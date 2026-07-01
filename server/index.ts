import express from "express";
import fs from "node:fs";
import path from "node:path";
import { WebSocketServer } from "ws";
import type {
  FittingRoom,
  RequestItem,
  Session,
  StoreState,
  StoreEvent,
  EventKind,
  Destination,
  ItemStatus,
} from "../shared/types.js";
import { skuKey, TAX_RATE } from "../shared/types.js";
import { CATALOG } from "./catalog.js";

const app = express();
app.use(express.json());

// After any successful mutation, persist to disk and push the new state to
// every connected client.
app.use((req, res, next) => {
  if (req.method === "POST") {
    res.on("finish", () => {
      if (res.statusCode < 400) {
        scheduleSave();
        broadcast();
      }
    });
  }
  next();
});

// ---------------------------------------------------------------------------
// In-memory store. Resets whenever the server restarts — perfect for a demo.
// ---------------------------------------------------------------------------

const sessions = new Map<string, Session>();
const items = new Map<string, RequestItem>();
const inventory: Record<string, number> = {};
const events: StoreEvent[] = [];

let eventId = 1;
function logEvent(kind: EventKind, text: string) {
  events.push({ id: eventId++, ts: Date.now(), kind, text });
  if (events.length > 60) events.splice(0, events.length - 60);
}

// Live push: every connected client gets the full snapshot on each change.
let wss: WebSocketServer | null = null;
function broadcast() {
  if (!wss) return;
  const msg = JSON.stringify(snapshot());
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */) client.send(msg);
  }
}

const rooms: FittingRoom[] = [1, 2, 3, 4].map((n) => ({
  id: `room-${n}`,
  number: n,
  status: "available",
  sessionId: null,
}));

// Seed stock for every size of every color. A handful are intentionally left
// at 0 so the "live stock" UI has something to grey out.
// Deterministic but uneven stock: the extreme sizes of the second colour run
// out, so the "only 1 left" / "sold out" states have something to show.
function defaultQty(ci: number, si: number, len: number): number {
  let qty = 6;
  if (ci === 1 && (si === 0 || si === len - 1)) qty = 0;
  if (ci === 2 && si === len - 1) qty = 1;
  return qty;
}

function seedInventory() {
  for (const p of CATALOG) {
    p.colors.forEach((color, ci) => {
      p.sizes.forEach((size, si) => {
        inventory[skuKey(p.id, color.name, size)] = defaultQty(
          ci,
          si,
          p.sizes.length
        );
      });
    });
  }
}

// Fill stock for any catalog SKU missing an entry (e.g. after the catalog
// changes) without disturbing counts that already exist.
function ensureInventory() {
  for (const p of CATALOG) {
    p.colors.forEach((color, ci) => {
      p.sizes.forEach((size, si) => {
        const key = skuKey(p.id, color.name, size);
        if (inventory[key] === undefined) {
          inventory[key] = defaultQty(ci, si, p.sizes.length);
        }
      });
    });
  }
}
seedInventory();

let idCounter = 1;
const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

let orderCounter = 1000;
const money = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Persistence — write-through to a JSON file so state survives restarts.
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "server", "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

function serialize(): string {
  return JSON.stringify({
    sessions: [...sessions.values()],
    items: [...items.values()],
    inventory,
    rooms,
    events,
    counters: { idCounter, orderCounter, eventId, clock },
  });
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveTimer) return; // coalesce rapid changes
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, serialize());
    } catch (e) {
      console.error("Failed to save store:", e);
    }
  }, 250);
}

function load(): void {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    sessions.clear();
    for (const s of raw.sessions ?? []) sessions.set(s.id, s);
    items.clear();
    for (const i of raw.items ?? []) items.set(i.id, i);
    for (const k of Object.keys(inventory)) delete inventory[k];
    Object.assign(inventory, raw.inventory ?? {});
    (raw.rooms ?? []).forEach((r: FittingRoom, idx: number) => {
      if (rooms[idx]) Object.assign(rooms[idx], r);
    });
    events.length = 0;
    events.push(...(raw.events ?? []));
    if (raw.counters) {
      idCounter = raw.counters.idCounter ?? idCounter;
      orderCounter = raw.counters.orderCounter ?? orderCounter;
      eventId = raw.counters.eventId ?? eventId;
      clock = raw.counters.clock ?? clock;
    }
    console.log(
      `Restored ${sessions.size} session(s), ${items.size} item(s) from disk.`
    );
  } catch (e) {
    console.error("Failed to load store, starting fresh:", e);
  }
}

const ADJECTIVES = ["Swift", "Bright", "Calm", "Bold", "Keen", "Warm"];
const ANIMALS = ["Otter", "Heron", "Fox", "Lynx", "Wren", "Ibis"];
function friendlyName(): string {
  const a = ADJECTIVES[idCounter % ADJECTIVES.length];
  const b = ANIMALS[(idCounter * 3) % ANIMALS.length];
  return `${a} ${b}`;
}

function bin(productId: string): string {
  // Stable pseudo-location for staff flavor, e.g. "Aisle 3 · Bay B".
  const n = productId.length + idCounter;
  return `Aisle ${(n % 6) + 1} · Bay ${String.fromCharCode(65 + (n % 4))}`;
}

function snapshot(): StoreState {
  return {
    sessions: [...sessions.values()],
    rooms,
    items: [...items.values()].sort((a, b) => a.createdAt - b.createdAt),
    inventory,
    events: [...events],
  };
}

// Use a monotonic counter for timestamps so ordering is stable without relying
// on wall-clock resolution.
let clock = 0;
const now = () => ++clock;

// ---------------------------------------------------------------------------
// Catalog (fetched once by clients)
// ---------------------------------------------------------------------------

app.get("/api/catalog", (_req, res) => {
  res.json({ products: CATALOG });
});

// Resolve a scanned tag code to a product.
app.get("/api/scan/:code", (req, res) => {
  const code = req.params.code.trim();
  const product = CATALOG.find(
    (p) => p.tagCode === code || p.id === code
  );
  if (!product) return res.status(404).json({ error: "Unknown tag code" });
  res.json({ product });
});

// ---------------------------------------------------------------------------
// State (polled by every client ~1/sec)
// ---------------------------------------------------------------------------

app.get("/api/state", (_req, res) => {
  res.json(snapshot());
});

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

app.post("/api/session", (_req, res) => {
  const id = nextId("session");
  const session: Session = {
    id,
    name: friendlyName(),
    fittingRoomId: null,
    createdAt: now(),
  };
  sessions.set(id, session);
  res.json({ session });
});

// ---------------------------------------------------------------------------
// Basket
// ---------------------------------------------------------------------------

app.post("/api/basket/add", (req, res) => {
  const { sessionId, productId, colorName, size, destination } = req.body as {
    sessionId: string;
    productId: string;
    colorName: string;
    size: string;
    destination: Destination;
  };
  const session = sessions.get(sessionId);
  const product = CATALOG.find((p) => p.id === productId);
  if (!session || !product) {
    return res.status(400).json({ error: "Bad session or product" });
  }
  const color = product.colors.find((c) => c.name === colorName);
  if (!color) return res.status(400).json({ error: "Bad color" });

  const key = skuKey(productId, colorName, size);
  const stock = inventory[key] ?? 0;
  if (stock <= 0) {
    return res.status(409).json({ error: "Out of stock" });
  }
  inventory[key] = stock - 1; // hold the unit while it's reserved

  const item: RequestItem = {
    id: nextId("item"),
    sessionId,
    productId,
    productName: product.name,
    brand: product.brand,
    garment: product.garment,
    image: color.image ?? product.image,
    color,
    size,
    price: product.price,
    binLocation: bin(productId),
    destination,
    status: "in_basket",
    createdAt: now(),
  };
  items.set(item.id, item);
  res.json({ item });
});

app.post("/api/basket/remove", (req, res) => {
  const { itemId } = req.body as { itemId: string };
  const item = items.get(itemId);
  if (item && item.status === "in_basket") {
    const key = skuKey(item.productId, item.color.name, item.size);
    inventory[key] = (inventory[key] ?? 0) + 1; // release the hold
    items.delete(itemId);
  }
  res.json({ ok: true });
});

// Change an in-basket item's destination before sending it.
app.post("/api/basket/destination", (req, res) => {
  const { itemId, destination } = req.body as {
    itemId: string;
    destination: Destination;
  };
  const item = items.get(itemId);
  if (item && item.status === "in_basket") {
    item.destination = destination;
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Send to fulfillment
// ---------------------------------------------------------------------------

function sessionItems(sessionId: string): RequestItem[] {
  return [...items.values()].filter((i) => i.sessionId === sessionId);
}

// "Ready to try on" — assign a room and push fitting-room items into the queue.
app.post("/api/fulfill/fitting-room", (req, res) => {
  const { sessionId } = req.body as { sessionId: string };
  const session = sessions.get(sessionId);
  if (!session) return res.status(400).json({ error: "Bad session" });

  const toSend = sessionItems(sessionId).filter(
    (i) => i.status === "in_basket" && i.destination === "fitting_room"
  );
  if (toSend.length === 0) {
    return res.status(409).json({ error: "Nothing to try on" });
  }

  // Assign a room if the session doesn't already have one.
  let room = session.fittingRoomId
    ? rooms.find((r) => r.id === session.fittingRoomId) ?? null
    : null;
  if (!room) {
    room = rooms.find((r) => r.status === "available") ?? null;
    if (!room) {
      return res.status(409).json({ error: "No fitting rooms available" });
    }
    room.status = "assigned";
    room.sessionId = sessionId;
    session.fittingRoomId = room.id;
    logEvent("assign", `Room ${room.number} assigned to ${session.name}`);
  }

  for (const item of toSend) {
    item.status = "requested";
    item.requestedAt = Date.now();
  }
  logEvent(
    "request",
    `${session.name} sent ${toSend.length} item(s) to room ${room.number}`
  );
  res.json({ ok: true, roomNumber: room.number });
});

// "Send the rest to checkout" — push checkout-destined items into the queue.
app.post("/api/fulfill/checkout", (req, res) => {
  const { sessionId } = req.body as { sessionId: string };
  const session = sessions.get(sessionId);
  if (!session) return res.status(400).json({ error: "Bad session" });

  const toSend = sessionItems(sessionId).filter(
    (i) => i.status === "in_basket" && i.destination === "checkout"
  );
  for (const item of toSend) {
    item.status = "requested";
    item.requestedAt = Date.now();
  }
  if (toSend.length > 0) {
    logEvent(
      "request",
      `${session.name} sent ${toSend.length} item(s) to the counter`
    );
  }
  res.json({ ok: true, count: toSend.length });
});

// ---------------------------------------------------------------------------
// Staff actions
// ---------------------------------------------------------------------------

const STAFF_TRANSITIONS: Record<string, ItemStatus> = {
  pick: "picking",
  stage: "staged",
};

app.post("/api/staff/advance", (req, res) => {
  const { itemId, action } = req.body as { itemId: string; action: string };
  const item = items.get(itemId);
  const next = STAFF_TRANSITIONS[action];
  if (!item || !next) return res.status(400).json({ error: "Bad request" });

  item.status = next;
  if (next === "picking") item.pickedAt = Date.now();

  if (next === "staged") {
    item.stagedAt = Date.now();
    const session = sessions.get(item.sessionId);
    const room =
      item.destination === "fitting_room" && session?.fittingRoomId
        ? rooms.find((r) => r.id === session.fittingRoomId)
        : null;
    // When the first item is staged in a room, mark the room occupied.
    if (room && room.status === "assigned") room.status = "occupied";
    const where = room ? `room ${room.number}` : "the counter";
    logEvent("stage", `${item.productName} staged to ${where}`);
  }
  res.json({ item });
});

// ---------------------------------------------------------------------------
// Customer decisions in the fitting room
// ---------------------------------------------------------------------------

app.post("/api/try/decide", (req, res) => {
  const { itemId, decision } = req.body as {
    itemId: string;
    decision: "keep" | "return";
  };
  const item = items.get(itemId);
  if (!item || !["staged", "kept"].includes(item.status)) {
    return res.status(400).json({ error: "Item not ready to decide" });
  }
  const who = sessions.get(item.sessionId)?.name ?? "Shopper";
  if (decision === "keep") {
    item.status = "kept"; // the unit stays held until it's purchased
    logEvent("keep", `${who} kept ${item.productName}`);
  } else {
    // "Not today" — release the held unit back to the shelf.
    const key = skuKey(item.productId, item.color.name, item.size);
    inventory[key] = (inventory[key] ?? 0) + 1;
    item.status = "returned";
    logEvent("return", `${who} returned ${item.productName}`);
  }
  res.json({ item });
});

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

app.post("/api/checkout", (req, res) => {
  const { sessionId } = req.body as { sessionId: string };
  const session = sessions.get(sessionId);
  if (!session) return res.status(400).json({ error: "Bad session" });

  // Charge what the shopper decided to keep, plus anything staged at the
  // counter for them. Undecided fitting-room items are never charged.
  const payable = sessionItems(sessionId).filter(
    (i) =>
      i.status === "kept" ||
      (i.status === "staged" && i.destination === "checkout")
  );

  const lineItems = payable.map((i) => ({
    id: i.id,
    name: i.productName,
    color: i.color.name,
    size: i.size,
    price: i.price,
    image: i.image,
    garment: i.garment,
  }));

  for (const item of payable) {
    if (item.status === "purchased") continue;
    // Stock was already held when the item was reserved — just finalise it.
    item.status = "purchased";
  }

  // Release the fitting room.
  if (session.fittingRoomId) {
    const room = rooms.find((r) => r.id === session.fittingRoomId);
    if (room) {
      room.status = "available";
      room.sessionId = null;
    }
    session.fittingRoomId = null;
  }

  const subtotal = money(payable.reduce((sum, i) => sum + i.price, 0));
  const tax = money(subtotal * TAX_RATE);
  const total = money(subtotal + tax);
  const orderId = `WB-${++orderCounter}`;
  if (payable.length > 0) {
    logEvent(
      "order",
      `Order ${orderId} — $${total.toFixed(2)} · ${payable.length} item(s)`
    );
  }
  res.json({
    ok: true,
    orderId,
    items: lineItems,
    subtotal,
    tax,
    total,
    count: payable.length,
  });
});

// ---------------------------------------------------------------------------
// In-room iPad: add a piece without a phone, and release the room
// ---------------------------------------------------------------------------

// Request another size / colour from inside the fitting room. It goes straight
// into the staff pick queue and is handed in to the same room.
app.post("/api/room/:roomId/add", (req, res) => {
  const room = rooms.find((r) => r.id === req.params.roomId);
  if (!room || !room.sessionId) {
    return res.status(400).json({ error: "Room is not in use" });
  }
  const { productId, colorName, size } = req.body as {
    productId: string;
    colorName: string;
    size: string;
  };
  const product = CATALOG.find((p) => p.id === productId);
  if (!product) return res.status(400).json({ error: "Bad product" });
  const color = product.colors.find((c) => c.name === colorName);
  if (!color) return res.status(400).json({ error: "Bad colour" });

  const key = skuKey(productId, colorName, size);
  const stock = inventory[key] ?? 0;
  if (stock <= 0) return res.status(409).json({ error: "Out of stock" });
  inventory[key] = stock - 1; // hold it

  const item: RequestItem = {
    id: nextId("item"),
    sessionId: room.sessionId,
    productId,
    productName: product.name,
    brand: product.brand,
    garment: product.garment,
    image: color.image ?? product.image,
    color,
    size,
    price: product.price,
    binLocation: bin(productId),
    destination: "fitting_room",
    status: "requested", // already in the room — send straight to the queue
    createdAt: now(),
    requestedAt: Date.now(),
  };
  items.set(item.id, item);
  const session = sessions.get(room.sessionId);
  logEvent(
    "request",
    `${session?.name ?? "Shopper"} requested ${product.name} (${size}) to room ${room.number}`
  );
  res.json({ item });
});

// "I'm finished" (shopper) or "Free room" (staff). Anything still undecided
// goes back to the shelf; kept items stay kept for checkout.
app.post("/api/room/:roomId/release", (req, res) => {
  const room = rooms.find((r) => r.id === req.params.roomId);
  if (!room || !room.sessionId) {
    return res.status(400).json({ error: "Room is not in use" });
  }
  const session = sessions.get(room.sessionId);
  let restocked = 0;
  for (const item of items.values()) {
    if (
      item.sessionId === room.sessionId &&
      item.destination === "fitting_room" &&
      ["requested", "picking", "staged"].includes(item.status)
    ) {
      const key = skuKey(item.productId, item.color.name, item.size);
      inventory[key] = (inventory[key] ?? 0) + 1;
      item.status = "returned";
      restocked++;
    }
  }
  logEvent("release", `Room ${room.number} freed`);
  room.status = "available";
  room.sessionId = null;
  if (session) session.fittingRoomId = null;
  res.json({ ok: true, restocked });
});

// ---------------------------------------------------------------------------
// Demo reset
// ---------------------------------------------------------------------------

app.post("/api/reset", (_req, res) => {
  sessions.clear();
  items.clear();
  events.length = 0;
  for (const r of rooms) {
    r.status = "available";
    r.sessionId = null;
  }
  seedInventory();
  res.json({ ok: true });
});

// In production (after `vite build`) serve the static client from this same
// server, so the entire app runs on one port — ideal behind a single
// reverse proxy or Cloudflare Tunnel.
const DIST_DIR = path.join(process.cwd(), "dist");
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get("*", (_req, res) => res.sendFile(path.join(DIST_DIR, "index.html")));
  console.log("Serving built client from ./dist");
}

// In production honour $PORT (the container/tunnel sets it); in dev always use
// 3001 so it never collides with the Vite dev server on 5173.
const PORT =
  process.env.NODE_ENV === "production"
    ? Number(process.env.PORT) || 3001
    : 3001;
load(); // restore any persisted state before accepting connections
ensureInventory(); // make sure new catalog items have stock

const httpServer = app.listen(PORT, () => {
  console.log(`Showroom API listening on http://localhost:${PORT}`);
});

wss = new WebSocketServer({ server: httpServer, path: "/ws" });
wss.on("connection", (socket) => {
  // Send the current state immediately on connect.
  socket.send(JSON.stringify(snapshot()));
});

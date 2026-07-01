import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { Product, RequestItem, Destination } from "../../shared/types";
import { skuKey, COLLECTIONS } from "../../shared/types";
import { api } from "../lib/api";
import {
  getStoredSessionId,
  storeSessionId,
  useStore,
} from "../lib/store";
import { Scanner } from "@yudiel/react-qr-scanner";
import { ProductImage } from "../components/ProductImage";
import { PaymentSheet } from "../components/PaymentSheet";

type Tab = "floor" | "bag";

export function Customer() {
  const { collectionId } = useParams();
  const activeCollection =
    COLLECTIONS.find((c) => c.id === collectionId) ?? COLLECTIONS[0];
  const { state, refresh, loaded } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("floor");
  const [selected, setSelected] = useState<Product | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Bootstrap catalog + session.
  useEffect(() => {
    api.catalog().then(setProducts);
  }, []);

  const creatingRef = useRef(false);
  useEffect(() => {
    if (!loaded) return; // wait for the first real state poll
    const existing = getStoredSessionId();
    if (existing && state.sessions.some((s) => s.id === existing)) {
      setSessionId(existing);
      creatingRef.current = false;
      return;
    }
    // No stored session, or it's gone (e.g. after a demo reset) — make a new one.
    if (!creatingRef.current) {
      creatingRef.current = true;
      api.createSession().then(({ session }) => {
        storeSessionId(session.id);
        setSessionId(session.id);
        refresh();
      });
    }
  }, [loaded, state.sessions]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  const myItems = useMemo(
    () => state.items.filter((i) => i.sessionId === sessionId),
    [state.items, sessionId]
  );
  const myRoom = useMemo(() => {
    const session = state.sessions.find((s) => s.id === sessionId);
    return state.rooms.find((r) => r.id === session?.fittingRoomId) ?? null;
  }, [state, sessionId]);

  const bagCount = myItems.filter(
    (i) => i.status !== "purchased" && i.status !== "returned"
  ).length;

  function stockFor(p: Product, colorName: string, size: string): number {
    return state.inventory[skuKey(p.id, colorName, size)] ?? 0;
  }

  // Only show this storefront's products on the floor / in the scan list.
  const collectionProducts = useMemo(
    () => products.filter((p) => p.collection === activeCollection.id),
    [products, activeCollection.id]
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-black/10 bg-white p-1">
          <TabButton active={tab === "floor"} onClick={() => setTab("floor")}>
            Floor
          </TabButton>
          <TabButton active={tab === "bag"} onClick={() => setTab("bag")}>
            My bag{bagCount > 0 ? ` · ${bagCount}` : ""}
          </TabButton>
        </div>
        <button
          onClick={() => setScanOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm active:scale-95"
        >
          <ScanGlyph /> Scan a tag
        </button>
      </div>

      {tab === "floor" ? (
        <>
          <div className="mb-3 flex items-baseline justify-between">
            <h1 className="text-base font-semibold">{activeCollection.label}</h1>
            <span className="text-xs uppercase tracking-wide text-ink/40">
              {activeCollection.tab}
            </span>
          </div>
          <FloorGrid
            products={collectionProducts}
            stockFor={stockFor}
            onPick={setSelected}
          />
        </>
      ) : (
        <Bag
          items={myItems}
          room={myRoom}
          sessionId={sessionId}
          onChange={refresh}
          flash={flash}
        />
      )}

      {scanOpen && (
        <ScanModal
          products={collectionProducts}
          onClose={() => setScanOpen(false)}
          onResolve={(p) => {
            setScanOpen(false);
            setSelected(p);
          }}
        />
      )}

      {selected && sessionId && (
        <DetailSheet
          product={selected}
          stockFor={stockFor}
          onClose={() => setSelected(null)}
          onAdd={async (colorName, size, destination) => {
            try {
              await api.addToBasket({
                sessionId,
                productId: selected.id,
                colorName,
                size,
                destination,
              });
              await refresh();
              setSelected(null);
              flash(
                destination === "fitting_room"
                  ? "Added — send it to a fitting room from your bag"
                  : "Added to your bag for checkout"
              );
            } catch (e) {
              flash((e as Error).message);
            }
          }}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-5 z-50 mx-auto w-fit max-w-[90%] animate-pop rounded-full bg-ink px-5 py-2.5 text-center text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-ink text-white" : "text-ink/60 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Floor grid — the showroom. One of each item on display.
// ---------------------------------------------------------------------------

function FloorGrid({
  products,
  stockFor,
  onPick,
}: {
  products: Product[];
  stockFor: (p: Product, c: string, s: string) => number;
  onPick: (p: Product) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {products.map((p) => {
        const anyStock = p.colors.some((c) =>
          p.sizes.some((s) => stockFor(p, c.name, s) > 0)
        );
        return (
          <button
            key={p.id}
            onClick={() => onPick(p)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-left transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-black/[0.04]">
              <div className="h-full w-full transition-transform duration-300 group-hover:scale-105">
                <ProductImage
                  src={p.image}
                  garment={p.garment}
                  hex={p.colors[0].hex}
                  alt={p.name}
                />
              </div>
              <span className="absolute left-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink/60">
                #{p.tagCode}
              </span>
              {!anyStock && (
                <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Sold out
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-0.5 p-3">
              <span className="text-[11px] uppercase tracking-wide text-ink/40">
                {p.brand}
              </span>
              <span className="text-sm font-medium leading-tight">
                {p.name}
              </span>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-semibold">${p.price}</span>
                <div className="flex -space-x-1">
                  {p.colors.slice(0, 4).map((c) => (
                    <span
                      key={c.name}
                      className="h-3.5 w-3.5 rounded-full border border-white"
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scan modal — simulates pointing the phone at a floor tag.
// ---------------------------------------------------------------------------

function ScanModal({
  products,
  onClose,
  onResolve,
}: {
  products: Product[];
  onClose: () => void;
  onResolve: (p: Product) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [camError, setCamError] = useState(false);
  const [paused, setPaused] = useState(false);

  async function submit(value: string) {
    try {
      const p = await api.scan(value);
      onResolve(p);
    } catch {
      setError(`No item with tag #${value}`);
      setPaused(false); // keep scanning
    }
  }

  return (
    <Sheet onClose={onClose} title="Scan a display tag">
      <div className="relative mb-4 aspect-video overflow-hidden rounded-xl bg-ink">
        {!camError ? (
          <Scanner
            onScan={(codes) => {
              const v = codes?.[0]?.rawValue;
              if (v && !paused) {
                setPaused(true);
                submit(v);
              }
            }}
            onError={() => setCamError(true)}
            formats={["qr_code"]}
            paused={paused}
            components={{ finder: true }}
            styles={{
              container: { width: "100%", height: "100%" },
              video: { width: "100%", height: "100%", objectFit: "cover" },
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-white/60">
            Camera unavailable — enter the code or tap a tag below.
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) submit(code.trim());
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          inputMode="numeric"
          placeholder="e.g. 1003"
          className="flex-1 rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-ink"
        />
        <button
          type="submit"
          className="rounded-lg bg-ink px-4 text-sm font-semibold text-white"
        >
          Go
        </button>
      </form>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
      <p className="mb-2 text-xs font-medium text-ink/50">
        Demo: tap a tag to "scan" it
      </p>
      <div className="grid grid-cols-3 gap-2">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => submit(p.tagCode)}
            className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2.5 py-2 text-left text-xs hover:border-ink/40"
          >
            <span className="font-mono text-ink/40">#{p.tagCode}</span>
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Product detail sheet — choose colour, size, destination.
// ---------------------------------------------------------------------------

function DetailSheet({
  product,
  stockFor,
  onClose,
  onAdd,
}: {
  product: Product;
  stockFor: (p: Product, c: string, s: string) => number;
  onClose: () => void;
  onAdd: (
    colorName: string,
    size: string,
    destination: Destination
  ) => void;
}) {
  const [color, setColor] = useState(product.colors[0].name);
  const [size, setSize] = useState<string | null>(
    product.sizes.length === 1 ? product.sizes[0] : null
  );
  const [destination, setDestination] = useState<Destination>("fitting_room");

  const selectedColor = product.colors.find((c) => c.name === color);
  const selectedHex = selectedColor?.hex ?? "#ccc";
  // Swap to the chosen colour's photo when it has one; else the hero photo.
  const selectedImage = selectedColor?.image ?? product.image;
  const sizeStock = size ? stockFor(product, color, size) : 0;
  const canAdd = !!size && sizeStock > 0;

  return (
    <Sheet onClose={onClose} title={product.name}>
      <div className="mb-4 flex gap-4">
        <div className="h-36 w-28 shrink-0 overflow-hidden rounded-xl bg-black/[0.05]">
          <ProductImage
            src={selectedImage}
            garment={product.garment}
            hex={selectedHex}
            alt={`${product.name} in ${color}`}
          />
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-ink/40">
            {product.brand} · #{product.tagCode}
          </span>
          <span className="text-lg font-semibold">${product.price}</span>
          <p className="mt-1 text-sm text-ink/60">{product.description}</p>
        </div>
      </div>

      <Label>Colour — {color}</Label>
      <div className="mb-4 flex gap-2">
        {product.colors.map((c) => (
          <button
            key={c.name}
            onClick={() => {
              setColor(c.name);
              setSize(product.sizes.length === 1 ? product.sizes[0] : null);
            }}
            className={`h-9 w-9 rounded-full border-2 transition-transform ${
              color === c.name
                ? "scale-110 border-ink"
                : "border-black/10"
            }`}
            style={{ background: c.hex }}
            aria-label={c.name}
          />
        ))}
      </div>

      <Label>Size</Label>
      <div className="mb-5 flex flex-wrap gap-2">
        {product.sizes.map((s) => {
          const stock = stockFor(product, color, s);
          const out = stock <= 0;
          const low = stock > 0 && stock <= 1;
          return (
            <button
              key={s}
              disabled={out}
              onClick={() => setSize(s)}
              className={`relative min-w-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                out
                  ? "cursor-not-allowed border-black/5 text-ink/25 line-through"
                  : size === s
                  ? "border-ink bg-ink text-white"
                  : "border-black/15 hover:border-ink/50"
              }`}
            >
              {s}
              {low && (
                <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                  1
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Label>Send it to</Label>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <DestChoice
          active={destination === "fitting_room"}
          onClick={() => setDestination("fitting_room")}
          title="Fitting room"
          sub="Have it waiting to try on"
        />
        <DestChoice
          active={destination === "checkout"}
          onClick={() => setDestination("checkout")}
          title="Checkout"
          sub="Buy without trying on"
        />
      </div>

      <button
        disabled={!canAdd}
        onClick={() => size && onAdd(color, size, destination)}
        className="w-full rounded-xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-30"
      >
        {!size
          ? "Select a size"
          : sizeStock <= 0
          ? "Out of stock"
          : "Add to bag"}
      </button>
    </Sheet>
  );
}

function DestChoice({
  active,
  onClick,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-colors ${
        active ? "border-ink bg-ink/[0.04]" : "border-black/15"
      }`}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-ink/50">{sub}</div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Bag — requests, fitting-room status, checkout.
// ---------------------------------------------------------------------------

function Bag({
  items,
  room,
  sessionId,
  onChange,
  flash,
}: {
  items: RequestItem[];
  room: ReturnType<typeof Object> | any;
  sessionId: string | null;
  onChange: () => void;
  flash: (m: string) => void;
}) {
  const [paying, setPaying] = useState(false);
  if (!sessionId) return null;

  const toTryOn = items.filter(
    (i) => i.status === "in_basket" && i.destination === "fitting_room"
  );
  const toBuy = items.filter(
    (i) => i.status === "in_basket" && i.destination === "checkout"
  );
  const inFlight = items.filter(
    (i) => i.status === "requested" || i.status === "picking"
  );
  const stagedRoom = items.filter(
    (i) => i.status === "staged" && i.destination === "fitting_room"
  );
  const stagedCounter = items.filter(
    (i) => i.status === "staged" && i.destination === "checkout"
  );
  const kept = items.filter((i) => i.status === "kept");
  const purchased = items.filter((i) => i.status === "purchased");

  const payable = [...kept, ...stagedCounter];
  const payTotal = payable.reduce((s, i) => s + i.price, 0);

  const empty =
    items.filter((i) => i.status !== "returned").length === 0;

  if (empty) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-10 text-center">
        <p className="text-sm font-medium">Your bag is empty</p>
        <p className="mt-1 text-xs text-ink/50">
          Scan a tag on the floor to add items, then send them to a fitting
          room or straight to checkout.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {room && (
        <div className="flex items-center gap-3 rounded-2xl bg-ink p-4 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-2xl font-bold">
            {room.number}
          </div>
          <div>
            <div className="text-sm font-semibold">
              Fitting room {room.number}
            </div>
            <div className="text-xs text-white/70">
              {room.status === "occupied"
                ? "Your items are staged — head in"
                : "Assigned to you — items on the way"}
            </div>
          </div>
        </div>
      )}

      {toTryOn.length > 0 && (
        <Section title="Ready to try on">
          {toTryOn.map((i) => (
            <Row key={i.id} item={i} onRemove={onChange} />
          ))}
          <button
            onClick={async () => {
              try {
                const { roomNumber } = await api.sendToFittingRoom(sessionId);
                await onChange();
                flash(`Sent to fitting room ${roomNumber}`);
              } catch (e) {
                flash((e as Error).message);
              }
            }}
            className="mt-1 w-full rounded-xl bg-ink py-3 text-sm font-semibold text-white"
          >
            Ready to try on ({toTryOn.length}) — assign me a room
          </button>
        </Section>
      )}

      {toBuy.length > 0 && (
        <Section title="To buy (no try-on)">
          {toBuy.map((i) => (
            <Row key={i.id} item={i} onRemove={onChange} />
          ))}
          <button
            onClick={async () => {
              await api.sendToCheckout(sessionId);
              await onChange();
              flash("Sent to the counter to be bagged");
            }}
            className="mt-1 w-full rounded-xl border border-ink py-3 text-sm font-semibold text-ink"
          >
            Have these ready at checkout
          </button>
        </Section>
      )}

      {inFlight.length > 0 && (
        <Section title="Being prepared">
          {inFlight.map((i) => (
            <Row key={i.id} item={i} status />
          ))}
        </Section>
      )}

      {stagedRoom.length > 0 && (
        <Section title="In your fitting room — keep or return">
          {stagedRoom.map((i) => (
            <Row key={i.id} item={i}>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await api.decide(i.id, "return");
                    onChange();
                  }}
                  className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-semibold"
                >
                  Return
                </button>
                <button
                  onClick={async () => {
                    await api.decide(i.id, "keep");
                    onChange();
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Keep
                </button>
              </div>
            </Row>
          ))}
        </Section>
      )}

      {(payable.length > 0 || purchased.length > 0) && (
        <Section title="Checkout">
          {kept.map((i) => (
            <Row key={i.id} item={i} badge="Keeping" />
          ))}
          {stagedCounter.map((i) => (
            <Row key={i.id} item={i} badge="At counter" />
          ))}
          {purchased.map((i) => (
            <Row key={i.id} item={i} badge="Paid" dim />
          ))}

          {payable.length > 0 && (
            <button
              onClick={() => setPaying(true)}
              className="mt-1 flex w-full items-center justify-between rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white"
            >
              <span>Pay now</span>
              <span>${payTotal}</span>
            </button>
          )}
        </Section>
      )}

      {paying && (
        <PaymentSheet
          sessionId={sessionId}
          amount={payTotal}
          onClose={() => setPaying(false)}
          onPaid={(r) => {
            onChange();
            flash(`Paid $${r.total.toFixed(2)} — enjoy!`);
          }}
        />
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
        {title}
      </h2>
      <div className="space-y-2 rounded-2xl border border-black/10 bg-white p-3">
        {children}
      </div>
    </section>
  );
}

const STATUS_TEXT: Record<string, string> = {
  requested: "Waiting for a stylist to pick it",
  picking: "Being retrieved from the stockroom",
};

function Row({
  item,
  onRemove,
  status,
  badge,
  dim,
  children,
}: {
  item: RequestItem;
  onRemove?: () => void;
  status?: boolean;
  badge?: string;
  dim?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-3 ${dim ? "opacity-50" : ""}`}
    >
      <div className="h-12 w-11 shrink-0 overflow-hidden rounded-lg bg-black/[0.05]">
        <ProductImage
          src={item.image}
          garment={item.garment}
          hex={item.color.hex}
          alt={item.productName}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.productName}</div>
        <div className="text-xs text-ink/50">
          {item.color.name} · {item.size} · ${item.price}
        </div>
        {status && (
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink/60">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            {STATUS_TEXT[item.status] ?? item.status}
          </div>
        )}
      </div>
      {badge && (
        <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-medium text-ink/60">
          {badge}
        </span>
      )}
      {onRemove && (
        <button
          onClick={async () => {
            await api.removeFromBasket(item.id);
            onRemove();
          }}
          className="text-ink/30 hover:text-red-500"
          aria-label="Remove"
        >
          ✕
        </button>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bottom sheet + small bits
// ---------------------------------------------------------------------------

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="animate-pop relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink/50"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
      {children}
    </div>
  );
}

function ScanGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M3 12h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

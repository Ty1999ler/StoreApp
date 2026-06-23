# Showroom — scan · reserve · try on

A prototype of a scan-to-reserve apparel store. The sales floor is a **showroom**
(one of each item on display); real stock lives in the back. Shoppers scan a
display tag with their phone and reserve items to a **fitting room** or to
**checkout**, where staff pick and stage them.

## Run it

```bash
npm install
npm run dev
```

- Shopper app → http://localhost:5173/customer
- Staff pick queue → http://localhost:5173/staff
- Fitting-room screens → http://localhost:5173/room
- In-room iPad → http://localhost:5173/room/room-1 (tap a room on the Rooms page)
- Floor tags → http://localhost:5173/tags (printable QR tags, one per item)
- Ops dashboard → http://localhost:5173/ops (live KPIs, pick-time SLA, conversion, low stock, activity)

Open the shopper, staff, and a fitting-room iPad in side-by-side tabs to watch
a request flow between them. Everything stays in sync via 1-second polling.

The scanner uses the real device camera (point it at a tag on the Tags page);
where there's no camera/permission it falls back to manual entry and a tap
list. Checkout is a mock card-entry + itemised receipt — no real charge.

## Try the full loop

1. **Shopper:** tap **Scan a tag** (or any item) → pick a colour & size →
   send it to a **Fitting room** → add a second item to **Checkout**.
2. Open **My bag** → press **Ready to try on** (a room is assigned).
3. **Staff tab:** the request appears in a lane for that room → **Start
   picking** → **Mark staged**. The **Rooms** screen lights up.
4. **Shopper** (phone) or **the in-room iPad:** **Keep** or **Not today** each
   item. From the iPad you can also tap **+** to request another size or a new
   piece without your phone — it drops into the staff queue and is handed in.
5. Press **Pay now** (phone) or **I'm finished · buy …** (iPad). The room is
   released so it can be reassigned; staff can also **Free room** manually.

Reserving an item *holds* that unit of stock; returning it or freeing the room
puts it back. Use **Reset demo** on the staff page to start over.

## How it's built

| Layer    | Tech                								   |
| -------- | ------------------------------------------------ |
| Client   | React 19 + TypeScript + Vite + Tailwind v4       |
| Backend  | Express, in-memory state persisted to `server/data/store.json` |
| Sync     | WebSocket push (`ws`) with auto-reconnect        |
| Scanning | `@yudiel/react-qr-scanner` (camera) + `qrcode.react` (tags) |
| Photos   | Local files in `/public/products`, SVG fallback  |

```
shared/types.ts     domain model shared by client + server
server/catalog.ts   the apparel catalog
server/index.ts     API + in-memory store + fulfillment logic
src/pages/          Customer.tsx · Staff.tsx · Room.tsx · RoomKiosk.tsx (iPad) · Tags.tsx · Ops.tsx
src/lib/            api.ts (calls) · store.ts (websocket hook)
src/components/      ProductImage.tsx (photo + SVG fallback) · PaymentSheet.tsx · GarmentIcon.tsx
public/products/    12 product photos (jpg)
server/data/        store.json (auto-saved state, restored on boot)
```

State lives in memory but is written through to `server/data/store.json` on
every change, so it survives a restart. To wipe it, hit **Reset demo** on the
staff page or delete that file. Every screen stays in sync over a WebSocket —
no polling — and the client auto-reconnects if the server restarts.

## Deploy (Synology / Docker + Cloudflare Tunnel)

In production the whole app — UI, API, **and** the websocket — runs from one
Node process on a single port (`8002`), which is exactly what a tunnel wants.
Build once, run anywhere:

```bash
npm run build   # bundles the UI into ./dist
PORT=8002 NODE_ENV=production npm start   # serves UI + API + WS on :8002
```

### On the NAS (Container Manager)

1. Copy this folder to the NAS (or `git clone` it).
2. In **Container Manager → Project**, point it at this folder's
   `docker-compose.yml` and build. It exposes **port 8002** and mounts a named
   volume at `/app/server/data` so `store.json` survives image rebuilds.
3. The container runs `npm start` — the single-port production server.

### Cloudflare Tunnel

Add a public hostname (e.g. `store.yourdomain.com`) with the service pointing
at the container, e.g. `http://localhost:8002` (or `http://showroom:8002` if
`cloudflared` shares the Docker network). Notes:

- **WebSockets** pass through Cloudflare Tunnels automatically — no extra
  config. The client uses `wss://` on the public origin, so live sync just works.
- **HTTPS is free** at the edge, which is what makes the **phone camera scan**
  work (browsers require a secure origin for the camera off `localhost`).
- **Auth:** the Staff and Ops screens have no login. Since the tunnel is
  internet-reachable, protect it with a **Cloudflare Access** policy (e.g.
  email one-time-PIN) on the hostname — or just the `/staff`, `/ops`, and
  `/room/*` paths — so only you can open the back-of-house views.

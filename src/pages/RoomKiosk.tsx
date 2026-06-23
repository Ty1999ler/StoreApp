import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Product, RequestItem } from "../../shared/types";
import { skuKey } from "../../shared/types";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { ProductImage } from "../components/ProductImage";
import { PaymentSheet } from "../components/PaymentSheet";

/**
 * The wall-mounted iPad inside a single fitting room. Greets the shopper by
 * name, shows their garments with big Keep / Not today buttons, lets them
 * request more sizes or pieces without a phone, and releases the room when
 * they're finished.
 */
export function RoomKiosk() {
  const { roomId = "" } = useParams();
  const { state, refresh } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [adding, setAdding] = useState<Product | true | null>(null);
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [farewell, setFarewell] = useState<{
    name: string;
    paid: number | null;
  } | null>(null);

  useEffect(() => {
    api.catalog().then(setProducts);
  }, []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }

  const room = state.rooms.find((r) => r.id === roomId);
  const session = state.sessions.find((s) => s.id === room?.sessionId);
  const items = useMemo(
    () =>
      state.items.filter(
        (i) =>
          i.sessionId === room?.sessionId &&
          i.destination === "fitting_room" &&
          i.status !== "returned" &&
          i.status !== "purchased"
      ),
    [state.items, room?.sessionId]
  );

  const stockFor = (productId: string, color: string, size: string) =>
    state.inventory[skuKey(productId, color, size)] ?? 0;

  if (!room) {
    return (
      <Frame>
        <p className="text-white/70">Unknown room.</p>
        <Link to="/room" className="mt-2 underline">
          Back to rooms
        </Link>
      </Frame>
    );
  }

  // Farewell screen after finishing.
  if (farewell) {
    return (
      <Frame center>
        <div className="animate-pop text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-4xl">
            ✓
          </div>
          <h1 className="text-3xl font-semibold">
            {farewell.paid !== null ? "Thank you" : "All set"},{" "}
            {farewell.name}!
          </h1>
          <p className="mt-2 text-white/60">
            {farewell.paid !== null
              ? `Paid $${farewell.paid}. Your items are bagged at the counter.`
              : "Thanks for visiting — we're prepping the room for the next guest."}
          </p>
        </div>
      </Frame>
    );
  }

  // Idle screen — no one assigned.
  if (!session) {
    return (
      <Frame center>
        <div className="text-center">
          <div className="mb-3 text-sm uppercase tracking-[0.3em] text-white/40">
            Showroom
          </div>
          <h1 className="text-5xl font-light">Fitting Room {room.number}</h1>
          <p className="mt-4 text-white/50">
            Available — press “Ready to try on” in the app and you'll be
            welcomed here.
          </p>
          <Link
            to="/room"
            className="mt-8 inline-block rounded-full border border-white/20 px-5 py-2 text-sm text-white/70"
          >
            ← All rooms
          </Link>
        </div>
      </Frame>
    );
  }

  const staged = items.filter((i) => i.status === "staged");
  const kept = items.filter((i) => i.status === "kept");
  const incoming = items.filter(
    (i) => i.status === "requested" || i.status === "picking"
  );
  const keepTotal = kept.reduce((s, i) => s + i.price, 0);

  async function finish() {
    // Anything left undecided goes back to the shelf.
    for (const i of staged) await api.decide(i.id, "return");
    if (kept.length > 0) {
      setPaying(true); // pay for the keepers, then say goodbye
    } else {
      await api.roomRelease(room!.id);
      setFarewell({ name: session!.name, paid: null });
      window.setTimeout(() => setFarewell(null), 6000);
      refresh();
    }
  }

  return (
    <Frame>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.25em] text-white/40">
            Fitting Room {room.number}
          </div>
          <h1 className="mt-1 text-4xl font-semibold">
            Welcome, {session.name}
          </h1>
        </div>
        <button
          onClick={finish}
          className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold backdrop-blur hover:bg-white/20"
        >
          {kept.length > 0
            ? `I'm finished · buy ${kept.length} ($${keepTotal})`
            : "I'm finished"}
        </button>
      </div>

      {/* Items */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {staged.map((i) => (
          <KioskCard key={i.id} item={i} onDone={refresh} state="decide" />
        ))}
        {kept.map((i) => (
          <KioskCard key={i.id} item={i} onDone={refresh} state="kept" />
        ))}
        {incoming.map((i) => (
          <KioskCard key={i.id} item={i} onDone={refresh} state="incoming" />
        ))}

        {/* Add tile */}
        <button
          onClick={() => setAdding(true)}
          className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/20 text-white/60 transition-colors hover:border-white/40 hover:text-white"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-3xl">
            +
          </span>
          <span className="text-sm font-medium">Add a size or another piece</span>
        </button>
      </div>

      {items.length === 0 && (
        <p className="mt-6 text-center text-white/40">
          Your pieces will appear here as our team brings them in.
        </p>
      )}

      {adding && (
        <AddPanel
          products={products}
          focus={adding === true ? null : adding}
          stockFor={stockFor}
          onClose={() => setAdding(null)}
          onAdd={async (productId, colorName, size) => {
            try {
              await api.roomAdd(room.id, { productId, colorName, size });
              await refresh();
              setAdding(null);
              flash("On its way to your room");
            } catch (e) {
              flash((e as Error).message);
            }
          }}
        />
      )}

      {paying && (
        <PaymentSheet
          sessionId={session.id}
          amount={keepTotal}
          onClose={() => setPaying(false)}
          onPaid={(r) => {
            setPaying(false);
            setFarewell({ name: session.name, paid: r.total });
            window.setTimeout(() => setFarewell(null), 6000);
            refresh();
          }}
        />
      )}

      {toast && (
        <div className="animate-pop fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-full bg-white px-6 py-3 text-sm font-medium text-ink shadow-xl">
          {toast}
        </div>
      )}
    </Frame>
  );
}

function Frame({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div
      className={`min-h-[78vh] rounded-3xl bg-ink p-8 text-white shadow-2xl ${
        center ? "flex items-center justify-center" : ""
      }`}
    >
      {children}
    </div>
  );
}

function KioskCard({
  item,
  onDone,
  state,
}: {
  item: RequestItem;
  onDone: () => void;
  state: "decide" | "kept" | "incoming";
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-white/[0.06] p-4">
      <div className="mb-3 flex gap-3">
        <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-white/10">
          <ProductImage
            src={item.image}
            garment={item.garment}
            hex={item.color.hex}
            alt={item.productName}
          />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-white/40">
            {item.brand}
          </div>
          <div className="font-medium leading-tight">{item.productName}</div>
          <div className="mt-1 text-sm text-white/60">
            {item.color.name} · {item.size}
          </div>
          <div className="text-sm text-white/80">${item.price}</div>
        </div>
      </div>

      {state === "incoming" && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm text-white/60">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          {item.status === "picking" ? "On its way…" : "Requested"}
        </div>
      )}

      {state === "decide" && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={async () => {
              await api.decide(item.id, "return");
              onDone();
            }}
            className="rounded-xl border border-white/20 py-3 text-sm font-semibold hover:bg-white/5"
          >
            Not today
          </button>
          <button
            onClick={async () => {
              await api.decide(item.id, "keep");
              onDone();
            }}
            className="rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            Keep
          </button>
        </div>
      )}

      {state === "kept" && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/15 px-3 py-2.5">
          <span className="text-sm font-semibold text-emerald-300">
            ♥ Keeping
          </span>
          <button
            onClick={async () => {
              await api.decide(item.id, "return");
              onDone();
            }}
            className="text-xs text-white/50 underline hover:text-white"
          >
            change
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add panel — browse the catalog or pick another size of a piece.
// ---------------------------------------------------------------------------

function AddPanel({
  products,
  focus,
  stockFor,
  onClose,
  onAdd,
}: {
  products: Product[];
  focus: Product | null;
  stockFor: (productId: string, color: string, size: string) => number;
  onClose: () => void;
  onAdd: (productId: string, colorName: string, size: string) => void;
}) {
  const [selected, setSelected] = useState<Product | null>(focus);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="animate-pop relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-paper p-6 text-ink shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {selected ? selected.name : "Bring something to my room"}
          </h3>
          <button
            onClick={selected && !focus ? () => setSelected(null) : onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-ink/50"
          >
            {selected && !focus ? "‹" : "✕"}
          </button>
        </div>

        {!selected ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="flex flex-col items-center rounded-xl border border-black/10 bg-white p-3 hover:border-ink/40"
              >
                <div className="aspect-square w-full overflow-hidden rounded-lg">
                  <ProductImage
                    src={p.image}
                    garment={p.garment}
                    hex={p.colors[0].hex}
                    alt={p.name}
                  />
                </div>
                <span className="mt-1 line-clamp-1 text-xs font-medium">
                  {p.name}
                </span>
                <span className="text-xs text-ink/50">${p.price}</span>
              </button>
            ))}
          </div>
        ) : (
          <Chooser product={selected} stockFor={stockFor} onAdd={onAdd} />
        )}
      </div>
    </div>
  );
}

function Chooser({
  product,
  stockFor,
  onAdd,
}: {
  product: Product;
  stockFor: (productId: string, color: string, size: string) => number;
  onAdd: (productId: string, colorName: string, size: string) => void;
}) {
  const [color, setColor] = useState(product.colors[0].name);
  const [size, setSize] = useState<string | null>(
    product.sizes.length === 1 ? product.sizes[0] : null
  );
  const hex = product.colors.find((c) => c.name === color)?.hex ?? "#ccc";
  const stock = size ? stockFor(product.id, color, size) : 0;

  return (
    <div>
      <div className="mb-4 flex gap-4">
        <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-black/[0.05]">
          <ProductImage
            src={product.image}
            garment={product.garment}
            hex={hex}
            alt={product.name}
          />
        </div>
        <p className="text-sm text-ink/60">{product.description}</p>
      </div>

      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
        Colour — {color}
      </div>
      <div className="mb-4 flex gap-2">
        {product.colors.map((c) => (
          <button
            key={c.name}
            onClick={() => {
              setColor(c.name);
              setSize(product.sizes.length === 1 ? product.sizes[0] : null);
            }}
            className={`h-10 w-10 rounded-full border-2 ${
              color === c.name ? "scale-110 border-ink" : "border-black/10"
            }`}
            style={{ background: c.hex }}
            aria-label={c.name}
          />
        ))}
      </div>

      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
        Size
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {product.sizes.map((s) => {
          const out = stockFor(product.id, color, s) <= 0;
          return (
            <button
              key={s}
              disabled={out}
              onClick={() => setSize(s)}
              className={`min-w-12 rounded-lg border px-3 py-2.5 text-sm font-medium ${
                out
                  ? "cursor-not-allowed border-black/5 text-ink/25 line-through"
                  : size === s
                  ? "border-ink bg-ink text-white"
                  : "border-black/15"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      <button
        disabled={!size || stock <= 0}
        onClick={() => size && onAdd(product.id, color, size)}
        className="w-full rounded-xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-30"
      >
        {!size ? "Select a size" : stock <= 0 ? "Out of stock" : "Bring it to my room"}
      </button>
    </div>
  );
}

import { useMemo } from "react";
import type { RequestItem, Session } from "../../shared/types";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { ProductImage } from "../components/ProductImage";

export function Staff() {
  const { state, refresh } = useStore();

  // Items still needing staff action (requested / picking) or recently staged.
  const live = state.items.filter((i) =>
    ["requested", "picking", "staged"].includes(i.status)
  );

  const open = live.filter((i) => i.status !== "staged").length;
  const roomsInUse = state.rooms.filter((r) => r.status !== "available").length;

  // Build lanes: one per active fitting room, plus a single counter lane.
  const sessionById = useMemo(() => {
    const m = new Map<string, Session>();
    for (const s of state.sessions) m.set(s.id, s);
    return m;
  }, [state.sessions]);

  const roomLanes = state.rooms
    .filter((r) => r.sessionId)
    .map((r) => ({
      key: r.id,
      roomId: r.id,
      title: `Fitting room ${r.number}`,
      subtitle: sessionById.get(r.sessionId!)?.name ?? "",
      items: live.filter(
        (i) => i.sessionId === r.sessionId && i.destination === "fitting_room"
      ),
    }))
    .filter((lane) => lane.items.length > 0);

  const counterItems = live.filter((i) => i.destination === "checkout");

  const hasWork = roomLanes.length > 0 || counterItems.length > 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Stat label="Open requests" value={open} accent />
        <Stat label="Rooms in use" value={`${roomsInUse}/${state.rooms.length}`} />
        <div className="ml-auto">
          <button
            onClick={async () => {
              await api.reset();
              refresh();
            }}
            className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-ink/60 hover:text-ink"
          >
            Reset demo
          </button>
        </div>
      </div>

      {!hasWork ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-10 text-center">
          <p className="text-sm font-medium">Pick queue is clear</p>
          <p className="mt-1 text-xs text-ink/50">
            When a shopper presses “Ready to try on” or sends items to
            checkout, their requests appear here to pick and stage.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {roomLanes.map((lane) => (
            <Lane
              key={lane.key}
              roomId={lane.roomId}
              title={lane.title}
              subtitle={lane.subtitle}
              items={lane.items}
              onChange={refresh}
            />
          ))}
          {counterItems.length > 0 && (
            <Lane
              key="counter"
              title="Checkout counter"
              subtitle="To bag for pickup"
              items={counterItems}
              onChange={refresh}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-2 ${
        accent ? "border-amber-300 bg-amber-50" : "border-black/10 bg-white"
      }`}
    >
      <div className="text-xl font-bold leading-none">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-ink/50">
        {label}
      </div>
    </div>
  );
}

function Lane({
  roomId,
  title,
  subtitle,
  items,
  onChange,
}: {
  roomId?: string;
  title: string;
  subtitle: string;
  items: RequestItem[];
  onChange: () => void;
}) {
  const remaining = items.filter((i) => i.status !== "staged").length;
  return (
    <section className="rounded-2xl border border-black/10 bg-white">
      <header className="flex items-center justify-between border-b border-black/5 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-ink/50">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2">
          {roomId && (
            <button
              onClick={async () => {
                await api.roomRelease(roomId);
                onChange();
              }}
              title="Mark the room empty so it can be reassigned"
              className="rounded-full border border-black/15 px-2.5 py-1 text-[11px] font-medium text-ink/50 hover:text-ink"
            >
              Free room
            </button>
          )}
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              remaining > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {remaining > 0 ? `${remaining} to pick` : "All staged"}
          </span>
        </div>
      </header>
      <div className="divide-y divide-black/5">
        {items.map((item) => (
          <PickRow key={item.id} item={item} onChange={onChange} />
        ))}
      </div>
    </section>
  );
}

function PickRow({
  item,
  onChange,
}: {
  item: RequestItem;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-12 w-11 shrink-0 overflow-hidden rounded-lg bg-black/[0.05]">
        <ProductImage
          src={item.image}
          garment={item.garment}
          hex={item.color.hex}
          alt={item.productName}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {item.productName}
        </div>
        <div className="text-xs text-ink/50">
          {item.color.name} · size {item.size}
        </div>
        <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-ink/40">
          <PinGlyph /> {item.binLocation}
        </div>
      </div>
      <Action item={item} onChange={onChange} />
    </div>
  );
}

function Action({
  item,
  onChange,
}: {
  item: RequestItem;
  onChange: () => void;
}) {
  if (item.status === "requested") {
    return (
      <button
        onClick={async () => {
          await api.staffAdvance(item.id, "pick");
          onChange();
        }}
        className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white"
      >
        Start picking
      </button>
    );
  }
  if (item.status === "picking") {
    return (
      <button
        onClick={async () => {
          await api.staffAdvance(item.id, "stage");
          onChange();
        }}
        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
      >
        Mark staged
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
      <CheckGlyph /> Staged
    </span>
  );
}

function PinGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

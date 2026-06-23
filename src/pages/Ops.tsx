import { useEffect, useMemo, useState } from "react";
import type { Product, StoreEvent } from "../../shared/types";
import { api } from "../lib/api";
import { useStore } from "../lib/store";

const SLA_SECONDS = 180; // target: staged within 3 minutes of the request

export function Ops() {
  const { state } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [, setTick] = useState(0);
  const now = Date.now();

  useEffect(() => {
    api.catalog().then(setProducts);
  }, []);

  // Keep wait-times and "x ago" labels ticking even when no data changes.
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const productById = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const items = state.items;

  // ---- KPIs ----
  const activeShoppers = state.sessions.filter((s) =>
    items.some(
      (i) =>
        i.sessionId === s.id &&
        i.status !== "purchased" &&
        i.status !== "returned"
    )
  ).length;
  const open = items.filter(
    (i) => i.status === "requested" || i.status === "picking"
  );
  const roomsInUse = state.rooms.filter((r) => r.status !== "available").length;

  // ---- Fulfilment speed ----
  const pickTimes = items
    .filter((i) => i.requestedAt && i.stagedAt)
    .map((i) => (i.stagedAt! - i.requestedAt!) / 1000);
  const avgPick =
    pickTimes.length > 0
      ? pickTimes.reduce((a, b) => a + b, 0) / pickTimes.length
      : null;
  const breaches = open.filter(
    (i) => i.requestedAt && (now - i.requestedAt) / 1000 > SLA_SECONDS
  ).length;

  // ---- Conversion (try-ons) ----
  const tried = items.filter(
    (i) =>
      i.destination === "fitting_room" &&
      ["kept", "returned", "purchased"].includes(i.status)
  );
  const kept = tried.filter(
    (i) => i.status === "kept" || i.status === "purchased"
  ).length;
  const returned = tried.filter((i) => i.status === "returned").length;
  const keepRate = kept + returned > 0 ? (kept / (kept + returned)) * 100 : null;

  // ---- Revenue ----
  const purchased = items.filter((i) => i.status === "purchased");
  const revenue = purchased.reduce((s, i) => s + i.price, 0);
  const orders = state.events.filter((e) => e.kind === "order").length;

  // ---- Low stock ----
  const lowStock = Object.entries(state.inventory)
    .filter(([, qty]) => qty <= 1)
    .map(([key, qty]) => {
      const [productId, color, size] = key.split("|");
      return { productId, color, size, qty, name: productById.get(productId)?.name ?? productId };
    })
    .sort((a, b) => a.qty - b.qty)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Store operations</h1>
        <span className="text-xs text-ink/40">live · updates every second</span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Active shoppers" value={activeShoppers} />
        <Kpi
          label="Open requests"
          value={open.length}
          tone={breaches > 0 ? "warn" : open.length > 0 ? "info" : "ok"}
        />
        <Kpi label="Rooms in use" value={`${roomsInUse}/${state.rooms.length}`} />
        <Kpi
          label="Avg pick time"
          value={avgPick === null ? "—" : fmtDur(avgPick)}
          tone={avgPick !== null && avgPick > SLA_SECONDS ? "warn" : "ok"}
        />
        <Kpi
          label="Keep rate"
          value={keepRate === null ? "—" : `${Math.round(keepRate)}%`}
        />
        <Kpi label="Revenue" value={`$${revenue.toFixed(0)}`} sub={`${orders} order(s)`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* SLA / open requests */}
        <Panel
          title="Fulfilment queue"
          subtitle={`Target: staged within ${fmtDur(SLA_SECONDS)}`}
          className="lg:col-span-2"
        >
          {open.length === 0 ? (
            <Empty>Queue is clear — every request is staged.</Empty>
          ) : (
            <div className="space-y-1.5">
              {open
                .slice()
                .sort(
                  (a, b) => (a.requestedAt ?? 0) - (b.requestedAt ?? 0)
                )
                .map((i) => {
                  const wait = i.requestedAt ? (now - i.requestedAt) / 1000 : 0;
                  const tone =
                    wait > SLA_SECONDS
                      ? "text-red-600"
                      : wait > SLA_SECONDS / 2
                      ? "text-amber-600"
                      : "text-emerald-600";
                  return (
                    <div
                      key={i.id}
                      className="flex items-center justify-between rounded-lg border border-black/5 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-medium">{i.productName}</span>
                        <span className="text-ink/40">
                          {" "}
                          · {i.color.name} · {i.size}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] text-ink/50">
                          {i.status === "picking" ? "picking" : "queued"}
                        </span>
                        <span className={`w-14 text-right font-mono ${tone}`}>
                          {fmtDur(wait)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Panel>

        {/* Conversion */}
        <Panel title="Try-on conversion">
          {kept + returned === 0 ? (
            <Empty>No try-on decisions yet.</Empty>
          ) : (
            <div>
              <div className="mb-3 flex items-end gap-2">
                <span className="text-3xl font-bold">
                  {Math.round(keepRate ?? 0)}%
                </span>
                <span className="pb-1 text-xs text-ink/50">kept after trying</span>
              </div>
              <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(kept / (kept + returned)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-ink/50">
                <span>♥ {kept} kept</span>
                <span>↩ {returned} returned</span>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Low stock */}
        <Panel title="Low stock" subtitle="1 or fewer left — reorder soon">
          {lowStock.length === 0 ? (
            <Empty>Everything's well stocked.</Empty>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {lowStock.map((s) => (
                <div
                  key={`${s.productId}-${s.color}-${s.size}`}
                  className="flex items-center justify-between rounded-lg border border-black/5 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 truncate">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-ink/40"> · {s.color} · {s.size}</span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      s.qty === 0
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {s.qty === 0 ? "Out" : "1 left"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Activity feed */}
        <Panel title="Activity">
          {state.events.length === 0 ? (
            <Empty>Activity will appear here as shoppers and staff act.</Empty>
          ) : (
            <div className="space-y-1">
              {state.events
                .slice(-14)
                .reverse()
                .map((e) => (
                  <div key={e.id} className="flex items-center gap-2.5 py-1 text-sm">
                    <Dot kind={e.kind} />
                    <span className="min-w-0 flex-1 truncate">{e.text}</span>
                    <span className="shrink-0 text-[11px] text-ink/40">
                      {fmtAgo(now - e.ts)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "ok",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "ok" | "info" | "warn";
}) {
  const ring =
    tone === "warn"
      ? "border-amber-300 bg-amber-50"
      : tone === "info"
      ? "border-sky-200 bg-sky-50"
      : "border-black/10 bg-white";
  return (
    <div className={`rounded-2xl border p-4 ${ring}`}>
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/50">
        {label}
      </div>
      {sub && <div className="text-[11px] text-ink/40">{sub}</div>}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-black/10 bg-white p-4 ${className ?? ""}`}
    >
      <header className="mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-ink/40">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center text-sm text-ink/40">{children}</p>
  );
}

const DOT_COLOR: Record<StoreEvent["kind"], string> = {
  request: "bg-sky-500",
  assign: "bg-indigo-500",
  stage: "bg-amber-500",
  keep: "bg-emerald-500",
  return: "bg-rose-400",
  order: "bg-ink",
  release: "bg-ink/30",
};

function Dot({ kind }: { kind: StoreEvent["kind"] }) {
  return (
    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_COLOR[kind]}`} />
  );
}

function fmtDur(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}m ${r}s`;
}

function fmtAgo(ms: number): string {
  const s = ms / 1000;
  if (s < 5) return "just now";
  if (s < 60) return `${Math.round(s)}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}

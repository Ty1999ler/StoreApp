import { Link } from "react-router-dom";
import type { RequestItem } from "../../shared/types";
import { useStore } from "../lib/store";
import { ProductImage } from "../components/ProductImage";

export function Room() {
  const { state } = useStore();

  return (
    <div>
      <p className="mb-4 text-sm text-ink/50">
        The screen mounted outside each fitting room. It lights up with a
        shopper’s name once a room is assigned, and shows their garments as
        staff stage them inside.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {state.rooms.map((room) => {
          const session = state.sessions.find((s) => s.id === room.sessionId);
          const items = state.items.filter(
            (i) =>
              i.sessionId === room.sessionId &&
              i.destination === "fitting_room" &&
              ["requested", "picking", "staged", "kept", "returned"].includes(
                i.status
              )
          );
          const staged = items.filter((i) =>
            ["staged", "kept", "returned"].includes(i.status)
          ).length;
          return (
            <Link
              key={room.id}
              to={`/room/${room.id}`}
              className={`block overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg ${
                room.status === "available"
                  ? "border-black/10 bg-white"
                  : "border-ink bg-ink text-white"
              }`}
            >
              <header className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-bold ${
                      room.status === "available"
                        ? "bg-black/[0.06] text-ink/40"
                        : "bg-white/15"
                    }`}
                  >
                    {room.number}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      {room.status === "available"
                        ? "Available"
                        : session?.name ?? "Reserved"}
                    </div>
                    <div
                      className={`text-xs ${
                        room.status === "available"
                          ? "text-ink/40"
                          : "text-white/60"
                      }`}
                    >
                      {room.status === "available"
                        ? "No one assigned"
                        : room.status === "occupied"
                        ? `${staged} item(s) ready inside`
                        : "Preparing your items…"}
                    </div>
                  </div>
                </div>
                {room.status !== "available" && (
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
                    {room.status}
                  </span>
                )}
              </header>

              {items.length > 0 && (
                <div className="flex gap-2 overflow-x-auto px-4 pb-4 no-scrollbar">
                  {items.map((i) => (
                    <RoomItem key={i.id} item={i} dark={room.status !== "available"} />
                  ))}
                </div>
              )}
              <div
                className={`flex items-center justify-end gap-1 px-4 pb-3 text-[11px] font-medium ${
                  room.status === "available" ? "text-ink/40" : "text-white/60"
                }`}
              >
                Open in-room iPad →
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function RoomItem({ item, dark }: { item: RequestItem; dark: boolean }) {
  const ready = ["staged", "kept", "returned"].includes(item.status);
  return (
    <div className="w-20 shrink-0 text-center">
      <div
        className={`relative aspect-[4/5] overflow-hidden rounded-xl ${
          dark ? "bg-white/10" : "bg-black/[0.05]"
        } ${ready ? "" : "opacity-40"}`}
      >
        <ProductImage
          src={item.image}
          garment={item.garment}
          hex={item.color.hex}
          alt={item.productName}
        />
        {!ready && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-[10px] font-medium text-white">
            …
          </span>
        )}
      </div>
      <div
        className={`mt-1 truncate text-[10px] ${
          dark ? "text-white/70" : "text-ink/50"
        }`}
      >
        {item.size}
        {item.status === "kept" && " · ♥"}
        {item.status === "returned" && " · ↩"}
      </div>
    </div>
  );
}

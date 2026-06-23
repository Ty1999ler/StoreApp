import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { Customer } from "./pages/Customer";
import { Staff } from "./pages/Staff";
import { Room } from "./pages/Room";
import { RoomKiosk } from "./pages/RoomKiosk";
import { Tags } from "./pages/Tags";
import { Ops } from "./pages/Ops";

function TopNav() {
  const link =
    "shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors";
  const active = "bg-ink text-white";
  const idle = "text-ink/60 hover:text-ink hover:bg-black/5";
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-[13px] font-bold text-white">
            S
          </div>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            Showroom
          </span>
          <span className="hidden text-xs text-ink/40 lg:inline">
            scan · reserve · try on
          </span>
        </div>
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
          <NavLink
            to="/customer"
            className={({ isActive }) =>
              `${link} ${isActive ? active : idle}`
            }
          >
            Shopper
          </NavLink>
          <NavLink
            to="/staff"
            className={({ isActive }) =>
              `${link} ${isActive ? active : idle}`
            }
          >
            Staff
          </NavLink>
          <NavLink
            to="/room"
            className={({ isActive }) =>
              `${link} ${isActive ? active : idle}`
            }
          >
            Rooms
          </NavLink>
          <NavLink
            to="/tags"
            className={({ isActive }) =>
              `${link} ${isActive ? active : idle}`
            }
          >
            Tags
          </NavLink>
          <NavLink
            to="/ops"
            className={({ isActive }) =>
              `${link} ${isActive ? active : idle}`
            }
          >
            Ops
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-full">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-5">
        <Routes>
          <Route path="/" element={<Navigate to="/customer" replace />} />
          <Route path="/customer" element={<Customer />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/room" element={<Room />} />
          <Route path="/room/:roomId" element={<RoomKiosk />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/ops" element={<Ops />} />
        </Routes>
      </main>
    </div>
  );
}

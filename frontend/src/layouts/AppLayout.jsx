// src/layouts/AppLayout.jsx
import { NavLink, Outlet } from "react-router-dom";

const pill =
  "bg-white rounded-[24px] shadow px-6 py-3 text-[15px] font-semibold border inline-flex items-center gap-2 transition";
const active = "ring-2 ring-zinc-300";
const inactive = "hover:bg-zinc-50";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-zinc-200/60">
      <header className="px-8 py-5">
        {/* tylko prawy przełącznik, bez napisu LAS */}
        <div className="max-w-7xl mx-auto flex items-center justify-end">
          <nav className="flex gap-3">
            <NavLink
              to="/mapa"
              className={({ isActive }) => `${pill} ${isActive ? active : inactive}`}
            >
              🗺️ Mapa
            </NavLink>
            <NavLink
              to="/historia"
              className={({ isActive }) => `${pill} ${isActive ? active : inactive}`}
            >
              ⏱️ Historia
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

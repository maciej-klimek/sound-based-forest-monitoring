// src/components/AlertsPanel.jsx
import { useMemo, useState } from "react";

export default function AlertsPanel({ items = [], onSelect, onShow }) {
  const toneClass = "pastel pastel-rose"; // tylko new

  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const sortedItems = useMemo(() => {
    const arr = [...items];

    arr.sort((a, b) => {
      let va, vb;
      if (sortField === "id") {
        va = a.id;
        vb = b.id;
      } else {
        // domyślnie czas (createdAt)
        va = a.createdAt || "";
        vb = b.createdAt || "";
      }

      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [items, sortField, sortDir]);

  const sortButtons = [
    { key: "createdAt", label: "Czas" },
    { key: "id", label: "ID" },
  ];

  return (
    <div className="card h-[700px] rounded-[24px] overflow-hidden p-0 flex flex-col">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-black">Aktywne Alerty</h2>
          <span className="text-xs text-zinc-500">{items.length}</span>
        </div>
        <p className="text-xs text-zinc-500">
          Pokazuje tylko alerty ze statusem{" "}
          <span className="font-semibold">new</span>
        </p>

        {/* sortowanie Czas / ID */}
        <div className="mt-3 flex flex-wrap gap-2">
          {sortButtons.map((btn) => {
            const active = sortField === btn.key;
            const arrow = sortDir === "asc" ? "▲" : "▼";

            return (
              <button
                key={btn.key}
                type="button"
                onClick={() => {
                  if (active) {
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                  } else {
                    setSortField(btn.key);
                    setSortDir("desc");
                  }
                }}
                className={
                  "flex items-center justify-center gap-1 px-3 py-2 rounded-full border text-xs font-semibold min-w-[90px] transition " +
                  (active
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-zinc-400 hover:bg-zinc-100")
                }
              >
                <span>{btn.label}</span>
                <span className="text-[10px]">{arrow}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pb-5 space-y-3 overflow-y-auto flex-1">
        {sortedItems.length === 0 && (
          <div className="text-sm text-zinc-500">brak aktywnych alertów</div>
        )}

        {sortedItems.map((src) => (
          <div key={src.id} className={toneClass}>
            <button
              type="button"
              onClick={() => onShow?.(src)}
              className="w-full text-left"
            >
              <div className="font-extrabold text-[18px] mb-1">{src.id}</div>

              <div className="text-[13px] space-y-1">
                <div>
                  <span className="text-zinc-500">Status:</span> {src.status}
                </div>
                {src.devices?.length > 0 && (
                  <div>
                    <span className="text-zinc-500">Czujniki:</span>{" "}
                    <span className="font-mono text-xs">
                      {src.devices.join(", ")}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-zinc-500">Lat:</span>{" "}
                  {src.lat.toFixed(4)}{" "}
                  <span className="text-zinc-500">Lon:</span>{" "}
                  {src.lon.toFixed(4)}
                </div>
              </div>
            </button>

            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect([src.lat, src.lon])}
                className="mt-2 text-[12px] underline underline-offset-4"
              >
                Pokaż na mapie
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

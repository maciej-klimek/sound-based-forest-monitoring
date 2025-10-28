import { useMemo, useState } from "react";

export default function AlertsPanel({ items = [], onSelect, onShow }) {
  const [sortKey, setSortKey] = useState("score"); // score | time
  const [dir, setDir] = useState("desc");          // asc | desc

  const toneToClass = (t) =>
    t === "rose" ? "pastel pastel-rose" :
    t === "amber" ? "pastel pastel-amber" :
    t === "orange" ? "pastel pastel-orange" : "pastel pastel-neutral";

  const isSource = (a) => String(a.id || "").startsWith("A");
  const parseDate = (s) => {
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
  };

  const data = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      let va, vb;
      if (sortKey === "score") {
        va = Number(a.score) || 0;
        vb = Number(b.score) || 0;
      } else {
        va = parseDate(a.startedAt) ?? -Infinity;
        vb = parseDate(b.startedAt) ?? -Infinity;
      }
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [items, sortKey, dir]);

  const SortChip = ({ active, label, onClick, direction }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1
        ${active ? "bg-black text-white border-black" : "bg-white hover:bg-zinc-50"}`}
      title={`Sortuj po: ${label}`}
    >
      {label}
      <span className="inline-block leading-none">{direction === "asc" ? "▲" : "▼"}</span>
    </button>
  );

  const toggleSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setDir("desc");
      return;
    }
    setDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  return (
    // identyczne zaokrąglenie i wysokość jak mapa
    <div className="card h-[700px] rounded-[24px] overflow-hidden p-0 flex flex-col">
      {/* Sticky header bez kreski (border-b) */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-black">Aktywne Alerty</h2>
          <span className="text-xs text-zinc-500">{items.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <SortChip
            label="Score"
            active={sortKey === "score"}
            direction={dir}
            onClick={() => toggleSort("score")}
          />
          <SortChip
            label="Czas"
            active={sortKey === "time"}
            direction={dir}
            onClick={() => toggleSort("time")}
          />
        </div>
      </div>

      {/* Lista przewijana w obrębie panelu */}
      <div className="px-5 pb-5 space-y-3 overflow-y-auto flex-1">
        {data.map((a) => (
          <div key={a.id} className={`${toneToClass(a.tone)}`}>
            <button
              type="button"
              onClick={() => onShow?.(a)}
              className="w-full text-left"
              title="Pokaż szczegóły alertu"
            >
              <div className="font-extrabold text-[18px]">{a.id}</div>

              <div className="mt-1 grid grid-cols-2 gap-x-3 text-[13px] leading-tight text-zinc-800">
                <div>
                  <span className="text-zinc-500">Lat:</span> {Number(a.lat).toFixed(4)}
                </div>
                <div>
                  <span className="text-zinc-500">Lon:</span> {Number(a.lon).toFixed(4)}
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-500">Score:</span> {a.score}
                </div>
              </div>

              {isSource(a) && (
                <div className="mt-2 text-[13px] font-semibold">
                  Potencjalne źródło dźwięku!
                </div>
              )}
            </button>

            {onSelect && (
              <button
                onClick={() => onSelect([a.lat, a.lon])}
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

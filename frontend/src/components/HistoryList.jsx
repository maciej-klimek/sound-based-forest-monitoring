import { useMemo, useState } from "react";

export default function HistoryList({ items = [], onShow }) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("score"); // score | start
  const [dir, setDir] = useState("desc");          // asc | desc

  const rowClass = (severity) =>
    severity === "high" ? "pastel pastel-rose" :
    severity === "medium" ? "pastel pastel-amber" : "pastel pastel-neutral";

  const parseDate = (s) => {
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
  };

  const filteredSorted = useMemo(() => {
    const s = q.trim().toLowerCase();

    let data = !s
      ? items
      : items.filter((it) => {
          const inId = String(it.id).toLowerCase().includes(s);
          const inStart = String(it.startedAt || "").toLowerCase().includes(s);
          const inEnd = String(it.endedAt || "").toLowerCase().includes(s);
          return inId || inStart || inEnd;
        });

    data = [...data].sort((a, b) => {
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

    return data;
  }, [items, q, sortKey, dir]);

  const SortChip = ({ active, label, onClick, direction }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1
        ${active ? "bg-black text-white border-black" : "bg-white hover:bg-zinc-50"}`}
      title={`Sortuj po: ${label}`}
    >
      {label}
      <span className="inline-block leading-none">
        {direction === "asc" ? "▲" : "▼"}
      </span>
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
    // identyczne wymiary i róg jak panel Aktywne Alerty
    <div className="card h-[700px] rounded-[24px] overflow-hidden p-0 flex flex-col">
      {/* Sticky header (bez dolnej kreski) */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-3xl font-black">Historia Alertów:</h2>
          <span className="text-xs text-zinc-500">
            {filteredSorted.length}/{items.length}
          </span>
        </div>

        {/* chipsy sortowania + search */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <SortChip
            label="Score"
            active={sortKey === "score"}
            direction={dir}
            onClick={() => toggleSort("score")}
          />
          <SortChip
            label="Czas"
            active={sortKey === "start"}
            direction={dir}
            onClick={() => toggleSort("start")}
          />

          <div className="ml-auto grow">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Szukaj po ID lub dacie (np. 16.10.2025)…"
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Scrollowalna lista */}
      <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
        {filteredSorted.map((it) => (
          <button
            key={`${it.id}-${it.startedAt || ""}-${it.endedAt || ""}`}
            onClick={() => onShow?.(it)}
            className={`w-full text-left ${rowClass(it.severity)}`}
            title="Pokaż szczegóły alertu"
          >
            <div className="grid md:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3">
              <div className="font-extrabold text-[20px] md:mr-2">{it.id}</div>

              <div className="text-sm">
                <span className="text-zinc-500 mr-1">Włączył się:</span>
                {it.startedAt || "—"}
                <span className="text-zinc-500 mx-2">/</span>
                <span className="text-zinc-500 mr-1">Wyłączył się:</span>
                {it.endedAt || "—"}
              </div>

              <div className="text-sm md:text-right">
                <span className="text-zinc-500">Lat:</span>{" "}
                {Number(it.lat).toFixed(4)}
              </div>
              <div className="text-sm md:text-right">
                <span className="text-zinc-500">Lon:</span>{" "}
                {Number(it.lon).toFixed(4)}
              </div>

              <div className="text-sm md:text-right">
                <span className="text-zinc-500">Score:</span> {it.score}
              </div>
            </div>
          </button>
        ))}

        {filteredSorted.length === 0 && (
          <div className="text-sm text-zinc-500">Brak wyników.</div>
        )}
      </div>
    </div>
  );
}

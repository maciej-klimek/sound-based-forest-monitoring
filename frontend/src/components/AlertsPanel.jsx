// src/components/AlertsPanel.jsx
import { useEffect, useMemo, useState } from "react";

export default function AlertsPanel({ items: itemsProp, onSelect, onShow }) {
  const [items, setItems] = useState(itemsProp || []);
  const [loading, setLoading] = useState(!itemsProp);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (itemsProp) {
      setItems(itemsProp);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          "/api/alerts?status=active&_sort=createdAt&_order=desc&_limit=100"
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (alive) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setError(e.message || "Błąd pobierania");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [itemsProp]);

  const toneToClass = (t) =>
    t === "rose" ? "pastel pastel-rose" :
    t === "amber" ? "pastel pastel-amber" :
    t === "orange" ? "pastel pastel-orange" : "pastel pastel-neutral";

  const normalized = useMemo(
    () =>
      items.map((a) => ({
        ...a,
        lat: Number(a.lat),
        lon: Number(a.lon),
        tone:
          a.score >= 0.85 ? "rose" :
          a.score >= 0.7  ? "amber" :
          "orange",
      })),
    [items]
  );

  return (
    <div className="card p-5">
      <h2 className="text-2xl font-black mb-4">Aktywne Alerty</h2>

      {loading && <div className="text-sm text-zinc-500">ładowanie…</div>}
      {error && <div className="text-sm text-rose-600">błąd: {error}</div>}

      <div className="space-y-3">
        {normalized.map((a) => (
          <div key={a.id} className={`${toneToClass(a.tone)} cursor-pointer`}>
            <div
              onClick={() => onShow?.(a)}
              className="flex flex-col"
              title="Pokaż szczegóły"
            >
              <div className="font-extrabold">{a.id}</div>
              <div className="text-[13px] leading-tight text-zinc-700">
                Lat: {a.lat.toFixed(4)} Lon: {a.lon.toFixed(4)}
              </div>
              <div className="text-[13px]">Score: {a.score}</div>
              {a.message && <div className="mt-1 text-[13px] font-semibold">{a.message}</div>}
            </div>

            <button
              onClick={() => onSelect?.([a.lat, a.lon])}
              className="mt-2 text-[12px] underline underline-offset-4"
            >
              Pokaż na mapie
            </button>
          </div>
        ))}
        {!loading && !error && normalized.length === 0 && (
          <div className="text-sm text-zinc-500">brak aktywnych alertów</div>
        )}
      </div>
    </div>
  );
}

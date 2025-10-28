// src/components/AlertsPanel.jsx
export default function AlertsPanel({ items = [], onSelect, onShow }) {
  const toneToClass = (t) =>
    t === "rose" ? "pastel pastel-rose" :
    t === "amber" ? "pastel pastel-amber" :
    t === "orange" ? "pastel pastel-orange" : "pastel pastel-neutral";

  return (
    <div className="card p-5">
      <h2 className="text-2xl font-black mb-4">Aktywne Alerty</h2>
      <div className="space-y-3">
        {items.map((a) => (
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
              {a.isAlert && a.message && (
                <div className="mt-1 text-[13px] font-semibold">{a.message}</div>
              )}
            </div>

            {/* mały link "Pokaż na mapie" */}
            <button
              onClick={() => onSelect?.([a.lat, a.lon])}
              className="mt-2 text-[12px] underline underline-offset-4"
            >
              Pokaż na mapie
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

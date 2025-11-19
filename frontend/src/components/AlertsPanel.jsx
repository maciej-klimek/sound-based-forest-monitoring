// src/components/AlertsPanel.jsx
export default function AlertsPanel({ items = [], onSelect, onShow }) {
  const toneClass = "pastel pastel-rose"; // tylko new

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
      </div>

      <div className="px-5 pb-5 space-y-3 overflow-y-auto flex-1">
        {items.length === 0 && (
          <div className="text-sm text-zinc-500">brak aktywnych alertów</div>
        )}

        {items.map((src) => (
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

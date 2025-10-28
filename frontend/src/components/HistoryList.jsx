// src/components/HistoryList.jsx
export default function HistoryList({ items = [], onShow }) {
  const rowClass = (severity) =>
    severity === "high" ? "pastel pastel-rose" :
    severity === "medium" ? "pastel pastel-amber" : "pastel pastel-neutral";

  return (
    <div className="card p-6">
      <h2 className="text-3xl font-black mb-5">Historia Alertów:</h2>

      <div className="space-y-4">
        {items.map((it) => (
          <button
            key={it.id + (it.startedAt || "")}
            onClick={() => onShow?.(it)}
            className={`w-full text-left ${rowClass(it.severity)}`}
            title="Pokaż szczegóły"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-extrabold">{it.id}</div>
              <div className="text-sm">
                <span className="text-zinc-500 mr-1">Włączył się:</span> {it.startedAt}
                {it.endedAt && (
                  <>
                    <span className="text-zinc-500 mx-1">/ Wyłączył się:</span> {it.endedAt}
                  </>
                )}
              </div>
              <div className="text-sm">
                <span className="text-zinc-500">Lat:</span> {it.lat.toFixed(4)}{" "}
                <span className="text-zinc-500 ml-2">Lon:</span> {it.lon.toFixed(4)}
              </div>
              <div className="text-sm">
                <span className="text-zinc-500">Score:</span> {it.score}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

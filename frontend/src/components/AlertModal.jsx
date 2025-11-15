// src/components/AlertModal.jsx
import { useEffect } from "react";

export default function AlertModal({ open, alert, onClose, onFly }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !alert) return null;

  const { id, lat, lon, score, message, startedAt, endedAt, audioUrl, sourceId } =
    alert;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
          <div className="flex items-start justify-between p-5 border-b">
            <div>
              <div className="text-lg font-extrabold">Szczegóły alertu</div>
              <div className="mt-1 text-sm text-zinc-600">
                <span className="font-semibold">ID:</span> {id}
                {sourceId && (
                  <span className="ml-3">
                    <span className="font-semibold">Czujnik:</span> {sourceId}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-zinc-100 hover:bg-zinc-200 border rounded-full w-9 h-9 grid place-items-center text-lg"
              aria-label="Zamknij"
            >
              ×
            </button>
          </div>

          <div className="p-5 grid md:grid-cols-2 gap-6">
            <div className="space-y-2 text-sm">
              {message && (
                <div>
                  <div className="text-zinc-500">Opis</div>
                  <div className="font-medium">{message}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-3">
                <div>
                  <div className="text-zinc-500">Lat</div>
                  <div className="font-medium">{Number(lat).toFixed(5)}</div>
                </div>
                <div>
                  <div className="text-zinc-500">Lon</div>
                  <div className="font-medium">{Number(lon).toFixed(5)}</div>
                </div>
                <div>
                  <div className="text-zinc-500">Score</div>
                  <div className="font-medium">{score ?? "—"}</div>
                </div>
                <div>
                  <div className="text-zinc-500">Czas</div>
                  <div className="font-medium">
                    {startedAt || "—"}{endedAt ? ` → ${endedAt}` : ""}
                  </div>
                </div>
              </div>
              {onFly && lat && lon && (
                <button
                  onClick={() => onFly([lat, lon])}
                  className="mt-2 px-3 py-1.5 rounded-xl border bg-white hover:bg-zinc-50 text-sm"
                >
                  Pokaż na mapie
                </button>
              )}
            </div>

            <div>
              <div className="text-sm text-zinc-500 mb-1.5">Próbka dźwięku</div>
              {audioUrl ? (
                <>
                  <audio controls preload="none" src={audioUrl} className="w-full" />
                  <div className="mt-2">
                    <a
                      href={audioUrl}
                      download
                      className="text-sm underline underline-offset-4 text-zinc-700 hover:text-black"
                    >
                      Pobierz plik audio
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-sm text-zinc-600">
                  Brak dołączonej próbki audio do tego alertu.
                </div>
              )}
            </div>
          </div>

          <div className="p-5 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border bg-white hover:bg-zinc-50"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

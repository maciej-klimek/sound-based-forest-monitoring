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

  const {
    id,
    lat,
    lon,
    status,
    createdAt,
    devices = [],
    events = [], // sensor readings with audio paths
  } = alert;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
          {/* header */}
          <div className="flex items-start justify-between p-5 border-b">
            <div>
              <div className="text-lg font-extrabold">
                Alert details {id}
              </div>
              <div className="mt-1 text-sm text-zinc-600 space-x-2">
                <span>
                  <span className="font-semibold">Status:</span>{" "}
                  {status || "—"}
                </span>
                {createdAt && (
                  <span>
                    <span className="font-semibold">Time:</span> {createdAt}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-zinc-100 hover:bg-zinc-200 border rounded-full w-9 h-9 grid place-items-center text-lg"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* content */}
          <div className="p-5 grid md:grid-cols-2 gap-6">
            {/* left column: alert meta */}
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-3">
                <div>
                  <div className="text-zinc-500">Lat</div>
                  <div className="font-medium">
                    {lat != null ? Number(lat).toFixed(5) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Lon</div>
                  <div className="font-medium">
                    {lon != null ? Number(lon).toFixed(5) : "—"}
                  </div>
                </div>
              </div>

              {devices.length > 0 && (
                <div>
                  <div className="text-zinc-500 mb-0.5">Devices</div>
                  <div className="font-mono text-xs break-words">
                    {devices.join(", ")}
                  </div>
                </div>
              )}

              {onFly && lat != null && lon != null && (
                <button
                  onClick={() => onFly([lat, lon])}
                  className="mt-2 px-3 py-1.5 rounded-xl border bg-white hover:bg-zinc-50 text-sm"
                >
                  Show on map
                </button>
              )}
            </div>

            {/* right column: sensor readings */}
            <div className="space-y-3">
              <div>
                <div className="text-sm text-zinc-500 mb-1.5">
                  Sensor readings
                </div>
                {events.length === 0 ? (
                  <div className="text-xs text-zinc-500">
                    No detailed sensor data available for this alert.
                  </div>
                ) : (
                  <ul className="space-y-1 max-h-64 overflow-auto text-xs">
                    {events.map((ev, idx) => {
                      const url = ev.audioUrl || ev.s3Key;
                      return (
                        <li
                          key={ev.deviceId + ev.ts + idx}
                          className="flex items-center justify-between gap-2 border rounded-lg px-2 py-1 bg-white"
                        >
                          <div className="space-y-0.5">
                            <div className="font-mono">
                              {ev.deviceId || "unknown"}
                            </div>
                            <div className="text-zinc-500">
                              {ev.ts || ev.createdAt || "no timestamp"}
                            </div>
                            {ev.status && (
                              <div>
                                <span className="text-zinc-500">
                                  status:
                                </span>{" "}
                                {ev.status}
                              </div>
                            )}
                          </div>
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] underline underline-offset-2 text-blue-600"
                            >
                              audio
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

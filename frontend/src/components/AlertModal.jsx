import { useEffect } from "react";
import { shortId } from "../utils/format";

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
    events = [],
  } = alert;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute inset-0 grid place-items-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-zinc-50/50 rounded-t-2xl">
            <div>
              <h2 className="text-xl font-black text-zinc-800 flex items-center gap-2">
                <span>⚠️ THREAT DETECTED</span>
                <span className="bg-zinc-200 text-zinc-600 text-sm px-2 py-0.5 rounded font-mono font-normal"  
                  title={id}>
                  #{shortId(id)}
                </span>
              </h2>
              <div className="mt-1 text-sm text-zinc-500 flex gap-3">
                <span className={`uppercase font-bold text-xs px-2 py-0.5 rounded ${status === 'new' ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>
                  {status}
                </span>
                <span>{createdAt?.replace('T', ' ').replace('Z', '')}</span>
              </div>
            </div>
            <button 
                onClick={onClose} 
                className="bg-white hover:bg-zinc-100 border rounded-full w-10 h-10 grid place-items-center text-xl transition text-zinc-500 hover:text-black"
            >
                ×
            </button>
          </div>

          {/* Content */}
          <div className="p-6 grid md:grid-cols-[1fr_1.5fr] gap-8">
            
            {/* Left: Metadata */}
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Location</div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <div className="text-xs text-zinc-500">Latitude</div>
                        <div className="font-mono font-medium text-lg">{lat?.toFixed(5)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500">Longitude</div>
                        <div className="font-mono font-medium text-lg">{lon?.toFixed(5)}</div>
                    </div>
                </div>
                {onFly && (
                  <button 
                    onClick={() => onFly([lat, lon])} 
                    className="w-full py-2 bg-white border shadow-sm rounded-lg text-sm font-medium hover:bg-zinc-50 text-blue-600 transition flex justify-center items-center gap-2"
                  >
                    <span>📍</span> Locate on Map
                  </button>
                )}
              </div>

              <div>
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Participating Sensors</div>
                <div className="flex flex-wrap gap-2">
                    {devices.map(d => (
                        <span key={d} className="px-2 py-1 bg-zinc-100 border rounded text-xs font-mono text-zinc-600"
                          title={d}>
                            dev-{shortId(d.replace("device-", ""), 5)}
                        </span>
                    ))}
                </div>
              </div>
            </div>

            {/* Right: Audio Evidence List */}
            <div className="space-y-4">
               <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Acoustic Evidence</div>
                  <div className="text-xs text-zinc-500">{events.length} recordings</div>
               </div>

               <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {events.length === 0 ? (
                    <div className="text-sm text-zinc-400 italic py-4 text-center border-2 border-dashed rounded-xl">No audio data available</div>
                  ) : (
                    events.map((ev, idx) => {
                        const path = ev.audioUrl || ev.s3Key; 
                        const dist = ev.distance;
                        
                        return (
                            <div key={idx} className="bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition flex items-center justify-between gap-3">
                                
                                {/* Info o nagraniu */}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-mono text-xs font-bold bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700" 
                                      title={ev.deviceId}>
                                          {shortId(ev.deviceId ? ev.deviceId.replace("device-", "") : ev.deviceId,5)}
                                      </span>
                                      {dist > 0 && (
                                        <span className="text-[10px] font-mono text-zinc-500 border border-zinc-200 px-1 rounded">
                                          {dist}m
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-zinc-400">
                                        {ev.ts?.split('T')[1]?.split('Z')[0] || "Unknown time"}
                                    </div>
                                </div>

                                {path ? (
                                    <a 
                                        href={path} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-black text-white text-xs font-bold rounded-lg transition"
                                    >
                                        <span>📂</span>
                                        <span>Open Source</span>
                                    </a>
                                ) : (
                                    <span className="text-xs text-rose-400 italic px-2">
                                        Path missing
                                    </span>
                                )}
                            </div>
                        )
                    })
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
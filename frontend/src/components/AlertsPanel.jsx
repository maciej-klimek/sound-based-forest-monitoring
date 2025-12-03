import { useMemo, useState } from "react";
import { shortId } from "../utils/format";

export default function AlertsPanel({ items = [], onSelect, onShow }) {
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const sortedItems = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      let va = a[sortField] || "";
      let vb = b[sortField] || "";
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [items, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
        setSortField(field);
        setSortDir('desc');
    }
  }

  const SortLabel = ({ field, label }) => {
    const isActive = sortField === field;
    return (
      <button 
        onClick={() => toggleSort(field)}
        className={`text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1
          ${isActive ? "text-zinc-800" : "text-zinc-400 hover:text-zinc-600"}
        `}
      >
        {label}
        {isActive && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    );
  };

  return (
    <div className="card h-[700px] rounded-[24px] overflow-hidden p-0 flex flex-col shadow-xl bg-white">
      
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 pt-6 pb-2 border-b border-zinc-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-zinc-800">Active Alerts</h2>
          <span className="text-xs font-bold text-white bg-rose-500 px-2 py-0.5 rounded-full shadow-sm shadow-rose-200">
            {items.length}
          </span>
        </div>
        
        <div className="flex items-center gap-4 pb-2">
            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider select-none cursor-default">
                Sort by:
            </span>
            <SortLabel field="createdAt" label="Time" />
            <div className="w-px h-3 bg-zinc-200"></div>
            <SortLabel field="id" label="ID" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar bg-zinc-50/30">
        {sortedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-400 italic">
            <span>Everything is quiet.</span>
            <span className="text-xs mt-1">No active threats detected.</span>
          </div>
        )}

        {sortedItems.map((src) => (
          <div 
            key={src.id} 
            onClick={() => onShow?.(src)} 
            className="bg-white border border-rose-100 p-4 rounded-xl shadow-sm hover:shadow-md transition group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">   
              <div 
                className="font-extrabold text-xl text-zinc-800 group-hover:text-rose-600 transition font-mono"
                title={src.id}
              >
                {shortId(src.id)}
              </div>
                <div className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-1 rounded">
                    {src.createdAt?.split('T')[1]?.split('Z')[0] || "--:--:--"}
                </div>
            </div>

            <div className="flex items-end justify-between">
                
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Detecting Sensors</span>
                    <div className="flex flex-wrap gap-1">
                        {src.devices.map(d => (
                            <span key={d} className="text-[10px] font-mono bg-white border border-rose-200 px-1.5 py-0.5 rounded text-rose-700">
                                {shortId(d.replace('device-', ''), 5)}
                            </span>
                        ))}
                    </div>
                </div>

                <button
                  onClick={(e) => {
                      e.stopPropagation(); 
                      onSelect?.([src.lat, src.lon]);
                  }}
                  className="whitespace-nowrap text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-transparent hover:border-rose-600 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                >
                  <span>📍</span> Show on map
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
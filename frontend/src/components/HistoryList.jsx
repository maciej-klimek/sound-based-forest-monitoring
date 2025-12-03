import { useMemo, useState } from "react";
import { shortId } from "../utils/format";


export default function HistoryList({ items = [], onShow }) {
  const [q, setQ] = useState("");       
  const [qLat, setQLat] = useState(""); 
  const [qLon, setQLon] = useState(""); 
  
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const matchesCoord = (val, filter) => {
    if (!filter.trim()) return true;
    if (val == null) return false;
    return val.toFixed(5).includes(filter.trim());
  };

  const processedItems = useMemo(() => {
    let data = [...items];

    data = data.filter(item => {
      const lowerQ = q.toLowerCase();
      const matchMain = !lowerQ || 
        item.id.toLowerCase().includes(lowerQ) ||
        item.status.toLowerCase().includes(lowerQ) ||
        item.devices.some(d => d.toLowerCase().includes(lowerQ));

      const matchLat = matchesCoord(item.lat, qLat);
      const matchLon = matchesCoord(item.lon, qLon);

      return matchMain && matchLat && matchLon;
    });

    data.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (!valA) valA = "";
      if (!valB) valB = "";

      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [items, q, qLat, qLon, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const Arrow = ({ field }) => {
    if (sortField !== field) return <span className="text-zinc-300 ml-1">⇅</span>;
    return <span className="text-black ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="card p-6 h-[700px] flex flex-col shadow-xl bg-white">
      <div className="flex justify-between items-end mb-4">
          <h2 className="text-3xl font-black text-zinc-800">Alert History</h2>
          <span className="text-xs text-zinc-400 font-mono">Total: {processedItems.length}</span>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ID / device"
          className="border rounded-lg px-4 py-2 text-sm w-full shadow-sm focus:ring-2 ring-zinc-200 outline-none transition"
        />
        
        <input
          value={qLat}
          onChange={(e) => setQLat(e.target.value)}
          placeholder="Lat"
          className="border rounded-lg px-2 py-2 text-sm w-[100px] text-center shadow-sm focus:ring-2 ring-zinc-200 outline-none transition"
        />
        <input
          value={qLon}
          onChange={(e) => setQLon(e.target.value)}
          placeholder="Lon"
          className="border rounded-lg px-2 py-2 text-sm w-[100px] text-center shadow-sm focus:ring-2 ring-zinc-200 outline-none transition"
        />
      </div>

      <div className="grid grid-cols-[80px_140px_1fr_1fr_100px] gap-4 pb-2 border-b text-[10px] font-bold text-zinc-400 uppercase tracking-wider select-none">
        <div onClick={() => handleSort('id')} className="cursor-pointer hover:text-zinc-600 transition">
            ID <Arrow field="id"/>
        </div>
        <div onClick={() => handleSort('createdAt')} className="cursor-pointer hover:text-zinc-600 transition">
            Time <Arrow field="createdAt"/>
        </div>
        <div>Devices</div>
        <div>Location</div>
        <div onClick={() => handleSort('status')} className="cursor-pointer hover:text-zinc-600 text-right transition">
            Status <Arrow field="status"/>
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1 pt-2">
        {processedItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onShow?.(item)}
            className={`w-full text-left p-4 rounded-xl border transition group grid grid-cols-[80px_140px_1fr_1fr_100px] items-center gap-4
              ${item.status === 'new' ? 'bg-rose-50/50 hover:bg-rose-100/50 border-rose-100' : 'bg-white hover:bg-zinc-50 border-zinc-200'}
            `}
          >
            <div
              className="font-mono font-bold text-lg text-zinc-700 group-hover:text-black transition"
              title={item.id}
            >
              {shortId(item.id)}
            </div>

            <div className="text-xs text-zinc-600 font-medium">
               {item.createdAt?.replace('T', ' ').replace('Z', '') || "—"}
            </div>

            <div className="flex flex-wrap gap-1">

              {item.devices.length > 0 ? item.devices.map(dev => (
                <span
                  key={dev}
                  className="text-[10px] font-mono bg-white border border-zinc-300 px-1.5 py-0.5 rounded text-zinc-600"
                >
                  {shortId(dev.replace("device-", ""), 5)}
                </span>
               )) : <span className="text-zinc-300 italic text-xs">No devices</span>}
            </div>

            <div className="text-xs font-mono text-zinc-600">
                {item.lat?.toFixed(4)}, {item.lon?.toFixed(4)}
            </div>

            <div className="text-right">
              <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase shadow-sm ${item.status === 'new' ? 'bg-rose-500 text-white' : 'bg-zinc-200 text-zinc-500'}`}>
                  {item.status}
              </span>
            </div>
          </button>
        ))}

        {processedItems.length === 0 && (
            <div className="text-center py-10 text-zinc-400 italic">
                No alerts found matching filters.
            </div>
        )}
      </div>
    </div>
  );
}
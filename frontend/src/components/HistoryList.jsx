// src/components/HistoryList.jsx
import { useMemo, useState } from "react";

export default function HistoryList({ alerts = [], sourcesIndex = {}, onShow }) {
  const [qMain, setQMain] = useState("");   // ID / status / device
  const [qLat, setQLat] = useState("");     // filtr po lat
  const [qLon, setQLon] = useState("");     // filtr po lon

  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  // dopasowanie lat z prostymi operatorami
  const matchesLat = (alertLat) => {
    const v = qLat.trim();
    if (!v) return true;
    if (alertLat == null) return false;

    const m = v.match(/^([<>]=?)?\s*(-?\d+(?:\.\d+)?)/);
    if (m) {
      const op = m[1];
      const num = parseFloat(m[2]);
      if (isNaN(num)) return true;
      if (!op) return alertLat.toFixed(4).includes(m[2]);
      if (op === ">") return alertLat > num;
      if (op === "<") return alertLat < num;
      if (op === ">=") return alertLat >= num;
      if (op === "<=") return alertLat <= num;
      return true;
    }

    return alertLat.toFixed(4).includes(v);
  };

  // dopasowanie lon z prostymi operatorami
  const matchesLon = (alertLon) => {
    const v = qLon.trim();
    if (!v) return true;
    if (alertLon == null) return false;

    const m = v.match(/^([<>]=?)?\s*(-?\d+(?:\.\d+)?)/);
    if (m) {
      const op = m[1];
      const num = parseFloat(m[2]);
      if (isNaN(num)) return true;
      if (!op) return alertLon.toFixed(4).includes(m[2]);
      if (op === ">") return alertLon > num;
      if (op === "<") return alertLon < num;
      if (op === ">=") return alertLon >= num;
      if (op === "<=") return alertLon <= num;
      return true;
    }

    return alertLon.toFixed(4).includes(v);
  };

  const enriched = useMemo(() => {
    const withCoords = alerts.map((a) => {
      const src = sourcesIndex[a.id];
      return {
        ...a,
        lat: src?.lat ?? null,
        lon: src?.lon ?? null,
        devices: a.devices,
        _sourceRawAlerts: src?.rawAlerts || [],
      };
    });

    const filtered = withCoords.filter((a) => {
      const main = qMain.trim().toLowerCase();

      const okMain =
        !main ||
        a.id.toLowerCase().includes(main) ||
        (a.status || "").toLowerCase().includes(main) ||
        a.devices.some((d) => d.toLowerCase().includes(main));

      const okLat = matchesLat(a.lat);
      const okLon = matchesLon(a.lon);

      return okMain && okLat && okLon;
    });

    const sorted = [...filtered].sort((a, b) => {
      let va, vb;
      if (sortField === "id") {
        va = a.id;
        vb = b.id;
      } else if (sortField === "status") {
        va = a.status || "";
        vb = b.status || "";
      } else {
        va = a.createdAt || "";
        vb = b.createdAt || "";
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [alerts, sourcesIndex, qMain, qLat, qLon, sortField, sortDir]);

  const total = enriched.length;
  const current = enriched;

  const rowClass = (status) =>
    status === "new" ? "pastel pastel-rose" : "pastel pastel-neutral";

  return (
    <div className="card p-6">
      <h2 className="text-3xl font-black mb-4">Historia Alertów</h2>

      {/* FILTRY + SORT (jedna linia na desktopie) */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* search: ID / status / device */}
        <input
          value={qMain}
          onChange={(e) => setQMain(e.target.value)}
          placeholder="ID / status / device…"
          className="border rounded-full px-4 py-2 text-sm w-[240px]"
        />

        {/* Lat / Lon */}
        <div className="flex items-center gap-2">
          <input
            value={qLat}
            onChange={(e) => setQLat(e.target.value)}
            placeholder="Lat"
            className="border rounded-full px-3 py-2 text-sm w-[80px]"
          />
          <input
            value={qLon}
            onChange={(e) => setQLon(e.target.value)}
            placeholder="Lon"
            className="border rounded-full px-3 py-2 text-sm w-[80px]"
          />
        </div>

        {/* sort pigułki */}
        <div className="flex items-center gap-2">
          {[
            { key: "createdAt", label: "Czas" },
            { key: "id", label: "ID" },
            { key: "status", label: "Status" },
          ].map((btn) => {
            const active = sortField === btn.key;
            const arrow = sortDir === "asc" ? "▲" : "▼";

            return (
              <button
                key={btn.key}
                type="button"
                onClick={() => {
                  if (active) {
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                  } else {
                    setSortField(btn.key);
                    setSortDir("desc");
                  }
                }}
                className={
                  "flex items-center justify-center gap-1 px-3 py-2 rounded-full border text-xs font-semibold min-w-[90px] transition " +
                  (active
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-zinc-400 hover:bg-zinc-100")
                }
              >
                <span>{btn.label}</span>
                <span className="text-[10px]">{arrow}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-zinc-500 ml-auto">
          {total} alertów
        </div>
      </div>

      {/* LISTA – scrollowana */}
      <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
        {current.map((it) => (
          <button
            key={it.id + it.createdAt}
            type="button"
            onClick={() =>
              onShow?.({
                id: it.id,
                status: it.status,
                createdAt: it.createdAt,
                lat: it.lat,
                lon: it.lon,
                devices: it.devices,
                events: it._sourceRawAlerts,
              })
            }
            className={`w-full text-left ${rowClass(it.status)}`}
          >
            <div className="grid md:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3">
              <div className="font-extrabold text-[20px] md:mr-2">
                {it.id}
              </div>

              <div className="text-sm">
                <span className="text-zinc-500 mr-1">Czas:</span>{" "}
                {it.createdAt || "—"}
              </div>

              <div className="text-sm md:text-right">
                <span className="text-zinc-500">Status:</span> {it.status}
              </div>

              <div className="text-sm md:text-right">
                <span className="text-zinc-500">Lat/Lon:</span>{" "}
                {it.lat != null && it.lon != null
                  ? `${it.lat.toFixed(4)}, ${it.lon.toFixed(4)}`
                  : "—"}
              </div>

              <div className="text-sm md:text-right">
                <span className="text-zinc-500">Czujniki:</span>{" "}
                <span className="font-mono text-xs">
                  {it.devices?.join(", ") || "—"}
                </span>
              </div>
            </div>
          </button>
        ))}

        {current.length === 0 && (
          <div className="text-sm text-zinc-500">brak wyników</div>
        )}
      </div>
    </div>
  );
}

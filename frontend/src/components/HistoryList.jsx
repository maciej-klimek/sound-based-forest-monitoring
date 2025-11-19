// src/components/HistoryList.jsx
import { useMemo, useState } from "react";

export default function HistoryList({ alerts = [], sourcesIndex = {}, onShow }) {
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const enriched = useMemo(() => {
    const withCoords = alerts.map((a) => {
      const src = sourcesIndex[a.id];
      return {
        ...a,
        lat: src?.lat ?? null,
        lon: src?.lon ?? null,
        devices: a.devices,
        // przyda się do modala
        _sourceRawAlerts: src?.rawAlerts || [],
      };
    });

    const filtered = withCoords.filter((a) => {
      const term = q.trim().toLowerCase();
      if (!term) return true;
      return (
        a.id.toLowerCase().includes(term) ||
        (a.status || "").toLowerCase().includes(term)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      let va, vb;
      if (sortField === "id") {
        va = a.id;
        vb = b.id;
      } else if (sortField === "status") {
        va = a.status;
        vb = b.status;
      } else {
        va = a.createdAt || "";
        vb = b.createdAt || "";
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [alerts, sourcesIndex, q, sortField, sortDir]);

  const total = enriched.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const current = enriched.slice(start, start + limit);

  const rowClass = (status) =>
    status === "new"
      ? "pastel pastel-rose"
      : "pastel pastel-neutral";

  return (
    <div className="card p-6">
      <h2 className="text-3xl font-black mb-4">Historia Alertów</h2>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Szukaj po ID / statusie…"
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={sortField}
          onChange={(e) => {
            setPage(1);
            setSortField(e.target.value);
          }}
          className="border rounded-lg px-2 py-2 text-sm"
        >
          <option value="createdAt">czas</option>
          <option value="id">ID</option>
          <option value="status">status</option>
        </select>
        <select
          value={sortDir}
          onChange={(e) => {
            setPage(1);
            setSortDir(e.target.value);
          }}
          className="border rounded-lg px-2 py-2 text-sm"
        >
          <option value="desc">malejąco</option>
          <option value="asc">rosnąco</option>
        </select>
        <select
          value={limit}
          onChange={(e) => {
            setPage(1);
            setLimit(Number(e.target.value));
          }}
          className="border rounded-lg px-2 py-2 text-sm"
        >
          <option value={10}>10 / stronę</option>
          <option value={20}>20 / stronę</option>
          <option value={50}>50 / stronę</option>
        </select>
        <div className="text-xs text-zinc-500 ml-auto">
          {current.length} / {total}
        </div>
      </div>

      <div className="space-y-4">
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

      <div className="mt-4 flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1.5 border rounded-lg disabled:opacity-50"
        >
          ← poprzednia
        </button>
        <div className="text-sm">
          strona {page} / {pages}
        </div>
        <button
          disabled={page >= pages}
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          className="px-3 py-1.5 border rounded-lg disabled:opacity-50"
        >
          następna →
        </button>
      </div>
    </div>
  );
}

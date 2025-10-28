import { useEffect, useMemo, useState } from "react";

export default function HistoryList({ items: itemsProp, onShow }) {
  const [items, setItems] = useState(itemsProp || []);
  const [q, setQ] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(!itemsProp);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (itemsProp) {
      setItems(itemsProp);
      setTotal(itemsProp.length);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const qs = new URLSearchParams({
          status: "resolved",
          q,
          _sort: sortField,
          _order: sortDir,
          _page: String(page),
          _limit: String(limit),
        });
        const res = await fetch(`/api/alerts?${qs.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const totalHdr = res.headers.get("X-Total-Count");
        if (alive) {
          setItems(Array.isArray(data) ? data : []);
          setTotal(totalHdr ? Number(totalHdr) : data.length || 0);
        }
      } catch (e) {
        if (alive) setError(e.message || "Błąd pobierania");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [itemsProp, q, sortField, sortDir, page, limit]);

  const rowClass = (severity) =>
    severity === "high" ? "pastel pastel-rose"
    : severity === "medium" ? "pastel pastel-amber"
    : "pastel pastel-neutral";

  const normalized = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        lat: Number(it.lat),
        lon: Number(it.lon),
        severity:
          it.score >= 0.85 ? "high" :
          it.score >= 0.7  ? "medium" :
          "low",
      })),
    [items]
  );

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="card p-6">
      <h2 className="text-3xl font-black mb-4">Historia Alertów</h2>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value); }}
          placeholder="Szukaj po ID / opisie…"
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={sortField}
          onChange={(e) => { setPage(1); setSortField(e.target.value); }}
          className="border rounded-lg px-2 py-2 text-sm"
        >
          <option value="createdAt">czas</option>
          <option value="score">score</option>
          <option value="id">ID</option>
        </select>
        <select
          value={sortDir}
          onChange={(e) => { setPage(1); setSortDir(e.target.value); }}
          className="border rounded-lg px-2 py-2 text-sm"
        >
          <option value="desc">malejąco</option>
          <option value="asc">rosnąco</option>
        </select>
        <select
          value={limit}
          onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}
          className="border rounded-lg px-2 py-2 text-sm"
        >
          <option value={10}>10 / stronę</option>
          <option value={20}>20 / stronę</option>
          <option value={50}>50 / stronę</option>
        </select>
        <div className="text-xs text-zinc-500 ml-auto">
          {normalized.length} / {total}
        </div>
      </div>

      {loading && <div className="text-sm text-zinc-500">ładowanie…</div>}
      {error && <div className="text-sm text-rose-600">błąd: {error}</div>}

      <div className="space-y-4">
        {normalized.map((it) => (
          <button
            key={`${it.id}-${it.startedAt || ""}-${it.endedAt || ""}`}
            onClick={() => onShow?.(it)}
            className={`w-full text-left ${rowClass(it.severity)}`}
            title="Pokaż szczegóły alertu"
          >
            <div className="grid md:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3">
              <div className="font-extrabold text-[20px] md:mr-2">{it.id}</div>

              <div className="text-sm">
                <span className="text-zinc-500 mr-1">Włączył się:</span> {it.startedAt || it.createdAt || "—"}
                {it.endedAt && (
                  <>
                    <span className="text-zinc-500 mx-1">/ Wyłączył się:</span> {it.endedAt}
                  </>
                )}
              </div>

              <div className="text-sm md:text-right">
                <span className="text-zinc-500">Lat:</span> {Number(it.lat).toFixed(4)}
              </div>
              <div className="text-sm md:text-right">
                <span className="text-zinc-500">Lon:</span> {Number(it.lon).toFixed(4)}
              </div>

              <div className="text-sm md:text-right">
                <span className="text-zinc-500">Score:</span> {it.score}
              </div>
            </div>
          </button>
        ))}

        {!loading && !error && normalized.length === 0 && (
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

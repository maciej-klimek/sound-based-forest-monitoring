import { useEffect, useMemo, useRef, useState } from "react";

const parseWhen = (it) => {
  const s = it?.startedAt || it?.createdAt || "";
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const t = Date.parse(iso);
  return Number.isNaN(t) ? -Infinity : t;
};
const byTime = (a, b) => parseWhen(a) - parseWhen(b);
const byScore = (a, b) => (Number(a?.score) || 0) - (Number(b?.score) || 0);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matchesQuery = (it, q) => {
  if (!q) return true;
  const re = new RegExp(escapeRe(q.trim()), "i");
  return re.test(String(it.id || "")) ||
         re.test(String(it.message || "")) ||
         re.test(String(it.sourceId || ""));
};

export default function HistoryList({ items: itemsProp, onShow }) {
  const [items, setItems] = useState(itemsProp || []);
  const [total, setTotal] = useState(itemsProp ? itemsProp.length : 0);
  const [loading, setLoading] = useState(!itemsProp);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("time"); 
  const [dir, setDir] = useState("desc");         

  const [page, setPage] = useState(1);
  const limit = 20;
  const scrollerRef = useRef(null);

  useEffect(() => {
    setItems([]);
    setPage(1);
  }, [q, sortKey, dir]);

  useEffect(() => {
    if (itemsProp) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const apiSortField = sortKey === "score" ? "score" : "createdAt";
        const apiOrder = dir;

        const qs =
          `status=resolved` +
          `&q=${encodeURIComponent(q)}` +             
          `&_sort=${encodeURIComponent(apiSortField)}` +
          `&_order=${encodeURIComponent(apiOrder)}` +
          `&_page=${page}` +
          `&_limit=${limit}`;

        const res = await fetch(`/api/alerts?${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const totalHdr = res.headers.get("X-Total-Count");
        const serverTotal = totalHdr ? Number(totalHdr) : (Array.isArray(data) ? data.length : 0);

        if (!alive) return;

        const combined = page === 1
          ? (Array.isArray(data) ? data : [])
          : [...items, ...(Array.isArray(data) ? data : [])];

        const filtered = q ? combined.filter((it) => matchesQuery(it, q)) : combined;

        filtered.sort(sortKey === "time" ? byTime : byScore);
        if (dir === "desc") filtered.reverse();

        setItems(filtered);
        setTotal(serverTotal);
      } catch (e) {
        if (alive) setError(e.message || "Błąd pobierania");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [itemsProp, q, sortKey, dir, page]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
      const canLoadMore = items.length < total; 
      if (nearBottom && !loading && canLoadMore) setPage((p) => p + 1);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length, total, loading]);

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

  const rowClass = (sev) =>
    sev === "high" ? "pastel pastel-rose" :
    sev === "medium" ? "pastel pastel-amber" :
    "pastel pastel-neutral";

  const SortChip = ({ active, label, onClick, direction }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1
        ${active ? "bg-black text-white border-black" : "bg-white hover:bg-zinc-50"}`}
      title={`Sortuj po: ${label}`}
    >
      {label}
      <span className="inline-block leading-none">{direction === "asc" ? "▲" : "▼"}</span>
    </button>
  );
  const toggleSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setDir("desc");
    } else {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  const canLoadMore = items.length < total;

  return (
    <div className="card p-0 rounded-[24px] overflow-hidden flex flex-col">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-6 pt-6 pb-4">

        <h2 className="text-3xl font-black mb-3">Historia Alertów</h2>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj po ID / opisie…"
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <SortChip
            label="Czas"
            active={sortKey === "time"}
            direction={dir}
            onClick={() => toggleSort("time")}
          />
          <SortChip
            label="Score"
            active={sortKey === "score"}
            direction={dir}
            onClick={() => toggleSort("score")}
          />
          <div className="text-xs text-zinc-500 ml-auto">
            {normalized.length} / {total}
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="px-6 py-5 space-y-4 overflow-y-auto"
        style={{ maxHeight: "70vh" }}
      >
        {error && <div className="text-sm text-rose-600">błąd: {error}</div>}

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
                <span className="text-zinc-500 mr-1">Włączył się:</span>
                {it.startedAt || it.createdAt || "—"}
                {it.endedAt && (
                  <>
                    <span className="text-zinc-500 mx-1">/ Wyłączył się:</span>
                    {it.endedAt}
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

        {loading && <div className="text-sm text-zinc-500 py-2">ładowanie…</div>}

      </div>
    </div>
  );
}

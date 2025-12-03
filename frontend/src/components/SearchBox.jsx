import { useEffect, useMemo, useRef, useState } from "react";
import { shortId } from "../utils/format";

const debounce = (fn, ms = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

export default function SearchBox({ sensors = [], sources = [], onSelect }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const abortRef = useRef(null);

  const sensorMatches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return sensors
      .filter((x) => x.id.toLowerCase().includes(s))
      .slice(0, 5)
      .map((x) => ({
        type: "sensor",
        id: x.id,
        label: shortId(x.id),
        lat: x.lat,
        lon: x.lon,
      }));
  }, [q, sensors]);

  const alertMatches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return sources
      .filter((x) => x.id && x.id.toLowerCase().includes(s))
      .slice(0, 5)
      .map((x) => ({
        type: "alert",
        id: x.id,
        label: `Alert ${shortId(x.id)}`,
        lat: x.lat,
        lon: x.lon,
      }));
  }, [q, sources]);

  const doGeocode = async (query) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(
      query
    )}`;
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((p) => ({
        type: "place",
        id: p.place_id,
        label: p.display_name,
        lat: parseFloat(p.lat),
        lon: parseFloat(p.lon),
      }));
    } catch {
      return [];
    }
  };

  const debouncedSearch = useMemo(
    () =>
      debounce(async (text) => {
        const t = text.trim();
        if (!t) {
          setResults([]);
          return;
        }

        const m = t.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
        const coordResult = m
          ? [
              {
                type: "coords",
                id: `coords-${m[1]}-${m[2]}`,
                label: `${m[1]}, ${m[2]}`,
                lat: parseFloat(m[1]),
                lon: parseFloat(m[2]),
              },
            ]
          : [];

        const places = await doGeocode(t);

        setResults([...alertMatches, ...sensorMatches, ...coordResult, ...places]);
        setOpen(true);
      }, 350),
    [sensorMatches, alertMatches]
  );

  useEffect(() => {
    debouncedSearch(q);
  }, [q, debouncedSearch]);

  const pick = (item) => {
    setOpen(false);
    setQ(item.label);
    onSelect?.([item.lat, item.lon], item);
  };

  return (
    <div className="absolute z-[500] left-6 top-6">
      <div className="bg-white border rounded-full px-3 py-2 shadow flex items-center gap-2 w-[320px]">
        <span>🔎</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q && setOpen(true)}
          placeholder="Search area / sensor / alert A001 / 50.06"
          className="outline-none w-full text-sm"
        />
        {q && (
          <button
            className="text-zinc-500 text-sm"
            onClick={() => {
              setQ("");
              setResults([]);
              setOpen(false);
            }}
          >
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="mt-2 bg-white border rounded-2xl shadow w-[360px] max-h-[280px] overflow-auto">
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => pick(r)}
              className="w-full text-left px-4 py-2 hover:bg-zinc-100 flex gap-2"
            >
              <span>
                {r.type === "sensor"
                  ? "📟"
                  : r.type === "coords"
                  ? "🧭"
                  : r.type === "alert"
                  ? "⚠️"
                  : "📍"}
              </span>
              <span className="text-sm">
                <span className="font-medium">{r.label}</span>
                {(r.type === "place" || r.type === "coords") && (
                  <span className="block text-zinc-500 text-xs">
                    {r.lat.toFixed(4)}, {r.lon.toFixed(4)}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

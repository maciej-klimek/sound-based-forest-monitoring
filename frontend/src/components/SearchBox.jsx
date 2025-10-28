// src/components/SearchBox.jsx
import { useEffect, useMemo, useRef, useState } from "react";

const debounce = (fn, ms = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

export default function SearchBox({ sensors = [], onSelect }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const abortRef = useRef(null);

  // lokalne dopasowania po nazwie sensora (np. "CLW001")
  const sensorMatches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return sensors
      .filter((x) => x.id.toLowerCase().includes(s))
      .slice(0, 5)
      .map((x) => ({
        type: "sensor",
        id: x.id,
        label: x.id,
        lat: x.lat,
        lon: x.lon,
      }));
  }, [q, sensors]);

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

        // 1) parse współrzędnych: "lat, lon"
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

        // 2) geokodowanie (miasta/adresy)
        const places = await doGeocode(t);

        // wynik: najpierw sensory, potem coords, potem miejsca
        setResults([...sensorMatches, ...coordResult, ...places]);
        setOpen(true);
      }, 350),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sensorMatches]
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
          placeholder="Wyszukaj obszar, CLW…, lub 50.06, 19.94"
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
              <span>{r.type === "sensor" ? "📟" : r.type === "coords" ? "🧭" : "📍"}</span>
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

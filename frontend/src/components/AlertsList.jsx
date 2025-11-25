import { useEffect, useState } from "react";

export default function AlertsList({ sensors: sensorsProp, onSelect }) {
  const [sensors, setSensors] = useState(sensorsProp || []);
  const [loading, setLoading] = useState(!sensorsProp);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sensorsProp) {
      setSensors(sensorsProp);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/sensors");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (alive) setSensors(data || []);
      } catch (e) {
        if (alive) setError(e.message || "Error while fetching sensors");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [sensorsProp]);

  if (loading)
    return <div className="text-sm text-zinc-500">loading…</div>;

  if (error)
    return <div className="text-sm text-rose-600">error: {error}</div>;

  if (!sensors?.length)
    return <div className="text-sm text-zinc-500">no data…</div>;

  return (
    <div className="space-y-3">
      {sensors.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect?.([s.lat, s.lon])}
          className="w-full text-left bg-white border rounded-xl p-3 hover:shadow transition"
        >
          <div className="font-semibold">{s.id}</div>
          <div className="text-sm text-zinc-600">
            Lat: {Number(s.lat).toFixed(4)} Lon: {Number(s.lon).toFixed(4)}
            {typeof s.score === "number" ? <> · Score: {s.score}</> : null}
          </div>
        </button>
      ))}
    </div>
  );
}

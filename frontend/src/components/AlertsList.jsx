export default function AlertsList({ sensors, onSelect }) {
  if (!sensors?.length) {
    return <div className="text-sm text-zinc-500">brak danych…</div>;
  }
  return (
    <div className="space-y-3">
      {sensors.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect([s.lat, s.lon])}
          className="w-full text-left bg-white border rounded-xl p-3 hover:shadow transition"
        >
          <div className="font-semibold">{s.id}</div>
          <div className="text-sm text-zinc-600">
            Lat: {s.lat.toFixed(4)} Lon: {s.lon.toFixed(4)} · Score: {s.score}
          </div>
        </button>
      ))}
    </div>
  );
}

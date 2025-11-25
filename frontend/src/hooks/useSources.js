import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "";

export function useSources(intervalMs = 10000) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    let timer;

    const fetchOnce = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API}/sources`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (!alive) return;

        const rawSources = Array.isArray(json) 
          ? json 
          : (Array.isArray(json?.sources) ? json.sources : []);

        const normalized = rawSources.map((src, idx) => {
          const alerts = Array.isArray(src.alerts) ? src.alerts : [];
          
          const hasNew = alerts.some((a) => a.status === "new");
          const status = hasNew ? "new" : "resolved";

          const devices = [
            ...new Set(alerts.map((a) => a.deviceId).filter(Boolean)),
          ];

          const createdAt = alerts
            .map((a) => a.createdAt || a.ts)
            .filter(Boolean)
            .sort()[0] || null;

          const cleanAlerts = alerts.map(a => ({
            ...a,
            lat: Number(a.lat),
            lon: Number(a.lon),
            distance: Number(a.distance) || 0
          }));


          let displayId = src.id || `S${String(idx + 1).padStart(3, '0')}`;
          displayId = displayId.replace('S', 'A'); 

          return {
            id: displayId, 
            originalId: src.id,
            lat: Number(src.lat),
            lon: Number(src.lon),
            status,
            devices,      
            createdAt,
            rawAlerts: cleanAlerts,
          };
        });
        
        setSources(normalized);
      } catch (e) {
        console.error(e);
        if (alive) setError(e.message || "Błąd danych");
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchOnce();
    if (intervalMs > 0) timer = setInterval(fetchOnce, intervalMs);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [intervalMs]);

  return { sources, loading, error };
}
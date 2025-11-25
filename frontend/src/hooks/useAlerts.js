import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "";

export function useAlerts(intervalMs = 10000) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    let timer;

    const fetchOnce = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API}/alerts`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        console.log("Raw JSON from /alerts:", json);

        if (!alive) return;


        const normalized = (json || []).map((a, idx) => ({
          id: a.id || `A${String(idx + 1).padStart(3, "0")}`,
          status: a.status,
          createdAt: a.createdAt,
          deviceId: a.deviceId, 
          lat: a.lat ? Number(a.lat) : null,
          lon: a.lon ? Number(a.lon) : null,
          distance: a.distance ? Number(a.distance) : null,
          devices: a.devices || (a.deviceId ? [a.deviceId] : []),
        }));

        console.log("Normalized alerts:", normalized);
        setAlerts(normalized);
      } catch (e) {
        console.error("Error fetching alerts:", e);
        if (alive) setError(e.message || "Błąd pobierania alertów");
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

  return { alerts, loading, error };
}
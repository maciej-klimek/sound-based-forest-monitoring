// src/hooks/useSensors.js
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "";

export function useSensors(intervalMs = 10000) {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    let timer;

    const fetchOnce = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API}/sensors`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (!alive) return;

        const normalized = (json || []).map((s) => ({
          id: s.deviceId,
          lat: Number(s.lat),
          lon: Number(s.lon),
          firstSeen: s.firstSeen,
          lastSeen: s.lastSeen,
        }));

        setSensors(normalized);
      } catch (e) {
        if (alive) setError(e.message || "Błąd pobierania czujników");
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

  return { sensors, loading, error };
}

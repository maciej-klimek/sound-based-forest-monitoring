// src/hooks/useAlerts.js
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

        if (!alive) return;

        const normalized = (json || []).map((a, idx) => ({
          id: a.id || `A${String(idx + 1).padStart(3, "0")}`,
          status: a.status,
          devices: a.devices || [],
          createdAt: a.createdAt,
        }));

        setAlerts(normalized);
      } catch (e) {
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

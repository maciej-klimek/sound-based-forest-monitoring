// src/hooks/useSensors.js
import { useEffect, useState } from "react";

/**
 * Normalizacja odpowiedzi /api/sensors
 * Oczekiwane kształty:
 *   [{ ... }, ...]
 *   lub { sensors: [{ ... }], count: n }
 */
function normalizeSensors(json) {
  const list = Array.isArray(json) ? json : json?.sensors || [];

  return list.map((s, idx) => ({
    id: s.id || s.deviceId || `sensor-${idx}`,
    lat: s.lat != null ? Number(s.lat) : null,
    lon: s.lon != null ? Number(s.lon) : null,
    firstSeen: s.firstSeen,
    lastSeen: s.lastSeen,
    // opcjonalnie – jeśli backend zwraca "score"
    score: typeof s.score === "number" ? s.score : undefined,
  }));
}

/**
 * useSensors(pollMs)
 *  - polluje /api/sensors co pollMs ms
 *  - zwraca: { sensors, loading, error }
 */
export function useSensors(pollMs = 10000) {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/sensors");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (cancelled) return;

        const normalized = normalizeSensors(json);
        setSensors(normalized);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        console.error("useSensors error:", e);
        setError(e.message || "Failed to fetch sensors");
        setSensors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, pollMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollMs]);

  return { sensors, loading, error };
}

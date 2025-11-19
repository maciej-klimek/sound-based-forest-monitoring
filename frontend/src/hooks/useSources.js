// src/hooks/useSources.js
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

        const res = await fetch(`${API}/api/sources`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (!alive) return;

        const rawSources = Array.isArray(json?.sources) ? json.sources : [];

        const normalized = rawSources.map((src, idx) => {
          const alerts = Array.isArray(src.alerts) ? src.alerts : [];

          // Status źródła: jeśli wśród odczytów jest chociaż jeden "new" → "new"
          const hasNew = alerts.some((a) => a.status === "new");
          const status = hasNew ? "new" : "resolved";

          const devices = [
            ...new Set(alerts.map((a) => a.deviceId).filter(Boolean)),
          ];

          // czas utworzenia (bierzemy najwcześniejszy createdAt z odczytów)
          const createdAt =
            alerts
              .map((a) => a.createdAt)
              .filter(Boolean)
              .sort()[0] || null;

          return {
            id: src.id || `SRC-${idx + 1}`,
            lat: Number(src.lat),
            lon: Number(src.lon),
            status,
            devices,
            createdAt,
            rawAlerts: alerts,
          };
        });

        setSources(normalized);
      } catch (e) {
        if (alive) setError(e.message || "Błąd pobierania źródeł");
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

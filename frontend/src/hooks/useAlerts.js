// src/hooks/useAlerts.js
import { useEffect, useState } from "react";

// w produkcji nginx proxuje /api -> worker
const API = import.meta.env.VITE_API_BASE_URL || "/api";

function normalizeAlerts(json) {
  let raw;

  if (Array.isArray(json)) {
    raw = json;
  } else if (json && Array.isArray(json.alerts)) {
    raw = json.alerts;
  } else {
    raw = [];
  }

  return raw.map((a, idx) => {
    const id =
      a.id ||
      a.alertId ||
      a.checksum ||
      `A${String(idx + 1).padStart(3, "0")}`;

    return {
      id,
      status: (a.status || "NEW").toLowerCase(),
      createdAt: a.createdAt || a.ts || null,
      deviceId: a.deviceId || null,
      lat: a.lat != null ? Number(a.lat) : null,
      lon: a.lon != null ? Number(a.lon) : null,
      distance: a.distance != null ? Number(a.distance) : null,
      checksum: a.checksum || null,
      s3Key: a.s3Key || a.audioUrl || null,
      audioUrl: a.audioUrl || a.s3Key || null,
      devices: a.devices || (a.deviceId ? [a.deviceId] : []),
    };
  });
}

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

        const normalized = normalizeAlerts(json);
        console.log("Normalized alerts:", normalized);
        setAlerts(normalized);
      } catch (e) {
        console.error("Error fetching alerts:", e);
        if (alive) {
          setError(e.message || "Błąd pobierania alertów");
          setAlerts([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchOnce();
    if (intervalMs > 0) {
      timer = setInterval(fetchOnce, intervalMs);
    }

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [intervalMs]);

  return { alerts, loading, error };
}

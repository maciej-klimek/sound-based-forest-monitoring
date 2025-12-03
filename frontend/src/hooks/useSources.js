// src/hooks/useSources.js
import { useEffect, useState } from "react";

function normalizeSources(json) {
  if (!json) return [];

  let rawSources;
  if (Array.isArray(json)) {
    rawSources = json;
  } else if (Array.isArray(json.sources)) {
    rawSources = json.sources;
  } else if (Array.isArray(json.alerts)) {
    rawSources = [json];
  } else {
    rawSources = [];
  }

  return rawSources.map((src, idx) => {
    const alertsIn = Array.isArray(src.alerts)
      ? src.alerts
      : Array.isArray(src.rawAlerts)
      ? src.rawAlerts
      : [];

    // deduplikacja alertów w obrębie jednego source
    const seen = new Set();
    const rawAlerts = [];

    for (let j = 0; j < alertsIn.length; j++) {
      const a = alertsIn[j] || {};
      const key = [
        a.deviceId || "",
        a.s3Key || "",
        a.ts || a.createdAt || "",
        a.checksum || "",
      ].join("|");

      if (seen.has(key)) continue;
      seen.add(key);

      const baseStatus = (a.status || src.status || "NEW").toLowerCase();

      rawAlerts.push({
        id: a.id || `alert-${idx}-${j}`,
        deviceId: a.deviceId,
        lat: a.lat != null ? Number(a.lat) : null,
        lon: a.lon != null ? Number(a.lon) : null,
        distance: a.distance != null ? Number(a.distance) : null,
        status: baseStatus,
        ts: a.ts || a.createdAt,
        createdAt: a.createdAt || a.ts,
        checksum: a.checksum,
        s3Key: a.s3Key || a.audioUrl,
        audioUrl: a.audioUrl || a.s3Key,
      });
    }

    const first = rawAlerts[0] || alertsIn[0] || src || {};

    const devices =
      src.devices ||
      Array.from(new Set(rawAlerts.map((a) => a.deviceId).filter(Boolean)));

    const status = (src.status || first.status || "NEW").toLowerCase();

    // 👇 id będzie zawsze unikalne: checksum + indeks, albo fallback src-idx
    const baseId =
      src.id ||
      src.sourceId ||
      first.checksum ||
      first.ts ||
      `src-${idx}`;
    const id = `${baseId}-${idx}`;

    return {
      id,
      lat:
        src.lat != null
          ? Number(src.lat)
          : first.lat != null
          ? Number(first.lat)
          : null,
      lon:
        src.lon != null
          ? Number(src.lon)
          : first.lon != null
          ? Number(first.lon)
          : null,
      status,
      createdAt: src.createdAt || first.createdAt || first.ts,
      devices,
      rawAlerts,
    };
  });
}

export function useSources(pollMs = 10000) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/sources");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (cancelled) return;

        const normalized = normalizeSources(json);
        setSources(normalized);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        console.error("useSources error:", e);
        setError(e.message || "Failed to fetch sources");
        setSources([]);
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

  return { sources, loading, error };
}

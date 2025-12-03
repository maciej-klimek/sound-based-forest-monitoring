import { useMemo, useState } from "react";
import AlertsPanel from "../components/AlertsPanel";
import HistoryList from "../components/HistoryList";
import AlertModal from "../components/AlertModal";
import { useAlerts } from "../hooks/useAlerts";

export default function HistoryPage() {
  const [selectedAlert, setSelectedAlert] = useState(null);

  const {
    alerts,
    loading,
    error,
  } = useAlerts(10_000);

  // Normalizacja alertów (żeby UI miał zawsze id / status / devices itd.)
  const normalizedAlerts = useMemo(
    () =>
      (alerts || []).map((a, idx) => ({
        id: a.id || `A${String(idx + 1).padStart(3, "0")}`,
        status: a.status || "new",
        createdAt: a.createdAt,
        lat: a.lat ?? null,
        lon: a.lon ?? null,
        distance: a.distance ?? null,
        devices: a.devices || (a.deviceId ? [a.deviceId] : []),
        deviceId: a.deviceId,
        ts: a.ts,
        audioUrl: a.audioUrl || a.s3Key,
      })),
    [alerts]
  );

  const activeAlerts = useMemo(
    () => normalizedAlerts.filter((a) => a.status === "new"),
    [normalizedAlerts]
  );

  const openAlertModal = (a) => {
    setSelectedAlert({
      id: a.id,
      status: a.status,
      createdAt: a.createdAt,
      lat: a.lat ?? null,
      lon: a.lon ?? null,
      devices: a.devices || (a.deviceId ? [a.deviceId] : []),
      events: [
        {
          deviceId: a.deviceId || (a.devices && a.devices[0]),
          distance: a.distance,
          ts: a.ts || a.createdAt,
          audioUrl: a.audioUrl,
          s3Key: a.audioUrl,
        },
      ],
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:[grid-template-columns:380px_1fr] gap-8">
        {/* LEWY PANEL – Active Alerts: tylko bieżące alerty */}
        <aside className="lg:sticky lg:top-4 h-fit">
          <div className="max-w-[380px]">
            <AlertsPanel
              items={activeAlerts}
              onShow={openAlertModal}
            />
            {error && (
              <div className="text-red-500 text-xs mt-2">
                {error}
              </div>
            )}
          </div>
        </aside>

        {/* PRAWY – pełna historia alertów */}
        <section>
          {loading && (
            <div className="text-sm text-zinc-500 animate-pulse">
              Synchronizacja danych...
            </div>
          )}

          {!loading && (
            <HistoryList
              items={normalizedAlerts}
              onShow={openAlertModal}
            />
          )}
        </section>
      </div>

      <AlertModal
        open={!!selectedAlert}
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
      />
    </>
  );
}

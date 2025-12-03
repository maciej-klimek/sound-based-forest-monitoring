import { useMemo, useRef, useState } from "react";
import MapView from "../components/MapView";
import AlertsPanel from "../components/AlertsPanel";
import AlertModal from "../components/AlertModal";
import { useSensors } from "../hooks/useSensors";
import { useSources } from "../hooks/useSources";
import { useAlerts } from "../hooks/useAlerts";

export default function MapPage() {
  const mapRef = useRef(null);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const {
    sensors,
    loading: sensorsLoading,
    error: sensorsError,
  } = useSensors(10_000);

  const {
    sources,
    loading: sourcesLoading,
    error: sourcesError,
  } = useSources(10_000);

  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
  } = useAlerts(10_000);

  // ŹRÓDŁA (białe targety, triangulacja z rawAlerts)
  const activeSources = useMemo(
    () => sources.filter((s) => s.status === "new"),
    [sources]
  );

  // ALERTY z /alerts – normalizacja pod UI
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

  // Tylko aktywne (status === 'new') – do listy po lewej i do okręgów
  const activeAlerts = useMemo(
    () => normalizedAlerts.filter((a) => a.status === "new"),
    [normalizedAlerts]
  );

  const loading = sensorsLoading || sourcesLoading || alertsLoading;

  const flyTo = (pos) => {
    if (pos && pos[0] != null && pos[1] != null) {
      mapRef.current?.flyTo(pos, 16);
    }
  };

  // Modal otwierany z mapy – kliknięcie w SOURCE (biały target)
  const openSourceModal = (src) => {
    setSelectedAlert({
      id: src.id,
      status: src.status,
      createdAt: src.createdAt,
      lat: src.lat,
      lon: src.lon,
      devices: src.devices || [],
      events: src.rawAlerts || [],
    });
  };

  // Modal otwierany z listy alertów – pojedynczy ALERT z /alerts
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
        {/* LEWY PANEL – Active Alerts z /alerts */}
        <aside className="lg:sticky lg:top-4">
          <div className="max-w-[380px]">
            <AlertsPanel
              items={activeAlerts}
              onSelect={(pos) => flyTo(pos)}   // Show on map
              onShow={openAlertModal}         // otwarcie modala z detalami alertu
            />

            {(sourcesError || sensorsError || alertsError) && (
              <div className="mt-2 text-xs text-rose-600 space-y-1">
                {sourcesError && <>Sources Error: {sourcesError}<br /></>}
                {sensorsError && <>Sensors Error: {sensorsError}<br /></>}
                {alertsError && <>Alerts Error: {alertsError}</>}
              </div>
            )}
          </div>
        </aside>

        {/* PRAWO – mapa: źródła (triangulacja) + czujniki + OKRĘGI z ALERTÓW */}
        <section>
          <MapView
            mapRef={mapRef}
            sources={activeSources}    // białe targety / triangulacja
            sensors={sensors}          // czujniki
            alerts={activeAlerts}      // 🔴 TU DODANE – na tym rysujemy okręgi
            loading={loading}
            onAlertSelect={openSourceModal}
          />
        </section>
      </div>

      {/* Wspólny modal – potrafi wyświetlać zarówno pojedynczy alert, jak i source */}
      <AlertModal
        open={!!selectedAlert}
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onFly={(pos) => {
          flyTo(pos);
          setSelectedAlert(null);
        }}
      />
    </>
  );
}

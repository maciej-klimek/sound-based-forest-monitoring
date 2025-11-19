// src/pages/MapPage.jsx
import { useMemo, useRef, useState } from "react";
import MapView from "../components/MapView";
import AlertsPanel from "../components/AlertsPanel";
import AlertModal from "../components/AlertModal";
import { useSensors } from "../hooks/useSensors";
import { useSources } from "../hooks/useSources";

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

  const activeSources = useMemo(
    () => sources.filter((s) => s.status === "new"),
    [sources]
  );

  const flyTo = (pos) => mapRef.current?.flyTo(pos, 16);

  const openSourceModal = (src) => {
    setSelectedAlert({
      id: src.id,
      status: src.status,
      createdAt: src.createdAt,
      lat: src.lat,
      lon: src.lon,
      devices: src.devices,
      events: src.rawAlerts || [],
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:[grid-template-columns:380px_1fr] gap-8">
        <aside className="lg:sticky lg:top-4">
          <div className="max-w-[380px]">
            <AlertsPanel
              items={activeSources}
              onSelect={flyTo}
              onShow={openSourceModal}
            />

            {(sourcesError || sensorsError) && (
              <div className="mt-2 text-xs text-rose-600">
                {sourcesError && <>Błąd źródeł: {sourcesError}<br /></>}
                {sensorsError && <>Błąd czujników: {sensorsError}</>}
              </div>
            )}
          </div>
        </aside>

        <section>
          <MapView
            mapRef={mapRef}
            sources={activeSources}
            sensors={sensors}
            loading={sourcesLoading || sensorsLoading}
          />
        </section>
      </div>

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

// src/pages/HistoryPage.jsx
import { useMemo, useState } from "react";
import AlertsPanel from "../components/AlertsPanel";
import HistoryList from "../components/HistoryList";
import AlertModal from "../components/AlertModal";
import { useAlerts } from "../hooks/useAlerts";
import { useSources } from "../hooks/useSources";

export default function HistoryPage() {
  const [selectedAlert, setSelectedAlert] = useState(null);

  // full history of alerts (GET /alerts)
  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
  } = useAlerts(30_000);

  // sources (trilateration) – GET /sources
  const {
    sources,
    loading: sourcesLoading,
    error: sourcesError,
  } = useSources(30_000);

  // index id -> source (for fetching lat/lon in history)
  const sourcesIndex = useMemo(() => {
    const idx = {};
    for (const s of sources) {
      idx[s.id] = s;
    }
    return idx;
  }, [sources]);

  // active sources (status === "new") – panel on the left
  const activeSources = useMemo(
    () => sources.filter((s) => s.status === "new"),
    [sources]
  );

  // open modal from the "Active Alerts" panel
  const openFromSource = (src) => {
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

  // open modal from the history row (we already have the object)
  const openFromHistory = (alertLike) => {
    setSelectedAlert(alertLike);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:[grid-template-columns:380px_1fr] gap-8">
        {/* LEFT COLUMN – active alerts (sources status=new) */}
        <aside className="lg:sticky lg:top-4">
          <div className="max-w-[380px]">
            <AlertsPanel
              items={activeSources}
              onShow={openFromSource}
              // no need for flyTo on history, so no onSelect provided
            />

            {(sourcesError || alertsError) && (
              <div className="mt-2 text-xs text-rose-600">
                {sourcesError && <>Sources Error: {sourcesError}<br /></>}
                {alertsError && <>Alerts Error: {alertsError}</>}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN – full alert history */}
        <section>
          {alertsLoading && (
            <div className="text-sm text-zinc-500">Loading history...</div>
          )}

          {!alertsLoading && !alertsError && (
            <HistoryList
              alerts={alerts}
              sourcesIndex={sourcesIndex}
              onShow={openFromHistory}
            />
          )}
        </section>
      </div>

      {/* Common modal for both panels */}
      <AlertModal
        open={!!selectedAlert}
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
      />
    </>
  );
}

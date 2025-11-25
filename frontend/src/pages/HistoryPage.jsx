import { useMemo, useState } from "react";
import AlertsPanel from "../components/AlertsPanel";
import HistoryList from "../components/HistoryList";
import AlertModal from "../components/AlertModal";
import { useSources } from "../hooks/useSources";

export default function HistoryPage() {
  const [selectedAlert, setSelectedAlert] = useState(null);


  const {
    sources,
    loading,
    error,
  } = useSources(10_000);

  const activeSources = useMemo(
    () => sources.filter((s) => s.status === "new"),
    [sources]
  );

  const openModal = (src) => {
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
        
        <aside className="lg:sticky lg:top-4 h-fit">
          <div className="max-w-[380px]">
            <AlertsPanel
              items={activeSources}
              onShow={openModal}
            />
            {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
          </div>
        </aside>

        <section>
          {loading && (
            <div className="text-sm text-zinc-500 animate-pulse">Synchronizacja danych...</div>
          )}

          {!loading && (
            <HistoryList
              items={sources} 
              onShow={openModal}
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
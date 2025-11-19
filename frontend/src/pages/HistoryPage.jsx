// src/pages/HistoryPage.jsx
import { useMemo, useState } from "react";
import AlertsPanel from "../components/AlertsPanel";
import HistoryList from "../components/HistoryList";
import AlertModal from "../components/AlertModal";
import { useAlerts } from "../hooks/useAlerts";
import { useSources } from "../hooks/useSources";

export default function HistoryPage() {
  const [selectedAlert, setSelectedAlert] = useState(null);

  // pełna historia alertów (GET /alerts)
  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
  } = useAlerts(30_000);

  // źródła (trilateracje) – GET /sources
  const {
    sources,
    loading: sourcesLoading,
    error: sourcesError,
  } = useSources(30_000);

  // indeks id -> source (do dociągnięcia lat/lon w historii)
  const sourcesIndex = useMemo(() => {
    const idx = {};
    for (const s of sources) {
      idx[s.id] = s;
    }
    return idx;
  }, [sources]);

  // aktywne źródła (status === "new") – panel po lewej
  const activeSources = useMemo(
    () => sources.filter((s) => s.status === "new"),
    [sources]
  );

  // otwórz modal z panelu „Aktywne Alerty”
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

  // otwórz modal z wiersza historii (tam już mamy gotowy obiekt)
  const openFromHistory = (alertLike) => {
    setSelectedAlert(alertLike);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:[grid-template-columns:380px_1fr] gap-8">
        {/* LEWA KOLUMNA – aktywne alerty (sources status=new) */}
        <aside className="lg:sticky lg:top-4">
          <div className="max-w-[380px]">
            <AlertsPanel
              items={activeSources}
              onShow={openFromSource}
              // na historii nie potrzebujemy flyTo, więc nie podajemy onSelect
            />

            {(sourcesError || alertsError) && (
              <div className="mt-2 text-xs text-rose-600">
                {sourcesError && <>Błąd źródeł: {sourcesError}<br /></>}
                {alertsError && <>Błąd alertów: {alertsError}</>}
              </div>
            )}
          </div>
        </aside>

        {/* PRAWA KOLUMNA – historia wszystkich alertów */}
        <section>
          {alertsLoading && (
            <div className="text-sm text-zinc-500">ładowanie historii…</div>
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

      {/* Wspólny modal dla obu paneli */}
      <AlertModal
        open={!!selectedAlert}
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
      />
    </>
  );
}

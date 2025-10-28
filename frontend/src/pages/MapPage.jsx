import { useRef, useState } from "react";
import MapView from "../components/MapView";
import AlertsPanel from "../components/AlertsPanel";
import AlertModal from "../components/AlertModal";

export default function MapPage() {
  const mapRef = useRef(null);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const flyTo = (pos) => mapRef.current?.flyTo(pos, 16);

  return (
    <>
      <div className="grid grid-cols-1 lg:[grid-template-columns:380px_1fr] gap-8">
        <aside className="lg:sticky lg:top-4">
          <div className="max-w-[380px]">
            {/* NIE przekazujemy items -> AlertsPanel sam wykona fetch('/api/alerts?...') */}
            <AlertsPanel onSelect={flyTo} onShow={(a) => setSelectedAlert(a)} />
          </div>
        </aside>

        <section>
          {/* NIE przekazujemy sensors/alerts -> MapView samo pobierze z /api */}
          <MapView mapRef={mapRef} />
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

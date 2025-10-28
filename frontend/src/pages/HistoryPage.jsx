import { useState } from "react";
import AlertsPanel from "../components/AlertsPanel";
import HistoryList from "../components/HistoryList";
import AlertModal from "../components/AlertModal";

export default function HistoryPage() {
  const [selectedAlert, setSelectedAlert] = useState(null);

  return (
    <>
      <div className="grid grid-cols-1 lg:[grid-template-columns:380px_1fr] gap-8">
        <aside className="lg:sticky lg:top-4">
          <div className="max-w-[380px]">
            {/* bez items -> sam pobierze aktywne alerty */}
            <AlertsPanel onShow={(a) => setSelectedAlert(a)} />
          </div>
        </aside>

        <section>
          {/* bez items -> sam pobierze historię z /api/alerts?status=resolved */}
          <HistoryList onShow={(a) => setSelectedAlert(a)} />
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

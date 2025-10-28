// src/pages/HistoryPage.jsx
import { useState } from "react";
import AlertsPanel from "../components/AlertsPanel";
import HistoryList from "../components/HistoryList";
import AlertModal from "../components/AlertModal";
import { ACTIVE_ALERTS, HISTORY } from "../data/mock";

export default function HistoryPage() {
  const [selectedAlert, setSelectedAlert] = useState(null);

  return (
    <>
      <div className="grid grid-cols-1 lg:[grid-template-columns:380px_1fr] gap-8">
        <aside className="lg:sticky lg:top-4">
          <div className="max-w-[380px]">
            <AlertsPanel
              items={ACTIVE_ALERTS}
              onShow={(a) => setSelectedAlert(a)}
            />
          </div>
        </aside>

        <section>
          <HistoryList items={HISTORY} onShow={(a) => setSelectedAlert(a)} />
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

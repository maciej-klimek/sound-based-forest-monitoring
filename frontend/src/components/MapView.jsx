// src/components/MapView.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "../leaflet_fix";
import SearchBox from "./SearchBox";

const colorByScore = (v) => (v >= 85 ? "#ef4444" : v >= 70 ? "#f59e0b" : "#65a30d");

// ✅ ikona CZUJNIKA – zielone kółko
function sensorIcon(name, score) {
  const color = colorByScore(score);
  const html = `
    <div class="sensor-wrap">
      <div style="width:16px;height:16px;border:2px solid ${color};border-radius:50%;background:white;margin:auto"></div>
      <div style="background:${color};color:white;font-size:11px;font-weight:bold;padding:2px 6px;border-radius:6px;margin-top:2px">
        ${name}
      </div>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [50, 40],
    iconAnchor: [25, 20],
    popupAnchor: [0, -20],
  });
}

// 🔺 ikona ŹRÓDŁA – czerwony trójkąt
function alertIcon(label = "A1") {
  const html = `
    <div class="sensor-wrap" style="text-align:center">
      <div style="width: 0; height: 0; border-left: 9px solid transparent;
          border-right: 9px solid transparent; border-bottom: 15px solid #dc2626;
          margin: auto;"></div>
      <div style="background:#000;color:white;font-size:11px;font-weight:bold;padding:2px 6px;border-radius:6px;margin-top:2px;">
        ${label}
      </div>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25],
  });
}

export default function MapView({ sensors: sensorsProp = [], alerts: alertsProp = [], mapRef }) {
  const [sensors, setSensors] = useState(sensorsProp);
  const [alerts, setAlerts] = useState(alertsProp);
  const [loading, setLoading] = useState(!sensorsProp?.length || !alertsProp?.length);

  // Pobierz dane tylko jeśli nie przyszły przez propsy
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!sensorsProp?.length) {
          const resS = await fetch("/api/sensors");
          if (resS.ok) {
            const dataS = await resS.json();
            if (alive) setSensors(Array.isArray(dataS) ? dataS : []);
          }
        } else {
          setSensors(sensorsProp);
        }

        if (!alertsProp?.length) {
          const resA = await fetch("/api/alerts?status=active&_limit=100&_sort=createdAt&_order=desc");
          if (resA.ok) {
            const dataA = await resA.json();
            if (alive) setAlerts(Array.isArray(dataA) ? dataA : []);
          }
        } else {
          setAlerts(alertsProp);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [sensorsProp, alertsProp]);

  const bounds = useMemo(
    () => (sensors?.length ? L.latLngBounds(sensors.map((s) => [s.lat, s.lon])) : null),
    [sensors]
  );

  const markersRef = useRef({});
  const [base, setBase] = useState("topo");
  const [showCircles, setShowCircles] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);

  return (
    <div className="relative card overflow-hidden">
      <SearchBox
        sensors={sensors}
        onSelect={(pos, item) => {
          mapRef?.current?.flyTo(pos, item?.type === "sensor" ? 16 : 13);
          if (item?.type === "sensor" && item.id) {
            setTimeout(() => markersRef.current[item.id]?.openPopup(), 350);
          }
        }}
      />

      {/* przełączniki bazowych map */}
      <div className="absolute z-[500] left-6 bottom-6 flex gap-2">
        <button
          title="Topograficzna"
          onClick={() => setBase("topo")}
          className={`w-10 h-10 rounded-full border shadow bg-white grid place-items-center text-lg ${
            base === "topo" ? "ring-2 ring-zinc-300" : "hover:bg-zinc-50"
          }`}
        >
          🗺️
        </button>
        <button
          title="Satelitarna"
          onClick={() => setBase("sat")}
          className={`w-10 h-10 rounded-full border shadow bg-white grid place-items-center text-lg ${
            base === "sat" ? "ring-2 ring-zinc-300" : "hover:bg-zinc-50"
          }`}
        >
          🛰️
        </button>
      </div>

      {/* nakładki */}
      <div className="absolute z-[500] right-6 top-[88px]">
        <div className="bg-white/95 backdrop-blur border rounded-[12px] shadow px-2 py-1.5">
          <label className="flex items-center gap-2 text-[12px] py-0.5">
            <input
              type="checkbox"
              checked={showCircles}
              onChange={(e) => setShowCircles(e.target.checked)}
            />
            Okręgi
          </label>
          <label className="flex items-center gap-2 text-[12px] py-0.5">
            <input
              type="checkbox"
              checked={showSensors}
              onChange={(e) => setShowSensors(e.target.checked)}
            />
            Czujniki
          </label>
          <label className="flex items-center gap-2 text-[12px] py-0.5">
            <input
              type="checkbox"
              checked={showAlerts}
              onChange={(e) => setShowAlerts(e.target.checked)}
            />
            Źródła
          </label>
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        center={[50.0614, 19.9383]}
        zoom={14}
        bounds={bounds || undefined}
        zoomControl={false}
        className="w-full h-[700px] rounded-[24px]"
      >
        <ZoomControl position="topright" />

        {/* podkład */}
        {base === "topo" ? (
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        {/* okręgi */}
        {showCircles &&
          sensors.map((s) => {
            const c = colorByScore(s.score ?? 0);
            return (
              <Circle
                key={`${s.id}-circle`}
                center={[s.lat, s.lon]}
                radius={s.radiusM ?? 600}
                pathOptions={{ color: c, fillColor: c, fillOpacity: 0.18 }}
              />
            );
          })}

        {/* czujniki */}
        {showSensors &&
          sensors.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lon]}
              icon={sensorIcon(s.id, s.score ?? 0)}
              ref={(el) => {
                if (el) markersRef.current[s.id] = el;
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{s.id}</div>
                  <div>
                    Lat: {Number(s.lat).toFixed(4)} Lon: {Number(s.lon).toFixed(4)}
                  </div>
                  {typeof s.score === "number" && <div>Score: {s.score}</div>}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* źródła (trójkąty) */}
        {showAlerts &&
          alerts
            .map((a) => (
              <Marker key={a.id} position={[a.lat, a.lon]} icon={alertIcon(a.id)}>
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">{a.id}</div>
                    {a.message && <div>{a.message}</div>}
                    <div>
                      Lat: {Number(a.lat).toFixed(4)} Lon: {Number(a.lon).toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
      </MapContainer>

      {loading && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="bg-white/80 px-4 py-2 rounded-xl border shadow">ładowanie mapy…</div>
        </div>
      )}
    </div>
  );
}

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

// API base (działa z proxy albo z VITE_API_BASE_URL)
const API = import.meta.env.VITE_API_BASE_URL || "";
const api = (path) => (API ? `${API}${path}` : path);

// Kolory (progi w % gdy score jest 0–100; jeśli 0–1 – normalizujemy poniżej)
const colorByScore = (v) => (v >= 85 ? "#ef4444" : v >= 70 ? "#f59e0b" : "#65a30d");

// Ikona CZUJNIKA — zawsze kółko; jeśli brak alertu → biała z czarną obwódką i czarną etykietą
function sensorIcon(name, hexColor = "#ffffff") {
  const neutral = hexColor.toLowerCase() === "#ffffff";
  const circleBorder = neutral ? "#111111" : hexColor;
  const labelBg = neutral ? "#ffffff" : hexColor;
  const labelText = neutral ? "#111111" : "#ffffff";
  const labelBorder = neutral ? "2px solid #111111" : "0";

  const html = `
    <div class="sensor-wrap" style="text-align:center; pointer-events:auto;">
      <div style="
        width:20px;height:20px;
        border:3px solid ${circleBorder};
        border-radius:50%;
        background:white;
        margin:auto;
        box-shadow:${neutral ? "0 0 0 2px #fff, 0 0 0 4px #111" : "0 0 0 2px #fff"};
      "></div>
      <div style="
        background:${labelBg};
        color:${labelText};
        font-size:12px;font-weight:800;
        padding:3px 8px;border-radius:8px;margin-top:4px;
        border:${labelBorder};
        box-shadow:0 1px 2px rgba(0,0,0,.25);
      ">
        ${name}
      </div>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    // trochę większy hitbox dla łatwiejszego klikania
    iconSize: [80, 68],
    iconAnchor: [40, 34],
    popupAnchor: [0, -28],
  });
}

// Ikona TRIANGULACJI — trójkąt + czarna etykieta (większy hitbox)
function triangleIcon(label = "T001", hexColor = "#dc2626") {
  const html = `
    <div class="sensor-wrap" style="text-align:center; pointer-events:auto;">
      <div style="width:0;height:0;border-left:12px solid transparent;
        border-right:12px solid transparent;border-bottom:18px solid ${hexColor};
        margin:auto; filter: drop-shadow(0 1px 2px rgba(0,0,0,.25));"></div>
      <div style="background:#000;color:white;font-size:12px;font-weight:800;
        padding:3px 8px;border-radius:8px;margin-top:4px;box-shadow:0 1px 2px rgba(0,0,0,.25);">
        ${label}
      </div>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [84, 72],
    iconAnchor: [42, 36],
    popupAnchor: [0, -30],
  });
}

export default function MapView({ sensors: sensorsProp = [], alerts: alertsProp = [], mapRef }) {
  const [sensors, setSensors] = useState(sensorsProp);
  const [alerts, setAlerts] = useState(alertsProp);
  const [tris, setTris] = useState([]);          // punkty triangulacji T00x
  const [loading, setLoading] = useState(!sensorsProp?.length || !alertsProp?.length);

  // Pobieranie danych (równolegle, bez wieszania ładowania)
  useEffect(() => {
    let alive = true;
    const getJson = async (res) => (res.ok ? res.json() : []);

    (async () => {
      try {
        const pSensors = sensorsProp?.length
          ? Promise.resolve(sensorsProp)
          : fetch(api("/api/sensors")).then(getJson).catch(() => []);

        const pAlerts = alertsProp?.length
          ? Promise.resolve(alertsProp)
          : fetch(api("/api/alerts?status=active&_limit=100&_sort=createdAt&_order=desc"))
              .then(getJson)
              .catch(() => []);

        const pTris = fetch(api("/api/triangulations?_sort=createdAt&_order=desc&_limit=100"))
          .then(getJson)
          .catch(() => []);

        const [rs, ra, rt] = await Promise.allSettled([pSensors, pAlerts, pTris]);
        if (!alive) return;

        if (rs.status === "fulfilled" && Array.isArray(rs.value)) setSensors(rs.value);
        if (ra.status === "fulfilled" && Array.isArray(ra.value)) setAlerts(ra.value);
        if (rt.status === "fulfilled" && Array.isArray(rt.value)) setTris(rt.value);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [sensorsProp, alertsProp]);

  // Mapowanie: sensorId -> aktywny alert
  const alertsBySensor = useMemo(() => {
    const m = new Map();
    for (const a of alerts) {
      const sid = String(a?.sourceId || "").trim();
      if (sid) m.set(sid, a);
    }
    return m;
  }, [alerts]);

  // Bounds po sensorach (żeby mapa ładnie się dopasowała)
  const bounds = useMemo(
    () => (sensors?.length ? L.latLngBounds(sensors.map((s) => [s.lat, s.lon])) : null),
    [sensors]
  );

  const markersRef = useRef({});
  const [base, setBase] = useState("topo");
  const [showCircles, setShowCircles] = useState(true);     // okręgi z alertów
  const [showSensors, setShowSensors] = useState(true);     // markery czujników (kółka)
  const [showTris, setShowTris] = useState(true);           // punkty triangulacji (trójkąty)

  return (
    <div className="relative card overflow-hidden">
      <SearchBox
        sensors={sensors}
        onSelect={(pos, item) => {
          mapRef?.current?.flyTo(pos, item?.type === "sensor" ? 16 : 13);
          if (item?.type === "sensor" && item.id) {
            setTimeout(() => markersRef.current[item.id]?.openPopup(), 250);
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
            <input type="checkbox" checked={showCircles} onChange={(e) => setShowCircles(e.target.checked)} />
            Okręgi
          </label>
          <label className="flex items-center gap-2 text-[12px] py-0.5">
            <input type="checkbox" checked={showSensors} onChange={(e) => setShowSensors(e.target.checked)} />
            Czujniki
          </label>
          <label className="flex items-center gap-2 text-[12px] py-0.5">
            <input type="checkbox" checked={showTris} onChange={(e) => setShowTris(e.target.checked)} />
            Triangulacje
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

        {/* OKRĘGI z ALERTÓW + POPUP po kliknięciu / hoverze (łatwiej trafić) */}
        {showCircles &&
          alerts.map((a) => {
            const raw = a?.score ?? 0;
            const v = typeof raw === "number" && raw <= 1 ? raw * 100 : raw; // obsługa 0–1 i 0–100
            const c = colorByScore(v);
            return (
              <Circle
                key={`${a.id}-circle`}
                center={[a.lat, a.lon]}
                radius={a.radiusM ?? 500}
                pathOptions={{
                  color: c,
                  weight: 3,
                  opacity: 0.9,
                  fillColor: c,
                  fillOpacity: 0.22
                }}
                eventHandlers={{
                  mouseover: (e) => e.target.openPopup(),
                  click: (e) => e.target.openPopup()
                }}
              >
                <Popup autoPan={true} keepInView={true}>
                  <div className="space-y-1">
                    <div className="font-semibold">{a.id} — alert</div>
                    {a.message && <div>{a.message}</div>}
                    <div>Lat: {Number(a.lat).toFixed(4)} Lon: {Number(a.lon).toFixed(4)}</div>
                    <div>Score: {a.score}</div>
                    {typeof a.radiusM === "number" && <div>Promień: {a.radiusM} m</div>}
                    {a.startedAt && <div>Start: {a.startedAt}</div>}
                    {a.createdAt && !a.startedAt && <div>Utworzono: {a.createdAt}</div>}
                    {a.sourceId && <div>Czujnik: {a.sourceId}</div>}
                  </div>
                </Popup>
              </Circle>
            );
          })}

        {/* CZUJNIKI (kółka) — biały bez alertu, kolor z alertu gdy aktywny; lepsza klikalność */}
        {showSensors &&
          sensors.map((s) => {
            const a = alertsBySensor.get(String(s.id).trim()) || null;
            const raw = a?.score ?? 0;
            const v = typeof raw === "number" && raw <= 1 ? raw * 100 : raw;
            const hex = a ? colorByScore(v) : "#ffffff";
            return (
              <Marker
                key={s.id}
                position={[s.lat, s.lon]}
                icon={sensorIcon(s.id, hex)}
                riseOnHover={true}
                zIndexOffset={a ? 1200 : 1000}
                ref={(el) => { if (el) markersRef.current[s.id] = el; }}
                eventHandlers={{
                  mouseover: (e) => e.target.openPopup(),
                  click: (e) => e.target.openPopup()
                }}
              >
                <Popup autoPan={true} keepInView={true}>
                  <div className="space-y-1">
                    <div className="font-semibold">Czujnik {s.id}</div>
                    <div>Lat: {Number(s.lat).toFixed(4)} Lon: {Number(s.lon).toFixed(4)}</div>
                    {a ? (
                      <>
                        <div>Aktywny alert: {a.id}</div>
                        <div>Score: {a.score}</div>
                        {a.message && <div>{a.message}</div>}
                        {typeof a.radiusM === "number" && <div>Promień: {a.radiusM} m</div>}
                      </>
                    ) : (
                      <div>Brak aktywnego alertu</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* TRIANGULACJE (trójkąty) — większy hitbox + popup na hover/klik */}
        {showTris &&
          tris.map((t) => (
            <Marker
              key={t.id}
              position={[t.lat, t.lon]}
              icon={triangleIcon(t.id, "#dc2626")}
              riseOnHover={true}
              zIndexOffset={1400}
              eventHandlers={{
                mouseover: (e) => e.target.openPopup(),
                click: (e) => e.target.openPopup()
              }}
            >
              <Popup autoPan={true} keepInView={true}>
                <div className="space-y-1">
                  <div className="font-semibold">{t.id} — punkt triangulacji</div>
                  <div>Lat: {Number(t.lat).toFixed(4)} Lon: {Number(t.lon).toFixed(4)}</div>
                  {t.sensors?.length ? <div>Obliczone z czujników: {t.sensors.join(", ")}</div> : null}
                  {typeof t.score === "number" ? <div>Score: {t.score}</div> : null}
                  {t.createdAt ? <div>Utworzone: {t.createdAt}</div> : null}
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

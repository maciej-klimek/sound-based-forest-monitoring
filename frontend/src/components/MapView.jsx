import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  ZoomControl,
  Tooltip,
  Pane,
} from "react-leaflet";
import L from "leaflet";
import "../leaflet_fix";
import SearchBox from "./SearchBox";

const API = import.meta.env.VITE_API_BASE_URL || "";
const api = (p) => (API ? `${API}${p}` : p);

// 0–100
const colorByScore = (v) => (v >= 85 ? "#ef4444" : v >= 70 ? "#f59e0b" : "#65a30d");

function triangleIcon(label = "T001", hexColor = "#dc2626") {
  const html = `
    <div style="text-align:center; pointer-events:auto;">
      <div style="width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-bottom:18px solid ${hexColor};margin:auto;filter:drop-shadow(0 1px 2px rgba(0,0,0,.25))"></div>
      <div style="background:#000;color:#fff;font-weight:800;font-size:12px;margin-top:4px;padding:3px 8px;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.25)">${label}</div>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [84, 72],
    iconAnchor: [42, 9],       // środek „znaku”
    popupAnchor: [0, -18],     // popup nad trójkątem
  });
}

export default function MapView({ sensors: sensorsProp = [], alerts: alertsProp = [], mapRef }) {
  const [sensors, setSensors] = useState(sensorsProp);
  const [alerts, setAlerts] = useState(alertsProp);
  const [tris, setTris] = useState([]);
  const [loading, setLoading] = useState(!sensorsProp?.length || !alertsProp?.length);

  useEffect(() => {
    let alive = true;
    const getJson = async (r) => (r.ok ? r.json() : []);
    (async () => {
      try {
        const pSensors = sensorsProp?.length
          ? Promise.resolve(sensorsProp)
          : fetch(api("/api/sensors")).then(getJson).catch(() => []);
        const pAlerts = alertsProp?.length
          ? Promise.resolve(alertsProp)
          : fetch(api("/api/alerts?status=active&_limit=100&_sort=createdAt&_order=desc"))
              .then(getJson).catch(() => []);
        const pTris = fetch(api("/api/triangulations?_sort=createdAt&_order=desc&_limit=100"))
          .then(getJson).catch(() => []);

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

  // sensorId -> aktywny alert
  const alertsBySensor = useMemo(() => {
    const m = new Map();
    for (const a of alerts) {
      const sid = String(a?.sourceId || "").trim();
      if (sid) m.set(sid, a);
    }
    return m;
  }, [alerts]);

  const bounds = useMemo(
    () => (sensors?.length ? L.latLngBounds(sensors.map((s) => [s.lat, s.lon])) : null),
    [sensors]
  );

  const markersRef = useRef({}); // dla triangulacji: markersRef[Txxx] => Marker

  const [base, setBase] = useState("topo");
  const [showCircles, setShowCircles] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showTris, setShowTris] = useState(true);

  return (
    <div className="relative card overflow-hidden">
      <SearchBox
        sensors={sensors}
        onSelect={(pos, item) => {
          mapRef?.current?.flyTo(pos, item?.type === "sensor" ? 16 : 13);
          if (item?.type === "sensor" && item.id) {
            setTimeout(() => markersRef.current[item.id]?.openPopup?.(), 250);
          }
        }}
      />

      {/* przełączniki map */}
      <div className="absolute z-[500] left-6 bottom-6 flex gap-2">
        <button
          title="Topograficzna"
          onClick={() => setBase("topo")}
          className={`w-10 h-10 rounded-full border shadow bg-white grid place-items-center text-lg ${base === "topo" ? "ring-2 ring-zinc-300" : "hover:bg-zinc-50"}`}
        >🗺️</button>
        <button
          title="Satelitarna"
          onClick={() => setBase("sat")}
          className={`w-10 h-10 rounded-full border shadow bg-white grid place-items-center text-lg ${base === "sat" ? "ring-2 ring-zinc-300" : "hover:bg-zinc-50"}`}
        >🛰️</button>
      </div>

      {/* nakładki */}
      <div className="absolute z-[500] right-6 top-[88px]">
        <div className="bg-white/95 backdrop-blur border rounded-[12px] shadow px-2 py-1.5">
          <label className="flex items-center gap-2 text-[12px] py-0.5">
            <input type="checkbox" checked={showCircles} onChange={(e) => setShowCircles(e.target.checked)} /> Okręgi
          </label>
          <label className="flex items-center gap-2 text-[12px] py-0.5">
            <input type="checkbox" checked={showSensors} onChange={(e) => setShowSensors(e.target.checked)} /> Czujniki
          </label>
          <label className="flex items-center gap-2 text-[12px] py-0.5">
            <input type="checkbox" checked={showTris} onChange={(e) => setShowTris(e.target.checked)} /> Triangulacje
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

        {base === "topo" ? (
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        ) : (
          <TileLayer
            attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        {/* Pane'y – by popup/okręgi nie zasłaniały klików */}
        <Pane name="alert-circles" style={{ zIndex: 400 }} />
        <Pane name="triangles" style={{ zIndex: 600 }} />
        <Pane name="sensors" style={{ zIndex: 700 }} />

        {/* OKRĘGI ALERTÓW (popup z przesunięciem, żeby nie zasłaniał znacznika) */}
        {showCircles && alerts.map((a) => {
          const raw = a?.score ?? 0;
          const v = typeof raw === "number" && raw <= 1 ? raw * 100 : raw;
          const c = colorByScore(v);
          return (
            <Circle
              key={`${a.id}-circle`}
              center={[a.lat, a.lon]}
              radius={a.radiusM ?? 500}
              pathOptions={{ color: c, weight: 3, opacity: 0.9, fillColor: c, fillOpacity: 0.22 }}
              pane="alert-circles"
              eventHandlers={{ click: (e) => e.target.openPopup() }}
            >
              <Popup autoPan keepInView offset={[0, -14]}>
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

        {/* CZUJNIKI — CircleMarker = precyzyjne centrum + wygodny hitbox */}
        {showSensors && sensors.map((s) => {
          const a = alertsBySensor.get(String(s.id).trim()) || null;
          const raw = a?.score ?? 0;
          const v = typeof raw === "number" && raw <= 1 ? raw * 100 : raw;
          const border = a ? colorByScore(v) : "#111111";
          const badgeBg = a ? colorByScore(v) : "#ffffff";
          const badgeColor = a ? "#ffffff" : "#111111";
          const badgeBorder = a ? "0" : "2px solid #111111";

          return (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lon]}
              radius={11}
              pathOptions={{ color: border, weight: 3, fillColor: "#ffffff", fillOpacity: 1 }}
              pane="sensors"
              eventHandlers={{ click: (e) => e.target.openPopup() }}
            >
              {/* Estetyczna badgetka */}
              <Tooltip direction="top" offset={[0, -6]} permanent className="sensor-badge">
                <span
                  style={{
                    background: badgeBg,
                    color: badgeColor,
                    border: badgeBorder,
                    padding: "3px 8px",
                    fontWeight: 800,
                    fontSize: "12px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 2px rgba(0,0,0,.25)",
                  }}
                >
                  {s.id}
                </span>
              </Tooltip>

              <Popup autoPan keepInView offset={[0, -16]}>
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
            </CircleMarker>
          );
        })}

        {/* TRIANGULACJE — duży hitbox + pewny ref + offset popupu */}
        {showTris && tris.map((t) => (
          <Pane key={`tri-${t.id}`} name={`tri-${t.id}`} style={{ zIndex: 600 }}>
            {/* HITBOX: łatwy klik w okolicy (przezroczysty) */}
            <CircleMarker
              center={[t.lat, t.lon]}
              radius={18}
              pathOptions={{ opacity: 0, fillOpacity: 0 }}
              pane="triangles"
              eventHandlers={{ click: () => markersRef.current[t.id]?.openPopup?.() }}
            />
            <Marker
              position={[t.lat, t.lon]}
              icon={triangleIcon(t.id, "#dc2626")}
              pane="triangles"
              ref={(el) => { if (el) markersRef.current[t.id] = el; }}
              eventHandlers={{ click: (e) => e.target.openPopup() }}
            >
              <Popup autoPan keepInView offset={[0, -18]}>
                <div className="space-y-1">
                  <div className="font-semibold">{t.id} — punkt triangulacji</div>
                  <div>Lat: {Number(t.lat).toFixed(4)} Lon: {Number(t.lon).toFixed(4)}</div>
                  {t.sensors?.length ? <div>Obliczone z czujników: {t.sensors.join(", ")}</div> : null}
                  {typeof t.score === "number" ? <div>Score: {t.score}</div> : null}
                  {t.createdAt ? <div>Utworzone: {t.createdAt}</div> : null}
                </div>
              </Popup>
            </Marker>
          </Pane>
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

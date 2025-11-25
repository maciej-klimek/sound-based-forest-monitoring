// src/components/MapView.jsx
import { useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,   // 🆕 small point in the center of the circle
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "../leaflet_fix";
import SearchBox from "./SearchBox";

const colorNew = "#ef4444"; // red for active sources

function sensorIcon(name) {
  const html = `
    <div class="sensor-wrap" style="text-align:center; pointer-events:auto;">
      <div style="
        width:20px;height:20px;
        border:3px solid #111111;
        border-radius:50%;
        background:white;
        margin:auto;
        box-shadow:0 0 0 2px #fff, 0 0 0 4px #111;
      "></div>
      <div style="
        background:#ffffff;
        color:#111111;
        font-size:12px;font-weight:800;
        padding:3px 8px;border-radius:8px;margin-top:4px;
        border:2px solid #111111;
        box-shadow:0 1px 2px rgba(0,0,0,.25);
      ">
        ${name}
      </div>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [80, 68],
    iconAnchor: [40, 34],
    popupAnchor: [0, -28],
  });
}

export default function MapView({
  sources = [], // only new
  sensors = [],
  mapRef,
  loading = false,
}) {
  const markersRef = useRef({});
  const sourceRefs = useRef({}); // references for circles (alerts)
  const [base, setBase] = useState("topo");
  const [showSources, setShowSources] = useState(true);
  const [showSensors, setShowSensors] = useState(true);

  const summary = useMemo(
    () => ({
      sources: sources.length,
      sensors: sensors.length,
    }),
    [sources, sensors]
  );

  return (
    <div className="relative card overflow-hidden">
      <SearchBox
        sensors={sensors}
        sources={sources}
        onSelect={(pos, item) => {
          mapRef?.current?.flyTo(pos, item?.type === "sensor" ? 16 : 13);

          if (item?.type === "sensor" && item.id) {
            setTimeout(() => markersRef.current[item.id]?.openPopup(), 250);
          }

          if (item?.type === "alert" && item.id) {
            setTimeout(() => sourceRefs.current[item.id]?.openPopup(), 250);
          }
        }}
      />

      {/* Base map switchers */}
      <div className="absolute z-[500] left-6 bottom-6 flex gap-2">
        <button
          title="Topographic"
          onClick={() => setBase("topo")}
          className={`w-10 h-10 rounded-full border shadow bg-white grid place-items-center text-lg ${
            base === "topo" ? "ring-2 ring-zinc-300" : "hover:bg-zinc-50"
          }`}
        >
          🗺️
        </button>
        <button
          title="Satellite"
          onClick={() => setBase("sat")}
          className={`w-10 h-10 rounded-full border shadow bg-white grid place-items-center text-lg ${
            base === "sat" ? "ring-2 ring-zinc-300" : "hover:bg-zinc-50"
          }`}
        >
          🛰️
        </button>
      </div>

      {/* Overlay */}
      <div className="absolute z-[500] right-6 top-[88px]">
        <div className="bg-white/95 backdrop-blur border rounded-[12px] shadow px-2 py-1.5 text-[12px] space-y-1">
          <div className="text-xs text-zinc-500">
            devices: {summary.sensors}, alerts: {summary.sources}
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showSources}
              onChange={(e) => setShowSources(e.target.checked)}
            />
            Sources
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showSensors}
              onChange={(e) => setShowSensors(e.target.checked)}
            />
            Sensors
          </label>
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        center={[50.0614, 19.9383]}
        zoom={14}
        zoomControl={false}
        className="w-full h-[700px] rounded-[24px]"
      >
        <ZoomControl position="topright" />

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

        {/* ALERTS – only new */}
        {showSources &&
          sources.map((src) => (
            <Circle
              key={src.id}
              center={[src.lat, src.lon]}
              radius={300}
              pathOptions={{
                color: colorNew,
                weight: 3,
                opacity: 0.9,
                fillColor: colorNew,
                fillOpacity: 0.25,
              }}
              ref={(el) => {
                if (el) sourceRefs.current[src.id] = el;
              }}
            >
              <Popup autoPan keepInView>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{src.id}</div>
                  <div>Status: {src.status}</div>
                  {src.createdAt && <div>Time: {src.createdAt}</div>}
                  <div>
                    Lat/Lon: {src.lat.toFixed(4)}, {src.lon.toFixed(4)}
                  </div>
                  {src.devices?.length > 0 && (
                    <div>
                      Sensors:{" "}
                      <span className="font-mono text-xs">
                        {src.devices.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </Circle>
          ))}

        {/* 🆕 TRIANGULATION POINT IN THE CENTER OF THE CIRCLE */}
        {showSources &&
          sources.map((src) => (
            <CircleMarker
              key={src.id + "-center"}
              center={[src.lat, src.lon]}
              radius={5}
              pathOptions={{
                color: "#b91c1c",     // darker red border
                weight: 2,
                fillColor: "#ffffff", // white fill
                fillOpacity: 1,
              }}
            />
          ))}

        {/* SENSORS */}
        {showSensors &&
          sensors.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lon]}
              icon={sensorIcon(s.id)}
              riseOnHover
              zIndexOffset={1000}
              ref={(el) => {
                if (el) markersRef.current[s.id] = el;
              }}
            >
              <Popup autoPan keepInView>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">Sensor {s.id}</div>
                  <div>
                    Lat/Lon: {s.lat.toFixed(4)}, {s.lon.toFixed(4)}
                  </div>
                  {s.firstSeen && <div>First seen: {s.firstSeen}</div>}
                  {s.lastSeen && <div>Last seen: {s.lastSeen}</div>}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {loading && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="bg-white/80 px-4 py-2 rounded-xl border shadow">
            loading map…
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polyline,
  Popup,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "../leaflet_fix";
import SearchBox from "./SearchBox";

const getColorByDistance = (dist) => {
  if (dist <= 200) return "#84cc16";  
  if (dist <= 400) return "#eab308";  
  return "#ef4444";                   
};

const createSensorIcon = () => {
  const html = `
    <div style="
      width: 12px; height: 12px; background-color: white;
      border: 2px solid #333; border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    "></div>`;
  return L.divIcon({ html, className: "bg-transparent", iconSize: [12, 12], iconAnchor: [6, 6] });
};

const createPulsingSourceIcon = (status) => {
  const isNew = status === 'new';
  const colorClass = isNew ? 'red-600' : 'gray-500';
  const pulse = isNew ? `<div class="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-50"></div>` : '';

  const html = `
    <div class="relative flex items-center justify-center w-8 h-8">
      <div class="absolute w-full h-0.5 bg-${colorClass}"></div>
      <div class="absolute h-full w-0.5 bg-${colorClass}"></div>
      <div class="absolute w-6 h-6 border-2 border-${colorClass} rounded-full bg-white/20 z-10"></div>
      ${pulse}
    </div>`;
  return L.divIcon({ html, className: "bg-transparent", iconSize: [32, 32], iconAnchor: [16, 16] });
};

function MapFlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 1.5 });
  }, [position, map]);
  return null;
}

export default function MapView({
  sources = [],
  sensors = [],
  mapRef,
  loading = false,
  onAlertSelect,
}) {
  const [base, setBase] = useState("topo");
  const [showCircles, setShowCircles] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [showTriangulation, setShowTriangulation] = useState(true);
  
  const [selectedAlertId, setSelectedAlertId] = useState("");

  const sensorsMap = useMemo(() => {
    const map = {};
    sensors.forEach((s) => (map[s.id] = s));
    return map;
  }, [sensors]);

  const displayedSources = useMemo(() => {
    if (!selectedAlertId) return sources;
    return sources.filter(s => s.id === selectedAlertId);
  }, [sources, selectedAlertId]);

  const visibleSensorIds = useMemo(() => {
    if (!selectedAlertId) return null; 
    const ids = new Set();
    displayedSources.forEach(src => src.devices.forEach(d => ids.add(d)));
    return ids;
  }, [displayedSources, selectedAlertId]);

  const flyPosition = useMemo(() => {
    if (!selectedAlertId || displayedSources.length === 0) return null;
    const target = displayedSources[0];
    if (target.lat && target.lon) return [target.lat, target.lon];
    return null;
  }, [selectedAlertId, displayedSources]);

  return (
    <div className="relative card overflow-hidden border-0 p-0 shadow-xl h-[700px]">
      
      <SearchBox
        sensors={sensors}
        sources={sources}
        onSelect={(pos) => mapRef?.current?.flyTo(pos, 15)}
      />


      <div className="absolute z-[500] right-6 top-6">
        <div className="bg-white/95 backdrop-blur shadow-md border border-zinc-300 rounded-lg px-3 py-2 flex items-center gap-2">
           <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Focus:</span>
           <select 
             className="bg-transparent font-bold text-sm outline-none cursor-pointer max-w-[140px]"
             value={selectedAlertId}
             onChange={(e) => setSelectedAlertId(e.target.value)}
           >
             <option value="">-- Show All ({sources.length}) --</option>
             {sources.map(s => (
               <option key={s.id} value={s.id}>
                 Alert {s.id}
               </option>
             ))}
           </select>
           {selectedAlertId && (
             <button 
               onClick={() => setSelectedAlertId("")}
               className="ml-1 text-xs bg-zinc-100 hover:bg-zinc-200 border rounded px-1.5 py-0.5 font-bold text-zinc-600"
               title="Clear filter"
             >✕</button>
           )}
        </div>
      </div>

      <div className="absolute z-[500] right-4 top-16 mt-2">
        <div className="bg-white/95 backdrop-blur border border-zinc-300 rounded-lg shadow-md p-3 text-xs space-y-2 select-none w-[140px]">
           <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showCircles} onChange={e => setShowCircles(e.target.checked)} className="accent-blue-600"/>
            <span className="font-semibold">Signal Zones</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showSensors} onChange={e => setShowSensors(e.target.checked)} className="accent-blue-600"/>
            <span className="font-semibold">Sensors</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showTriangulation} onChange={e => setShowTriangulation(e.target.checked)} className="accent-blue-600"/>
            <span className="font-semibold">Triangulation</span>
          </label>
        </div>
      </div>

      <div className="absolute z-[500] left-4 bottom-8 flex flex-col gap-2">
        <button 
          onClick={() => setBase("topo")} 
          className={`w-10 h-10 rounded shadow grid place-items-center text-xl transition-transform hover:scale-105 ${base === "topo" ? "bg-zinc-800 text-white" : "bg-white"}`}
          title="Mapa drogowa"
        >
          🗺️
        </button>
        <button 
          onClick={() => setBase("sat")} 
          className={`w-10 h-10 rounded shadow grid place-items-center text-xl transition-transform hover:scale-105 ${base === "sat" ? "bg-zinc-800 text-white" : "bg-white"}`}
          title="Satelita"
        >
          🛰️
        </button>
      </div>

      <MapContainer
        ref={mapRef}
        center={[50.0614, 19.9383]}
        zoom={14}
        zoomControl={false}
        className="w-full h-full bg-[#eef0f2]"
      >
        <ZoomControl position="bottomright" />
        
        <MapFlyTo position={flyPosition} />

        {base === "topo" ? (
          <TileLayer opacity={0.7} attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        ) : (
          <TileLayer attribution="Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        )}

        {showCircles && displayedSources.map((src) => (
            src.rawAlerts.map((alert, idx) => {
                let lat = alert.lat;
                let lon = alert.lon;
                if ((!lat || !lon) && alert.deviceId) {
                    const sensor = sensorsMap[alert.deviceId];
                    if (sensor) { lat = sensor.lat; lon = sensor.lon; }
                }

                const dist = alert.distance;
                if (!lat || !lon) return null;
                const color = getColorByDistance(dist);

                return (
                    <Circle
                        key={`circle-${src.id}-${alert.deviceId}-${idx}`}
                        center={[lat, lon]}
                        radius={dist} 
                        pathOptions={{
                            color: color,
                            weight: 2,
                            fillColor: color,
                            fillOpacity: 0.15,
                        }}
                        interactive={false}
                    />
                );
            })
        ))}

        {showTriangulation && displayedSources.map((src) => {
            if (src.status !== 'new') return null;
            return src.rawAlerts.map((alert, idx) => {
                let sLat = alert.lat;
                let sLon = alert.lon;
                if ((!sLat || !sLon) && alert.deviceId) {
                    const sensor = sensorsMap[alert.deviceId];
                    if (sensor) { sLat = sensor.lat; sLon = sensor.lon; }
                }
                if (!sLat || !sLon || !src.lat || !src.lon) return null;
                
                return (
                    <Polyline
                        key={`line-${src.id}-${idx}`}
                        positions={[[src.lat, src.lon], [sLat, sLon]]}
                        pathOptions={{
                            color: getColorByDistance(alert.distance),
                            weight: 1,
                            dashArray: '5, 5',
                            opacity: 0.8
                        }}
                    />
                );
            });
        })}

        {showSensors && sensors.map((s) => {
            if (visibleSensorIds && !visibleSensorIds.has(s.id)) {
                return null;
            }
            return (
                <Marker 
                    key={`sensor-${s.id}`} 
                    position={[s.lat, s.lon]} 
                    icon={createSensorIcon()} 
                    zIndexOffset={500}
                >
                  <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
                    <span className="font-mono font-bold text-xs">{s.id}</span>
                  </Tooltip>
                  <Popup>
                      <div className="text-sm font-mono space-y-1">
                        <strong className="block border-b pb-1 mb-1">{s.id}</strong>
                        <div>Lat: {s.lat.toFixed(4)}</div>
                        <div>Lon: {s.lon.toFixed(4)}</div>
                        <div className="text-zinc-500 text-xs mt-1 pt-1 border-t">
                           TS: {s.lastSeen?.replace('T', ' ').replace('Z', '')}
                        </div>
                      </div>
                  </Popup>
                </Marker>
            );
        })}

        {showTriangulation && displayedSources.map((src) => {
             if (!src.lat || !src.lon) return null;
             return (
                <Marker
                    key={`target-${src.id}`}
                    position={[src.lat, src.lon]}
                    icon={createPulsingSourceIcon(src.status)} 
                    zIndexOffset={1000}
                    eventHandlers={{ click: () => onAlertSelect?.(src) }}
                >
                   <Tooltip direction="top" offset={[0, -10]}>
                      Target: <strong>{src.id}</strong>
                   </Tooltip>
                </Marker>
            )
        })}
      </MapContainer>
    </div>
  );
}
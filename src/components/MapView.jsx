import {
  MapContainer,
  TileLayer,
  Popup,
  Polyline,
  CircleMarker,
  useMap
} from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Radio, Sparkles, Layers } from "lucide-react";

const ROUTE_COLORS = [
  "#10b981", // Recommended (Emerald neon)
  "#38bdf8", // Route B (Cyan neon)
  "#f59e0b", // Route C (Amber neon)
  "#c084fc", // Route D (Purple neon)
  "#f43f5e"  // Route E (Rose neon)
];

function MapController({ routes, locations }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (!locations) return;

    const points = [];

    if (locations.from && Number.isFinite(locations.from.latitude)) {
      points.push([locations.from.latitude, locations.from.longitude]);
    }

    if (locations.to && Number.isFinite(locations.to.latitude)) {
      points.push([locations.to.latitude, locations.to.longitude]);
    }

    routes.forEach((route) => {
      if (route.geometry && Array.isArray(route.geometry.coordinates)) {
        route.geometry.coordinates.forEach(([lng, lat]) => {
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            points.push([lat, lng]);
          }
        });
      }
    });

    if (points.length > 1) {
      map.fitBounds(points, {
        padding: [60, 60],
        maxZoom: 15
      });
    }
  }, [map, routes, locations]);

  return null;
}

function MapView({
  routes = [],
  locations = null,
  selectedRouteId = null,
  onSelectRoute = null
}) {
  const defaultCenter = [31.3260, 75.5762]; // Jalandhar default center
  const [mapTheme, setMapTheme] = useState("dark"); // "dark" | "osm"

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  return (
    <div className="map-card-container cyber-glow-map-card">
      {/* MAP HEADER BAR */}
      <div className="map-header-bar">
        <div className="map-header-left">
          <div className="radar-status-dot">
            <span className="dot-pulse-ring" />
            <Radio size={15} className="text-emerald" />
          </div>
          <span className="map-title">Pan-India Geographic Corridor &amp; Trajectory HUD</span>
        </div>

        <div className="map-header-right">
          <span className="map-legend-pills">
            <span className="pill pill-rec">
              <span className="legend-circle bg-emerald" /> Recommended
            </span>
            <span className="pill pill-alt">
              <span className="legend-circle bg-cyan" /> Alternative
            </span>
            <span className="pill pill-incident">
              <span className="legend-circle bg-rose" /> Hazards
            </span>
          </span>

          <button
            type="button"
            className="map-theme-btn"
            onClick={() => setMapTheme(mapTheme === "dark" ? "osm" : "dark")}
            title="Toggle Map Style"
          >
            <Layers size={13} />
            <span>{mapTheme === "dark" ? "Satellite/OSM" : "Dark Cyber"}</span>
          </button>
        </div>
      </div>

      <div className="map-relative-wrapper">
        {/* RADAR SWEEP ANIMATED HUD OVERLAY */}
        <div className="map-radar-hud">
          <div className="hud-radar-scanner">
            <div className="radar-sweep-beam" />
            <div className="radar-grid-ring ring-1" />
            <div className="radar-grid-ring ring-2" />
          </div>
          <div className="hud-telemetry-text">
            <span className="hud-gps-locked">GPS LOCKED</span>
            <span className="hud-coords">
              {locations?.from?.latitude
                ? `${locations.from.latitude.toFixed(2)}°N, ${locations.from.longitude.toFixed(2)}°E`
                : "28.61°N, 77.20°E"}
            </span>
          </div>
        </div>

        {/* SELECTED ROUTE FLOATING CHIP OVER MAP */}
        {selectedRoute && (
          <div className="map-floating-route-chip">
            <div className="floating-chip-title">
              {selectedRoute.recommended && <Sparkles size={13} className="text-emerald" />}
              <strong>{selectedRoute.name}</strong>
              {selectedRoute.roadName && <span>• {selectedRoute.roadName}</span>}
            </div>
            <div className="floating-chip-stats">
              <span>{selectedRoute.distance} km</span>
              <span>•</span>
              <span>{selectedRoute.predictedTime} min</span>
              {selectedRoute.stabilityScore != null && (
                <>
                  <span>•</span>
                  <span className="floating-score">
                    Stability: {selectedRoute.stabilityScore}/100
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <MapContainer
          center={defaultCenter}
          zoom={12}
          scrollWheelZoom={true}
          className={`flow-real-map ${mapTheme === "dark" ? "map-filter-cyber" : ""}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* START MARKER */}
          {locations?.from && (
            <CircleMarker
              center={[locations.from.latitude, locations.from.longitude]}
              radius={10}
              pathOptions={{
                fillColor: "#10b981",
                fillOpacity: 1,
                color: "#ffffff",
                weight: 3
              }}
            >
              <Popup>
                <div className="map-popup">
                  <strong className="text-emerald">🟢 Origin Point</strong>
                  <p>{locations.from.name}</p>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* DESTINATION MARKER */}
          {locations?.to && (
            <CircleMarker
              center={[locations.to.latitude, locations.to.longitude]}
              radius={10}
              pathOptions={{
                fillColor: "#ef4444",
                fillOpacity: 1,
                color: "#ffffff",
                weight: 3
              }}
            >
              <Popup>
                <div className="map-popup">
                  <strong className="text-rose">🔴 Destination</strong>
                  <p>{locations.to.name}</p>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* DRAW CANDIDATE ROUTES */}
          {routes.map((route, idx) => {
            if (!route.geometry?.coordinates) return null;

            const positions = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            const isSelected = selectedRouteId === route.id;
            const isRec = route.recommended;

            // Luminous Color selection
            let strokeColor = isRec
              ? "#10b981"
              : ROUTE_COLORS[(idx % (ROUTE_COLORS.length - 1)) + 1];
            let weight = isRec || isSelected ? 7 : 4;
            let opacity = isRec ? 0.98 : isSelected ? 0.92 : 0.65;

            return (
              <Polyline
                key={route.id || idx}
                positions={positions}
                pathOptions={{
                  color: strokeColor,
                  weight: weight,
                  opacity: opacity,
                  lineCap: "round",
                  lineJoin: "round"
                }}
                eventHandlers={{
                  click: () => {
                    if (onSelectRoute) onSelectRoute(route.id);
                  }
                }}
              >
                <Popup>
                  <div className="map-popup">
                    <h4>
                      {route.name} {route.recommended ? "⭐ (Best Route)" : ""}
                    </h4>
                    <p>
                      <strong>Distance:</strong> {route.distance} km
                    </p>
                    <p>
                      <strong>Current Estimate:</strong> {route.currentTime} min
                    </p>
                    <p>
                      <strong>Predicted Time:</strong> {route.predictedTime} min
                    </p>
                    {route.stabilityScore != null && (
                      <p>
                        <strong>Stability Score:</strong> {route.stabilityScore}/100
                      </p>
                    )}
                    {route.roadName && <p className="subtext">Via {route.roadName}</p>}
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          <MapController routes={routes} locations={locations} />
        </MapContainer>
      </div>
    </div>
  );
}

export default MapView;

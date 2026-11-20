import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap
} from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

const ROUTE_COLORS = [
  "#16a34a", // Recommended or primary
  "#2563eb", // Route B
  "#f59e0b", // Route C
  "#8b5cf6", // Route D
  "#ec4899"  // Route E
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
        padding: [50, 50],
        maxZoom: 15
      });
    }
  }, [map, routes, locations]);

  return null;
}

function MapView({ routes = [], locations = null, selectedRouteId = null, onSelectRoute = null, incidents = [] }) {
  const defaultCenter = [31.3260, 75.5762]; // Jalandhar default center

  return (
    <div className="map-card-container">
      <div className="map-header-bar">
        <span className="map-title">🗺️ Interactive Traffic &amp; Route Map</span>
        <span className="map-legend-pills">
          <span className="pill pill-rec">● Recommended</span>
          <span className="pill pill-alt">● Alternatives</span>
          <span className="pill pill-incident">⚠️ Incident Alert</span>
        </span>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="flow-real-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* START MARKER */}
        {locations?.from && (
          <CircleMarker
            center={[locations.from.latitude, locations.from.longitude]}
            radius={9}
            pathOptions={{ fillColor: "#16a34a", fillOpacity: 1, color: "#ffffff", weight: 3 }}
          >
            <Popup>
              <div className="map-popup">
                <strong>🟢 Starting Location</strong>
                <p>{locations.from.name}</p>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* DESTINATION MARKER */}
        {locations?.to && (
          <CircleMarker
            center={[locations.to.latitude, locations.to.longitude]}
            radius={9}
            pathOptions={{ fillColor: "#dc2626", fillOpacity: 1, color: "#ffffff", weight: 3 }}
          >
            <Popup>
              <div className="map-popup">
                <strong>🔴 Destination</strong>
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

          // Color selection
          let strokeColor = isRec ? "#16a34a" : ROUTE_COLORS[(idx % (ROUTE_COLORS.length - 1)) + 1];
          let weight = isRec || isSelected ? 7 : 4;
          let opacity = isRec ? 0.95 : isSelected ? 0.9 : 0.65;

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
                  <h4>{route.name} {route.recommended ? "⭐ (Best Route)" : ""}</h4>
                  <p><strong>Distance:</strong> {route.distance} km</p>
                  <p><strong>Current Estimate:</strong> {route.currentTime} min</p>
                  <p><strong>Predicted Time:</strong> {route.predictedTime} min</p>
                  {route.stabilityScore != null && (
                    <p><strong>Stability Score:</strong> {route.stabilityScore}/100</p>
                  )}
                  {route.roadName && (
                    <p className="subtext">Via {route.roadName}</p>
                  )}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        <MapController routes={routes} locations={locations} />
      </MapContainer>
    </div>
  );
}

export default MapView;

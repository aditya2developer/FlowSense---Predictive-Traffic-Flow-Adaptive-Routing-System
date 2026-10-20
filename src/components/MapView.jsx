import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";

import { useEffect } from "react";

import "leaflet/dist/leaflet.css";


function MapController({ routes, locations }) {

  const map = useMap();

  useEffect(() => {

    // Give Leaflet time to calculate the
    // actual container size.
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

  }, [map]);


  useEffect(() => {

    if (!locations) {
      return;
    }

    const points = [];

    // Start point
    points.push([
      locations.from.latitude,
      locations.from.longitude
    ]);

    // Destination
    points.push([
      locations.to.latitude,
      locations.to.longitude
    ]);


    // Route points
    routes.forEach((route) => {

      if (
        route.geometry &&
        route.geometry.coordinates
      ) {

        route.geometry.coordinates.forEach(
          ([longitude, latitude]) => {

            points.push([
              latitude,
              longitude
            ]);

          }
        );

      }

    });


    if (points.length > 1) {

      map.fitBounds(points, {
        padding: [40, 40]
      });

    }

  }, [map, routes, locations]);


  return null;
}


function MapView({ routes, locations }) {

  const defaultPosition = [
    31.2533133,
    75.7032788
  ];


  return (

    <div className="map-container">

      <MapContainer
        center={defaultPosition}
        zoom={13}
        scrollWheelZoom={true}
        className="real-map"
        style={{
          height: "100%",
          width: "100%"
        }}
      >

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />


        {/* START */}

        {locations && (

          <Marker
            position={[
              locations.from.latitude,
              locations.from.longitude
            ]}
          >

            <Popup>

              <strong>Start</strong>

              <br />

              {locations.from.name}

            </Popup>

          </Marker>

        )}


        {/* DESTINATION */}

        {locations && (

          <Marker
            position={[
              locations.to.latitude,
              locations.to.longitude
            ]}
          >

            <Popup>

              <strong>Destination</strong>

              <br />

              {locations.to.name}

            </Popup>

          </Marker>

        )}


        {/* ROUTES */}

        {routes.map((route) => {

          if (
            !route.geometry ||
            !route.geometry.coordinates
          ) {
            return null;
          }


          const positions =
            route.geometry.coordinates.map(
              ([longitude, latitude]) => [

                latitude,
                longitude

              ]
            );


          return (

            <Polyline
              key={route.id}
              positions={positions}
              weight={6}
              opacity={0.8}
            />

          );

        })}


        <MapController
          routes={routes}
          locations={locations}
        />

      </MapContainer>

    </div>

  );
}


export default MapView;
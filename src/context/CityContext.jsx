import { createContext, useContext, useState } from "react";
import { findCityEntry } from "../utils/indiaLocations";
import { reverseGeocodeCoords } from "../api";

const CityContext = createContext(null);

const STORAGE_KEY = "flowsense_active_location";

function getInitialLocationState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.city && parsed.state) {
        return { ...parsed, isConfirmed: true };
      }
    }
  } catch {
    // ignore storage errors
  }

  return {
    state: "Delhi (NCT)",
    city: "Delhi NCR",
    lat: 28.6139,
    lon: 77.2090,
    isConfirmed: false
  };
}

export function CityProvider({ children }) {
  const [location, setLocation] = useState(getInitialLocationState);
  const [cityModalOpen, setCityModalOpen] = useState(() => !getInitialLocationState().isConfirmed);
  const [detectingGps, setDetectingGps] = useState(false);

  function selectCity({ state, city, lat, lon }) {
    const matched = findCityEntry(city);
    const next = {
      state: state || matched?.state || "India",
      city: city || matched?.name || "Delhi NCR",
      lat: Number.isFinite(Number(lat)) ? Number(lat) : matched?.lat || 28.6139,
      lon: Number.isFinite(Number(lon)) ? Number(lon) : matched?.lon || 77.2090,
      isConfirmed: true
    };
    setLocation(next);
    setCityModalOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }

  function detectMyCity() {
    if (!navigator.geolocation) return;
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const res = await reverseGeocodeCoords(lat, lon);
          if (res.success && res.data) {
            const matched = findCityEntry(res.data.city);
            selectCity({
              state: matched?.state || res.data.state || "India",
              city: matched?.name || res.data.city || "Delhi NCR",
              lat,
              lon
            });
          } else {
            selectCity({ state: "India", city: "Current GPS City", lat, lon });
          }
        } finally {
          setDetectingGps(false);
        }
      },
      () => setDetectingGps(false),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }

  const cityMeta = findCityEntry(location.city);

  return (
    <CityContext.Provider
      value={{
        activeState: location.state,
        activeCity: location.city,
        cityCoords: { lat: location.lat, lon: location.lon },
        cityMeta,
        isCityConfirmed: location.isConfirmed,
        cityModalOpen,
        openCityModal: () => setCityModalOpen(true),
        closeCityModal: () => setCityModalOpen(false),
        selectCity,
        detectMyCity,
        detectingGps
      }}
    >
      {children}
    </CityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) {
    throw new Error("useCity must be used within a CityProvider");
  }
  return ctx;
}

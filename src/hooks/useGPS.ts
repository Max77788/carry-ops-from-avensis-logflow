import { useState, useCallback } from "react";
import type { GPSCoordinates } from "@/lib/types";

export const useGPS = () => {
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<GPSCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  const captureLocation =
    useCallback(async (): Promise<GPSCoordinates | null> => {
      console.log("[GPS] captureLocation called");

      if (!navigator.geolocation) {
        const errorMsg = "Geolocation is not supported by your browser";
        console.error("[GPS] Geolocation not supported:", errorMsg);
        setError(errorMsg);
        return null;
      }

      setLoading(true);
      setError(null);
      console.log("[GPS] Starting geolocation request...");

      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          console.error("[GPS] Geolocation request timed out after 15 seconds");
          setLoading(false);
          setError("Location request timed out");
          resolve(null);
        }, 15000);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            console.log("[GPS] Position received:", {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });

            const coords: GPSCoordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            };
            setCoordinates(coords);
            setLoading(false);
            setError(null);
            console.log("[GPS] Coordinates set and resolving with:", coords);
            resolve(coords);
          },
          (error) => {
            clearTimeout(timeoutId);
            let errorMsg = "Unable to retrieve your location";
            console.error(
              "[GPS] Geolocation error code:",
              error.code,
              "message:",
              error.message
            );

            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMsg =
                  "Location permission denied. Please enable location access.";
                break;
              case error.POSITION_UNAVAILABLE:
                errorMsg = "Location information unavailable";
                break;
              case error.TIMEOUT:
                errorMsg = "Location request timed out";
                break;
            }
            console.error("[GPS] Error:", errorMsg);
            setError(errorMsg);
            setLoading(false);
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });
    }, []);

  return {
    captureLocation,
    coordinates,
    loading,
    error,
  };
};

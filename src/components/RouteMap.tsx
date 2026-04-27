import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";

interface RouteMapProps {
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  originName?: string;
  destinationName?: string;
}

/**
 * RouteMap Component
 * Displays a map with route between origin and destination points
 * Uses Leaflet for mapping (can be replaced with other map libraries)
 */
export const RouteMap = ({
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  originName = "Origin",
  destinationName = "Destination",
}: RouteMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const hasCoordinates =
    originLat !== undefined &&
    originLng !== undefined &&
    destinationLat !== undefined &&
    destinationLng !== undefined;

  useEffect(() => {
    if (!hasCoordinates || !mapContainer.current) return;

    // Dynamically load Leaflet
    const loadLeaflet = async () => {
      // Check if Leaflet is already loaded
      if ((window as any).L) {
        initializeMap();
        return;
      }

      // Load Leaflet CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);

      // Load Leaflet JS
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.onload = initializeMap;
      document.body.appendChild(script);
    };

    const initializeMap = () => {
      const L = (window as any).L;

      if (!mapContainer.current) return;

      // Create map
      map.current = L.map(mapContainer.current).setView(
        [(originLat! + destinationLat!) / 2, (originLng! + destinationLng!) / 2],
        10
      );

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map.current);

      // Add origin marker (green)
      L.circleMarker([originLat!, originLng!], {
        radius: 8,
        fillColor: "#22c55e",
        color: "#16a34a",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .bindPopup(`<strong>${originName}</strong><br/>Origin Point`)
        .addTo(map.current);

      // Add destination marker (red)
      L.circleMarker([destinationLat!, destinationLng!], {
        radius: 8,
        fillColor: "#ef4444",
        color: "#dc2626",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .bindPopup(`<strong>${destinationName}</strong><br/>Destination Point`)
        .addTo(map.current);

      // Draw line between points
      L.polyline(
        [
          [originLat!, originLng!],
          [destinationLat!, destinationLng!],
        ],
        {
          color: "#3b82f6",
          weight: 3,
          opacity: 0.7,
          dashArray: "5, 5",
        }
      ).addTo(map.current);

      // Fit bounds to show both markers
      const bounds = L.latLngBounds(
        [originLat!, originLng!],
        [destinationLat!, destinationLng!]
      );
      map.current.fitBounds(bounds, { padding: [50, 50] });
    };

    loadLeaflet();

    return () => {
      // Cleanup is handled by Leaflet
    };
  }, [originLat, originLng, destinationLat, destinationLng, hasCoordinates]);

  if (!hasCoordinates) {
    return (
      <Card className="overflow-hidden shadow-md">
        <div className="flex h-64 items-center justify-center bg-muted">
          <div className="text-center">
            <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Coordinates not available
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-md">
      <div className="bg-muted/50 p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Route Map</h3>
        </div>
      </div>
      <div
        ref={mapContainer}
        className="h-96 w-full bg-muted"
        style={{ minHeight: "400px" }}
      />
      <div className="border-t border-border bg-muted/30 p-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-success" />
            <span className="text-muted-foreground">Origin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Destination</span>
          </div>
        </div>
      </div>
    </Card>
  );
};


import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Loader2,
  ArrowRight,
  Truck as TruckIcon,
  MapPin,
  Building2,
} from "lucide-react";
import { useShift } from "@/contexts/ShiftContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { carrierService } from "@/lib/carrierService";
import {
  PICKUP_LOCATIONS,
  CARRIERS,
  getTrucksByCarrier,
} from "@/lib/trucksAndCarriers";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Carrier } from "@/lib/carrierService";

const StartShift = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { startShift } = useShift();
  const [isLoading, setIsLoading] = useState(false);
  const [dbCarriers, setDbCarriers] = useState<Carrier[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<string>("");
  const [selectedTruck, setSelectedTruck] = useState<string>("");
  const [pickupLocation, setPickupLocation] = useState<string>("");

  // Fetch database carriers on mount
  useEffect(() => {
    const fetchCarriers = async () => {
      const data = await carrierService.getAllCarriers();
      setDbCarriers(data);
    };
    fetchCarriers();
  }, []);

  const handleStartShift = async () => {
    if (!selectedCarrier || !selectedTruck || !pickupLocation) {
      return;
    }

    setIsLoading(true);
    try {
      // Get carrier ID from database carriers or use the name directly
      let carrierId = "";
      const dbCarrier = dbCarriers.find((c) => c.name === selectedCarrier);
      if (dbCarrier) {
        carrierId = dbCarrier.id;
      } else {
        // If not in database, try to get or create it
        const result = await carrierService.getOrCreateCarrier(selectedCarrier);
        if (result.success && result.data) {
          carrierId = result.data.id;
        } else {
          throw new Error("Failed to get or create carrier");
        }
      }

      // Get or create truck in database
      const truckResult = await carrierService.getOrCreateTruck(
        selectedTruck,
        carrierId
      );

      if (!truckResult.success || !truckResult.data) {
        throw new Error("Failed to get or create truck");
      }

      const truckId = truckResult.data.id;

      if (carrierId && truckId) {
        startShift(
          selectedCarrier,
          carrierId,
          selectedTruck,
          truckId,
          pickupLocation
        );
        navigate("/driver/profile");
      }
    } catch (error) {
      console.error("Error starting shift:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="bg-primary/10 p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">Start Shift</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your shift details
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Carrier Selection */}
          <div className="space-y-2">
            <Label htmlFor="carrier" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Carrier
            </Label>
            <SearchableSelect
              value={selectedCarrier}
              onValueChange={setSelectedCarrier}
              items={CARRIERS.map((carrier) => ({
                value: carrier,
                label: carrier,
              })).sort((a, b) =>
                a.label.localeCompare(b.label, undefined, {
                  numeric: true,
                  sensitivity: "base",
                })
              )}
              placeholder="Select carrier"
            />
          </div>

          {/* Truck Selection */}
          <div className="space-y-2">
            <Label htmlFor="truck" className="flex items-center gap-2">
              <TruckIcon className="h-4 w-4" />
              Truck
            </Label>
            <SearchableSelect
              value={selectedTruck}
              onValueChange={setSelectedTruck}
              items={getTrucksByCarrier(selectedCarrier)
                .map((truck) => ({
                  value: truck,
                  label: truck,
                }))
                .sort((a, b) =>
                  a.label.localeCompare(b.label, undefined, {
                    numeric: true,
                    sensitivity: "base",
                  })
                )}
              placeholder="Select truck"
            />
          </div>

          {/* Pickup Location */}
          <div className="space-y-2">
            <Label htmlFor="pickup" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Pickup Location
            </Label>
            <Select value={pickupLocation} onValueChange={setPickupLocation}>
              <SelectTrigger
                id="pickup"
                className={cn(!pickupLocation && "border-red-500 border-2")}
              >
                <SelectValue placeholder="Select pickup location" />
              </SelectTrigger>
              <SelectContent>
                {[...PICKUP_LOCATIONS]
                  .sort((a, b) =>
                    a.localeCompare(b, undefined, {
                      numeric: true,
                      sensitivity: "base",
                    })
                  )
                  .map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          {selectedCarrier && selectedTruck && (
            <Card className="bg-muted/50 p-4 border-dashed">
              <p className="text-xs text-muted-foreground mb-2">
                Shift Summary
              </p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-semibold">Carrier:</span>{" "}
                  {selectedCarrier}
                </p>
                <p>
                  <span className="font-semibold">Truck:</span> {selectedTruck}
                </p>
                <p>
                  <span className="font-semibold">Pickup:</span>{" "}
                  {pickupLocation}
                </p>
              </div>
            </Card>
          )}

          {/* Start Shift Button */}
          <Button
            onClick={handleStartShift}
            disabled={
              !selectedCarrier || !selectedTruck || !pickupLocation || isLoading
            }
            className="w-full h-12 text-base font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("startShift.startingShift")}
              </>
            ) : (
              <>
                {t("startShift.startShift")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default StartShift;

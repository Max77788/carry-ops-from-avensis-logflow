import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Header } from "@/components/Header";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { carrierService, type Carrier, type Truck } from "@/lib/carrierService";
import { supabase } from "@/lib/supabase";

const DriverSignUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setDriverProfile } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: (location.state as any)?.email || "",
    carrier_id: "",
    default_truck_id: "",
  });

  // Fetch carriers on component mount
  useEffect(() => {
    const fetchCarriers = async () => {
      const data = await carrierService.getAllCarriers();
      setCarriers(data);
    };
    fetchCarriers();
  }, []);

  // Fetch trucks when carrier is selected
  useEffect(() => {
    if (formData.carrier_id) {
      const fetchTrucks = async () => {
        const data = await carrierService.getAvailableTrucksByCarrier(
          formData.carrier_id
        );
        
        // Check each truck for restrictions
        // Priority: Admin-assigned compliance_status takes precedence over inspection issues
        const trucksWithRestrictions = await Promise.all(
          data.map(async (truck) => {
            // Get compliance_status from the truck record (admin-assigned)
            const { data: truckData } = await supabase
              .from("trucks")
              .select("compliance_status")
              .eq("id", truck.id)
              .single();

            // Admin-assigned status takes priority
            // If admin set to "active" -> truck is NOT restricted (even if there are inspection issues)
            // If admin set to "restricted" -> truck IS restricted
            // If no admin decision (null/undefined) -> check inspection issues as fallback
            let isRestricted = false;
            
            if (truckData?.compliance_status === "restricted") {
              // Admin explicitly marked as restricted
              isRestricted = true;
            } else if (truckData?.compliance_status === "active") {
              // Admin explicitly marked as active - NOT restricted
              isRestricted = false;
            } else {
              // No admin decision - fall back to checking inspection issues
              const { data: latestInspection } = await supabase
                .from("truck_daily_inspections")
                .select("id, inspection_date")
                .eq("truck_id", truck.id)
                .order("inspection_date", { ascending: false })
                .limit(1)
                .single();

              if (latestInspection) {
                // Count "not_working" items
                const { count } = await supabase
                  .from("truck_inspection_item_status")
                  .select("*", { count: "exact", head: true })
                  .eq("inspection_id", latestInspection.id)
                  .eq("status", "not_working");

                isRestricted = (count || 0) > 0;
              }
            }

            return {
              ...truck,
              isRestricted,
              compliance_status: truckData?.compliance_status || null,
            };
          })
        );

        setTrucks(trucksWithRestrictions);
        // Reset truck selection when carrier changes
        setFormData((prev) => ({ ...prev, default_truck_id: "" }));
      };
      fetchTrucks();
    } else {
      setTrucks([]);
    }
  }, [formData.carrier_id]);

  // Database carriers only - sorted alphabetically
  const carriersList = carriers
    .map((carrier) => ({
      value: carrier.id,
      label: carrier.name,
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

  // Available trucks from database (those without assigned drivers) - sorted alphabetically
  // Mark restricted trucks as disabled
  const trucksList = trucks
    .map((truck) => {
      const isRestricted = (truck as any).isRestricted || false;
      let statusLabel = "";
      if (isRestricted) {
        statusLabel = "restricted";
      } else if (truck.status === "inactive") {
        statusLabel = "available";
      } else if (truck.status === "active") {
        statusLabel = "active";
      } else {
        statusLabel = (truck as any).compliance_status || truck.status || "";
      }

      return {
        value: truck.id,
        label: `${truck.truck_id} - ${statusLabel}`,
        disabled: isRestricted, // Disable restricted trucks - they cannot be selected
      };
    })
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if driver already exists
      const existingDriver = await carrierService.getDriverByEmail(
        formData.email
      );

      if (existingDriver) {
        setIsLoading(false);
        return;
      }

      // Create new driver with the selected carrier and truck UUIDs
      const result = await carrierService.createDriver(
        formData.name,
        formData.carrier_id, // Already a UUID from database
        formData.email,
        formData.default_truck_id // Already a UUID from database
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to create driver");
      }

      // Set the truck status to active (truck is now assigned to this driver)
      // Truck status reflects assignment, not driver's shift status:
      // - 'active' = truck is assigned to a driver
      // - 'inactive' = truck is not assigned (available for selection)
      await carrierService.updateTruckStatus(
        formData.default_truck_id,
        "active"
      );

      // Log in the driver
      login("driver", result.data.id);

      // Set driver profile
      setDriverProfile({
        id: result.data.id,
        name: result.data.name,
        carrier_id: result.data.carrier_id,
        default_truck_id: result.data.default_truck_id,
        driver_qr_code: result.data.driver_qr_code,
        status: result.data.status,
        created_at: result.data.created_at,
        updated_at: result.data.updated_at,
      });

      // Redirect based on driver status
      if (result.data.status === "active") {
        navigate("/home");
      } else {
        navigate("/driver/profile");
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex flex-col">
      {/* Header */}
      <Header showHomeButton onHomeClick={() => navigate("/login")} />

      <div className="mx-auto max-w-md p-4 flex-1">
        {/* Content */}

        {/* Sign Up Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t("login.fullName")}*</Label>
              <Input
                id="name"
                placeholder={t("login.johnDoe")}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.emailAddress")}*</Label>
              <Input
                id="email"
                type="email"
                placeholder="driver@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            {/* Carrier */}
            <div className="space-y-2">
              <Label htmlFor="carrier">
                {t("driverSignUp.selectCarrier")}*
              </Label>
              <SearchableSelect
                value={formData.carrier_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, carrier_id: value })
                }
                placeholder={t("driverSignUp.selectCarrier")}
                items={carriersList}
              />
            </div>

            {/* Default Truck */}
            <div className="space-y-2">
              <Label htmlFor="truck">{t("driverSignUp.selectTruck")}*</Label>
              <SearchableSelect
                value={formData.default_truck_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, default_truck_id: value })
                }
                placeholder={t("driverSignUp.selectTruck")}
                items={trucksList}
                disabled={!formData.carrier_id}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={
                isLoading ||
                !formData.name ||
                !formData.email ||
                !formData.carrier_id ||
                !formData.default_truck_id
              }
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {t("login.creatingAccount")}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("login.createAccount")}
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            {t("login.yourUniqueDriverQRCode")}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default DriverSignUp;

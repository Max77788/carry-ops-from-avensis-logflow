import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import {
  ArrowLeft,
  User,
  Truck,
  Building2,
  MapPin,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useShift } from "@/contexts/ShiftContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  CARRIERS,
  getTrucksByCarrier,
  PICKUP_LOCATIONS,
} from "@/lib/trucksAndCarriers";

const DriverInfo = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { driverProfile } = useAuth();
  const { shift, updateShift } = useShift();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    carrier: shift?.carrier || "",
    truck: shift?.truck || "",
    pickupLocation: shift?.pickupLocation || "",
  });

  const handleSave = async () => {
    if (!editData.carrier.trim()) {
      toast({
        title: "Carrier Required",
        description: "Please select a carrier",
        variant: "destructive",
      });
      return;
    }

    if (!editData.truck.trim()) {
      toast({
        title: "Truck Required",
        description: "Please select a truck",
        variant: "destructive",
      });
      return;
    }

    if (!editData.pickupLocation.trim()) {
      toast({
        title: "Pickup Location Required",
        description: "Please enter a pickup location",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      updateShift({
        carrier: editData.carrier,
        truck: editData.truck,
        pickupLocation: editData.pickupLocation,
      });

      toast({
        title: "Shift Updated",
        description: "Your shift information has been updated",
      });

      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update shift information",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      carrier: shift?.carrier || "",
      truck: shift?.truck || "",
      pickupLocation: shift?.pickupLocation || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header
        showHomeButton
        onHomeClick={() => navigate("/driver/dashboard")}
      />

      <main className="mx-auto max-w-2xl p-4 flex-1">
        {/* Edit Button */}
        {!isEditing && (
          <div className="mb-6 flex justify-end">
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              {t("common.edit")}
            </Button>
          </div>
        )}

        {/* Driver Profile Card */}
        <Card className="mb-6 overflow-hidden border-primary/50 bg-primary/5 shadow-md">
          <div className="bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              <h2 className="font-semibold">{t("driverProfile.title")}</h2>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                {t("driverInfo.driverName")}
              </Label>
              <p className="mt-1 text-lg font-semibold">
                {driverProfile?.name || "N/A"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                {t("login.emailAddress")}
              </Label>
              <p className="mt-1 text-lg font-semibold">N/A</p>
            </div>
          </div>
        </Card>

        {/* Shift Information Card */}
        <Card className="overflow-hidden border-blue-500/50 bg-blue-50 shadow-md dark:bg-blue-950/20">
          <div className="bg-blue-100 p-4 dark:bg-blue-900/30">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Truck className="h-5 w-5" />
              <h2 className="font-semibold">Current Shift</h2>
            </div>
          </div>
          <div className="space-y-4 p-4">
            {/* Carrier */}
            <div>
              <Label
                htmlFor="carrier"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Building2 className="h-4 w-4" />
                Carrier
              </Label>
              {isEditing ? (
                <SearchableSelect
                  value={editData.carrier}
                  onValueChange={(value) =>
                    setEditData({ ...editData, carrier: value })
                  }
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
              ) : (
                <p className="mt-1 text-lg font-semibold">
                  {shift?.carrier || "N/A"}
                </p>
              )}
            </div>

            {/* Truck */}
            <div>
              <Label
                htmlFor="truck"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Truck className="h-4 w-4" />
                Truck
              </Label>
              {isEditing ? (
                <SearchableSelect
                  value={editData.truck}
                  onValueChange={(value) =>
                    setEditData({ ...editData, truck: value })
                  }
                  items={getTrucksByCarrier(editData.carrier)
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
              ) : (
                <p className="mt-1 text-lg font-semibold">
                  {shift?.truck || "N/A"}
                </p>
              )}
            </div>

            {/* Pickup Location */}
            <div>
              <Label
                htmlFor="pickupLocation"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <MapPin className="h-4 w-4" />
                Pickup Location
              </Label>
              {isEditing ? (
                <SearchableSelect
                  value={editData.pickupLocation}
                  onValueChange={(value) =>
                    setEditData({
                      ...editData,
                      pickupLocation: value,
                    })
                  }
                  items={PICKUP_LOCATIONS.map((location) => ({
                    value: location,
                    label: location,
                  })).sort((a, b) =>
                    a.label.localeCompare(b.label, undefined, {
                      numeric: true,
                      sensitivity: "base",
                    })
                  )}
                  placeholder="Select pickup location"
                />
              ) : (
                <p className="mt-1 text-lg font-semibold">
                  {shift?.pickupLocation || "N/A"}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 h-12 text-base font-semibold"
                >
                  {isSaving ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin">⏳</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={isSaving}
                  variant="outline"
                  className="flex-1 h-12 text-base font-semibold"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default DriverInfo;

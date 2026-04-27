import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";
import { InspectionHistory } from "@/components/InspectionHistory";
import {
  QrCode,
  LogOut,
  Plus,
  User,
  Truck,
  Building2,
  Download,
  Power,
  Home,
  AlertCircle,
  Moon,
  Sun,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useShift } from "@/contexts/ShiftContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { carrierService } from "@/lib/carrierService";
import { ticketService } from "@/lib/ticketService";
import { supabase } from "@/lib/supabase";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { Ticket } from "@/lib/types";
import { PICKUP_LOCATIONS } from "@/lib/trucksAndCarriers";

const DriverProfile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, driverProfile, logout, updateDriverStatus, setDriverProfile } =
    useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { shift, updateShift } = useShift();
  const [currentTruck, setCurrentTruck] = useState<any | null>(null);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [carrierName, setCarrierName] = useState<string>("");
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const [dbCarriers, setDbCarriers] = useState<any[]>([]);
  const [availableTrucks, setAvailableTrucks] = useState<any[]>([]);
  const [driverEmail, setDriverEmail] = useState<string>("");
  const [driverPhone, setDriverPhone] = useState<string>("");
  const [editFormData, setEditFormData] = useState({
    truck_id: driverProfile?.default_truck_id || "", // UUID
    carrier_id: driverProfile?.carrier_id || "", // UUID
    pickup_location: shift?.pickupLocation || "Primal Materials",
  });

  const trucksForSelect = useMemo(() => {
    if (!currentTruck) return availableTrucks;

    const existsInAvailable = availableTrucks.some(
      (t) => t.id === currentTruck.id
    );

    // If current truck is already in availableTrucks, don't duplicate it
    if (existsInAvailable) return availableTrucks;

    // Otherwise, put current truck at the top
    return [currentTruck, ...availableTrucks];
  }, [currentTruck, availableTrucks]);

  // Load driver data from Supabase and populate form
  useEffect(() => {
    const loadDriverDataFromSupabase = async () => {
      if (!user?.driver_id) return;

      try {
        // Fetch fresh driver data from Supabase
        const dbDriver = await carrierService.getDriverById(user.driver_id);

        if (dbDriver) {
          // Update the driver profile in context with fresh data
          setDriverProfile({
            id: dbDriver.id,
            name: dbDriver.name,
            carrier_id: dbDriver.carrier_id,
            default_truck_id: dbDriver.default_truck_id,
            driver_qr_code: dbDriver.driver_qr_code,
            status: dbDriver.status,
            created_at: dbDriver.created_at,
            updated_at: dbDriver.updated_at,
          });

          // Store email and phone for display
          setDriverEmail(dbDriver.email || "");
          setDriverPhone(dbDriver.phone || "");

          // Fetch truck name from truck_id and get status information
          let currentTruckLocal: any = null;

          if (dbDriver.default_truck_id) {
            const truck = await carrierService.getTruckById(
              dbDriver.default_truck_id
            );
            if (truck) {
              // Get compliance_status and status (admin-assigned)
              const { data: truckData } = await supabase
                .from("trucks")
                .select("compliance_status, status")
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
              
              // Determine display status based on admin-assigned compliance_status
              let displayStatus = "available";
              if (truckData?.compliance_status === "restricted") {
                displayStatus = "restricted";
              } else if (truckData?.compliance_status === "active") {
                displayStatus = "active";
              } else if (truckData?.compliance_status === "inactive") {
                displayStatus = "inactive";
              } else if (isRestricted) {
                displayStatus = "restricted";
              } else if (truckData?.status === "active") {
                displayStatus = "active";
              } else if (truckData?.status === "inactive") {
                displayStatus = "available";
              }

              currentTruckLocal = {
                ...truck,
                isRestricted,
                compliance_status: truckData?.compliance_status || null,
                displayStatus,
              };
              console.log("Found truck:", currentTruckLocal);
            }
          }

          // Fetch all carriers from database
          const carriers = await carrierService.getAllCarriers();
          setDbCarriers(carriers);

          const carrier = carriers.find((c) => c.id === dbDriver.carrier_id);

          if (carrier) {
            setCarrierName(carrier.name);

            console.log("Set edit form data with:", {
              truck_id: dbDriver.default_truck_id || "",
              carrier_id: carrier.id,
              pickup_location: shift?.pickupLocation || "Primal Materials",
            });

            setEditFormData((prev) => ({
              ...prev,
              truck_id: dbDriver.default_truck_id || "", // <-- UUID only
              carrier_id: carrier.id, // UUID
              pickup_location: shift?.pickupLocation || "Primal Materials",
            }));

            setCurrentTruck(currentTruckLocal); // <-- store current truck
          }

          const truckDisplayName = availableTrucks.find(
            (t) => t.id === dbDriver.default_truck_id
          )?.truck_id;

          // Sync with ShiftContext
          updateShift({
            carrier: carrierName,
            truck: truckDisplayName, // Display name for UI
            pickupLocation: editFormData.pickup_location,
          });
        }
      } catch (error) {
        console.error("Error loading driver data from Supabase:", error);
      }
    };

    loadDriverDataFromSupabase();
  }, [user?.driver_id]);

  // Fetch available trucks when carrier changes or periodically to refresh status
  useEffect(() => {
    const loadAvailableTrucks = async () => {
      if (!editFormData.carrier_id) {
        setAvailableTrucks([]);
        return;
      }

      try {
        const trucks = await carrierService.getAvailableTrucksByCarrier(
          editFormData.carrier_id
        );
        
        // Check each truck for restrictions
        // Priority: Admin-assigned compliance_status takes precedence over inspection issues
        const trucksWithRestrictions = await Promise.all(
          trucks.map(async (truck) => {
            // Get compliance_status and status (admin-assigned)
            const { data: truckData } = await supabase
              .from("trucks")
              .select("compliance_status, status")
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
            
            // Determine display status based on admin-assigned compliance_status
            let displayStatus = "available";
            if (truckData?.compliance_status === "restricted") {
              displayStatus = "restricted";
            } else if (truckData?.compliance_status === "active") {
              displayStatus = "active";
            } else if (truckData?.compliance_status === "inactive") {
              displayStatus = "inactive";
            } else if (isRestricted) {
              displayStatus = "restricted";
            } else if (truckData?.status === "active") {
              displayStatus = "active";
            } else if (truckData?.status === "inactive") {
              displayStatus = "available";
            }

            return {
              ...truck,
              isRestricted,
              compliance_status: truckData?.compliance_status || null,
              displayStatus,
            };
          })
        );

        setAvailableTrucks(trucksWithRestrictions);
      } catch (error) {
        console.error("Error fetching available trucks:", error);
        setAvailableTrucks([]);
      }
    };

    loadAvailableTrucks();
    
    // Set up real-time subscription to listen for truck status updates
    if (editFormData.carrier_id && driverProfile?.default_truck_id) {
      const currentTruckId = driverProfile.default_truck_id; // Capture in closure
      const channel = supabase
        .channel(`truck-updates-${currentTruckId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'trucks',
            filter: `id=eq.${currentTruckId}`,
          },
          (payload) => {
            console.log('Truck status updated:', payload);
            // Reload trucks to get updated status
            loadAvailableTrucks();
            // Also reload current truck data
            if (currentTruckId) {
              carrierService.getTruckById(currentTruckId).then((truck) => {
                if (truck) {
                  // Reload truck with status info
                  supabase
                    .from("trucks")
                    .select("compliance_status, status")
                    .eq("id", truck.id)
                    .single()
                    .then(({ data: truckData }) => {
                      const updatedTruck = {
                        ...truck,
                        compliance_status: truckData?.compliance_status || null,
                        status: truckData?.status || truck.status,
                      };
                      setCurrentTruck(updatedTruck);
                    });
                }
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [editFormData.carrier_id, driverProfile?.default_truck_id, driverProfile?.id]);

  useEffect(() => {
    if (!user || user.role !== "driver") {
      navigate("/");
      return;
    }

    const loadActiveTickets = async () => {
      setIsLoadingTickets(true);
      try {
        const allTickets = await ticketService.getAllTickets();

        const active = allTickets.filter(
          (t) =>
            t.driver_id === driverProfile?.id &&
            (t.status === "CREATED" ||
              t.status === "VERIFIED" ||
              t.status === "DELIVERED")
        );

        setActiveTickets(active);
      } catch (error) {
        console.error("Error loading tickets:", error);
      } finally {
        setIsLoadingTickets(false);
      }
    };

    loadActiveTickets();
  }, [user, driverProfile, navigate]);

  /**
   * Toggle driver shift status between active and inactive
   * This controls whether the driver is currently on shift
   * Note: Truck status is NOT affected by driver shift status
   * Truck status only reflects assignment (whether truck is assigned to a driver)
   */
  const handleToggleStatus = async () => {
    if (!driverProfile) return;

    setIsTogglingStatus(true);
    try {
      const newStatus =
        driverProfile.status === "inactive" ? "active" : "inactive";
      const result = await carrierService.updateDriverStatus(
        driverProfile.id,
        newStatus
      );

      if (result.success) {
        updateDriverStatus(newStatus);

        toast({
          title: "Status Updated",
          description: `Status changed to ${newStatus.toUpperCase()}`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleCarrierChange = async (carrierId: string) => {
    if (!driverProfile || !carrierId) return;

    // Check if driver is active - prevent changes
    if (driverProfile.status === "active") {
      toast({
        title: "Cannot Change Carrier",
        description:
          "Please change your status to INACTIVE before changing your carrier.",
        variant: "destructive",
      });
      // Revert the selection back to current carrier
      setEditFormData((prev) => ({
        ...prev,
        carrier_id: driverProfile.carrier_id,
      }));
      return;
    }

    console.log("carrier ID changed to:", carrierId);

    setIsUpdatingProfile(true);
    try {
      // Reset truck_id when carrier changes since trucks are carrier-specific
      const updates: any = {
        carrier_id: carrierId, // Store UUID
        default_truck_id: null, // Clear truck when carrier changes
      };

      // Find the carrier name for display
      const selectedCarrier = dbCarriers.find((c) => c.id === carrierId);
      const carrierNameForShift = selectedCarrier?.name || "";

      const result = await carrierService.updateDriverProfile(
        driverProfile.id,
        updates
      );

      if (result.success && result.data) {
        setDriverProfile(result.data);
        setCarrierName(carrierNameForShift);

        // Reset truck_id in editFormData when carrier changes
        setEditFormData((prev) => ({
          ...prev,
          truck_id: "", // Clear truck selection
        }));

        // Sync with ShiftContext
        updateShift({
          carrier: carrierNameForShift,
          carrier_id: carrierId,
          truck_id: "", // Clear truck in shift context
          truck: "",
          pickupLocation: editFormData.pickup_location,
        });

        console.log("Carrier updated successfully, truck selection cleared");
      } else {
        throw new Error(result.error || "Failed to update carrier");
      }
    } catch (error: any) {
      console.error("Error updating carrier:", error);
      alert(`Error updating carrier: ${error.message}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  /**
   * Handle truck change for driver
   * Process:
   * 1. Prevent changes if driver's shift is active (must be inactive first)
   * 2. Update driver's default_truck_id to new truck
   * 3. Set old truck status to 'inactive' (unassigned, available for other drivers)
   * 4. Set new truck status to 'active' (assigned to this driver)
   * 5. Update shift context with new truck information
   *
   * Note: Truck status reflects assignment, not driver's shift status:
   * - Truck status 'active' = truck is assigned to a driver
   * - Truck status 'inactive' = truck is not assigned (available)
   */
  const handleTruckChange = async (truckUuid: string) => {
    if (!driverProfile || !truckUuid) return;

    // Check if driver's shift is active - prevent changes
    if (driverProfile.status === "active") {
      toast({
        title: "Cannot Change Truck",
        description:
          "Please change your status to INACTIVE before changing your truck.",
        variant: "destructive",
      });
      // Revert the selection back to current truck
      setEditFormData((prev) => ({
        ...prev,
        truck_id: driverProfile.default_truck_id || "",
      }));
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const oldTruckId = driverProfile.default_truck_id;

      // Step 1: Update truck statuses FIRST (before updating driver profile)
      // This ensures data consistency - if truck updates fail, driver profile won't be changed

      // Set old truck to inactive (unassigned, available for other drivers)
      if (oldTruckId) {
        const oldTruckResult = await carrierService.updateTruckStatus(
          oldTruckId,
          "inactive"
        );
        if (!oldTruckResult.success) {
          throw new Error(
            `Failed to update old truck status: ${oldTruckResult.error}`
          );
        }
        console.log(`Old truck ${oldTruckId} set to inactive`);
      }

      // Set new truck status to active (assigned to this driver)
      const newTruckResult = await carrierService.updateTruckStatus(
        truckUuid,
        "active"
      );
      if (!newTruckResult.success) {
        // Rollback: Set old truck back to active if it was changed
        if (oldTruckId) {
          await carrierService.updateTruckStatus(oldTruckId, "active");
        }
        throw new Error(
          `Failed to update new truck status: ${newTruckResult.error}`
        );
      }
      console.log(`New truck ${truckUuid} set to active`);

      // Step 2: Update the driver's default_truck_id
      const updates = {
        default_truck_id: truckUuid, // Store the UUID
      };

      const result = await carrierService.updateDriverProfile(
        driverProfile.id,
        updates
      );

      if (result.success && result.data) {
        setDriverProfile(result.data);

        // Get the truck display name for UI
        const selectedTruck = availableTrucks.find((t) => t.id === truckUuid);
        const truckDisplayName = selectedTruck?.truck_id || "";

        // Get the carrier name for display
        const selectedCarrier = dbCarriers.find(
          (c) => c.id === result.data.carrier_id
        );
        const carrierName = selectedCarrier?.name || "";

        // Sync with ShiftContext
        updateShift({
          carrier: carrierName,
          carrier_id: result.data.carrier_id,
          truck_id: truckUuid, // Store UUID in shift context
          truck: truckDisplayName, // Display name for UI
          pickupLocation: editFormData.pickup_location,
        });

        toast({
          title: "Truck Updated",
          description: `Successfully changed truck`,
        });

        console.log("Truck updated successfully");
      } else {
        throw new Error(result.error || "Failed to update truck");
      }
    } catch (error: any) {
      console.error("Error updating truck:", error);
      toast({
        title: "Error",
        description: `Failed to update truck: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePickupLocationChange = (location: string) => {
    // Get the carrier name for display
    const selectedCarrier = dbCarriers.find(
      (c) => c.id === driverProfile?.carrier_id
    );
    const carrierName = selectedCarrier?.name || "";

    // Get the truck display name for UI
    const selectedTruck = availableTrucks.find(
      (t) => t.id === editFormData.truck_id
    );
    const truckDisplayName = selectedTruck?.truck_id || "";

    // Update ShiftContext immediately for pickup location
    updateShift({
      carrier: carrierName,
      carrier_id: driverProfile?.carrier_id,
      truck_id: editFormData.truck_id,
      truck: truckDisplayName,
      pickupLocation: location,
    });

    console.log("Pickup location updated successfully");
  };

  const handleSaveProfileChanges = async () => {
    if (!driverProfile || !editFormData.truck_id) {
      alert("Please select a truck");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      // First, verify the driver exists in the database
      console.log("Verifying driver exists:", driverProfile.id);
      const dbDriver = await carrierService.getDriverById(driverProfile.id);

      if (!dbDriver) {
        throw new Error("Driver not found in database. Please log in again.");
      }

      console.log("Driver verified:", dbDriver);

      const updates: any = {
        default_truck_id: editFormData.truck_id,
      };

      // If carrier is selected, look up its ID or create it
      let carrierIdForShift = driverProfile.carrier_id;
      let carrierNameForShift = editFormData.carrier_id;

      if (editFormData.carrier_id) {
        const carrierResult = await carrierService.getOrCreateCarrier(
          editFormData.carrier_id
        );
        if (carrierResult.success && carrierResult.data) {
          updates.carrier_id = carrierResult.data.id;
          carrierIdForShift = carrierResult.data.id;
          carrierNameForShift = carrierResult.data.name;
        } else {
          throw new Error(
            carrierResult.error || `Failed to get or create carrier`
          );
        }
      }

      console.log("Updating driver profile with:", {
        driverId: driverProfile.id,
        updates,
      });

      const result = await carrierService.updateDriverProfile(
        driverProfile.id,
        updates
      );

      if (result.success && result.data) {
        setDriverProfile(result.data);

        // Sync with ShiftContext
        updateShift({
          carrier: carrierNameForShift,
          carrier_id: carrierIdForShift,
          truck_id: editFormData.truck_id,
          truck: editFormData.truck_id,
          pickupLocation: editFormData.pickup_location,
        });

        console.log("Profile updated successfully and synced with shift");
      } else {
        throw new Error(result.error || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      alert(`Error updating profile: ${error.message}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!driverProfile) return;

    try {
      // Get the QR code SVG element by ID
      const svgElement = document.getElementById(
        "driver-qr-code"
      ) as SVGElement;
      if (!svgElement) {
        return;
      }

      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 500;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // White background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Title
      ctx.fillStyle = "black";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Driver QR Code", canvas.width / 2, 40);

      // Driver name
      ctx.font = "18px Arial";
      ctx.fillText(driverProfile.name, canvas.width / 2, 80);

      // Convert SVG to image
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      img.onload = () => {
        // Draw QR code centered
        const qrSize = 250;
        const x = (canvas.width - qrSize) / 2;
        const y = 120;
        ctx.drawImage(img, x, y, qrSize, qrSize);

        // QR code text
        ctx.font = "12px monospace";
        ctx.fillStyle = "#666";
        ctx.textAlign = "center";
        ctx.fillText(driverProfile.driver_qr_code, canvas.width / 2, 420);

        // Download
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `driver-qr-${driverProfile.id}.png`;
        link.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgString);
    } catch (error) {
      console.error("Error downloading QR code:", error);
    }
  };

  const handleLogout = () => {
    setShowLogoutWarning(true);
  };

  const confirmLogout = () => {
    logout();
    navigate("/driver/login");
  };

  if (!user || user.role !== "driver") {
    return null;
  }

  if (!driverProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex flex-col">
      {/* Header */}
      <Header
        showHomeButton
        onHomeClick={() => navigate("/home")}
        showLogoutButton
        onLogoutClick={() => setShowLogoutWarning(true)}
      />

      {/* Main Content */}
      <main className="container mx-auto px-3 py-4 md:px-4 md:py-8 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 md:space-y-6 pb-4">
          {/* Status Card 
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Status</h2>
              <Badge
                variant={
                  driverProfile.status === "active" ? "default" : "secondary"
                }
              >
                {driverProfile.status.toUpperCase()}
              </Badge>
            </div>
            <Button
              onClick={handleToggleStatus}
              disabled={isTogglingStatus}
              className="w-full"
              variant={
                driverProfile.status === "active" ? "destructive" : "default"
              }
            >
              <Power className="mr-2 h-4 w-4" />
              {driverProfile.status === "active"
                ? "Finish the Shift"
                : "Start the Shift"}
            </Button>
          </Card>
          */}

          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate("/home")}
          >
            {"Continue to Dashboard ->"}
          </Button>

          {/* Login Information Card */}
          <Card className="p-4 md:p-6">
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-foreground">
                Login Information
              </h3>
              <div className="space-y-2">
                {driverEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-foreground">{driverEmail}</span>
                  </div>
                )}
                {driverPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium text-foreground">{driverPhone}</span>
                  </div>
                )}
                {!driverEmail && !driverPhone && (
                  <p className="text-sm text-muted-foreground">
                    No login information available
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Edit Profile Card */}
          <Card className="p-4 md:p-6 border-primary/50 bg-primary/5">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-foreground">
                My Truck & Carrier
              </h3>

              <div className="space-y-4">
                {/* Carrier Selection - Always Editable */}
                <div>
                  <Label className="text-sm font-medium">Select Carrier*</Label>
                  <SearchableSelect
                    value={editFormData.carrier_id}
                    onValueChange={(value) => {
                      setEditFormData({ ...editFormData, carrier_id: value });
                      handleCarrierChange(value);
                    }}
                    items={dbCarriers
                      .map((carrier) => ({
                        value: carrier.id, // Store UUID
                        label: carrier.name, // Display name
                      }))
                      .sort((a, b) =>
                        a.label.localeCompare(b.label, undefined, {
                          numeric: true,
                          sensitivity: "base",
                        })
                      )}
                    placeholder="Choose a carrier"
                  />
                </div>

                {/* Truck Selection - Always Editable - Only show available trucks */}
                <div>
                  <Label className="text-sm font-medium">Select Truck *</Label>
                  <SearchableSelect
                    value={editFormData.truck_id}
                    onValueChange={(value) => {
                      setEditFormData({ ...editFormData, truck_id: value });
                      handleTruckChange(value);
                    }}
                    items={trucksForSelect
                      .map((truck) => {
                        const status = (truck as any).displayStatus || "available";
                        const isRestricted = (truck as any).isRestricted || false;
                        const label = `${truck.truck_id} - ${status}`;
                        
                        return {
                          value: truck.id, // UUID
                          label: label, // display name with status
                          disabled: isRestricted, // Disable restricted trucks - they cannot be selected
                          isRestricted: isRestricted, // Pass through for styling
                        };
                      })
                      .sort((a, b) =>
                        a.label.localeCompare(b.label, undefined, {
                          numeric: true,
                          sensitivity: "base",
                        })
                      )}
                    placeholder="Choose a truck"
                  />
                </div>

                {/* Pickup Location Selection - Always Editable */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Pickup Location*
                  </Label>
                  <SearchableSelect
                    value={editFormData.pickup_location}
                    onValueChange={(value) => {
                      setEditFormData({
                        ...editFormData,
                        pickup_location: value,
                      });
                      handlePickupLocationChange(value);
                    }}
                    items={PICKUP_LOCATIONS.map((location) => ({
                      value: location,
                      label: location,
                    })).sort((a, b) =>
                      a.label.localeCompare(b.label, undefined, {
                        numeric: true,
                        sensitivity: "base",
                      })
                    )}
                    placeholder="Choose pickup location"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Show different content based on shift status */}
          {true === false ? null : (
            // ACTIVE STATE: Show full dashboard
            <>
              {/* QR Code Card */}
              <Card className="p-4 md:p-6">
                <h2 className="text-base md:text-lg font-bold text-foreground mb-4">
                  My QR Code
                </h2>
                <div className="bg-white p-3 md:p-6 rounded-lg text-center mb-4 flex justify-center">
                  <QRCodeSVG
                    id="driver-qr-code"
                    value={driverProfile.driver_qr_code}
                    size={Math.min(200, window.innerWidth - 80)}
                    level="H"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mb-4 break-all line-clamp-2">
                  {driverProfile.driver_qr_code}
                </p>
                <Button
                  onClick={handleDownloadQR}
                  className="w-full"
                  variant="outline"
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download QR Code
                </Button>
              </Card>

              {/* Inspection History */}
              {driverProfile?.id && (
                <div className="mt-4">
                  <InspectionHistory
                    driverId={driverProfile.id}
                    truckId={driverProfile.default_truck_id || undefined}
                    limit={10}
                  />
                </div>
              )}

              {/* Active Tickets 
              <Card className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  Active Tickets ({activeTickets.length})
                </h2>
                {isLoadingTickets ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : activeTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-3">
                      <div className="rounded-full bg-muted p-3">
                        <AlertCircle className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-muted-foreground font-medium mb-1">
                      No active tickets
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Create a new ticket to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeTickets.map((ticket) => (
                      <div
                        key={ticket.ticket_id}
                        className="p-3 border border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-all hover:shadow-sm active:scale-95"
                        onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                      >
                        <p className="font-medium text-foreground">
                          {ticket.ticket_id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {ticket.destination_site}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              */}

              {/* Action Buttons 
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate("/tickets/create")}
                  className="flex-1"
                  size="lg"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Ticket
                </Button>
                <Button
                  onClick={handleToggleStatus}
                  disabled={isTogglingStatus}
                  variant="destructive"
                  className="flex-1"
                  size="lg"
                >
                  <Power className="mr-2 h-4 w-4" />
                  End Shift
                </Button>
              </div>
              */}
            </>
          )}
        </div>
      </main>

      {/* Logout Warning Dialog */}
      <AlertDialog open={showLogoutWarning} onOpenChange={setShowLogoutWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() => {
                logout();
                navigate("/driver/login");
              }}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Logout
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DriverProfile;

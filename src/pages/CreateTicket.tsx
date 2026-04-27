import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SignaturePad } from "@/components/SignaturePad";
import { TicketImageUpload } from "@/components/TicketImageUpload";
import { Header } from "@/components/Header";
import { Save, Weight, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useShift } from "@/contexts/ShiftContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Ticket } from "@/lib/types";
import { ticketService } from "@/lib/ticketService";
import { carrierService, type Carrier } from "@/lib/carrierService";
import { siteService } from "@/lib/siteService";
import type { PickupSite, DestinationSite } from "@/lib/types";
import {
  CARRIERS,
  PICKUP_LOCATIONS,
  DESTINATION_SITES,
} from "@/lib/trucksAndCarriers";

// Fallback sites (in case database is unavailable)
const FALLBACK_DESTINATION_SITES = DESTINATION_SITES;
const FALLBACK_PICKUP_LOCATIONS = PICKUP_LOCATIONS;

const CreateTicket = () => {
  const navigate = useNavigate();
  const { user, driverProfile } = useAuth();
  const { shift } = useShift();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const truckFromQR = searchParams.get("truck");
  const truckIdFromOverview = searchParams.get("truck_id");
  const carrierIdFromOverview = searchParams.get("carrier_id");
  const truckUuidFromOverview = searchParams.get("truck_uuid");

  const [formData, setFormData] = useState({
    carrier: "",
    carrier_id: "",
    truck_id: truckFromQR || "", // Display name (text)
    truck_uuid: "", // UUID (foreign key)
    driver_id: "",
    driver_name: "",
    pickup_location: "Primal Materials", // Text field (legacy)
    pickup_location_id: "", // Foreign key to pickup_sites
    destination_site: "", // Text field (legacy)
    destination_site_id: "", // Foreign key to destination_sites
    net_weight: "",
    manual_ticket_id: "", // Ticket ID field
  });

  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [availableTrucks, setAvailableTrucks] = useState<any[]>([]);
  const [pickupSites, setPickupSites] = useState<PickupSite[]>([]);
  const [destinationSites, setDestinationSites] = useState<DestinationSite[]>(
    []
  );
  const [
    hasShownActiveTicketNotification,
    setHasShownActiveTicketNotification,
  ] = useState(false);
  const [hasActiveTicket, setHasActiveTicket] = useState(false);
  const [truckHasActiveTicket, setTruckHasActiveTicket] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string>("");
  const [ticketImage, setTicketImage] = useState<File | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [truckNameDisplay, setTruckNameDisplay] = useState<string>("");
  const [isFromOverview, setIsFromOverview] = useState(false);
  const [assignedDriverId, setAssignedDriverId] = useState<string>("");
  const [assignedDriverName, setAssignedDriverName] = useState<string>("");

  // Check for existing draft on component mount
  useEffect(() => {
    const draftData = localStorage.getItem("ticketDraft");
    if (draftData) {
      setHasDraft(true);
    }
  }, []);

  // Fetch carriers, pickup sites, and destination sites on component mount
  useEffect(() => {
    const fetchData = async () => {
      const carriersData = await carrierService.getAllCarriers();
      setCarriers(carriersData);

      const pickupSitesData = await siteService.getPickupSites();
      if (pickupSitesData.length > 0) {
        setPickupSites(pickupSitesData);
      }

      const destinationSitesData = await siteService.getDestinationSites();
      if (destinationSitesData.length > 0) {
        setDestinationSites(destinationSitesData);
      }
    };
    fetchData();
  }, []);

  // Fetch available trucks when carrier changes
  useEffect(() => {
    const loadAvailableTrucks = async () => {
      if (!formData.carrier_id) {
        setAvailableTrucks([]);
        return;
      }

      try {
        const trucks = await carrierService.getAvailableTrucksByCarrier(
          formData.carrier_id
        );
        setAvailableTrucks(trucks);
      } catch (error) {
        console.error("Error fetching available trucks:", error);
        setAvailableTrucks([]);
      }
    };

    loadAvailableTrucks();
  }, [formData.carrier_id]);

  // Handle truck data from Overview page
  useEffect(() => {
    const loadTruckDataFromOverview = async () => {
      if (truckIdFromOverview && carrierIdFromOverview) {
        setIsFromOverview(true);

        // Find the carrier name
        const carrier = carriers.find((c) => c.id === carrierIdFromOverview);
        const carrierName = carrier?.name || "";

        // Set form data with truck and carrier info
        setFormData((prev) => ({
          ...prev,
          truck_id: truckIdFromOverview, // Display name
          truck_uuid: truckUuidFromOverview || "", // UUID
          carrier: carrierName,
          carrier_id: carrierIdFromOverview,
          driver_name: "", // Will be populated by auto-assignment
          driver_id: "", // Will be populated by auto-assignment
        }));

        // Find the current driver assigned to this truck
        if (truckUuidFromOverview) {
          try {
            const drivers = await carrierService.getDriversByCarrier(
              carrierIdFromOverview
            );
            // Find driver with this truck as default
            const assignedDriver = drivers.find(
              (d) => d.default_truck_id === truckUuidFromOverview
            );
            if (assignedDriver) {
              setAssignedDriverId(assignedDriver.id);
              setAssignedDriverName(assignedDriver.name);
              setFormData((prev) => ({
                ...prev,
                driver_id: assignedDriver.id,
                driver_name: assignedDriver.name,
              }));
            }
          } catch (error) {
            console.error("Error finding driver for truck:", error);
          }
        }
      }
    };

    if (truckIdFromOverview && carrierIdFromOverview && carriers.length > 0) {
      loadTruckDataFromOverview();
    }
  }, [
    truckIdFromOverview,
    carrierIdFromOverview,
    truckUuidFromOverview,
    carriers,
  ]);

  // Load driver data on mount
  useEffect(() => {
    const loadData = async () => {
      // Skip if data is coming from Overview page
      if (isFromOverview) {
        return;
      }

      // If driver is logged in, auto-fill their data
      if (user?.role === "driver" && driverProfile) {
        // Get the carrier name from the carrier ID
        let carrierName = "";
        let carrierId = "";

        // First, check if there's an active shift
        if (shift.isActive && shift.carrier) {
          carrierName = shift.carrier;
          carrierId = shift.carrier_id || "";
        } else if (driverProfile.carrier_id) {
          // Fall back to driver profile carrier
          const carrier = carriers.find(
            (c) => c.id === driverProfile.carrier_id
          );
          carrierName = carrier?.name || "";
          carrierId = driverProfile.carrier_id;
        }

        // Get the truck name and UUID from active shift or QR code
        let truckName = "";
        let truckUuid = "";

        if (truckFromQR) {
          truckName = truckFromQR;
          // For QR code, we need to look up the truck UUID
          // This is a display name, not a UUID
        } else if (shift.isActive && shift.truck_id) {
          // Use truck from active shift
          truckName = shift.truck_id;
          // shift.truck_id might be display name or UUID, need to check
        } else if (driverProfile.default_truck_id) {
          // Fall back to driver profile default truck
          truckUuid = driverProfile.default_truck_id; // This is the UUID
          // Fetch the truck display name from Supabase
          try {
            const truck = await carrierService.getTruckById(truckUuid);
            if (truck) {
              truckName = truck.truck_id; // Display name
            } else {
              truckName = truckUuid;
            }
          } catch (error) {
            console.error("Error fetching truck name:", error);
            truckName = truckUuid;
          }
        }

        // Get pickup location from shift (even if shift is not active, pickup location might be stored)
        const pickupLocation = shift.pickupLocation || "";

        console.log("CreateTicket loading data:", {
          carrierName,
          truckName,
          pickupLocation,
          shiftActive: shift.isActive,
        });

        setFormData((prev) => ({
          ...prev,
          carrier: carrierName,
          carrier_id: carrierId,
          truck_id: truckName, // Display name
          truck_uuid: truckUuid, // UUID
          driver_id: driverProfile.id,
          driver_name: driverProfile.name,
          pickup_location: pickupLocation,
        }));
      }
    };
    loadData();
  }, [user, driverProfile, carriers, truckFromQR, shift, isFromOverview]);

  // Check for active tickets only once when driver profile is loaded
  useEffect(() => {
    const checkActiveTickets = async () => {
      if (
        user?.role === "driver" &&
        driverProfile?.id &&
        !hasShownActiveTicketNotification
      ) {
        const activeTickets = await ticketService.getActiveTicketsByDriver(
          driverProfile.id
        );
        if (activeTickets.length > 0) {
          setHasActiveTicket(true);
        }
        setHasShownActiveTicketNotification(true);
      }
    };
    checkActiveTickets();
  }, [driverProfile?.id, hasShownActiveTicketNotification]);

  // Check if truck has active tickets when coming from Overview
  useEffect(() => {
    const checkTruckActiveTickets = async () => {
      if (isFromOverview && truckUuidFromOverview) {
        const activeTickets = await ticketService.getActiveTicketsByTruck(
          truckUuidFromOverview
        );
        if (activeTickets.length > 0) {
          setTruckHasActiveTicket(true);
          setActiveTicketId(activeTickets[0].ticket_id);
          toast({
            title: "Truck Busy",
            description: `This truck is currently fulfilling ticket ${activeTickets[0].ticket_id}. Cannot create a new ticket.`,
            variant: "destructive",
          });
          // Redirect back to scale-house page after a short delay
          setTimeout(() => {
            navigate("/scale-house");
          }, 3000);
        }
      }
    };
    checkTruckActiveTickets();
  }, [isFromOverview, truckUuidFromOverview, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for active tickets if driver is logged in
    if (user?.role === "driver" && driverProfile?.id) {
      const activeTickets = await ticketService.getActiveTicketsByDriver(
        driverProfile.id
      );
      if (activeTickets.length > 0) {
        return;
      }
    }

    // Check if truck has active tickets (for Overview page flow)
    if (formData.truck_uuid) {
      const truckActiveTickets = await ticketService.getActiveTicketsByTruck(
        formData.truck_uuid
      );
      if (truckActiveTickets.length > 0) {
        toast({
          title: "Truck Busy",
          description: `This truck is currently fulfilling ticket ${truckActiveTickets[0].ticket_id}. Cannot create a new ticket.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Validation
    if (!formData.carrier) {
      return;
    }

    if (!formData.truck_id) {
      return;
    }

    // Only require driver if NOT coming from Overview page
    const hasUrlParams =
      truckIdFromOverview || carrierIdFromOverview || truckUuidFromOverview;

    if (
      !hasUrlParams &&
      (!formData.driver_name || formData.driver_name === "To be defined later")
    ) {
      toast({
        title: "Driver Required",
        description:
          "Cannot create a ticket for a truck without an assigned driver",
        variant: "destructive",
      });
      return;
    }

    if (!formData.destination_site) {
      toast({
        title: "Missing Required Field",
        description: "Please select a destination site",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Create ticket with foreign keys (truck_uuid, driver_id, origin_site_id, destination_site_id)
    // Carrier name will be fetched via: truck_uuid -> trucks.carrier_id -> carriers.name
    // Driver name will be fetched via: driver_id -> drivers.name
    // Origin site name will be fetched via: origin_site_id -> pickup_sites.name
    // Destination site name will be fetched via: destination_site_id -> destination_sites.name
    const ticket: Ticket = {
      ticket_id: `TKT-${Date.now()}`,
      truck_qr_id: `TRUCK-${formData.truck_id}`,
      truck_id: formData.truck_uuid, // UUID (foreign key to trucks table)
      product: "", // Optional field, left empty
      origin_site: formData.pickup_location, // Text field (legacy, kept for backward compatibility)
      destination_site: formData.destination_site, // Text field (legacy, kept for backward compatibility)
      origin_site_id: formData.pickup_location_id || undefined, // Foreign key to pickup_sites
      destination_site_id: formData.destination_site_id || undefined, // Foreign key to destination_sites
      net_weight: parseFloat(formData.net_weight) || 0,
      scale_operator_signature: signature,
      status: "VERIFIED",
      created_at: new Date().toISOString(),
      verified_at_scale: new Date().toISOString(),
      manual_ticket_id: formData.manual_ticket_id || undefined, // Optional ticket ID
      // Removed denormalized fields - use FKs instead:
      // carrier: formData.carrier,
      // carrier_id: formData.carrier_id,
      // driver_name: formData.driver_name,
      driver_id: formData.driver_id,
    };

    const result = await ticketService.createTicket(
      ticket,
      ticketImage || undefined
    );

    setIsSubmitting(false);

    if (result.success) {
      // Clear the draft after successful submission
      localStorage.removeItem("ticketDraft");
      setHasDraft(false);

      // Show success toast
      toast({
        title: "Ticket Created Successfully",
        description: `Ticket has been created for truck ${formData.truck_id}`,
        variant: "default",
      });

      // Determine redirect destination based on how the page was opened
      // If URL parameters are present (truck_id, carrier_id, truck_uuid), it means
      // the page was opened from the scale house page, so redirect back there
      const hasUrlParams =
        truckIdFromOverview || carrierIdFromOverview || truckUuidFromOverview;

      // Wait for ticket to be fully registered in Supabase before redirecting
      setTimeout(() => {
        if (hasUrlParams) {
          // Redirect to scale house page if opened via URL parameters (from scale house)
          navigate(`/scale-house`);
        } else {
          // For drivers creating tickets normally, redirect to home/dashboard
          if (user?.role === "driver") {
            navigate(`/home`);
          } else {
            // For other users (attendants, carriers), redirect to scale house
            navigate(`/scale-house`);
          }
        }
      }, 700);
    }
  };

  const saveDraft = () => {
    const draft = {
      formData,
      signature,
      ticketImage: ticketImage ? ticketImage.name : null,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem("ticketDraft", JSON.stringify(draft));
    setHasDraft(true);
    toast({
      title: "Draft Saved",
      description: "Your ticket draft has been saved. You can continue later.",
    });
  };

  const loadDraft = () => {
    const draftData = localStorage.getItem("ticketDraft");
    if (draftData) {
      const draft = JSON.parse(draftData);
      setFormData(draft.formData);
      setSignature(draft.signature);
      toast({
        title: "Draft Loaded",
        description: "Your saved draft has been loaded.",
      });
    }
  };

  const deleteDraft = () => {
    localStorage.removeItem("ticketDraft");
    setHasDraft(false);
    toast({
      title: "Draft Deleted",
      description: "Your ticket draft has been deleted.",
    });
  };

  // Force re-render when driver status changes
  const [driverStatus, setDriverStatus] = useState<string | undefined>(
    driverProfile?.status
  );

  useEffect(() => {
    setDriverStatus(driverProfile?.status);
  }, [driverProfile?.status]);

  // Check if driver is inactive
  const isDriverInactive =
    user?.role === "driver" && driverStatus === "inactive";

  // Check if shift has all required fields (carrier, truck, pickup location)
  // Also check driverProfile as fallback in case shift context is not populated
  const isShiftComplete =
    user?.role === "driver"
      ? (shift.carrier && shift.truck_id && shift.pickupLocation) ||
        (driverProfile?.carrier_id && driverProfile?.default_truck_id)
      : true;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header
        showSettingsButton
        onSettingsClick={() => navigate("/driver/profile")}
        showHomeButton
        onHomeClick={() => navigate("/")}
      />

      {/* Main Content */}
      <main className="container mx-auto px-3 py-4 md:px-4 md:py-6 flex-1 overflow-y-auto">
        {/* Driver Inactive Warning */}
        {isDriverInactive && (
          <div className="mx-auto max-w-2xl mb-4 md:mb-6">
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
              <div className="p-3 md:p-4">
                <p className="text-xs md:text-sm font-medium text-red-900 dark:text-red-100">
                  ⛔ {t("createTicket.driverInactiveWarningFull")}
                </p>
                <Button
                  onClick={() => navigate("/")}
                  className="mt-3 w-full"
                  variant="default"
                  size="sm"
                >
                  {t("common.home")}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Shift Not Complete Warning */}
        {!isShiftComplete && !isDriverInactive && (
          <div className="mx-auto max-w-2xl mb-4 md:mb-6">
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <div className="p-3 md:p-4">
                <p className="text-xs md:text-sm font-medium text-amber-900 dark:text-amber-100">
                  ⚠️ Please complete your shift setup (carrier, truck, and
                  pickup location) at your profile page to create tickets.
                </p>
                <Button
                  onClick={() => navigate("/driver/profile")}
                  className="mt-3 w-full"
                  variant="default"
                  size="sm"
                >
                  Go to Profile
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-2xl space-y-4 md:space-y-6 pb-4"
        >
          {/* Truck Info - Compact for Mobile */}
          <Card className="overflow-hidden shadow-md">
            {/*
            <div className="bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-primary">
                <TruckIcon className="h-5 w-5" />
                <h2 className="font-semibold">Truck Information</h2>
              </div>
            </div>
            */}
            <div className="space-y-3 p-3 md:p-4">
              {/* Always in row layout for Carrier, Truck, Driver */}
              <div className="grid grid-cols-3 gap-2">
                {/* Carrier - Read-only for drivers and when from Overview */}
                <div className="min-w-0">
                  <Label htmlFor="carrier" className="text-xs">
                    {t("createTicket.carrier")}
                  </Label>
                  {user?.role === "driver" || isFromOverview ? (
                    <div className="mt-1 rounded border border-border bg-muted p-1 text-xs text-foreground truncate">
                      {formData.carrier || t("createTicket.notAssigned")}
                    </div>
                  ) : (
                    <SearchableSelect
                      value={formData.carrier}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          carrier: value,
                          truck_id: "", // Clear truck when carrier changes
                        })
                      }
                      placeholder="Select"
                      items={[
                        // Database carriers
                        ...carriers.map((carrier) => ({
                          value: carrier.name,
                          label: carrier.name,
                        })),
                        // Static carriers not in database
                        ...CARRIERS.filter(
                          (staticCarrier) =>
                            !carriers.some(
                              (dbCarrier) => dbCarrier.name === staticCarrier
                            )
                        ).map((carrier) => ({
                          value: carrier,
                          label: carrier,
                        })),
                      ].sort((a, b) =>
                        a.label.localeCompare(b.label, undefined, {
                          numeric: true,
                          sensitivity: "base",
                        })
                      )}
                    />
                  )}
                </div>

                {/* Truck ID - Read-only for drivers and when from Overview */}
                <div className="min-w-0">
                  <Label htmlFor="truck_id" className="text-xs">
                    {t("createTicket.truckID")}
                  </Label>
                  {user?.role === "driver" || isFromOverview ? (
                    <div className="mt-1 rounded border border-border bg-muted p-1 text-xs text-foreground truncate">
                      {formData.truck_id || t("createTicket.notAssigned")}
                    </div>
                  ) : (
                    <SearchableSelect
                      value={formData.truck_id}
                      onValueChange={(value) => {
                        // Find the selected truck to get its UUID
                        const selectedTruck = availableTrucks.find(
                          (truck) => truck.truck_id === value
                        );
                        setFormData({
                          ...formData,
                          truck_id: value, // Display name
                          truck_uuid: selectedTruck?.id || "", // UUID
                        });
                      }}
                      placeholder="Select Truck"
                      className={cn(
                        !formData.truck_id && "border-red-500 border-2"
                      )}
                      items={availableTrucks
                        .map((truck) => ({
                          value: truck.truck_id,
                          label: truck.truck_id,
                        }))
                        .sort((a, b) =>
                          a.label.localeCompare(b.label, undefined, {
                            numeric: true,
                            sensitivity: "base",
                          })
                        )}
                    />
                  )}
                </div>

                {/* Driver - Read-only for drivers and when from Overview */}
                <div className="min-w-0">
                  <Label htmlFor="driver_name" className="text-xs">
                    {t("createTicket.driver")}
                  </Label>
                  {user?.role === "driver" || isFromOverview ? (
                    <div className="mt-1 rounded border border-border bg-muted p-1 text-xs text-foreground truncate">
                      {formData.driver_name || "To be defined later"}
                    </div>
                  ) : (
                    <Input
                      id="driver_name"
                      name="driver_name"
                      type="text"
                      value={formData.driver_name}
                      onChange={handleChange}
                      placeholder="Driver"
                      className="mt-1 text-xs"
                    />
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Destination Site & Pickup Location */}
          <Card className="shadow-md">
            <div className="space-y-4 p-4">
              <div>
                <Label htmlFor="pickup_location">
                  {t("createTicket.pickupLocation")}
                </Label>
                <SearchableSelect
                  value={formData.pickup_location}
                  onValueChange={(value) => {
                    // Find the selected pickup site to get its ID
                    const selectedSite = pickupSites.find(
                      (site) => site.name === value
                    );
                    setFormData({
                      ...formData,
                      pickup_location: value,
                      pickup_location_id: selectedSite?.id || "",
                    });
                  }}
                  placeholder="Select pickup location"
                  items={pickupSites
                    .map((site) => ({
                      value: site.name,
                      label: site.name,
                    }))
                    .sort((a, b) =>
                      a.label.localeCompare(b.label, undefined, {
                        numeric: true,
                        sensitivity: "base",
                      })
                    )}
                />
              </div>
              <div>
                <Label htmlFor="destination_site">
                  {t("createTicket.destinationSite")}
                </Label>
                <SearchableSelect
                  value={formData.destination_site}
                  onValueChange={(value) => {
                    // Find the selected destination site to get its ID
                    const selectedSite = destinationSites.find(
                      (site) => site.name === value
                    );
                    setFormData({
                      ...formData,
                      destination_site: value,
                      destination_site_id: selectedSite?.id || "",
                    });
                  }}
                  placeholder="Select destination site"
                  items={destinationSites
                    .map((site) => ({
                      value: site.name,
                      label: site.name,
                    }))
                    .sort((a, b) =>
                      a.label.localeCompare(b.label, undefined, {
                        numeric: true,
                        sensitivity: "base",
                      })
                    )}
                />
              </div>
            </div>
          </Card>

          {/* Transaction ID */}
          <Card className="overflow-hidden shadow-md">
            <div className="space-y-4 p-4">
              <div>
                <Label
                  htmlFor="manual_ticket_id"
                  className="text-sm font-medium"
                >
                  Transaction ID (Optional)
                </Label>
                <Input
                  id="manual_ticket_id"
                  name="manual_ticket_id"
                  type="text"
                  value={formData.manual_ticket_id}
                  onChange={handleChange}
                  placeholder="Enter transaction ID"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional identifier for this ticket
                </p>
              </div>
            </div>
          </Card>

          {/* Weight Info */}
          <Card className="overflow-hidden shadow-md">
            <div className="bg-success/5 p-4">
              <div className="flex items-center gap-2 text-success">
                <Weight className="h-5 w-5" />
                <h2 className="font-semibold">
                  {t("createTicket.netWeight")} (tons) *
                </h2>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <Input
                  id="net_weight"
                  name="net_weight"
                  type="number"
                  step="0.01"
                  value={formData.net_weight}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className={cn(
                    "mt-1",
                    !formData.net_weight && "border-red-500 border-2"
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Ticket Image Upload - For all users to store ticket images 
          <TicketImageUpload onImageSelected={setTicketImage} />
          */}

          {/* Signature - Optional 
          <SignaturePad
            onSave={setSignature}
            label="Scale Operator Signature (Optional)"
          />
          */}

          {signature && (
            <Card className="overflow-hidden shadow-md">
              <div className="p-4">
                <Label className="mb-2 block">Signature Preview</Label>
                <img
                  src={signature}
                  alt="Operator signature"
                  className="h-32 w-full rounded border border-border object-contain bg-white"
                />
              </div>
            </Card>
          )}

          {/* Draft Notification */}
          {hasDraft && (
            <Card className="overflow-hidden shadow-md border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <div className="p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100 mb-3">
                  You have a saved draft ticket. Would you like to load it?
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadDraft}
                    className="flex-1"
                  >
                    Load Draft
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deleteDraft}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Draft
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Button Group */}
          <div className="flex gap-2">
            {/* Save as Draft Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 shadow-lg transition-all"
              onClick={saveDraft}
            >
              <Save className="mr-2 h-5 w-5" />
              {t("createTicket.saveAsDraft")}
            </Button>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="flex-1 shadow-lg transition-all"
              disabled={
                isSubmitting ||
                hasActiveTicket ||
                truckHasActiveTicket ||
                !isShiftComplete ||
                isDriverInactive ||
                !formData.destination_site ||
                // Only require driver if NOT from Overview
                (!isFromOverview &&
                  (!formData.driver_name ||
                    formData.driver_name === "To be defined later"))
              }
              title={
                truckHasActiveTicket
                  ? `Truck is busy with ticket ${activeTicketId}`
                  : !isFromOverview &&
                    (!formData.driver_name ||
                      formData.driver_name === "To be defined later")
                  ? "Truck must have an assigned driver"
                  : isDriverInactive
                  ? t("createTicket.driverInactiveWarning")
                  : !isShiftComplete
                  ? t("createTicket.completeShiftSetup")
                  : hasActiveTicket
                  ? t("createTicket.activeTicketWarning")
                  : ""
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t("createTicket.creatingTicket")}
                </>
              ) : hasActiveTicket ? (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  {t("createTicket.completeActiveTicketFirst")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  {t("createTicket.activateTicket")}
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateTicket;

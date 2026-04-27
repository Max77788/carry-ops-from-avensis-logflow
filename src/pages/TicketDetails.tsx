import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { SignaturePad } from "@/components/SignaturePad";
import { RouteMap } from "@/components/RouteMap";
import { Header } from "@/components/Header";
import { useGPS } from "@/hooks/useGPS";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  MapPin,
  Calendar,
  User,
  CheckCircle,
  Loader2,
  Navigation,
  Upload,
  Camera,
  X,
  Download,
  ArrowLeft,
} from "lucide-react";
import type { Ticket } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import { ticketService } from "@/lib/ticketService";
import { toast } from "@/hooks/use-toast";
import { CARRIER_VEHICLES_MAP } from "@/lib/trucksAndCarriers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Helper function to parse GPS coordinates
const parseGPS = (gpsString?: string) => {
  if (!gpsString) return null;
  const [lat, lng] = gpsString.split(",").map((v) => parseFloat(v.trim()));
  return isNaN(lat) || isNaN(lng) ? null : { lat, lng };
};

// Helper function to open Google Maps with directions
const openGoogleMaps = (lat: number, lng: number, label?: string) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  window.open(url, "_blank");
};

// Helper function to get carrier name from ticket
const getCarrierName = (ticket: Ticket): string => {
  if (!ticket.carrier) return "-";

  // If carrier is already a name (not a UUID), return it
  if (!ticket.carrier.includes("-")) {
    return ticket.carrier;
  }

  // If it's a UUID, try to find the carrier name from the mapping
  // This is a fallback - ideally the carrier field should already contain the name
  return ticket.carrier;
};

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (copied) return;
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Delivery confirmation state
  const [signature, setSignature] = useState<string | null>(null);
  const [confirmerName, setConfirmerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const { captureLocation, coordinates, loading, error } = useGPS();

  // Image upload state
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);

  // Destination attendant section state
  const [showAttendantSection, setShowAttendantSection] = useState(false);

  // Driver sign-off section state
  const [showDriverSignOff, setShowDriverSignOff] = useState(false);
  const [driverSignature, setDriverSignature] = useState<string | null>(null);
  const [driverConfirmerName, setDriverConfirmerName] = useState("");
  const [isSigningOff, setIsSigningOff] = useState(false);

  useEffect(() => {
    const loadTicket = async () => {
      if (id) {
        // Check if ticket was passed via navigation state
        const state = location.state as { ticket?: Ticket } | null;
        /*if (state?.ticket) {
          console.log("Ticket passed via navigation state:", state.ticket);
          setTicket(state.ticket);
        } else { */
        console.log("Fetching ticket from service...");
        // Otherwise fetch from service
        const found = await ticketService.getTicket(id);

        console.log("Found ticket:", found);

        setTicket(found);
      }
    };
    loadTicket();
  }, [id]);

  const handleDeliver = async () => {
    if (!signature) {
      toast({
        title: "Signature Required",
        description: "Please provide receiver signature",
        variant: "destructive",
      });
      return;
    }

    if (!confirmerName.trim()) {
      toast({
        title: "Confirmer Name Required",
        description: "Please enter the name of the person confirming delivery",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    console.log("[DELIVER] Starting delivery confirmation...");

    // Add a small delay before capturing location to ensure GPS is ready
    console.log("[DELIVER] Waiting 500ms for GPS to initialize...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Capture location automatically when confirming
    console.log("[DELIVER] Calling captureLocation()...");
    let capturedCoords = await captureLocation();
    console.log("[DELIVER] captureLocation returned:", capturedCoords);
    console.log("[DELIVER] coordinates state:", coordinates);

    // If function returned null but state has coordinates, use state
    // This handles the race condition where GPS succeeds after promise resolves
    if (!capturedCoords && coordinates) {
      console.log("[DELIVER] Using state coordinates due to timing issue");
      capturedCoords = coordinates;
    }

    // If still no coordinates, retry once more
    if (!capturedCoords) {
      console.log(
        "[DELIVER] First attempt failed, retrying after 2 seconds..."
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      capturedCoords = await captureLocation();
      console.log("[DELIVER] Second attempt returned:", capturedCoords);

      // Again, check state if return is null
      if (!capturedCoords && coordinates) {
        console.log("[DELIVER] Using state coordinates from second attempt");
        capturedCoords = coordinates;
      }
    }

    // Check if location was captured
    if (!capturedCoords) {
      console.error("[DELIVER] No coordinates captured after retry!");
      setIsSubmitting(false);
      toast({
        title: "Location Required",
        description:
          "Failed to capture your location. Please ensure location services are enabled and try again.",
        variant: "destructive",
      });
      return;
    }
    console.log("[DELIVER] Location captured successfully:", capturedCoords);

    const result = await ticketService.updateTicket(id!, {
      destination_signature: signature,
      delivery_gps: `${capturedCoords.latitude},${capturedCoords.longitude}`,
      delivered_at: new Date().toISOString(),
      status: "CLOSED",
      confirmer_name: confirmerName.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Delivery Confirmed",
        description: `Ticket ${id} is marked as delivered`,
      });
      // Show success animation
      setShowSuccessAnimation(true);
      // Redirect after animation completes (3 seconds)
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } else {
      toast({
        title: "Error",
        description: "Failed to update ticket. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDriverSignOff = async () => {
    if (!driverSignature) {
      toast({
        title: "Signature Required",
        description: "Please provide your signature to sign off the ticket",
        variant: "destructive",
      });
      return;
    }

    if (!driverConfirmerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to sign off the ticket",
        variant: "destructive",
      });
      return;
    }

    setIsSigningOff(true);
    console.log("[SIGNOFF] Starting driver sign-off...");

    // Add a small delay before capturing location to ensure GPS is ready
    console.log("[SIGNOFF] Waiting 500ms for GPS to initialize...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Capture location simultaneously with sign-off
    console.log("[SIGNOFF] Calling captureLocation()...");
    let capturedCoords = await captureLocation();
    console.log("[SIGNOFF] captureLocation returned:", capturedCoords);
    console.log("[SIGNOFF] coordinates state:", coordinates);

    // If function returned null but state has coordinates, use state
    // This handles the race condition where GPS succeeds after promise resolves
    if (!capturedCoords && coordinates) {
      console.log("[SIGNOFF] Using state coordinates due to timing issue");
      capturedCoords = coordinates;
    }

    // If still no coordinates, retry once more
    if (!capturedCoords) {
      console.log(
        "[SIGNOFF] First attempt failed, retrying after 2 seconds..."
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      capturedCoords = await captureLocation();
      console.log("[SIGNOFF] Second attempt returned:", capturedCoords);

      // Again, check state if return is null
      if (!capturedCoords && coordinates) {
        console.log("[SIGNOFF] Using state coordinates from second attempt");
        capturedCoords = coordinates;
      }
    }

    // Check if location was captured
    if (!capturedCoords) {
      console.error("[SIGNOFF] No coordinates captured after retry!");
      setIsSigningOff(false);
      toast({
        title: "Location Required",
        description:
          "Failed to capture your location. Please ensure location services are enabled and try again.",
        variant: "destructive",
      });
      return;
    }
    console.log("[SIGNOFF] Location captured successfully:", capturedCoords);

    const result = await ticketService.updateTicket(id!, {
      driver_signature: driverSignature,
      signed_off_at: new Date().toISOString(),
      driver_gps: `${capturedCoords.latitude},${capturedCoords.longitude}`,
      driver_confirmer_name: driverConfirmerName.trim(),
      status: "CLOSED",
    });

    setIsSigningOff(false);

    if (result.success) {
      toast({
        title: "Ticket Signed Off",
        description: "You have successfully signed off the ticket",
      });
      setDriverSignature(null);
      setDriverConfirmerName("");
      setShowDriverSignOff(false);
      // Reload ticket to show updated data
      const found = await ticketService.getTicket(id!);
      setTicket(found);

      // Redirect to home page if user is a driver
      if (user?.role === "driver") {
        setTimeout(() => {
          navigate("/");
        }, 1500);
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to sign off ticket. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !ticket) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    setIsUploadingImage(true);
    const result = await ticketService.uploadTicketImage(
      ticket.ticket_id,
      file
    );
    setIsUploadingImage(false);

    if (result.success && result.url) {
      const updateResult = await ticketService.updateTicket(ticket.ticket_id, {
        ticket_image_url: result.url,
      });

      if (updateResult.success) {
        setTicket({ ...ticket, ticket_image_url: result.url });
        setShowImageUpload(false);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      setShowCamera(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.error("Failed to play video:", err);
          });
        }
      }, 0);
    } catch (err) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !ticket) return;

    const context = canvasRef.current.getContext("2d");
    if (context) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;

      context.scale(-1, 1);
      context.drawImage(videoRef.current, -videoRef.current.videoWidth, 0);

      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], "ticket-photo.jpg", {
            type: "image/jpeg",
          });

          setIsUploadingImage(true);
          const result = await ticketService.uploadTicketImage(
            ticket.ticket_id,
            file
          );
          setIsUploadingImage(false);

          if (result.success && result.url) {
            const updateResult = await ticketService.updateTicket(
              ticket.ticket_id,
              {
                ticket_image_url: result.url,
              }
            );

            if (updateResult.success) {
              setTicket({ ...ticket, ticket_image_url: result.url });
              stopCamera();
              setShowImageUpload(false);
            }
          }
        }
      }, "image/jpeg");
    }
  };

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="p-8 text-center shadow-lg">
          <div className="mb-4 flex justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-foreground">
            {t("common.loading")}
          </h2>
          <p className="text-muted-foreground">{t("common.pleaseWait")}</p>
        </Card>
      </div>
    );
  }

  const canDeliver =
    ticket.status === "VERIFIED" || ticket.status === "DELIVERED";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        showHomeButton={false}
        showSettingsButton
        onSettingsClick={() => navigate("/driver/profile")}
      />

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Go Back Button */}
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          {/* Carrier, Truck, Driver - Always in Row */}
          <Card className="shadow-md">
            <div className="grid grid-cols-3 gap-1 p-3">
              <div className="min-w-0 text-center">
                <p className="text-xs text-muted-foreground">Carrier</p>
                <p className="truncate text-xs font-medium text-foreground">
                  {getCarrierName(ticket)}
                </p>
              </div>
              <div className="min-w-0 text-center">
                <p className="text-xs text-muted-foreground">Truck</p>
                <p className="truncate text-xs font-medium text-foreground">
                  {ticket.truck_name || "-"}
                </p>
              </div>
              <div className="min-w-0 text-center">
                <p className="text-xs text-muted-foreground">Driver</p>
                <p className="truncate text-xs font-medium text-foreground">
                  {ticket.driver_name || "-"}
                </p>
              </div>
            </div>
          </Card>
          {/* ATTENDANT VIEW - Simplified */}
          {user?.role === "attendant" ? (
            <>
              {/* Weight Info - First */}
              {ticket.net_weight && (
                <Card className="shadow-md">
                  <div className="bg-success-light p-4 text-center">
                    <p className="text-xs text-muted-foreground">Net Weight</p>
                    <p className="text-2xl font-bold text-success">
                      {ticket.net_weight.toFixed(2)} tons
                    </p>
                  </div>
                </Card>
              )}

              {/* Locations - Origin and Destination */}
              <Card className="shadow-md">
                <div className="flex justify-center items-start gap-6 p-4">
                  {ticket.origin_site && (
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-1 h-5 w-5 text-success" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Origin</p>
                        <p className="font-medium text-foreground">
                          {ticket.origin_site}
                        </p>
                      </div>
                    </div>
                  )}
                  {ticket.destination_site && (
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-1 h-5 w-5 text-destructive" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          Destination
                        </p>
                        <p className="font-medium text-foreground">
                          {ticket.destination_site}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <>
              {/* DRIVER VIEW - Top section with essential info */}

              {/* For Destination Attendant - Button to New Screen */}
              {user?.role === "driver" && (
                <>
                  {ticket.status === "CLOSED" ? (
                    <Card className="overflow-hidden shadow-lg border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                      <div className="p-4">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                          <h3 className="font-semibold text-green-900 dark:text-green-100">
                            {t("ticketDetails.ticketHasBeenConfirmed")}
                          </h3>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="overflow-hidden shadow-lg border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                              {t("ticketDetails.forDestinationAttendant")}
                            </h3>
                          </div>
                        </div>

                        <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                          Share this ticket with the destination attendant to
                          confirm delivery.
                        </p>

                        <div className="space-y-3">
                          {/* QR Code Section */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                              Driver QR Code
                            </p>

                            <div className="flex justify-center bg-white p-3 rounded-lg">
                              <QRCodeSVG
                                value={
                                  ticket.driver_qr_code ||
                                  ticket.driver_id ||
                                  ""
                                }
                                size={120}
                              />
                            </div>

                            {/* Ticket ID copy section */}
                            <div className="flex flex-col items-center gap-1">
                              <p className="text-xs text-muted-foreground">
                                Ticket ID
                              </p>

                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono">{id}</span>

                                <button
                                  onClick={handleCopy}
                                  className={`text-xs px-2 py-1 rounded transition ${
                                    copied
                                      ? "bg-green-600 text-white"
                                      : "bg-muted hover:bg-muted/70"
                                  }`}
                                >
                                  {copied ? "Copied!" : "Copy"}
                                </button>
                              </div>
                            </div>
                          </div>
                          {/* Ticket URL Section
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                              Ticket URL
                            </p>
                            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-amber-200 dark:border-amber-800 dark:bg-amber-950/30">
                              <span className="text-xs text-muted-foreground flex-1 truncate">
                                {`${window.location.origin}/tickets/${ticket.ticket_id}/confirm-delivery`}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    `${window.location.origin}/tickets/${ticket.ticket_id}/confirm-delivery`
                                  );
                                  toast({
                                    title: "Copied",
                                    description:
                                      "Confirmation URL copied to clipboard",
                                  });
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                          </div>
                          */}
                          {/* Navigation Button - For Driver to Access Confirm Delivery */}
                          {ticket.status !== "CLOSED" && (
                            <Button
                              onClick={() =>
                                navigate(
                                  `/tickets/${ticket.ticket_id}/confirm-delivery`
                                )
                              }
                              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                              size="lg"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Go to Confirmation Screen
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* QR Code - Only for drivers
              {user?.role === "driver" && ticket.driver_id && (
                <Card className="overflow-hidden shadow-lg">
                  <div className="bg-primary/5 p-6 text-center">
                    <h3 className="mb-4 text-sm font-semibold text-foreground">
                      Driver QR Code
                    </h3>
                    <div className="mx-auto mb-4 inline-block rounded-xl bg-white p-4 shadow-md">
                      <QRCodeSVG value={ticket.driver_id} size={160} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scan to view this ticket
                    </p>
                  </div>
                </Card>
              )}
              */}

              {ticket.net_weight && (
                <Card className="shadow-md">
                  <div className="bg-success-light p-4 text-center">
                    <p className="text-xs text-muted-foreground">Net Weight</p>
                    <p className="text-2xl font-bold text-success">
                      {ticket.net_weight.toFixed(2)} tons
                    </p>
                  </div>
                </Card>
              )}

              {/* Locations - Origin and Destination */}
              <Card className="shadow-md">
                <div className="flex justify-center items-start gap-8 p-4">
                  {ticket.origin_site && (
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-1 h-5 w-5 text-success" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Origin</p>
                        <p className="font-medium text-foreground">
                          {ticket.origin_site}
                        </p>
                      </div>
                    </div>
                  )}
                  {ticket.destination_site && (
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-1 h-5 w-5 text-destructive" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          Destination
                        </p>
                        <p className="font-medium text-foreground">
                          {ticket.destination_site}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Route Map - Only for drivers */}
              {user?.role === "driver" &&
                (() => {
                  const loadGps = parseGPS(ticket.load_gps) || {
                    lat: 40.4168,
                    lng: -3.7038,
                  }; // Madrid
                  const deliveryGps = parseGPS(ticket.delivery_gps) || {
                    lat: 40.0105,
                    lng: -4.3009,
                  }; // near Toledo (~80 km)
                  return (
                    <>
                      <RouteMap
                        originLat={loadGps.lat}
                        originLng={loadGps.lng}
                        destinationLat={deliveryGps.lat}
                        destinationLng={deliveryGps.lng}
                        originName={ticket.origin_site}
                        destinationName={ticket.destination_site}
                      />

                      {/* Get Directions Button */}
                      {deliveryGps && (
                        <Button
                          onClick={() =>
                            openGoogleMaps(
                              deliveryGps.lat,
                              deliveryGps.lng,
                              ticket.destination_site
                            )
                          }
                          className="w-full"
                          variant="outline"
                        >
                          <Navigation className="mr-2 h-4 w-4" />
                          Get Directions
                        </Button>
                      )}
                    </>
                  );
                })()}

              {/* Image Upload Section - For drivers */}
              {user?.role === "driver" && (
                <>
                  {!ticket.ticket_image_url && (
                    <Card className="overflow-hidden shadow-md border-dashed border-2">
                      <div className="bg-blue-50 p-4">
                        <h3 className="font-semibold text-blue-600">
                          Add Ticket Image
                        </h3>
                        <p className="mt-1 text-xs text-blue-600/70">
                          Upload a photo of the ticket
                        </p>
                      </div>
                      <div className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" className="w-full">
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Image
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuItem
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              <span>Choose from Files</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={startCamera}>
                              <Camera className="mr-2 h-4 w-4" />
                              <span>Take Photo</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>
                    </Card>
                  )}

                  {showCamera && (
                    <Card className="overflow-hidden shadow-md">
                      <div className="bg-blue-50 p-4">
                        <h3 className="font-semibold text-blue-600">
                          Take Photo
                        </h3>
                      </div>
                      <div className="p-4 space-y-3">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="h-96 w-full rounded border border-border bg-black object-cover"
                          style={{ transform: "scaleX(-1)" }}
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={capturePhoto}
                            disabled={isUploadingImage}
                            className="flex-1"
                          >
                            {isUploadingImage ? "Uploading..." : "Capture"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={stopCamera}
                            disabled={isUploadingImage}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </>
              )}

              {/* Fullscreen Image Modal */}
              {showFullscreenImage && ticket.ticket_image_url && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                  onClick={() => setShowFullscreenImage(false)}
                >
                  <div className="relative max-w-4xl max-h-screen">
                    <img
                      src={ticket.ticket_image_url}
                      alt="Ticket"
                      className="w-full h-auto object-contain"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowFullscreenImage(false)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Truck Info
              <Card className="shadow-md transition-all duration-300 hover:shadow-lg">
                <div className="flex items-start gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors duration-200">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      Truck {ticket.truck_id}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {ticket.product}
                    </p>
                  </div>
                </div>
              </Card>
              */}
            </>
          )}

          {/* Carrier & Driver Info - Only for drivers 
          {user?.role !== "attendant" &&
            (ticket.carrier || ticket.driver_name) && (
              <Card className="shadow-md">
                <div className="space-y-3 p-4">
                  {ticket.carrier && (
                    <div className="flex items-start gap-3">
                      <Truck className="mt-1 h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Carrier</p>
                        <p className="font-medium text-foreground">
                          {ticket.carrier}
                        </p>
                      </div>
                    </div>
                  )}
                  {ticket.driver_name && (
                    <div className="flex items-start gap-3">
                      <Users className="mt-1 h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Driver</p>
                        <p className="font-medium text-foreground">
                          {ticket.driver_name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          */}
          {/* Weight Info - Only for drivers 
          {user?.role !== "attendant" && ticket.net_weight && (
            <Card className="shadow-md">
              <div className="grid grid-cols-1 divide-x divide-border">
                <div className="bg-success-light p-4 text-center">
                  <p className="text-xs text-muted-foreground">Net</p>
                  <p className="text-lg font-bold text-success">
                    {ticket.net_weight.toFixed(2)} tons
                  </p>
                </div>
              </div>
            </Card>
          )}
          */}

          {/* GPS Coordinates - Only for drivers */}
          {user?.role !== "attendant" &&
            (ticket.load_gps || ticket.delivery_gps) && (
              <Card className="shadow-md">
                <div className="space-y-3 p-4">
                  {ticket.load_gps && (
                    <div className="flex items-start gap-3">
                      <Navigation className="mt-1 h-5 w-5 text-success" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          Load Location
                        </p>
                        <p className="text-sm font-mono text-foreground">
                          {ticket.load_gps}
                        </p>
                      </div>
                    </div>
                  )}
                  {/*
                  {ticket.delivery_gps && (
                    <div className="flex items-start gap-3">
                      <Navigation className="mt-1 h-5 w-5 text-destructive" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                          Delivery Location
                        </p>
                        <p className="text-sm font-mono text-foreground">
                          {ticket.delivery_gps}
                        </p>
                      </div>
                    </div>
                  )}
                  */}
                </div>
              </Card>
            )}

          {/* Ticket Image - If available */}
          {ticket.ticket_image_url && (
            <Card className="overflow-hidden shadow-md">
              <div className="bg-primary/5 p-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Ticket Image
                </h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = ticket.ticket_image_url;
                      link.download = `ticket-${ticket.ticket_id}.jpg`;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  {user?.role === "driver" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowImageUpload(!showImageUpload)}
                    >
                      Replace
                    </Button>
                  )}
                </div>
              </div>
              <div
                className="p-4 flex justify-center cursor-pointer"
                onClick={() => setShowFullscreenImage(true)}
              >
                <img
                  src={ticket.ticket_image_url}
                  alt="Ticket"
                  className="max-h-48 rounded border border-border object-contain hover:opacity-80 transition-opacity"
                />
              </div>
            </Card>
          )}

          {/* Fullscreen Image Modal */}
          {showFullscreenImage && ticket.ticket_image_url && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
              <div className="relative max-h-screen max-w-4xl w-full flex flex-col">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-10 right-0 text-white hover:bg-white/20"
                  onClick={() => setShowFullscreenImage(false)}
                >
                  <X className="h-6 w-6" />
                </Button>
                <img
                  src={ticket.ticket_image_url}
                  alt="Ticket Fullscreen"
                  className="w-full h-full object-contain rounded"
                />
              </div>
            </div>
          )}

          {showImageUpload && (
            <Card className="overflow-hidden shadow-md">
              <div className="bg-blue-50 p-4">
                <h3 className="font-semibold text-blue-600">
                  {ticket.ticket_image_url
                    ? "Replace Ticket Image"
                    : "Add Ticket Image"}
                </h3>
              </div>
              <div className="p-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      className="w-full"
                      disabled={isUploadingImage}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isUploadingImage ? "Uploading..." : "Upload Image"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      <span>Choose from Files</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={startCamera}
                      disabled={isUploadingImage}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      <span>Take Photo</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setShowImageUpload(false)}
                  disabled={isUploadingImage}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {/* Confirmer Information - Only for drivers */}
          {user?.role !== "attendant" && ticket.confirmer_name && (
            <Card className="shadow-md">
              <div className="flex items-start gap-3 p-4">
                <User className="mt-1 h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    Delivery Confirmed By
                  </p>
                  <p className="font-medium text-foreground">
                    {ticket.confirmer_name}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Timestamps - Only for drivers */}
          {user?.role !== "attendant" && (
            <Card className="shadow-md">
              <div className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {ticket.verified_at_scale && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Verified at Scale
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(ticket.verified_at_scale).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {ticket.delivered_at && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Delivered</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(ticket.delivered_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Signatures - Only for drivers */}
          {user?.role !== "attendant" && ticket.scale_operator_signature && (
            <Card className="shadow-md">
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Operator Signature
                  </p>
                </div>
                <img
                  src={ticket.scale_operator_signature}
                  alt="Operator signature"
                  className="h-24 w-full rounded border border-border object-contain bg-white"
                />
              </div>
            </Card>
          )}

          {ticket.destination_signature && (
            <Card className="shadow-md">
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Receiver Signature
                  </p>
                </div>
                <img
                  src={ticket.destination_signature}
                  alt="Receiver signature"
                  className="h-24 w-full rounded border border-border object-contain bg-white"
                />
              </div>
            </Card>
          )}

          {/* Success Animation */}
          {showSuccessAnimation && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <Card className="w-80 space-y-4 p-8 text-center shadow-2xl">
                <div className="flex justify-center">
                  <div className="relative h-20 w-20">
                    <CheckCircle className="h-20 w-20 animate-bounce text-success" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Delivery Confirmed!
                </h2>
                <p className="text-muted-foreground">
                  Ticket {ticket.ticket_id} has been successfully delivered
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting to home...
                </p>
              </Card>
            </div>
          )}

          {/* Delivery Confirmation Form - Only for Attendants */}
          {canDeliver && user?.role === "attendant" && (
            <>
              <Card className="overflow-hidden border-primary/50 bg-primary/5 shadow-md">
                <div className="bg-primary/10 p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <User className="h-5 w-5" />
                    <h3 className="font-semibold">Delivery Confirmation</h3>
                  </div>
                </div>
                <div className="space-y-5 p-4">
                  {/* Confirmer's Name - First Field */}
                  <div>
                    <Label
                      htmlFor="confirmer_name"
                      className="text-sm font-medium"
                    >
                      Confirmer's Name *
                    </Label>
                    <Input
                      id="confirmer_name"
                      placeholder="Enter name of person confirming delivery"
                      value={confirmerName}
                      onChange={(e) => setConfirmerName(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  {/* Location Verification - Second Field 
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">
                        Delivery Location
                      </Label>
                    </div>
                    <div className="rounded border border-primary/30 bg-primary/5 p-3">
                      <p className="text-xs text-muted-foreground">
                        📍 Location will be captured automatically when you
                        confirm the delivery.
                      </p>
                    </div>
                  </div>
                  */}

                  {/* Receiver Signature - Third Field */}
                  <div>
                    <SignaturePad
                      onSave={setSignature}
                      label="Receiver Signature *"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleDeliver}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirm
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSignature(null);
                        setConfirmerName("");
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default TicketDetails;

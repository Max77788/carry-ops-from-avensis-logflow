import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Pen,
  MapPin,
  User,
  FileText,
  AlertCircle,
  Home,
} from "lucide-react";
import { ticketService } from "@/lib/ticketService";
import { useGPS } from "@/hooks/useGPS";
import { SignaturePad } from "@/components/SignaturePad";
import { TicketImageManager } from "@/components/TicketImageManager";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Header } from "@/components/Header";
import type { Ticket } from "@/lib/types";
import { toast } from "@/components/ui/use-toast";

const DestinationAttendantConfirm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmerName, setConfirmerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const signaturePadRef = useRef<any>(null);
  const { captureLocation } = useGPS();

  useEffect(() => {
    const loadTicket = async () => {
      if (!id) return;
      try {
        const found = await ticketService.getTicket(id);
        setTicket(found);

        // Check if ticket is already confirmed
        if (found.status === "CLOSED" || found.status === "DELIVERED") {
          setIsConfirmed(true);
          // Set confirmer name if it exists
          if (found.confirmer_name) {
            setConfirmerName(found.confirmer_name);
          }
        }
      } catch (error) {
        console.error("Error loading ticket:", error);
        toast({
          title: "Error",
          description: "Failed to load ticket",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadTicket();
  }, [id]);

  const handleSignOff = async () => {
    if (!ticket || !confirmerName || !signature) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check if ticket is already confirmed (CLOSED or DELIVERED status)
    if (ticket.status === "CLOSED" || ticket.status === "DELIVERED") {
      toast({
        title: "Ticket Already Confirmed",
        description:
          "This ticket has already been confirmed and cannot be confirmed again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Capture location
      const coords = await captureLocation();

      const result = await ticketService.updateTicket(ticket.ticket_id, {
        destination_signature: signature,
        confirmer_name: confirmerName,
        delivery_gps: coords ? `${coords.latitude},${coords.longitude}` : null,
        status: "CLOSED",
        delivered_at: new Date().toISOString(),
      });

      if (result.success) {
        // Scroll to top of page
        window.scrollTo({ top: 0, behavior: "smooth" });
        toast({
          title: "Ticket Confirmed",
          description: "Ticket has been successfully confirmed",
        });
        setIsConfirmed(true);
        // Reload ticket to show updated status
        const updated = await ticketService.getTicket(ticket.ticket_id);
        setTicket(updated);
      } else {
        throw new Error(result.error || "Failed to confirm ticket");
      }
    } catch (error: any) {
      console.error("Error confirming ticket:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to confirm ticket",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!ticket) return;

    setIsUploadingImage(true);
    try {
      // Upload image to storage
      const uploadResult = await ticketService.uploadTicketImage(
        ticket.ticket_id,
        file
      );

      if (uploadResult.success && uploadResult.url) {
        // Update ticket with image URL
        const updateResult = await ticketService.updateTicket(
          ticket.ticket_id,
          {
            ticket_image_url: uploadResult.url,
          }
        );

        if (updateResult.success) {
          // Update local ticket state
          setTicket((prev) =>
            prev ? { ...prev, ticket_image_url: uploadResult.url } : null
          );
          toast({
            title: "Image Uploaded",
            description: "Ticket image has been successfully uploaded",
          });
        } else {
          throw new Error(updateResult.error || "Failed to update ticket");
        }
      } else {
        throw new Error(uploadResult.error || "Failed to upload image");
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageRemove = async () => {
    if (!ticket) return;

    setIsUploadingImage(true);
    try {
      const result = await ticketService.updateTicket(ticket.ticket_id, {
        ticket_image_url: null,
      });

      if (result.success) {
        setTicket((prev) =>
          prev ? { ...prev, ticket_image_url: undefined } : null
        );
        toast({
          title: "Image Removed",
          description: "Ticket image has been removed",
        });
      } else {
        throw new Error(result.error || "Failed to remove image");
      }
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">Ticket Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The ticket you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
          : "bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50"
      }`}
    >
      {/* Header */}
      <Header
        showHomeButton
        onHomeClick={() => navigate("/contractor/portal")}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {isConfirmed ? (
            // Success View
            <div className="space-y-6">
              {/* Delivery Location Tile - Clickable 
              <Card
                className="cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 p-4 md:p-6"
                onClick={() => navigate(`/tickets/${id}`)}
              >
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs mb-1 text-muted-foreground">
                      {t("destinationConfirm.deliveryLocation")}
                    </p>
                    <p
                      className={`text-lg font-semibold ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {ticket.destination_site || "N/A"}
                    </p>
                  </div>
                  <MapPin
                    className={`h-6 w-6 ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  />
                </div>
              </Card>
              */}

              {/* Success Message */}
              <Card className="border-0 p-8 text-white text-center bg-gradient-to-br from-emerald-500 to-emerald-600">
                <div className="flex justify-center mb-4">
                  <div className="bg-white/20 rounded-full p-4">
                    <CheckCircle className="h-12 w-12" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold mb-2">
                  {t("destinationConfirm.deliveryConfirmed")}
                </h2>
                <p className="text-emerald-100">
                  {t("destinationConfirm.ticketHasBeenSuccessfullyConfirmed")}
                </p>
              </Card>

              {/* Action Buttons 
              <div className="flex gap-4">
                <Button
                  onClick={() => navigate(`/tickets/${id}`)}
                  variant="outline"
                  className="flex-1"
                >
                  {t("destinationConfirm.viewTicket")}
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {t("destinationConfirm.goToDashboard")}
                </Button>
              </div>

              */}

              {/* Delivery Confirmed Details - 2 Column Layout */}
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <Card className="border border-border bg-card p-6">
                  <h3 className="text-lg font-bold mb-4 pb-3 border-b text-foreground border-border">
                    {t("destinationConfirm.ticketDetails")}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs mb-1 text-muted-foreground">
                        {t("destinationConfirm.ticketID")}
                      </p>
                      <p className="font-semibold text-base text-foreground">
                        {ticket.ticket_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-1 text-muted-foreground">
                        {t("destinationConfirm.status")}
                      </p>
                      <Badge className="bg-green-500">{ticket.status}</Badge>
                    </div>
                    <div>
                      <p className="text-xs mb-1 text-muted-foreground">
                        {t("destinationConfirm.pickupLocation")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {ticket.origin_site || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-1 text-muted-foreground">
                        {t("destinationConfirm.deliveryLocation")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {ticket.destination_site || "N/A"}
                      </p>
                    </div>
                  </div>
                </Card>
                {/* Right Column */}
                <Card className="border border-border bg-card p-6">
                  <h3 className="text-lg font-bold mb-4 pb-3 border-b text-foreground border-border">
                    {t("destinationConfirm.deliveryDetails")}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs mb-1 text-muted-foreground">
                        {t("destinationConfirm.netWeight")}
                      </p>
                      <p className="font-semibold text-base text-foreground">
                        {ticket.net_weight?.toFixed(1) || "—"}{" "}
                        {t("destinationConfirm.tons")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-1 text-muted-foreground">
                        {t("destinationConfirm.driverName")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {ticket.driver_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-1 text-muted-foreground">
                        {t("destinationConfirm.confirmedBy")}
                      </p>
                      <p className="font-semibold text-foreground">
                        {confirmerName}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
              {/* Ticket Image Display */}
              {ticket?.ticket_image_url && (
                <Card className="border border-border bg-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-6 w-6 text-primary" />
                    <h3 className="text-lg font-bold text-foreground">
                      {t("destinationConfirm.ticketImage")}
                    </h3>
                  </div>
                  <div className="flex justify-center">
                    <a
                      href={ticket.ticket_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      View Ticket Image
                    </a>
                  </div>
                </Card>
              )}

              <div className="mt-6 pt-6 border-t border-border/70">
                <Button
                  variant="outline"
                  onClick={() => navigate("/contractor/portal")}
                  className="w-full justify-center gap-2 py-5 text-base font-medium"
                >
                  <Home className="h-4 w-4" />
                  Back to Home
                </Button>
              </div>

              {/* Confirmation Details
              <Card
                className={`border-0 p-6 ${
                  isDark
                    ? "bg-slate-800 border-slate-700"
                    : "bg-slate-100 border-slate-200"
                }`}
              >
                <h3
                  className={`text-xl font-bold mb-4 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  {t("destinationConfirm.confirmationDetails")}
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs mb-1 text-muted-foreground">
                      {t("destinationConfirm.confirmedBy")}
                    </p>
                    <p
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {confirmerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-1 text-muted-foreground">
                      {t("destinationConfirm.deliveryLocation")}
                    </p>
                    <p
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    ></p>
                  </div>
                </div>
              </Card>
              */}
            </div>
          ) : (
            // Confirmation Form View
            <>
              {/* Already Confirmed Warning */}
              {(ticket.status === "CLOSED" ||
                ticket.status === "DELIVERED") && (
                <Card className="mb-6 p-6 border-2 border-destructive bg-destructive/10">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-bold text-destructive mb-1">
                        Ticket Already Confirmed
                      </h3>
                      <p className="text-sm text-destructive/80">
                        This ticket has already been confirmed and cannot be
                        confirmed again. Status:{" "}
                        <strong>{ticket.status}</strong>
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Ticket Info Card */}
              <Card className="mb-8 p-6 border border-border bg-card">
                <div className="flex flex-row justify-center gap-12">
                  <div>
                    <p className="text-xs mb-1 text-muted-foreground">
                      Destination
                    </p>
                    <p className="font-semibold text-foreground">
                      {ticket.destination_site}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-1 text-muted-foreground">Truck</p>
                    <p className="font-semibold text-foreground">
                      {ticket.truck_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-1 text-muted-foreground">
                      Net Weight
                    </p>
                    <p className="font-semibold text-foreground">
                      {ticket.net_weight?.toFixed(1) || "—"} tons
                    </p>
                  </div>
                </div>
              </Card>

              {/* Ticket Image Upload - Before Sign-off */}
              <div className="mb-8">
                <TicketImageManager
                  imageUrl={ticket.ticket_image_url}
                  ticketId={ticket.ticket_id}
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  isLoading={isUploadingImage}
                />
              </div>

              {/* Tiles Grid */}
              <div className="grid grid-cols-1 gap-6 mb-8">
                {/* Confirmer Name Tile */}
                <Card
                  className={`border-2 p-6 ${
                    !confirmerName
                      ? "border-orange-400 bg-orange-50/50 dark:bg-orange-950/20"
                      : "border border-border bg-card"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center mb-4">
                    <div
                      className={`p-2 rounded-full ${
                        !confirmerName
                          ? "bg-orange-100 dark:bg-orange-900/30"
                          : "bg-primary/10"
                      }`}
                    >
                      <User
                        className={`h-6 w-6 ${
                          !confirmerName
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-primary"
                        }`}
                      />
                    </div>
                    <div className="text-center mt-2">
                      <h3 className="text-lg font-bold mb-1 text-foreground">
                        {t("destinationConfirm.confirmerName")}
                      </h3>
                      <p
                        className={`text-sm font-semibold ${
                          !confirmerName
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {!confirmerName ? "⚠️ Required to confirm" : "✓ Filled"}
                      </p>
                    </div>
                  </div>
                  <Input
                    placeholder={t("destinationConfirm.enterYourFullName")}
                    value={confirmerName}
                    onChange={(e) => setConfirmerName(e.target.value)}
                    className={`${
                      !confirmerName
                        ? "border-orange-400 focus:border-orange-500 focus:ring-orange-500"
                        : ""
                    }`}
                  />
                  {!confirmerName && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 font-medium">
                      Please enter your full name to confirm the delivery
                    </p>
                  )}
                </Card>

                {/* Location Tile 
                <Card
                  className={`border-0 p-6 ${
                    isDark
                      ? "bg-slate-800 text-white"
                      : "bg-slate-800 text-white"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold mb-1">
                        {t("destinationConfirm.deliveryLocation")}
                      </h3>
                      <p
                        className={`text-sm ${
                          isDark ? "text-orange-100" : "text-orange-50"
                        }`}
                      >
                        Primal Materials
                      </p>
                    </div>
                    <MapPin
                      className={`h-6 w-6 ${
                        isDark ? "text-orange-200" : "text-orange-100"
                      }`}
                    />
                  </div>
                  <div
                    className={`rounded-lg p-3 text-sm ${
                      isDark ? "bg-white/20" : "bg-white/30"
                    }`}
                  >
                    {t("destinationConfirm.locationConfirmed")}
                  </div>
                </Card>
                */}

                {/* Signature Tile */}
                <Card className="border border-border bg-card p-6 md:col-span-2">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold mb-1 text-foreground">
                        {t("destinationConfirm.yourSignature")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("destinationConfirm.signToConfirmDelivery")}
                      </p>
                    </div>
                    <Pen className="h-6 w-6 text-primary" />
                  </div>
                  <div className="bg-background rounded-lg overflow-hidden">
                    <SignaturePad
                      ref={signaturePadRef}
                      onSave={(data) => setSignature(data)}
                      width={600}
                      height={200}
                    />
                  </div>
                </Card>

                {/* Summary Tile 
                <Card
                  className={`border-0 p-6 text-white md:col-span-2 ${
                    isDark
                      ? "bg-gradient-to-br from-green-600 to-green-700"
                      : "bg-gradient-to-br from-green-400 to-green-500"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold mb-1">
                        {t("destinationConfirm.confirmationSummary")}
                      </h3>
                      <p
                        className={`text-sm ${
                          isDark ? "text-green-100" : "text-green-50"
                        }`}
                      >
                        {t("destinationConfirm.reviewBeforeSubmitting")}
                      </p>
                    </div>
                    <FileText
                      className={`h-6 w-6 ${
                        isDark ? "text-green-200" : "text-green-100"
                      }`}
                    />
                  </div>
                  <div
                    className={`space-y-2 text-sm rounded-lg p-3 ${
                      isDark ? "bg-white/20" : "bg-white/30"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span>{t("destinationConfirm.confirmerName")}:</span>
                      <span className="font-semibold">
                        {confirmerName || t("destinationConfirm.notEntered")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("destinationConfirm.yourSignature")}:</span>
                      <span className="font-semibold">
                        {signature
                          ? t("destinationConfirm.signed")
                          : t("destinationConfirm.notSigned")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("destinationConfirm.deliveryLocation")}:</span>
                      <span className="font-semibold">Primal Materials</span>
                    </div>
                  </div>
                </Card>
                */}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/tickets/${id}`)}
                  className="flex-1"
                >
                  {t("destinationConfirm.cancel")}
                </Button>
                <Button
                  onClick={handleSignOff}
                  disabled={
                    isSubmitting ||
                    !confirmerName ||
                    !signature ||
                    ticket.status === "CLOSED" ||
                    ticket.status === "DELIVERED"
                  }
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t("destinationConfirm.confirmingDots")}
                    </>
                  ) : ticket.status === "CLOSED" ||
                    ticket.status === "DELIVERED" ? (
                    <>
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Already Confirmed
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      {t("destinationConfirm.confirmDelivery")}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default DestinationAttendantConfirm;

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/SignaturePad";
import { TicketImageDisplay } from "@/components/TicketImageDisplay";
import { Header } from "@/components/Header";
import {
  ArrowLeft,
  Weight,
  MapPin,
  User,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGPS } from "@/hooks/useGPS";
import { ticketService } from "@/lib/ticketService";
import { toast } from "@/hooks/use-toast";
import type { Ticket } from "@/lib/types";

const DestinationAttendant = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmerName, setConfirmerName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const { captureLocation, coordinates, loading, error } = useGPS();

  // Only allow attendants to access this page
  useEffect(() => {
    if (user?.role !== "attendant") {
      navigate("/home");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    const loadTicket = async () => {
      if (id) {
        const found = await ticketService.getTicket(id);
        setTicket(found);
      }
      setIsLoading(false);
    };
    loadTicket();
  }, [id]);

  const handleConfirmDelivery = async () => {
    if (!signature) {
      toast({
        title: "Signature Required",
        description: "Please provide your signature",
        variant: "destructive",
      });
      return;
    }

    if (!coordinates) {
      toast({
        title: "GPS Required",
        description: "Location must be captured for delivery confirmation",
        variant: "destructive",
      });
      return;
    }

    if (!confirmerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const result = await ticketService.updateTicket(id!, {
      destination_signature: signature,
      delivery_gps: `${coordinates.latitude},${coordinates.longitude}`,
      delivered_at: new Date().toISOString(),
      status: "CLOSED",
      confirmer_name: confirmerName.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Delivery Confirmed",
        description: `Ticket ${id} has been confirmed as delivered`,
      });
      setShowSuccessAnimation(true);
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to confirm delivery",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2 text-muted-foreground">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-80 space-y-4 p-8 text-center">
          <h2 className="text-xl font-bold">Ticket Not Found</h2>
          <p className="text-muted-foreground">
            The ticket you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate("/home")} className="w-full">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header showHomeButton onHomeClick={() => navigate("/home")} />

      <main className="mx-auto max-w-2xl p-4 flex-1">
        {/* Content */}

        {/* Ticket Summary */}
        <Card className="mb-6 overflow-hidden border-blue-500/50 bg-blue-50 shadow-md dark:bg-blue-950/20">
          <div className="bg-blue-100 p-4 dark:bg-blue-900/30">
            <h2 className="font-semibold text-blue-700 dark:text-blue-300">
              Ticket Details
            </h2>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Driver:</span>
              <span className="font-semibold">
                {ticket.driver_name || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Carrier:</span>
              <span className="font-semibold">{ticket.carrier || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Truck:</span>
              <span className="font-semibold">
                {ticket.truck_name || ticket.truck_id || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Destination:</span>
              <span className="font-semibold">
                {ticket.destination_site || "N/A"}
              </span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-muted-foreground">Net Weight:</span>
              <span className="font-semibold">{ticket.net_weight} lbs</span>
            </div>
          </div>
        </Card>

        {/* Confirmation Form */}
        <Card className="overflow-hidden border-primary/50 bg-primary/5 shadow-md">
          <div className="bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-primary">
              <User className="h-5 w-5" />
              <h3 className="font-semibold">Confirm Delivery</h3>
            </div>
          </div>
          <div className="space-y-5 p-4">
            {/* Attendant Name */}
            <div>
              <Label htmlFor="confirmer_name" className="text-sm font-medium">
                Your Name *
              </Label>
              <Input
                id="confirmer_name"
                placeholder="Enter your name"
                value={confirmerName}
                onChange={(e) => setConfirmerName(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Location Verification */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">
                  Delivery Location *
                </Label>
              </div>
              {coordinates ? (
                <div className="rounded border border-success/30 bg-success/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    ✓ Location Captured
                  </p>
                  <p className="text-xs text-foreground">
                    Lat: {coordinates.latitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-foreground">
                    Lon: {coordinates.longitude.toFixed(6)}
                  </p>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => captureLocation()}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Capturing Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Capture Location
                      </>
                    )}
                  </Button>
                  {error && (
                    <div className="mt-2 rounded border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-xs text-destructive">{error}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Signature */}
            <div>
              <SignaturePad onSave={setSignature} label="Your Signature *" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleConfirmDelivery}
                disabled={isSubmitting}
                className="flex-1 h-12 text-base font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Delivery
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                disabled={isSubmitting}
                className="flex-1 h-12 text-base font-semibold"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>

        {/* Ticket Image - If available */}
        {ticket.ticket_image_url && (
          <TicketImageDisplay
            imageUrl={ticket.ticket_image_url}
            ticketId={ticket.ticket_id}
          />
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
                Ticket {ticket.ticket_id} has been successfully confirmed
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to home...
              </p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default DestinationAttendant;

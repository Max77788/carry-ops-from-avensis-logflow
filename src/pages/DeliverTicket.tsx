import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/SignaturePad";
import { TicketImageDisplay } from "@/components/TicketImageDisplay";
import { Header } from "@/components/Header";
import { useGPS } from "@/hooks/useGPS";
import { useLanguage } from "@/contexts/LanguageContext";
import { MapPin, CheckCircle, Loader2, ArrowLeft, User } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { ticketService } from "@/lib/ticketService";

const DeliverTicket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [confirmerName, setConfirmerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showConfirmationForm, setShowConfirmationForm] = useState(false);
  const { captureLocation, coordinates, loading } = useGPS();

  useEffect(() => {
    const loadTicket = async () => {
      if (id) {
        const found = await ticketService.getTicket(id);
        setTicket(found);
      }
    };
    loadTicket();
  }, [id]);

  const handleDeliver = async () => {
    if (!signature) {
      return;
    }

    if (!coordinates) {
      return;
    }

    if (!confirmerName.trim()) {
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
      // Show success animation
      setShowSuccessAnimation(true);
      // Redirect after animation completes (3 seconds)
      setTimeout(() => {
        navigate("/");
      }, 3000);
    }
  };

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <style>{`
            @keyframes scaleIn {
              0% {
                transform: scale(0);
                opacity: 0;
              }
              50% {
                transform: scale(1.1);
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }

            @keyframes checkmark {
              0% {
                stroke-dashoffset: 100;
              }
              100% {
                stroke-dashoffset: 0;
              }
            }

            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.5;
              }
            }

            .success-circle {
              animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .success-checkmark {
              animation: checkmark 0.6s ease-in-out 0.3s forwards;
              stroke-dasharray: 100;
              stroke-dashoffset: 100;
            }

            .success-pulse {
              animation: pulse 2s ease-in-out infinite;
            }
          `}</style>
          <div className="flex flex-col items-center gap-6 p-10 bg-white rounded-2xl">
            <div className="success-circle relative h-32 w-32">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-success to-success/80 shadow-2xl" />
              <svg
                className="success-checkmark absolute inset-0 h-32 w-32"
                viewBox="0 0 100 100"
                fill="none"
              >
                <path
                  d="M 25 50 L 45 70 L 75 30"
                  stroke="white"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-center text-black">
              <h2 className="mb-2 text-3xl font-bold">Delivery Confirmed!</h2>
              <p className="text-lg">
                Ticket {id} has been successfully delivered
              </p>
              <p className="mt-4 text-sm">Redirecting to home...</p>
            </div>
            <div className="success-pulse">
              <div className="flex gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <div className="h-2 w-2 rounded-full bg-success" />
                <div className="h-2 w-2 rounded-full bg-success" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <Header showHomeButton onHomeClick={() => navigate("/")} />

        {/* Content */}
        <main className="container mx-auto px-3 py-4 md:px-4 md:py-6 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-4 md:space-y-6 pb-4">
            {/* Delivery Info */}
            <Card className="shadow-md">
              <div className="space-y-3 p-3 md:p-4">
                <h3 className="text-sm md:text-base font-semibold text-foreground">
                  {t("deliverTicket.deliveryLocation")}
                </h3>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium text-foreground">
                      {ticket.destination_site}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Truck: {ticket.truck_id} • Product: {ticket.product}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* GPS Capture */}
            <Card className="overflow-hidden shadow-md">
              <div className="bg-success/5 p-4">
                <div className="flex items-center gap-2 text-success">
                  <MapPin className="h-5 w-5" />
                  <h2 className="font-semibold">Location Verification</h2>
                </div>
              </div>
              <div className="p-4">
                {coordinates ? (
                  <div className="rounded-lg bg-success-light p-4">
                    <div className="mb-2 flex items-center gap-2 text-success">
                      <CheckCircle className="h-5 w-5" />
                      <p className="font-semibold">Location Captured</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Lat: {coordinates.latitude.toFixed(6)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Lon: {coordinates.longitude.toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Accuracy: ±{coordinates.accuracy.toFixed(0)}m
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={captureLocation}
                    disabled={loading}
                    variant="outline"
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
                        Capture GPS Location
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>

            {/* Signature */}
            <div
              className={
                showSuccessAnimation ? "pointer-events-none opacity-50" : ""
              }
            >
              <SignaturePad onSave={setSignature} label="Receiver Signature" />

              {signature && (
                <Card className="overflow-hidden shadow-md">
                  <div className="p-4">
                    <p className="mb-2 text-sm font-medium text-foreground">
                      Signature Preview
                    </p>
                    <img
                      src={signature}
                      alt="Receiver signature"
                      className="h-32 w-full rounded border border-border object-contain bg-white"
                    />
                  </div>
                </Card>
              )}
            </div>

            {/* Ticket Image - If available */}
            {ticket.ticket_image_url && (
              <TicketImageDisplay
                imageUrl={ticket.ticket_image_url}
                ticketId={ticket.ticket_id}
              />
            )}

            {/* Confirmation Form - Inline Expansion */}
            {!showConfirmationForm ? (
              <Button
                onClick={() => setShowConfirmationForm(true)}
                size="lg"
                className="w-full shadow-lg"
                disabled={!signature || !coordinates}
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Confirm Delivery
              </Button>
            ) : (
              <Card className="overflow-hidden shadow-md border-primary/50 bg-primary/5">
                <div className="bg-primary/10 p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <User className="h-5 w-5" />
                    <h2 className="font-semibold">Delivery Confirmation</h2>
                  </div>
                </div>
                <div className="space-y-4 p-4">
                  <div>
                    <Label htmlFor="confirmer_name">Confirmer's Name *</Label>
                    <Input
                      id="confirmer_name"
                      placeholder="Enter name of person confirming delivery"
                      value={confirmerName}
                      onChange={(e) => setConfirmerName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleDeliver}
                      size="lg"
                      className="flex-1 shadow-lg"
                      disabled={!confirmerName.trim() || isSubmitting}
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      {isSubmitting ? "Confirming..." : "Confirm"}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowConfirmationForm(false);
                        setConfirmerName("");
                      }}
                      size="lg"
                      variant="outline"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DeliverTicket;

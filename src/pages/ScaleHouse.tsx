import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { QRCodeSVG } from "qrcode.react";
import { Download, CheckCircle2, Loader2, Lock, LogIn } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Ticket } from "@/lib/types";

// Hardcoded credentials for scale house operators
const SCALE_HOUSE_CREDENTIALS = {
  username: "scaleoperator",
  password: "scale2024",
};

const ScaleHouse = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const ticket = location.state?.ticket as Ticket | undefined;
  const [isDownloading, setIsDownloading] = useState(false);

  // Authentication state - Load from localStorage on mount
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const stored = localStorage.getItem("scaleHouseAuthenticated");
    return stored === "true";
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Persist authentication state to localStorage
  useEffect(() => {
    localStorage.setItem("scaleHouseAuthenticated", isAuthenticated.toString());
  }, [isAuthenticated]);

  useEffect(() => {
    if (!ticket) {
      navigate("/driver/dashboard");
    }
  }, [ticket, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    // Simulate a brief loading state for better UX
    setTimeout(() => {
      if (
        username.trim() === SCALE_HOUSE_CREDENTIALS.username &&
        password === SCALE_HOUSE_CREDENTIALS.password
      ) {
        setIsAuthenticated(true);
        toast({
          title: "Login Successful",
          description: "Welcome to Scale House",
        });
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid username or password",
          variant: "destructive",
        });
      }
      setIsLoggingIn(false);
    }, 500);
  };

  if (!ticket) {
    return null;
  }

  // Show login wall if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Lock className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Scale House Access
            </h1>
            <p className="text-muted-foreground mt-2">
              Please enter your credentials to continue
            </p>
          </div>

          {/* Login Form */}
          <Card className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => navigate("/driver/dashboard")}
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </Card>

          {/* Info */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Scale house operators only. Contact your administrator for access.
          </p>
        </div>
      </div>
    );
  }

  const handleDownloadQR = () => {
    setIsDownloading(true);
    const qrElement = document.getElementById("ticket-qr");
    if (qrElement) {
      const canvas = qrElement.querySelector("canvas");
      if (canvas) {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `ticket-${ticket.ticket_id}-qr.png`;
        link.click();
      }
    }
    setIsDownloading(false);
  };

  const handleContinue = () => {
    navigate(`/tickets/${ticket.ticket_id}`, { state: { ticket } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex flex-col">
      {/* Header */}
      <Header
        showHomeButton
        onHomeClick={() => navigate("/driver/dashboard")}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Ticket Details */}
          <div className="space-y-6">
            {/* Status */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Ticket Status
                </h2>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified at Scale
                </Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ticket ID:</span>
                  <span className="font-semibold">{ticket.ticket_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carrier:</span>
                  <span className="font-semibold">{ticket.carrier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Truck:</span>
                  <span className="font-semibold">{ticket.truck_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-semibold">{ticket.driver_name}</span>
                </div>
              </div>
            </Card>

            {/* Destination & Weight */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Delivery Details
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Destination:</span>
                  <p className="font-semibold mt-1">
                    {ticket.destination_site}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Weight:</span>
                  <p className="font-semibold mt-1">{ticket.net_weight} tons</p>
                </div>
              </div>
            </Card>

            {/* Signature */}
            {ticket.scale_operator_signature && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Scale Operator Signature
                </h2>
                <img
                  src={ticket.scale_operator_signature}
                  alt="Scale operator signature"
                  className="h-32 w-full rounded border border-border object-contain bg-white dark:bg-slate-900"
                />
              </Card>
            )}
          </div>

          {/* Right: QR Code */}
          <div className="flex flex-col gap-6">
            <Card className="p-8 flex flex-col items-center justify-center">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Ticket QR Code
              </h2>
              <div
                id="ticket-qr"
                className="p-4 bg-white rounded-lg border-2 border-border"
              >
                <QRCodeSVG
                  value={ticket.ticket_id}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Scan this QR code at the destination to confirm delivery
              </p>
              <Button
                variant="outline"
                onClick={handleDownloadQR}
                disabled={isDownloading}
                className="mt-4 gap-2 h-12 text-base font-semibold"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download QR Code
                  </>
                )}
              </Button>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleContinue}
                className="w-full h-14 text-base font-semibold"
              >
                Continue to Delivery
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/driver/dashboard")}
                className="w-full h-14 text-base font-semibold"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ScaleHouse;

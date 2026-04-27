import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { carrierService } from "@/lib/carrierService";

const CarrierLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [carrierName, setCarrierName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCarrierLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Authenticate carrier with password
      const result = await carrierService.authenticateCarrier(
        carrierName.trim(),
        password
      );

      if (result.success && result.data) {
        // Authentication successful, log them in
        login("carrier", result.data.id);
        navigate("/carrier/portal");
      } else {
        setError(result.error || "Authentication failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="mb-4"
            >
              ← Back to Login
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              Carrier Portal Login
            </h1>
            <p className="text-muted-foreground mt-2">
              Enter your carrier name to access the activity portal
            </p>
          </div>

          {/* Login Form */}
          <Card className="p-6">
            <form onSubmit={handleCarrierLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="carrierName">Carrier Name</Label>
                <Input
                  id="carrierName"
                  type="text"
                  placeholder="Enter carrier name (e.g. 4HR Trucking)"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Logging In...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Access Portal
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                <p className="text-center">
                  The Carrier Portal allows you to view all loads your trucks
                  have completed on the Avensis eTicket platform.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CarrierLogin;

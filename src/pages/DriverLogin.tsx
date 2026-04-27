import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DriverOnboardingModal } from "@/components/DriverOnboardingModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { carrierService } from "@/lib/carrierService";
import { Header } from "@/components/Header";

const DriverLogin = () => {
  const navigate = useNavigate();
  const { login, setDriverProfile } = useAuth();
  const { t } = useLanguage();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if driver exists by email or phone
      const driver = await carrierService.getDriverByEmailOrPhone(emailOrPhone);

      if (driver) {
        // Driver exists, log them in
        login("driver", driver.id);

        // Set driver profile
        setDriverProfile({
          id: driver.id,
          name: driver.name,
          carrier_id: driver.carrier_id,
          default_truck_id: driver.default_truck_id,
          driver_qr_code: driver.driver_qr_code,
          status: driver.status,
          created_at: driver.created_at,
          updated_at: driver.updated_at,
        });

        // Redirect based on driver status
        if (driver.status === "active") {
          navigate("/home");
        } else {
          navigate("/driver/profile");
        }
      } else {
        // Driver doesn't exist, redirect to sign up
        // Try to determine if input is email or phone for pre-filling signup form
        const isEmail = emailOrPhone.includes("@");
        navigate("/driver/signup", {
          state: {
            email: isEmail ? emailOrPhone : "",
            phone: !isEmail ? emailOrPhone : "",
          },
        });
      }
    } catch (error) {
      console.error("Error during driver login:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      {/* <Header showHomeButton onHomeClick={() => navigate("/")} /> */}
      <Header />
      
      <div className="flex items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t("login.driverLogin")}
            </h1>
            <p className="text-muted-foreground">
              Enter your email or phone number to login
            </p>
          </div>

          {/* Login Form */}
          <Card className="p-6 shadow-lg">
            <form onSubmit={handleDriverLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailOrPhone">Email or Phone Number</Label>
                <Input
                  id="emailOrPhone"
                  type="text"
                  placeholder="driver@example.com or +1234567890"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    {t("login.loggingIn")}
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    {t("login.logInSignUp")}
                  </>
                )}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              {t("login.noAccountWarning")}
            </p>
          </Card>

          {/* Driver Onboarding Button */}
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => setShowOnboarding(true)}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Driver Onboarding
            </Button>
          </div>

          {/* Driver Onboarding Modal */}
          <DriverOnboardingModal
            open={showOnboarding}
            onOpenChange={setShowOnboarding}
          />

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            {t("login.copyright")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverLogin;

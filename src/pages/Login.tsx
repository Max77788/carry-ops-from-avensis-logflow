import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, BookOpen, Shield, Building2, MapPin, Gavel, Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DriverOnboardingModal } from "@/components/DriverOnboardingModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Header } from "@/components/Header";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleAttendantClick = () => {
    // Navigate to contractor login page for destination attendants
    navigate("/contractor/login");
  };

  const handleAdminClick = () => {
    login("admin");
    navigate("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Theme Toggle */}
      <Header />

      {/* Language Selector */}
      <div className="absolute top-16 right-4">
        <LanguageSelector />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-primary">
              <Truck className="h-3.5 w-3.5" />
              Modern Trucking Operations
            </div>
            <h1 className="mx-auto max-w-3xl font-display text-4xl font-semibold leading-[0.95] text-foreground md:text-6xl">
              Load Control for <span className="text-primary">Carry Ops</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {t("login.digitalTicketingSystem")}
            </p>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:border-primary/70 hover:shadow-glow"
              onClick={() => navigate("/driver-onboarding")}
            >
              <div className="p-6 space-y-4 flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Driver Onboarding
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Recruit, assess, manage and onboard new drivers
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:border-primary/70 hover:shadow-glow"
              onClick={() => navigate("/driver/login")}
            >
              <div className="p-6 space-y-4 flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {t("login.driver")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("login.driverDesc")}
                  </p>
                </div>
                {/*
                <Button className="w-full" size="lg">
                  {t("login.continueAsDriver")}
                </Button>
                */}
              </div>
            </Card>

            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:border-primary/70 hover:shadow-glow"
              onClick={() => navigate("/scale-house")}
            >
              <div className="p-6 space-y-4 flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 transition-colors overflow-hidden flex-shrink-0 group-hover:bg-primary/20">
                  <img
                    src="/truckPic.png"
                    alt="Truck"
                    className="h-12 w-12 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {/*t("login.overview")*/}Scalehouse
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("login.overviewDesc")}
                  </p>
                </div>
                {/*
                <Button className="w-full" size="lg">
                  {t("login.continueAsOverview")}
                </Button>
                */}
              </div>
            </Card>

            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:border-primary/70 hover:shadow-glow"
              onClick={handleAttendantClick}
            >
              <div className="p-6 space-y-4 flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Destination Attendant
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Contractor portal for destination sites
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:border-primary/70 hover:shadow-glow"
              onClick={handleAdminClick}
            >
              <div className="p-6 space-y-4 flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Admin
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Manage companies, sites, and onboarding
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 hover:border-primary/70 hover:shadow-glow"
              onClick={() => navigate("/shipper/login")}
            >
              <div className="p-6 space-y-4 flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Gavel className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Bidding
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Post loads, invite carriers, and manage bids
                  </p>
                </div>
              </div>
            </Card>

            {/* Driver Onboarding Button */}
            <div className="flex flex-col items-center gap-3 pt-4 md:col-span-2 md:pt-8 lg:col-span-3">
              <Button
                variant="outline"
                onClick={() => setShowOnboarding(true)}
                className="gap-2"
                size="sm"
              >
                <BookOpen className="h-4 w-4" />
                Driver Onboarding
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/vendor/login")}
                className="gap-2"
                size="sm"
              >
                <Building2 className="h-4 w-4" />
                Vendor Portal
              </Button>
            </div>

            {/* Driver Onboarding Modal */}
            <DriverOnboardingModal
              open={showOnboarding}
              onOpenChange={setShowOnboarding}
            />
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            {t("login.copyright")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

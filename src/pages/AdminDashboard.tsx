import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, MapPin, Building, Lock, Eye, EyeOff, Truck, Gavel } from "lucide-react";
import { CompaniesTab } from "@/components/admin/CompaniesTab";
import { PickupSitesTab } from "@/components/admin/PickupSitesTab";
import { DestinationSitesTab } from "@/components/admin/DestinationSitesTab";
import { AdminFleetComplianceTab } from "@/components/admin/AdminFleetComplianceTab";
import { BiddingTab } from "@/components/admin/BiddingTab";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("companies");

  // Simple login state - Load from localStorage on mount
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const stored = localStorage.getItem("adminAuthenticated");
    return stored === "true";
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Simple credentials
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "admin123";

  // Persist authentication state to localStorage
  useEffect(() => {
    localStorage.setItem("adminAuthenticated", isAuthenticated.toString());
    // Keep the session-scoped admin token in sync with auth state. On page
    // reload the login flow itself re-populates it, but if the user is
    // already authenticated (from localStorage) and hasn't typed the
    // password this session, fall back to the default so admin-bidding calls
    // still work end-to-end.
    if (isAuthenticated && !sessionStorage.getItem("adminToken")) {
      sessionStorage.setItem("adminToken", ADMIN_PASSWORD);
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      // The admin-bidding edge function validates this token via x-admin-token.
      // Stored in sessionStorage so it clears on tab close.
      sessionStorage.setItem("adminToken", password);
      toast({
        title: "Success",
        description: "Welcome to Admin Dashboard",
      });
    } else {
      toast({
        title: "Error",
        description: "Invalid username or password",
        variant: "destructive",
      });
    }
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-lg">
          <div className="flex flex-col items-center mb-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your credentials to access the dashboard
            </p>
          </div>

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

            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Admin Dashboard content - shown after authentication
  return (
    <div className="min-h-screen bg-background">
      <Header
        showLogoutButton
        onLogoutClick={() => {
          // Clear admin authentication
          setIsAuthenticated(false);
          localStorage.removeItem("adminAuthenticated");
          sessionStorage.removeItem("adminToken");
          // Clear main auth
          logout();
          // Refresh the page to show login modal again
          window.location.reload();
        }}
      />

      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage companies, sites, and onboarding workflows
              </p>
            </div>
          </div>

          {/* Main Tabs */}
          <Card className="shadow-md">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="companies" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Companies</span>
                </TabsTrigger>
                <TabsTrigger value="fleet-compliance" className="gap-2">
                  <Truck className="h-4 w-4" />
                  <span className="hidden sm:inline">Fleet Compliance</span>
                </TabsTrigger>
                <TabsTrigger value="pickup-sites" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Pickup Locations</span>
                </TabsTrigger>
                <TabsTrigger value="destination-sites" className="gap-2">
                  <Building className="h-4 w-4" />
                  <span className="hidden sm:inline">Destination Sites</span>
                </TabsTrigger>
                <TabsTrigger value="bidding" className="gap-2">
                  <Gavel className="h-4 w-4" />
                  <span className="hidden sm:inline">Bidding</span>
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="companies" className="mt-0">
                  <CompaniesTab />
                </TabsContent>
                <TabsContent value="fleet-compliance" className="mt-0">
                  <AdminFleetComplianceTab />
                </TabsContent>
                <TabsContent value="pickup-sites" className="mt-0">
                  <PickupSitesTab />
                </TabsContent>
                <TabsContent value="destination-sites" className="mt-0">
                  <DestinationSitesTab />
                </TabsContent>
                <TabsContent value="bidding" className="mt-0">
                  <BiddingTab />
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;

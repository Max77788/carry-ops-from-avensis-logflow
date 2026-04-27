import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Eye, EyeOff, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { carrierService } from "@/lib/carrierService";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ContractorLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [contractorName, setContractorName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Destination site selection state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [destinationSites, setDestinationSites] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [isLoadingSites, setIsLoadingSites] = useState(false);

  const handleContractorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Authenticate contractor with password (using same service as carriers)
      const result = await carrierService.authenticateCarrier(
        contractorName.trim(),
        password
      );

      if (result.success && result.data) {
        // Verify this is a destination client company (support both old "Contractor" and new "Destination Client")
        if (result.data.type !== "Destination Client" && result.data.type !== "Contractor") {
          setError("This company is not registered as a destination client.");
          setIsLoading(false);
          return;
        }

        // Authentication successful, store company ID and load destination sites
        setCompanyId(result.data.id);
        setIsAuthenticated(true);

        // Load destination sites for this contractor
        await loadDestinationSites(result.data.id);
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

  const loadDestinationSites = async (contractorId: string) => {
    setIsLoadingSites(true);
    try {
      const { data: sites, error: sitesError } = await supabase
        .from("destination_sites")
        .select("id, name")
        .eq("company_id", contractorId)
        .order("name");

      if (sitesError) throw sitesError;

      setDestinationSites(sites || []);

      // Auto-select if only one site
      if (sites && sites.length === 1) {
        setSelectedSiteId(sites[0].id);
      }
    } catch (error) {
      console.error("Error loading destination sites:", error);
      setError("Failed to load destination sites");
    } finally {
      setIsLoadingSites(false);
    }
  };

  const handleSiteSelection = () => {
    if (!selectedSiteId) {
      setError("Please select a destination site");
      return;
    }

    // Log them in as attendant and store selected site in localStorage
    login("attendant", companyId);
    localStorage.setItem("selectedDestinationSiteId", selectedSiteId);
    localStorage.setItem(
      "selectedDestinationSiteName",
      destinationSites.find((s) => s.id === selectedSiteId)?.name || ""
    );
    navigate("/contractor/portal");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {!isAuthenticated ? (
            <>
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
                  Contractor Portal Login
                </h1>
                <p className="text-muted-foreground mt-2">
                  Enter your contractor company name to access the destination
                  attendant portal
                </p>
              </div>

              {/* Login Form */}
              <Card className="p-6">
                <form onSubmit={handleContractorLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contractorName">
                      Contractor Company Name
                    </Label>
                    <Input
                      id="contractorName"
                      type="text"
                      placeholder="Enter contractor company name"
                      value={contractorName}
                      onChange={(e) => setContractorName(e.target.value)}
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
                      The Contractor Portal allows destination attendants to
                      view and approve tickets coming to their destination
                      sites.
                    </p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <>
              {/* Destination Site Selection */}
              <div className="mb-8">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsAuthenticated(false);
                    setDestinationSites([]);
                    setSelectedSiteId("");
                    setError("");
                  }}
                  className="mb-4"
                >
                  ← Back
                </Button>
                <h1 className="text-2xl font-bold text-foreground">
                  Select Destination Site
                </h1>
                <p className="text-muted-foreground mt-2">
                  Choose which destination site you want to view tickets for
                </p>
              </div>

              <Card className="p-6">
                {isLoadingSites ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : destinationSites.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">
                      No destination sites found for this contractor
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="destinationSite">Destination Site</Label>
                      <Select
                        value={selectedSiteId}
                        onValueChange={setSelectedSiteId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a destination site" />
                        </SelectTrigger>
                        <SelectContent>
                          {destinationSites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {site.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {error && (
                      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                        {error}
                      </div>
                    )}

                    <Button
                      onClick={handleSiteSelection}
                      className="w-full"
                      size="lg"
                      disabled={!selectedSiteId}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Access Portal
                    </Button>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractorLogin;

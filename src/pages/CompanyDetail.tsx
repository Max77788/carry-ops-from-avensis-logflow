import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Users,
  Truck,
  // UserCircle, // Not needed - Portal Users tab hidden
  // Mail, // Not needed - Onboarding tab hidden
  Shield,
} from "lucide-react";
import { adminService, Company } from "@/lib/adminService";
import { CompanyInfoTab } from "@/components/admin/CompanyInfoTab";
import { CompanyContactsTab } from "@/components/admin/CompanyContactsTab";
// import { CompanyPortalUsersTab } from "@/components/admin/CompanyPortalUsersTab"; // Hidden
// import { CompanyOnboardingTab } from "@/components/admin/CompanyOnboardingTab"; // Hidden
import { CompanyFleetTab } from "@/components/admin/CompanyFleetTab";
import { useAuth } from "@/contexts/AuthContext";

const CompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  // Check admin authentication
  useEffect(() => {
    const isAdminAuthenticated =
      localStorage.getItem("adminAuthenticated") === "true";
    if (!isAdminAuthenticated) {
      // Redirect to admin dashboard if not authenticated
      navigate("/admin/dashboard");
    }
  }, [navigate]);

  useEffect(() => {
    if (id) {
      loadCompany();
    }
  }, [id]);

  const loadCompany = async () => {
    if (!id) return;
    setIsLoading(true);
    const data = await adminService.getCompanyById(id);
    setCompany(data);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header showHomeButton onHomeClick={() => navigate("/home")} />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">Loading...</div>
        </main>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <Header showHomeButton onHomeClick={() => navigate("/")} />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">Company not found</div>
        </main>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Onboarding In Progress":
        return "bg-blue-500";
      case "Onboarding Invited":
        return "bg-yellow-500";
      case "Draft":
        return "bg-gray-500";
      case "Suspended":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        showHomeButton
        onHomeClick={() => navigate("/admin/dashboard")}
        showLogoutButton
        onLogoutClick={() => {
          // Clear admin authentication
          localStorage.removeItem("adminAuthenticated");
          // Clear main auth
          logout();
          // Redirect to admin dashboard which will show login modal
          navigate("/admin/dashboard");
        }}
      />

      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          {/* Company Header */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {company.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{company.type}</Badge>
                    <Badge className={getStatusColor(company.status)}>
                      {company.status}
                    </Badge>
                  </div>
                  {company.primary_contact_name && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Primary Contact: {company.primary_contact_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Card className="shadow-md">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
                <TabsTrigger value="info" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Info</span>
                </TabsTrigger>
                <TabsTrigger value="contacts" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Contacts</span>
                </TabsTrigger>
                {/* Portal Users tab hidden */}
                {/* <TabsTrigger value="portal_users" className="gap-2">
                  <UserCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Portal Users</span>
                </TabsTrigger> */}
                {/* Onboarding tab hidden */}
                {/* <TabsTrigger value="onboarding" className="gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">Onboarding</span>
                </TabsTrigger> */}
                <TabsTrigger value="fleet" className="gap-2">
                  <Truck className="h-4 w-4" />
                  <span className="hidden sm:inline">Fleet</span>
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="info" className="mt-0">
                  <CompanyInfoTab company={company} onUpdate={loadCompany} />
                </TabsContent>

                <TabsContent value="contacts" className="mt-0">
                  <CompanyContactsTab companyId={company.id} />
                </TabsContent>

                {/* Portal Users tab content hidden */}
                {/* <TabsContent value="portal_users" className="mt-0">
                  <CompanyPortalUsersTab
                    companyId={company.id}
                    company={company}
                  />
                </TabsContent> */}

                {/* Onboarding tab content hidden */}
                {/* <TabsContent value="onboarding" className="mt-0">
                  <CompanyOnboardingTab
                    company={company}
                    onUpdate={loadCompany}
                  />
                </TabsContent> */}

                <TabsContent value="fleet" className="mt-0">
                  <CompanyFleetTab companyId={company.id} />
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CompanyDetail;

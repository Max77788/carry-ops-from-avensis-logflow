import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  Building2,
  Users,
  Truck,
  UserCircle,
  LogOut,
  FileText,
  Search,
  Download,
  Filter,
  Calendar,
  MapPin,
  ExternalLink,
} from "lucide-react";
import CompanyInfoTab from "@/components/vendor-profile/CompanyInfoTab";
import ContactsTab from "@/components/vendor-profile/ContactsTab";
import TrucksTab from "@/components/vendor-profile/TrucksTab";
import DriversTab from "@/components/vendor-profile/DriversTab";
import { ticketService } from "@/lib/ticketService";
import type { Ticket } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type DateRangePreset =
  | "today"
  | "this-week"
  | "this-month"
  | "last-6-months"
  | "this-year"
  | "custom";

type ExportColumn = {
  id: string;
  label: string;
  enabled: boolean;
};

const VendorProfile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("company");

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangePreset>("this-month");
  const [selectedTruck, setSelectedTruck] = useState<string>("all");
  const [selectedDropoff, setSelectedDropoff] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Export dialog states
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportType, setExportType] = useState<"csv" | "pdf">("csv");
  const [exportColumns, setExportColumns] = useState<ExportColumn[]>([
    { id: "ticket_date", label: "Ticket Date", enabled: true },
    { id: "client_name", label: "Client Name", enabled: true },
    { id: "transaction_id", label: "Transaction/Ticket ID", enabled: true },
    { id: "truck_id", label: "Truck ID", enabled: true },
    { id: "driver_name", label: "Driver Name", enabled: true },
    { id: "pickup_location", label: "Pickup Location", enabled: true },
    { id: "dropoff_location", label: "Drop-off Location", enabled: true },
    { id: "net_weight", label: "Net Weight", enabled: true },
    { id: "tare_weight", label: "Tare Weight", enabled: true },
    { id: "gross_weight", label: "Gross Weight", enabled: false },
    { id: "close_time", label: "Ticket Close Time", enabled: true },
    { id: "attendant", label: "Destination Attendant Name", enabled: true },
    { id: "status", label: "Status", enabled: true },
    { id: "ticket_image_url", label: "Ticket Image URL", enabled: false },
  ]);

  // Check authentication and access status
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access your profile",
          variant: "destructive",
        });
        navigate("/vendor/login");
        return;
      }

      // Check company status and portal access
      const { data: company } = await supabase
        .from("companies")
        .select("status, portal_access_enabled")
        .eq("id", user.id)
        .single();

      if (company) {
        // Check if company is suspended
        if (company.status === "Suspended") {
          toast({
            title: "Access Suspended",
            description:
              "Your account has been suspended. Please contact your administrator.",
            variant: "destructive",
          });
          navigate("/vendor/login");
          return;
        }

        // Redirect to onboarding if company is in onboarding status
        const isOnboardingStatus =
          company.status === "Onboarding Invited" ||
          company.status === "Onboarding In Progress";

        if (isOnboardingStatus) {
          toast({
            title: "Complete Onboarding",
            description: "Please complete your onboarding process first.",
          });
          navigate("/vendor/onboarding");
          return;
        }

        // Check if portal access is disabled
        if (!company.portal_access_enabled) {
          toast({
            title: "Access Disabled",
            description:
              "Portal access is currently disabled. Please contact your administrator.",
            variant: "destructive",
          });
          navigate("/vendor/login");
          return;
        }
      }
    };

    checkAccess();
  }, [user, navigate]);

  // Load vendor data
  useEffect(() => {
    const loadVendorData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        // Load company data
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", user.id)
          .single();

        if (companyError) throw companyError;
        setCompanyData(company);

        // Load contacts
        const { data: contactsData, error: contactsError } = await supabase
          .from("Contact_Info")
          .select("*")
          .eq("company_id", user.id);

        if (!contactsError && contactsData) {
          setContacts(contactsData);
        }

        // Load trucks
        const { data: trucksData, error: trucksError } = await supabase
          .from("trucks")
          .select("*")
          .eq("carrier_id", user.id);

        if (!trucksError && trucksData) {
          setTrucks(trucksData);
        }

        // Load drivers
        const { data: driversData, error: driversError } = await supabase
          .from("drivers")
          .select("*")
          .eq("carrier_id", user.id);

        if (!driversError && driversData) {
          setDrivers(driversData);
        }
      } catch (error: any) {
        console.error("Error loading vendor data:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadVendorData();
  }, [user]);

  // Load tickets when tickets tab is active
  useEffect(() => {
    const loadTickets = async () => {
      if (activeTab !== "tickets" || !user?.id) return;

      setIsLoadingTickets(true);
      try {
        const allTickets = await ticketService.getAllTickets({
          sourceTableName: "tickets_duplicate_for_reports",
        });

        // Filter tickets for this vendor/carrier
        const vendorTickets = allTickets.filter(
          (ticket) => ticket.carrier_id === user.id
        );
        setTickets(vendorTickets);
      } catch (error) {
        console.error("Error loading tickets:", error);
        toast({
          title: "Error",
          description: "Failed to load tickets",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTickets(false);
      }
    };

    loadTickets();
  }, [activeTab, user]);

  // Get unique trucks and dropoff locations for filters
  const uniqueTrucks = useMemo(() => {
    const truckSet = new Set(tickets.map((t) => t.truck_id).filter(Boolean));
    return Array.from(truckSet).sort();
  }, [tickets]);

  const uniqueDropoffs = useMemo(() => {
    const dropoffSet = new Set(
      tickets.map((t) => t.destination_site).filter(Boolean)
    );
    return Array.from(dropoffSet).sort();
  }, [tickets]);

  // Date range calculation
  const getDateRangeFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case "today":
        return { start: today, end: new Date() };
      case "this-week": {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart, end: new Date() };
      }
      case "this-month": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart, end: new Date() };
      }
      case "last-6-months": {
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        return { start: sixMonthsAgo, end: new Date() };
      }
      case "this-year": {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return { start: yearStart, end: new Date() };
      }
      case "custom": {
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate + "T23:59:59"),
          };
        }
        return null;
      }
      default:
        return null;
    }
  };

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          ticket.ticket_id,
          ticket.truck_id,
          ticket.driver_name,
          ticket.origin_site,
          ticket.destination_site,
          ticket.confirmer_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(query)) return false;
      }

      // Date range filter
      const dateFilter = getDateRangeFilter();
      if (dateFilter) {
        const ticketDate = new Date(ticket.created_at);
        if (ticketDate < dateFilter.start || ticketDate > dateFilter.end) {
          return false;
        }
      }

      // Truck filter
      if (selectedTruck !== "all" && ticket.truck_id !== selectedTruck) {
        return false;
      }

      // Dropoff location filter
      if (
        selectedDropoff !== "all" &&
        ticket.destination_site !== selectedDropoff
      ) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all" && ticket.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [
    tickets,
    searchQuery,
    dateRange,
    selectedTruck,
    selectedDropoff,
    selectedStatus,
    customStartDate,
    customEndDate,
  ]);

  // Toggle column selection
  const toggleColumn = (columnId: string) => {
    setExportColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, enabled: !col.enabled } : col
      )
    );
  };

  // Select/Deselect all columns
  const toggleAllColumns = (enabled: boolean) => {
    setExportColumns((prev) => prev.map((col) => ({ ...col, enabled })));
  };

  // Get column value from ticket
  const getColumnValue = (ticket: Ticket, columnId: string): string => {
    switch (columnId) {
      case "ticket_date":
        return new Date(ticket.created_at).toLocaleString();
      case "client_name":
        return "Avensis Energy";
      case "transaction_id":
        return ticket.ticket_id;
      case "truck_id":
        return ticket.truck_id;
      case "driver_name":
        return ticket.driver_name || "-";
      case "pickup_location":
        return ticket.origin_site;
      case "dropoff_location":
        return ticket.destination_site;
      case "net_weight":
        return ticket.net_weight ? ticket.net_weight.toFixed(2) : "-";
      case "tare_weight":
        return ticket.tare_weight ? ticket.tare_weight.toFixed(2) : "-";
      case "gross_weight":
        return ticket.gross_weight ? ticket.gross_weight.toFixed(2) : "-";
      case "close_time":
        return ticket.delivered_at
          ? new Date(ticket.delivered_at).toLocaleString()
          : "-";
      case "attendant":
        return ticket.confirmer_name || "-";
      case "status":
        return ticket.status;
      case "ticket_image_url":
        return ticket.ticket_image_url || "-";
      default:
        return "-";
    }
  };

  // Export to CSV with selected columns
  const exportToCSV = () => {
    const enabledColumns = exportColumns.filter((col) => col.enabled);
    const headers = enabledColumns.map((col) => col.label);

    const rows = filteredTickets.map((ticket) =>
      enabledColumns.map((col) => getColumnValue(ticket, col.id))
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `vendor-tickets-${companyData?.name || "export"}-${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDialog(false);
  };

  // Export to PDF (simplified - creates a printable view)
  const exportToPDF = () => {
    window.print();
    setShowExportDialog(false);
  };

  // Open export dialog
  const openExportDialog = (type: "csv" | "pdf") => {
    setExportType(type);
    setShowExportDialog(true);
  };

  const handleLogout = () => {
    logout();
    navigate("/vendor/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Vendor Profile</h1>
            <p className="text-muted-foreground">
              {companyData?.name || "Your Company"}
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="company">
                <Building2 className="mr-2 h-4 w-4" />
                Company Info
              </TabsTrigger>
              <TabsTrigger value="contacts">
                <Users className="mr-2 h-4 w-4" />
                Contacts
              </TabsTrigger>
              <TabsTrigger value="trucks">
                <Truck className="mr-2 h-4 w-4" />
                Trucks
              </TabsTrigger>
              <TabsTrigger value="drivers">
                <UserCircle className="mr-2 h-4 w-4" />
                Drivers
              </TabsTrigger>
              <TabsTrigger value="tickets">
                <FileText className="mr-2 h-4 w-4" />
                Tickets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="company">
              <CompanyInfoTab
                companyData={companyData}
                setCompanyData={setCompanyData}
              />
            </TabsContent>

            <TabsContent value="contacts">
              <ContactsTab
                contacts={contacts}
                setContacts={setContacts}
                companyId={user?.id}
              />
            </TabsContent>

            <TabsContent value="trucks">
              <TrucksTab
                trucks={trucks}
                setTrucks={setTrucks}
                carrierId={user?.id}
              />
            </TabsContent>

            <TabsContent value="drivers">
              <DriversTab
                drivers={drivers}
                setDrivers={setDrivers}
                carrierId={user?.id}
              />
            </TabsContent>

            <TabsContent value="tickets">
              <div className="space-y-6">
                {/* Filters */}
                <Card className="shadow-md">
                  <div className="p-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search tickets, trucks, drivers, locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Filter Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                      {/* Date Range */}
                      <Select
                        value={dateRange}
                        onValueChange={(value) =>
                          setDateRange(value as DateRangePreset)
                        }
                      >
                        <SelectTrigger>
                          <Calendar className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="this-week">This Week</SelectItem>
                          <SelectItem value="this-month">This Month</SelectItem>
                          <SelectItem value="last-6-months">
                            Last 6 Months
                          </SelectItem>
                          <SelectItem value="this-year">This Year</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Truck Filter */}
                      <Select
                        value={selectedTruck}
                        onValueChange={setSelectedTruck}
                      >
                        <SelectTrigger>
                          <Truck className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="All Trucks" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Trucks</SelectItem>
                          {uniqueTrucks.map((truck) => (
                            <SelectItem key={truck} value={truck}>
                              {truck}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Dropoff Location Filter */}
                      <Select
                        value={selectedDropoff}
                        onValueChange={setSelectedDropoff}
                      >
                        <SelectTrigger>
                          <MapPin className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {uniqueDropoffs.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Status Filter */}
                      <Select
                        value={selectedStatus}
                        onValueChange={setSelectedStatus}
                      >
                        <SelectTrigger>
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="CREATED">Created</SelectItem>
                          <SelectItem value="VERIFIED">Verified</SelectItem>
                          <SelectItem value="DELIVERED">Delivered</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Export Button */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => openExportDialog("csv")}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          CSV
                        </Button>
                      </div>
                    </div>

                    {/* Custom Date Range */}
                    {dateRange === "custom" && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Start Date
                          </label>
                          <Input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            End Date
                          </label>
                          <Input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Results Count */}
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredTickets.length} of {tickets.length}{" "}
                      tickets
                    </div>
                  </div>
                </Card>

                {/* Tickets Table */}
                {isLoadingTickets ? (
                  <Card className="p-12 text-center shadow-md">
                    <div className="flex justify-center mb-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                    <p className="text-muted-foreground">Loading tickets...</p>
                  </Card>
                ) : filteredTickets.length === 0 ? (
                  <Card className="p-12 text-center shadow-md">
                    <FileText className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
                    <p className="text-lg font-medium text-foreground">
                      No tickets found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your filters to see more results
                    </p>
                  </Card>
                ) : (
                  <Card className="shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Ticket Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Client Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Transaction ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Ticket ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Truck ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Driver Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Pickup Location
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Drop-off Location
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Net Weight
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Tare Weight
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Gross Weight
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Close Time
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Attendant
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Ticket Link
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredTickets.map((ticket) => (
                            <tr
                              key={ticket.ticket_id}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                                {new Date(ticket.created_at).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                Avensis Energy
                              </td>
                              <td>{ticket.transaction_id}</td>
                              <td className="px-4 py-3 text-sm font-mono text-foreground">
                                {ticket.ticket_id.replace("TKT-", "")}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {ticket.truck_name}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {ticket.driver_name || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {ticket.origin_site}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {ticket.destination_site}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                                {ticket.net_weight
                                  ? `${ticket.net_weight.toFixed(2)} tons`
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                                {ticket.tare_weight
                                  ? `${ticket.tare_weight.toFixed(2)} tons`
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                                {ticket.gross_weight
                                  ? `${ticket.gross_weight.toFixed(2)} tons`
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                                {ticket.delivered_at
                                  ? new Date(
                                      ticket.delivered_at
                                    ).toLocaleString()
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {ticket.confirmer_name || "-"}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={ticket.status} />
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/tickets/${ticket.ticket_id}`)
                                  }
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Export Column Selection Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Select Columns to Export ({exportType.toUpperCase()})
            </DialogTitle>
            <DialogDescription>
              Choose which columns you want to include in your export
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Select/Deselect All */}
            <div className="flex items-center justify-between pb-3 border-b">
              <Label className="text-sm font-medium">Select All</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllColumns(true)}
                >
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllColumns(false)}
                >
                  None
                </Button>
              </div>
            </div>

            {/* Column Checkboxes */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {exportColumns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50"
                >
                  <Checkbox
                    id={column.id}
                    checked={column.enabled}
                    onCheckedChange={() => toggleColumn(column.id)}
                  />
                  <Label
                    htmlFor={column.id}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>

            {/* Selected Count */}
            <div className="pt-3 border-t text-sm text-muted-foreground">
              {exportColumns.filter((col) => col.enabled).length} of{" "}
              {exportColumns.length} columns selected
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={exportType === "csv" ? exportToCSV : exportToPDF}
              disabled={exportColumns.filter((col) => col.enabled).length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export {exportType.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorProfile;

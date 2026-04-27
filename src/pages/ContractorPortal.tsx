import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  LogOut,
  FileText,
  Search,
  MapPin,
  CheckCircle,
  Clock,
  Package,
  Calendar,
  Truck as TruckIcon,
  User,
  Weight,
} from "lucide-react";
import type { Ticket } from "@/lib/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ContractorPortal = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contractorName, setContractorName] = useState("");
  const [selectedDestinationSiteId, setSelectedDestinationSiteId] =
    useState("");
  const [selectedDestinationSiteName, setSelectedDestinationSiteName] =
    useState("");

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Redirect if not authenticated as attendant (only after loading is complete)
  useEffect(() => {
    if (loading) return; // Wait for auth state to load

    if (!user || user.role !== "attendant") {
      navigate("/contractor/login");
      return;
    }
  }, [user, navigate, loading]);

  // Load contractor data and selected destination site
  useEffect(() => {
    const loadData = async () => {
      if (!user || user.role !== "attendant") {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Get selected destination site from localStorage
        const siteId = localStorage.getItem("selectedDestinationSiteId");
        const siteName = localStorage.getItem("selectedDestinationSiteName");

        if (!siteId || !siteName) {
          // No site selected, redirect back to login
          navigate("/contractor/login");
          return;
        }

        setSelectedDestinationSiteId(siteId);
        setSelectedDestinationSiteName(siteName);

        // Get contractor company data
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", user.id)
          .single();

        if (companyError) throw companyError;
        setContractorName(company?.name || "");

        // Load tickets for the selected destination site only
        await loadTickets(siteId);
      } catch (error) {
        console.error("Error loading contractor data:", error);
        toast({
          title: "Error",
          description: "Failed to load contractor data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate]);

  const loadTickets = async (siteId: string) => {
    setIsLoadingTickets(true);
    try {
      if (!siteId) {
        setTickets([]);
        setIsLoadingTickets(false);
        return;
      }

      // Get today's date at midnight (for CLOSED tickets filter)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Query tickets directly from Supabase with proper filtering
      // Filter: destination_site_id = siteId AND (status = 'VERIFIED' OR (status = 'CLOSED' AND created_at >= today))
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          truck:trucks!tickets_truck_id_fkey (
            id,
            truck_id,
            carrier:companies (
              id,
              name
            )
          ),
          driver:drivers (
            id,
            name,
            driver_qr_code
          ),
          pickup_site:pickup_sites!tickets_origin_site_id_fkey (
            id,
            name,
            address
          ),
          destination_site_data:destination_sites!tickets_destination_site_id_fkey (
            id,
            name,
            location,
            address
          )
        `
        )
        .eq("destination_site_id", siteId)
        .or(
          `status.eq.VERIFIED,and(status.eq.CLOSED,created_at.gte.${todayISO})`
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading tickets from Supabase:", error);
        throw error;
      }

      // Map the tickets with joined data
      const mappedTickets = (data || []).map((row: any) => {
        const ticket: any = {
          ...row,
          // Map truck data
          truck_name: row.truck?.truck_id || row.truck_id || "Unknown",
          carrier: row.truck?.carrier?.name || row.carrier || "Unknown",
          carrier_id: row.truck?.carrier?.id || row.carrier_id,
          // Map driver data
          driver_name: row.driver?.name || row.driver_name || "Not assigned",
          driver_qr_code: row.driver?.driver_qr_code || row.driver_qr_code,
          // Map site data (use joined data if available, fallback to text fields)
          origin_site: row.pickup_site?.name || row.origin_site || "Unknown",
          destination_site:
            row.destination_site_data?.name ||
            row.destination_site ||
            "Unknown",
        };

        // Clean up the nested objects to avoid confusion
        delete ticket.truck;
        delete ticket.driver;
        delete ticket.pickup_site;
        delete ticket.destination_site_data;

        return ticket;
      });

      setTickets(mappedTickets);
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

  // Filter tickets based on search and filters
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch =
        searchQuery === "" ||
        ticket.manual_ticket_id
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        ticket.truck_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.driver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.carrier?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        selectedStatus === "all" || ticket.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchQuery, selectedStatus]);

  const handleLogout = () => {
    // Clear selected site from localStorage
    localStorage.removeItem("selectedDestinationSiteId");
    localStorage.removeItem("selectedDestinationSiteName");
    logout();
    navigate("/contractor/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <Header />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Destination Attendant Portal
            </h1>
            <p className="text-muted-foreground mt-1">{contractorName}</p>
            <div className="flex items-center gap-2 mt-2">
              <MapPin className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-primary">
                {selectedDestinationSiteName}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Pending Verification
                </p>
                <p className="text-2xl font-bold">
                  {tickets.filter((t) => t.status === "VERIFIED").length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Closed Today</p>
                <p className="text-2xl font-bold">
                  {tickets.filter((t) => t.status === "CLOSED").length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters Section */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by transaction ID, truck, driver, or carrier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Tickets Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Incoming Tickets</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredTickets.length} ticket
              {filteredTickets.length !== 1 ? "s" : ""}
            </p>
          </div>

          {isLoadingTickets ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTickets.map((ticket) => {
                const createdDate = ticket.created_at
                  ? new Date(ticket.created_at)
                  : null;
                const formattedDate = createdDate
                  ? createdDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "N/A";
                const formattedTime = createdDate
                  ? createdDate.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                const statusColors: Record<string, string> = {
                  VERIFIED:
                    "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
                  CLOSED:
                    "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
                };

                const statusColor =
                  statusColors[ticket.status] ||
                  "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20";

                return (
                  <Card
                    key={ticket.ticket_id}
                    className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 border-border/50 relative"
                    onClick={() =>
                      navigate(`/tickets/${ticket.ticket_id}/confirm-delivery`)
                    }
                  >
                    <div className="p-5">
                      <div className="flex flex-col gap-4">
                        {/* Header Section */}
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex-shrink-0 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                            <Package className="h-6 w-6 text-primary" />
                          </div>

                          {/* Transaction ID and Carrier */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <h3 className="font-bold text-lg text-foreground truncate">
                              {ticket.manual_ticket_id || "No Transaction ID"}
                            </h3>

                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <TruckIcon className="h-3 w-3" />
                              <span className="truncate">
                                {ticket.carrier || "Unknown Carrier"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <TruckIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground truncate">
                              {ticket.truck_name || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground truncate">
                              {ticket.driver_name || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2">
                            <Weight className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {ticket.net_weight
                                ? `${ticket.net_weight} lbs`
                                : "N/A"}
                            </span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-b border-border/50" />

                        {/* Status and Date */}
                        <div className="flex justify-between items-center gap-4">
                          <div
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${statusColor}`}
                          >
                            {ticket.status}
                          </div>

                          <div className="flex flex-col gap-1 text-xs text-muted-foreground text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{formattedDate}</span>
                            </div>
                            {formattedTime && (
                              <div className="flex items-center gap-1.5 justify-end">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{formattedTime}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Hover Effect Indicator */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractorPortal;

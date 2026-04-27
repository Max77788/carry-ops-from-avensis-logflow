import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  Truck as TruckIcon,
  Package,
  Filter,
  User,
  Building2,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Lock,
  LogIn,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Header } from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ticketService } from "@/lib/ticketService";
import { truckService } from "@/lib/truckService";
import { toast } from "@/hooks/use-toast";
import type { Ticket } from "@/lib/types";
import type { Truck } from "@/lib/truckService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

// Hardcoded credentials for overview page access
const OVERVIEW_CREDENTIALS = {
  username: "scalehouse",
  password: "scale2025",
};

type UITicket = Ticket & {
  _search: string;
  _isToday: boolean;
};

type UITruck = Truck & {
  _search: string;
};

const STATUSES = ["CREATED", "VERIFIED", "CLOSED"] as const;

const TICKETS_PAGE_SIZE = 50;
const TRUCKS_PAGE_SIZE = 50;

const Overview = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { logout } = useAuth();

  // Authentication state - Load from localStorage on mount
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const stored = localStorage.getItem("overviewAuthenticated");
    return stored === "true";
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Persist authentication state to localStorage
  useEffect(() => {
    localStorage.setItem("overviewAuthenticated", isAuthenticated.toString());
  }, [isAuthenticated]);

  // Tickets state
  const [allTickets, setAllTickets] = useState<UITicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [ticketsHasMore, setTicketsHasMore] = useState(true);

  // Trucks state
  const [allTrucks, setAllTrucks] = useState<UITruck[]>([]);
  const [trucksLoading, setTrucksLoading] = useState(false);
  const [trucksLoaded, setTrucksLoaded] = useState(false);
  const [trucksPage, setTrucksPage] = useState(1);
  const [trucksTotal, setTrucksTotal] = useState(0);
  const [trucksHasMore, setTrucksHasMore] = useState(true);

  // Metrics state for async updates
  const [ticketMetrics, setTicketMetrics] = useState({
    loadsDelivered: 0,
    loadsInProgress: 0,
    tonsDelivered: 0,
  });
  const [truckMetrics, setTruckMetrics] = useState({
    dailyTruckCount: 0,
    trucksAvailableToday: 0,
    trucksDeliveringNow: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Filters / UI
  const [ticketSearch, setTicketSearch] = useState("");
  const [truckSearch, setTruckSearch] = useState("");
  const [debouncedTicketSearch, setDebouncedTicketSearch] = useState("");
  const [debouncedTruckSearch, setDebouncedTruckSearch] = useState("");

  const [activeTab, setActiveTab] = useState<"tickets" | "trucks">("tickets");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [carrierFilter, setCarrierFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    // Simulate a brief loading state for better UX
    setTimeout(() => {
      if (
        username.trim() === OVERVIEW_CREDENTIALS.username &&
        password === OVERVIEW_CREDENTIALS.password
      ) {
        setIsAuthenticated(true);
        toast({
          title: "Login Successful",
          description: "Welcome to Overview Dashboard",
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

  // Debounce ticket search
  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedTicketSearch(ticketSearch),
      250
    );
    return () => window.clearTimeout(id);
  }, [ticketSearch]);

  // Debounce truck search
  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedTruckSearch(truckSearch),
      250
    );
    return () => window.clearTimeout(id);
  }, [truckSearch]);

  // Helper: normalize tickets (precompute search + isToday)
  const normalizeTickets = (tickets: Ticket[]): UITicket[] => {
    const todayStr = new Date().toDateString();

    return tickets.map((t) => {
      let isToday = false;
      if (t.created_at) {
        const createdAtStr = new Date(t.created_at).toDateString();
        isToday = createdAtStr === todayStr;
      }

      // Enhanced search key with more fields for better searchability
      const searchKey = [
        t.ticket_id ?? "",
        t.truck_id ?? "",
        t.truck_name ?? "", // Truck display name
        t.carrier ?? "",
        t.driver_name ?? "",
        t.destination_site ?? "",
        t.origin_site ?? "",
        t.product ?? "",
        t.status ?? "",
        t.manual_ticket_id ?? "", // Manual ticket ID
      ]
        .join(" ")
        .toLowerCase();

      return {
        ...t,
        _search: searchKey,
        _isToday: isToday,
      };
    });
  };

  /**
   * Normalize trucks for UI display
   * Extracts nested data from Supabase joins and adds search key
   * - Extracts carrier name from carriers object
   * - Extracts driver name from active_driver object
   * - Adds enhanced search key for filtering by truck ID, carrier, and driver
   */
  const normalizeTrucks = (trucks: Truck[]): UITruck[] => {
    return trucks.map((t: any) => {
      console.log("Truck:", t);

      // Extract carrier name from nested carriers object
      const carrierName =
        t.carriers?.name || t.carrier_name || t.companies?.name || "Unknown";

      // Extract driver name from nested active_driver object
      const driverName =
        t.active_driver?.name || t.driver_name || "Not assigned";

      // Enhanced search key with truck ID, carrier name, and driver name
      const searchKey = [
        t.truck_id || "",
        carrierName,
        driverName !== "Not assigned" ? driverName : "",
      ]
        .join(" ")
        .toLowerCase();

      return {
        ...t,
        carrier_name: carrierName,
        driver_name: driverName,
        _search: searchKey,
      };
    });
  };

  // Initial tickets load (page 1)
  useEffect(() => {
    let isMounted = true;

    const loadTicketsPage = async (page: number) => {
      setTicketsLoading(true);
      try {
        const fromDate =
          dateFilter === "today"
            ? new Date().toISOString().slice(0, 10) // YYYY-MM-DD
            : undefined;

        const res = await ticketService.getTicketsOverview({
          limit: TICKETS_PAGE_SIZE,
          fromDate,
          page,
        });

        if (!isMounted) return;

        const normalized = normalizeTickets(res.tickets);

        if (page === 1) {
          setAllTickets(normalized);
        } else {
          setAllTickets((prev) => [...prev, ...normalized]);
        }

        setTicketsTotal(res.total ?? 0);
        setTicketsPage(res.page);
        const totalPages = Math.ceil((res.total ?? 0) / res.pageSize);
        setTicketsHasMore(res.page < totalPages);
      } catch (error) {
        console.error("Error loading tickets overview:", error);
        if (isMounted) {
          setTicketsHasMore(false);
        }
      } finally {
        if (isMounted) setTicketsLoading(false);
      }
    };

    // Always (re)load page 1 when dateFilter changes
    loadTicketsPage(1);

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const loadMoreTickets = async () => {
    if (ticketsLoading || !ticketsHasMore) return;
    const nextPage = ticketsPage + 1;
    try {
      setTicketsLoading(true);
      const fromDate =
        dateFilter === "today"
          ? new Date().toISOString().slice(0, 10)
          : undefined;

      const res = await ticketService.getTicketsOverview({
        limit: TICKETS_PAGE_SIZE,
        fromDate,
        page: nextPage,
      });

      const normalized = normalizeTickets(res.tickets);

      setAllTickets((prev) => [...prev, ...normalized]);
      setTicketsPage(res.page);
      setTicketsTotal(res.total ?? 0);
      const totalPages = Math.ceil((res.total ?? 0) / res.pageSize);
      setTicketsHasMore(res.page < totalPages);
    } catch (error) {
      console.error("Error loading more tickets:", error);
      setTicketsHasMore(false);
    } finally {
      setTicketsLoading(false);
    }
  };

  // Lazy-load trucks (page 1) when Trucks tab is opened
  useEffect(() => {
    if (activeTab !== "trucks") return;
    if (trucksLoaded) return;

    let isMounted = true;

    const loadTrucksPage = async (page: number) => {
      setTrucksLoading(true);
      try {
        const res = await truckService.getActiveTrucksOverview({
          limit: TRUCKS_PAGE_SIZE,
          page,
        });

        if (!isMounted) return;

        const normalized = normalizeTrucks(res.trucks);

        if (page === 1) {
          setAllTrucks(normalized);
        } else {
          setAllTrucks((prev) => [...prev, ...normalized]);
        }

        setTrucksTotal(res.total ?? 0);
        setTrucksPage(res.page);
        const totalPages = Math.ceil((res.total ?? 0) / res.pageSize);
        setTrucksHasMore(res.page < totalPages);
        setTrucksLoaded(true);
      } catch (error) {
        console.error("Error loading trucks overview:", error);
        if (isMounted) setTrucksHasMore(false);
      } finally {
        if (isMounted) setTrucksLoading(false);
      }
    };

    loadTrucksPage(1);

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, trucksLoaded]);

  const loadMoreTrucks = async () => {
    if (trucksLoading || !trucksHasMore) return;
    const nextPage = trucksPage + 1;
    try {
      setTrucksLoading(true);
      const res = await truckService.getActiveTrucksOverview({
        limit: TRUCKS_PAGE_SIZE,
        page: nextPage,
      });

      const normalized = normalizeTrucks(res.trucks);

      setAllTrucks((prev) => [...prev, ...normalized]);
      setTrucksPage(res.page);
      setTrucksTotal(res.total ?? 0);
      const totalPages = Math.ceil((res.total ?? 0) / res.pageSize);
      setTrucksHasMore(res.page < totalPages);
    } catch (error) {
      console.error("Error loading more trucks:", error);
      setTrucksHasMore(false);
    } finally {
      setTrucksLoading(false);
    }
  };

  // Memoized filtered tickets
  const filteredTickets = useMemo(() => {
    const search = debouncedTicketSearch.trim().toLowerCase();

    return allTickets.filter((ticket) => {
      const matchesSearch = !search || ticket._search.includes(search);
      const matchesStatus = !statusFilter || ticket.status === statusFilter;
      const matchesCarrier = !carrierFilter || ticket.carrier === carrierFilter;
      const matchesDate = dateFilter === "today" ? ticket._isToday : true;

      return matchesSearch && matchesStatus && matchesCarrier && matchesDate;
    });
  }, [
    allTickets,
    debouncedTicketSearch,
    statusFilter,
    carrierFilter,
    dateFilter,
  ]);

  // Memoized map of busy trucks (trucks with active tickets)
  const busyTrucksMap = useMemo(() => {
    const map = new Map<string, string>(); // truck UUID -> ticket_id

    // Find all active tickets (CREATED or VERIFIED status)
    const activeTickets = allTickets.filter(
      (ticket) => ticket.status === "CREATED" || ticket.status === "VERIFIED"
    );

    // Map truck UUID to ticket_id for active tickets
    // Note: ticket.truck_id is the UUID (foreign key), not the display name
    activeTickets.forEach((ticket) => {
      if (ticket.truck_id) {
        map.set(ticket.truck_id, ticket.ticket_id);
      }
    });

    return map;
  }, [allTickets]);

  // Memoized filtered trucks - show all trucks without active tickets
  const filteredTrucks = useMemo(() => {
    const search = debouncedTruckSearch.trim().toLowerCase();

    return allTrucks.filter((truck: UITruck) => {
      const searchKey = truck._search || "";
      const matchesSearch = !search || searchKey.includes(search);
      // Show all trucks that don't have active tickets (regardless of driver assignment)
      const hasActiveTicket = busyTrucksMap.has(truck.id);

      return matchesSearch && !hasActiveTicket;
    });
  }, [allTrucks, debouncedTruckSearch, busyTrucksMap]);

  // Unique carriers for filter
  const uniqueCarriers = useMemo(() => {
    return Array.from(
      new Set(allTickets.map((t) => t.carrier).filter(Boolean))
    ).sort();
  }, [allTickets]);

  // Calculate ticket metrics from FILTERED tickets (displayed to user)
  useEffect(() => {
    const loadsDelivered = filteredTickets.filter(
      (t) => t.status === "CLOSED"
    ).length;
    const loadsInProgress = filteredTickets.filter(
      (t) => t.status === "VERIFIED"
    ).length;
    const tonsDelivered = filteredTickets
      .filter((t) => t.status === "CLOSED")
      .reduce((sum, ticket) => {
        const weight = ticket.net_weight || 0;
        return sum + weight;
      }, 0);

    setTicketMetrics({
      loadsDelivered,
      loadsInProgress,
      tonsDelivered,
    });
  }, [filteredTickets]);

  // Calculate truck metrics from FILTERED tickets and trucks (displayed to user)
  useEffect(() => {
    const todayStr = new Date().toDateString();

    // Daily Truck Count - unique trucks from filtered tickets created today
    const todayTickets = filteredTickets.filter((ticket) => {
      if (!ticket.created_at) return false;
      const createdAtStr = new Date(ticket.created_at).toDateString();
      return createdAtStr === todayStr;
    });
    const dailyTruckCount = new Set(
      todayTickets.map((t) => t.truck_id).filter(Boolean)
    ).size;

    // Trucks Delivering Now - unique trucks from filtered tickets with VERIFIED status
    const verifiedTickets = filteredTickets.filter(
      (ticket) => ticket.status === "VERIFIED"
    );
    const trucksDeliveringNow = new Set(
      verifiedTickets.map((t) => t.truck_id).filter(Boolean)
    ).size;

    // Trucks Available Today - count of filtered trucks being displayed
    const trucksAvailableToday = filteredTrucks.length;

    setTruckMetrics({
      dailyTruckCount,
      trucksDeliveringNow,
      trucksAvailableToday,
    });
  }, [filteredTickets, filteredTrucks]);

  // Use backend totals for counts if available, otherwise fallback
  const ticketsCountLabel =
    ticketsTotal > 0 ? ticketsTotal : filteredTickets.length;
  const trucksCountLabel =
    trucksTotal > 0 ? trucksTotal : filteredTrucks.length;

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
              Scalehouse Dashboard Access
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
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

            {/*
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
            */}
          </Card>

          {/* Info */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Authorized personnel only. Contact your administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        showLogoutButton
        onLogoutClick={() => setShowLogoutWarning(true)}
      />
      {/* Tabs Section */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-3 md:px-4 py-0">
          <div className="flex gap-1 md:gap-2 overflow-x-auto">
            <Button
              variant={activeTab === "tickets" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("tickets")}
              className="rounded-b-none whitespace-nowrap text-xs md:text-sm"
            >
              <Package className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t("overview.tickets")}</span>
              <span className="sm:hidden">Tickets</span>{" "}
              {/* ({ticketsCountLabel}) */}
            </Button>

            <Button
              variant={activeTab === "trucks" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("trucks")}
              className="rounded-b-none whitespace-nowrap text-xs md:text-sm"
            >
              <TruckIcon className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t("overview.trucks")}</span>
              <span className="sm:hidden">Trucks</span>{" "}
              {/* ({trucksCountLabel}) */}
            </Button>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <main className="container mx-auto px-3 py-4 md:px-4 md:py-8 flex-1 overflow-y-auto">
        {/* Tickets Tab */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Loads Delivered */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Loads Delivered
                    </p>
                    <p className="text-2xl font-bold">
                      {metricsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        ticketMetrics.loadsDelivered
                      )}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Loads in Progress */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Package className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Loads in Progress
                    </p>
                    <p className="text-2xl font-bold">
                      {metricsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        ticketMetrics.loadsInProgress
                      )}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Tons Delivered */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <TruckIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tons Delivered
                    </p>
                    <p className="text-2xl font-bold">
                      {metricsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        ticketMetrics.tonsDelivered.toFixed(2)
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Search + Filters */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by ticket, truck, carrier, driver, destination, origin, product, status..."
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="pl-10 text-xs md:text-sm"
                  />
                </div>
                <Button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  variant={showAdvancedFilters ? "default" : "outline"}
                  size="icon"
                  className="h-9 w-9 md:h-10 md:w-10"
                  title={t("overview.advancedFilters")}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <Card className="p-3 md:p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t("common.status")}
                      </label>
                      <Select
                        value={statusFilter || "all"}
                        onValueChange={(value) =>
                          setStatusFilter(value === "all" ? null : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("overview.allStatuses")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            {t("overview.allStatuses")}
                          </SelectItem>
                          {STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Carrier Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t("common.carrier")}
                      </label>
                      <Select
                        value={carrierFilter || "all"}
                        onValueChange={(value) =>
                          setCarrierFilter(value === "all" ? null : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("overview.allCarriers")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            {t("overview.allCarriers")}
                          </SelectItem>
                          {uniqueCarriers.map((carrier) => (
                            <SelectItem key={carrier} value={carrier}>
                              {carrier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t("overview.date")}
                      </label>
                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">
                            {t("overview.today")}
                          </SelectItem>
                          <SelectItem value="all">
                            {t("overview.allDates")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Tickets Grid */}
            {ticketsLoading && allTickets.length === 0 ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="h-24 animate-pulse bg-muted" />
                ))}
              </div>
            ) : filteredTickets.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {t("overview.noTicketsFound")}
                </p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTickets.map((ticket) => {
                    // Format created date
                    const createdDate = ticket.created_at
                      ? new Date(ticket.created_at)
                      : null;
                    const formattedDate = createdDate
                      ? createdDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "N/A";
                    const formattedTime = createdDate
                      ? createdDate.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";

                    // Status badge color
                    const statusColors = {
                      CREATED:
                        "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
                      VERIFIED:
                        "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
                      CLOSED:
                        "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
                    };
                    const statusColor =
                      statusColors[
                        ticket.status as keyof typeof statusColors
                      ] || statusColors.CREATED;

                    // Status label mapping
                    const statusLabels = {
                      CREATED: "CREATED",
                      VERIFIED: "In Progress",
                      CLOSED: "Delivered",
                    };
                    const statusLabel =
                      statusLabels[
                        ticket.status as keyof typeof statusLabels
                      ] || ticket.status;

                    return (
                      <Card
                        key={ticket.ticket_id}
                        className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50 border-border/50"
                        onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                      >
                        <div className="p-5">
                          <div className="flex flex-col gap-4">
                            {/* Header Section */}
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex-shrink-0 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                                <Package className="h-6 w-6 text-primary" />
                              </div>

                              {/* Ticket ID and Destination */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <h3 className="font-bold text-lg text-foreground truncate">
                                  {ticket.carrier}
                                </h3>

                                <div className="flex items-start gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">
                                      {ticket.destination_site}
                                    </p>
                                  </div>
                                  <TruckIcon className="h-3 w-3" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">
                                      {ticket.truck_name}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="border-b border-border/50" />

                            {/* Status Badge */}
                            <div className="flex justify-start gap-4">
                              <div
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${statusColor}`}
                              >
                                {statusLabel}
                              </div>
                              {/* Date and Time */}
                              <div className="flex flex-row gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>{formattedDate}</span>
                                </div>
                                {formattedTime && (
                                  <div className="flex items-center gap-1.5">
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

                {ticketsHasMore && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreTickets}
                      disabled={ticketsLoading}
                    >
                      {ticketsLoading
                        ? t("overview.loadingMore")
                        : t("overview.loadMoreTickets")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Trucks Tab */}
        {activeTab === "trucks" && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Daily Trucks Count */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <TruckIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Daily Truck Count
                    </p>
                    <p className="text-2xl font-bold">
                      {metricsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        truckMetrics.dailyTruckCount
                      )}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Available Today */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Trucks Available Today
                    </p>
                    <p className="text-2xl font-bold">
                      {truckMetrics.trucksAvailableToday}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Load in Progress */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Package className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Trucks Delivering Now
                    </p>
                    <p className="text-2xl font-bold">
                      {metricsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        truckMetrics.trucksDeliveringNow
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by truck ID, carrier, or driver..."
                  value={truckSearch}
                  onChange={(e) => setTruckSearch(e.target.value)}
                  className="pl-10 text-xs md:text-sm"
                />
              </div>
            </div>

            {/* Trucks List */}
            {trucksLoading && allTrucks.length === 0 ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="h-16 animate-pulse bg-muted" />
                ))}
              </div>
            ) : filteredTrucks.length === 0 ? (
              <Card className="p-6 text-center">
                <TruckIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t("overview.noTrucksFound")}
                </p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTrucks.map((truck) => {
                    // All trucks in filteredTrucks are available (no active tickets)
                    return (
                      <Card
                        key={truck.id}
                        className="group relative overflow-hidden transition-all duration-200 border-border/50 hover:shadow-lg hover:border-primary/50 cursor-pointer bg-card"
                        onClick={() => {
                          // Navigate to create ticket for available trucks
                          navigate(
                            `/tickets/create?truck_id=${encodeURIComponent(
                              truck.truck_id
                            )}&carrier_id=${encodeURIComponent(
                              truck.carrier_id
                            )}&truck_uuid=${encodeURIComponent(truck.id)}`
                          );
                        }}
                      >
                        {/* Status Indicator - Top Right */}
                        <div className="absolute top-3 right-3 z-10">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-300">
                              Available
                            </span>
                          </div>
                        </div>

                        <div className="p-5">
                          {/* Header Section */}
                          <div className="flex items-start gap-4 mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex-shrink-0 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                              <TruckIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <h3 className="font-bold text-lg text-foreground truncate mb-0.5">
                                {truck.truck_id}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                Truck ID
                              </p>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-border/50 mb-4" />

                          {/* Information Grid - Row Layout */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Carrier */}
                            <div className="flex items-start gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 flex-shrink-0">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  {t("common.carrier")}
                                </p>
                                <p className="text-sm font-medium text-foreground truncate">
                                  {truck.carrier_name || "Unknown"}
                                </p>
                              </div>
                            </div>

                            {/* Driver */}
                            <div className="flex items-start gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 flex-shrink-0">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  {t("common.driver")}
                                </p>
                                <p className="text-sm font-medium text-foreground truncate">
                                  {truck.driver_name || "Not assigned"}
                                </p>
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

                {trucksHasMore && (
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreTrucks}
                      disabled={trucksLoading}
                    >
                      {trucksLoading
                        ? t("overview.loadingMore")
                        : t("overview.loadMoreTrucks")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Logout Warning Dialog */}
      <AlertDialog open={showLogoutWarning} onOpenChange={setShowLogoutWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() => {
                // Clear Overview authentication
                setIsAuthenticated(false);
                localStorage.removeItem("overviewAuthenticated");
                // Clear main auth
                logout();
                // Refresh the page to show login modal again
                window.location.reload();
              }}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Logout
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Overview;

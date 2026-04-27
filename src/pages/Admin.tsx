import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Header } from "@/components/Header";
import { Search, Download, Package, Filter } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Ticket } from "@/lib/types";
import { ticketService } from "@/lib/ticketService";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const Admin = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { logout } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  useEffect(() => {
    const loadTickets = async () => {
      const allTickets = await ticketService.getAllTickets();
      setTickets(allTickets);
    };
    loadTickets();
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.truck_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.product.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || ticket.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    if (tickets.length === 0) {
      return;
    }

    const headers = [
      "Ticket ID",
      "Truck ID",
      "Product",
      "Origin",
      "Destination",
      "Status",
      "Created",
      "Delivered",
    ];

    const rows = tickets.map((t) => [
      t.ticket_id,
      t.truck_id,
      t.product,
      t.origin_site,
      t.destination_site,
      t.status,
      new Date(t.created_at).toLocaleString(),
      t.delivered_at ? new Date(t.delivered_at).toLocaleString() : "N/A",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        showHomeButton
        onHomeClick={() => navigate("/home")}
        showLogoutButton
        onLogoutClick={() => setShowLogoutWarning(true)}
      />

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Hardcoded Credentials */}
          <Card className="shadow-md border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Admin Credentials
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">
                    Username:
                  </p>
                  <p className="font-mono font-semibold text-blue-900 dark:text-blue-100">
                    admin
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">
                    Password:
                  </p>
                  <p className="font-mono font-semibold text-blue-900 dark:text-blue-100">
                    admin123
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <Card className="shadow-md">
            <div className="space-y-4 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("admin.searchTickets")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={filterStatus === "all" ? "default" : "outline"}
                  onClick={() => setFilterStatus("all")}
                >
                  <Filter className="mr-2 h-3 w-3" />
                  All
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "CREATED" ? "default" : "outline"}
                  onClick={() => setFilterStatus("CREATED")}
                >
                  Created
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "VERIFIED" ? "default" : "outline"}
                  onClick={() => setFilterStatus("VERIFIED")}
                >
                  Verified
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "DELIVERED" ? "default" : "outline"}
                  onClick={() => setFilterStatus("DELIVERED")}
                >
                  Delivered
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "CLOSED" ? "default" : "outline"}
                  onClick={() => setFilterStatus("CLOSED")}
                >
                  Closed
                </Button>
              </div>
            </div>
          </Card>

          {/* Tickets List */}
          {filteredTickets.length === 0 ? (
            <Card className="shadow-md">
              <div className="p-12 text-center">
                <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
                <p className="text-lg font-medium text-foreground">
                  {t("admin.noTicketsFound")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterStatus !== "all"
                    ? t("common.tryAdjustingFilters")
                    : t("common.createFirstTicket")}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <Card
                  key={ticket.ticket_id}
                  className="cursor-pointer shadow-md transition-all hover:shadow-lg"
                  onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                >
                  <div className="flex flex-col items-center justify-center space-y-2 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-foreground">
                        {ticket.ticket_id}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {ticket.destination_site}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutWarning} onOpenChange={setShowLogoutWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmLogout")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.areYouSureLogout")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-center items-center">
            <AlertDialogCancel className="min-w-[120px] px-4 py-2">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="min-w-[120px] px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.logout")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;

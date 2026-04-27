import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";
import {
  Plus,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image,
  ChevronRight,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useShift } from "@/contexts/ShiftContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ticketService } from "@/lib/ticketService";
import type { Ticket } from "@/lib/types";

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { driverProfile, logout } = useAuth();
  const { shift, endShift } = useShift();
  const [todayTickets, setTodayTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTodayTickets = async () => {
      if (driverProfile?.id) {
        const tickets = await ticketService.getTicketsByDriver(
          driverProfile.id
        );
        // Filter for today's tickets
        const today = new Date().toDateString();
        const todayTickets = tickets.filter(
          (t) => new Date(t.created_at).toDateString() === today
        );
        setTodayTickets(todayTickets);
      }
      setIsLoading(false);
    };

    loadTodayTickets();
    const interval = setInterval(loadTodayTickets, 5000);
    return () => clearInterval(interval);
  }, [driverProfile]);

  const handleEndShift = () => {
    endShift();
    logout();
    navigate("/driver/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CREATED":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "VERIFIED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "DELIVERED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "CLOSED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CREATED":
        return <AlertCircle className="h-4 w-4" />;
      case "VERIFIED":
        return <Clock className="h-4 w-4" />;
      case "DELIVERED":
        return <Clock className="h-4 w-4" />;
      case "CLOSED":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const groupedTickets = {
    active: todayTickets.filter((t) => t.status === "CREATED"),
    verified: todayTickets.filter((t) => t.status === "VERIFIED"),
    delivered: todayTickets.filter((t) => t.status === "DELIVERED"),
    closed: todayTickets.filter((t) => t.status === "CLOSED"),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex flex-col">
      {/* Header */}
      <Header showHomeButton onHomeClick={() => navigate("/home")} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Action Buttons */}
        <div className="grid gap-4 mb-8 sm:grid-cols-2">
          <Button
            onClick={() => navigate("/tickets/create")}
            className="h-14 text-base font-semibold gap-2"
          >
            <Plus className="h-5 w-5" />
            {t("home.createTicket")}
          </Button>
        </div>

        {/* Today's Tickets */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {t("home.todayTickets")} ({todayTickets.length})
            </h2>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : todayTickets.length === 0 ? (
              <Card className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{t("common.noData")}</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Active Tickets */}
                {groupedTickets.active.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      {t("home.active")} ({groupedTickets.active.length})
                    </p>
                    {groupedTickets.active.map((ticket) => (
                      <Card
                        key={ticket.ticket_id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() =>
                          navigate(`/tickets/${ticket.ticket_id}`, {
                            state: { ticket },
                          })
                        }
                      >
                        <div className="flex flex-col items-center justify-center space-y-2 p-6">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            {ticket.ticket_image_url ? (
                              <Image className="h-6 w-6 text-primary" />
                            ) : (
                              getStatusIcon(ticket.status) && (
                                <div className="text-primary">
                                  {getStatusIcon(ticket.status)}
                                </div>
                              )
                            )}
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-foreground">
                              {ticket.ticket_id}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {ticket.destination_site}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Other Status Groups */}
                {groupedTickets.verified.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      {t("home.verified")} ({groupedTickets.verified.length})
                    </p>
                    {groupedTickets.verified.map((ticket) => (
                      <Card
                        key={ticket.ticket_id}
                        className="cursor-pointer hover:shadow-md transition-shadow opacity-75"
                        onClick={() =>
                          navigate(`/tickets/${ticket.ticket_id}`, {
                            state: { ticket },
                          })
                        }
                      >
                        <div className="flex flex-col items-center justify-center space-y-2 p-6">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            {getStatusIcon(ticket.status) && (
                              <div className="text-primary">
                                {getStatusIcon(ticket.status)}
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-foreground">
                              {ticket.ticket_id}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {ticket.destination_site}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Delivered Tickets */}
                {groupedTickets.delivered.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      {t("home.delivered")} ({groupedTickets.delivered.length})
                    </p>
                    {groupedTickets.delivered.map((ticket) => (
                      <Card
                        key={ticket.ticket_id}
                        className="cursor-pointer hover:shadow-md transition-shadow opacity-50"
                        onClick={() =>
                          navigate(`/tickets/${ticket.ticket_id}`, {
                            state: { ticket },
                          })
                        }
                      >
                        <div className="flex flex-col items-center justify-center space-y-2 p-6">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            {getStatusIcon(ticket.status) && (
                              <div className="text-primary">
                                {getStatusIcon(ticket.status)}
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-foreground">
                              {ticket.ticket_id}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {ticket.destination_site}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Closed Tickets */}
                {groupedTickets.closed.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      {t("home.closed")} ({groupedTickets.closed.length})
                    </p>
                    {groupedTickets.closed.map((ticket) => (
                      <Card
                        key={ticket.ticket_id}
                        className="cursor-pointer hover:shadow-md transition-shadow opacity-30"
                        onClick={() =>
                          navigate(`/tickets/${ticket.ticket_id}`, {
                            state: { ticket },
                          })
                        }
                      >
                        <div className="flex flex-col items-center justify-center space-y-2 p-6">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            {getStatusIcon(ticket.status) && (
                              <div className="text-primary">
                                {getStatusIcon(ticket.status)}
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-foreground">
                              {ticket.ticket_id}
                            </p>
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;

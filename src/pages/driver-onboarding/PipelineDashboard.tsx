import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/Header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApplicationStatusBadge } from "@/components/driver-onboarding/ApplicationStatusBadge";
import { driverOnboardingService } from "@/lib/driverOnboardingService";
import type { ApplicationWithDetails } from "@/lib/driverOnboardingTypes";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Loader2,
  FileText,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const PipelineDashboard = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>(
    []
  );
  const [filteredApplications, setFilteredApplications] = useState<
    ApplicationWithDetails[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yardFilter, setYardFilter] = useState<string>("all");

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applications, searchQuery, statusFilter, yardFilter]);

  const loadApplications = async () => {
    setIsLoading(true);
    const result = await driverOnboardingService.getApplications();
    if (result.success && result.data) {
      setApplications(result.data);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to load applications",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...applications];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.candidate.name.toLowerCase().includes(query) ||
          app.candidate.phone.toLowerCase().includes(query) ||
          app.candidate.email?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (app) => app.application.status === statusFilter
      );
    }

    // Yard filter
    if (yardFilter !== "all") {
      filtered = filtered.filter(
        (app) => app.application.yard_id === yardFilter
      );
    }

    setFilteredApplications(filtered);
  };

  const getUniqueYards = () => {
    const yards = applications
      .filter((app) => app.yard)
      .map((app) => app.yard!)
      .filter(
        (yard, index, self) => index === self.findIndex((y) => y.id === yard.id)
      );
    return yards;
  };

  const getAge = (createdAt: string) => {
    const days = Math.floor(
      (new Date().getTime() - new Date(createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "Today";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        showHomeButton
        onHomeClick={() => navigate("/driver-onboarding")}
      />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Driver Onboarding Pipeline</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate("/driver-onboarding/supervisor/orientation")
              }
            >
              <Calendar className="h-4 w-4 mr-2" />
              Orientation Schedule
            </Button>
            <Button
              onClick={() => navigate("/driver-onboarding/application/new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="DOCS_PENDING">Docs Pending</SelectItem>
                <SelectItem value="DOCS_VERIFIED">Docs Verified</SelectItem>
                <SelectItem value="MVR_PENDING">MVR Pending</SelectItem>
                <SelectItem value="MVR_PASSED">MVR Passed</SelectItem>
                <SelectItem value="MVR_FAILED">MVR Failed</SelectItem>
                <SelectItem value="DRUG_TEST_ORDERED">
                  Drug Test Ordered
                </SelectItem>
                <SelectItem value="DRUG_TEST_PENDING">
                  Drug Test Pending
                </SelectItem>
                <SelectItem value="DRUG_TEST_PASSED">
                  Drug Test Passed
                </SelectItem>
                <SelectItem value="DRUG_TEST_FAILED">
                  Drug Test Failed
                </SelectItem>
                <SelectItem value="DRUG_TEST_NO_SHOW">
                  Drug Test No Show
                </SelectItem>
                <SelectItem value="DRUG_TEST_EXPIRED">
                  Drug Test Expired
                </SelectItem>
                <SelectItem value="CLEARED_FOR_HIRE">
                  Cleared for Hire
                </SelectItem>
                <SelectItem value="ORIENTATION_SCHEDULED">
                  Orientation Scheduled
                </SelectItem>
                <SelectItem value="ORIENTATION_COMPLETED">
                  Orientation Completed
                </SelectItem>
                <SelectItem value="TRAINING_IN_PROGRESS">
                  Training In Progress
                </SelectItem>
                <SelectItem value="TRAINING_COMPLETED">
                  Training Completed
                </SelectItem>
                <SelectItem value="HIRED">Hired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yardFilter} onValueChange={setYardFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Yards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Yards</SelectItem>
                {getUniqueYards().map((yard) => (
                  <SelectItem key={yard.id} value={yard.id}>
                    {yard.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center text-sm text-muted-foreground">
              Showing {filteredApplications.length} of {applications.length}{" "}
              applications
            </div>
          </div>
        </Card>

        {/* Applications Table */}
        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No applications found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Yard</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Form</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Age</TableHead>
                  {/*
                  <TableHead className="text-right">Actions</TableHead>
                  */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => (
                  <TableRow
                    key={app.application.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(
                        `/driver-onboarding/application/${app.application.id}`
                      )
                    }
                  >
                    <TableCell className="font-medium">
                      {app.candidate.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {app.candidate.phone}
                        </div>
                        {app.candidate.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {app.candidate.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{app.yard?.name || "-"}</TableCell>
                    <TableCell>
                      {app.application.position_type || "-"}
                    </TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={app.application.status} />
                    </TableCell>
                    <TableCell className="text-center">
                      {app.application.application_form_completed_at ? (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs">
                            {format(
                              new Date(
                                app.application.application_form_completed_at
                              ),
                              "MMM d"
                            )}
                          </span>
                        </div>
                      ) : app.application.application_form_sent_at ? (
                        <div className="flex items-center justify-center gap-1 text-yellow-600">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs">Sent</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {app.candidate.source || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getAge(app.application.created_at)}
                    </TableCell>
                    {/*
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            `/driver-onboarding/application/${app.application.id}`
                          );
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                    */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>
    </div>
  );
};

export default PipelineDashboard;

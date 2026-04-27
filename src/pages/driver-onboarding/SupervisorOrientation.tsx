import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { driverOnboardingService } from "@/lib/driverOnboardingService";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ApplicationWithDetails } from "@/lib/driverOnboardingTypes";

const SupervisorOrientation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [applications, setApplications] = useState<ApplicationWithDetails[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [yards, setYards] = useState<
    Array<{
      id: string;
      name: string;
      address?: string;
      supervisor_name?: string;
      supervisor_phone?: string;
    }>
  >([]);
  const [selectedYardId, setSelectedYardId] = useState<string>("");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedApplication, setSelectedApplication] =
    useState<ApplicationWithDetails | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    loadYards();
    loadOrientationSchedule();
  }, [startDate, endDate, selectedYardId]);

  const loadYards = async () => {
    const result = await driverOnboardingService.getYards();
    if (result.success && result.data) {
      setYards(result.data);
    }
  };

  const loadOrientationSchedule = async () => {
    setIsLoading(true);
    const result = await driverOnboardingService.getOrientationScheduleForDate(
      startDate,
      endDate,
      selectedYardId || undefined
    );
    if (result.success && result.data) {
      setApplications(result.data);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to load orientation schedule",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleCompleteOrientation = async () => {
    if (!selectedApplication) return;

    setIsCompleting(true);
    const result = await driverOnboardingService.completeOrientation(
      selectedApplication.application.id,
      completionNotes,
      user?.id
    );

    if (result.success) {
      toast({
        title: "Success",
        description: "Orientation marked as completed",
      });
      setShowCompleteDialog(false);
      setSelectedApplication(null);
      setCompletionNotes("");
      loadOrientationSchedule();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to complete orientation",
        variant: "destructive",
      });
    }
    setIsCompleting(false);
  };

  const openCompleteDialog = (application: ApplicationWithDetails) => {
    setSelectedApplication(application);
    setShowCompleteDialog(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showHomeButton onHomeClick={() => navigate("/home")} />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/driver-onboarding/pipeline")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pipeline
          </Button>
          <h1 className="text-3xl font-bold mb-2">Orientation Schedule</h1>
          <p className="text-muted-foreground">
            View and manage drivers scheduled for orientation
          </p>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6 border-2 shadow-lg bg-card">
          <h3 className="text-lg font-bold mb-4 text-foreground">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="start-date" className="text-base font-semibold">
                Start Date
              </Label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-background dark:text-foreground dark:[color-scheme:dark]"
                style={{
                  colorScheme: 'dark',
                }}
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-base font-semibold">
                End Date
              </Label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-background dark:text-foreground dark:[color-scheme:dark]"
                style={{
                  colorScheme: 'dark',
                }}
              />
            </div>
            <div>
              <Label htmlFor="yard" className="text-base font-semibold">
                Yard (Optional)
              </Label>
              <select
                id="yard"
                value={selectedYardId}
                onChange={(e) => setSelectedYardId(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-background dark:text-foreground"
              >
                <option value="">All Yards</option>
                {yards.map((yard) => (
                  <option key={yard.id} value={yard.id}>
                    {yard.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={loadOrientationSchedule}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* Schedule List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : applications.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No drivers scheduled for orientation{" "}
              {startDate === endDate ? (
                <>on {format(new Date(startDate), "MMMM d, yyyy")}</>
              ) : (
                <>
                  from {format(new Date(startDate), "MMMM d, yyyy")} to{" "}
                  {format(new Date(endDate), "MMMM d, yyyy")}
                </>
              )}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <Card key={application.application.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <h3 className="text-xl font-semibold">
                        {application.candidate.name}
                      </h3>
                      {application.onboarding?.orientation_scheduled_at && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {format(
                            new Date(
                              application.onboarding.orientation_scheduled_at
                            ),
                            "h:mm a"
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {application.candidate.phone}
                        </span>
                      </div>
                      {application.candidate.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {application.candidate.email}
                          </span>
                        </div>
                      )}
                      {application.yard && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{application.yard.name}</span>
                          {application.yard.address && (
                            <span className="text-xs text-muted-foreground">
                              • {application.yard.address}
                            </span>
                          )}
                        </div>
                      )}
                      {application.onboarding?.supervisor_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Supervisor: {application.onboarding.supervisor_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {application.onboarding?.orientation_notes && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium mb-1">Notes:</p>
                        <p className="text-sm text-muted-foreground">
                          {application.onboarding.orientation_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Button
                      onClick={() => openCompleteDialog(application)}
                      className="min-w-[140px]"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Complete Orientation Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Orientation</DialogTitle>
            <DialogDescription>
              Mark orientation as completed for{" "}
              <strong>{selectedApplication?.candidate.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="completion-notes">Completion Notes (Optional)</Label>
              <Textarea
                id="completion-notes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes about the orientation..."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCompleteDialog(false);
                setCompletionNotes("");
              }}
              disabled={isCompleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteOrientation}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Complete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupervisorOrientation;


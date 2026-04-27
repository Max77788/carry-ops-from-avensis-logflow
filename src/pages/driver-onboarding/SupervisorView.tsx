import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/Header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApplicationStatusBadge } from "@/components/driver-onboarding/ApplicationStatusBadge";
import { driverOnboardingService } from "@/lib/driverOnboardingService";
import type { ApplicationWithDetails } from "@/lib/driverOnboardingTypes";
import {
  Users,
  GraduationCap,
  Calendar,
  Award,
  Loader2,
  CheckCircle,
  UserCheck,
  Clock,
  Search,
  Eye,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const SupervisorView = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Orientation dialog state
  const [orientationDialogOpen, setOrientationDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] =
    useState<ApplicationWithDetails | null>(null);
  const [orientationDate, setOrientationDate] = useState("");
  const [orientationNotes, setOrientationNotes] = useState("");
  const [isSubmittingOrientation, setIsSubmittingOrientation] = useState(false);

  // Training dialog state
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [trainingStartDate, setTrainingStartDate] = useState("");
  const [trainingEndDate, setTrainingEndDate] = useState("");
  const [trainingMentorId, setTrainingMentorId] = useState("");
  const [isSubmittingTraining, setIsSubmittingTraining] = useState(false);

  // Complete training dialog state
  const [completeTrainingDialogOpen, setCompleteTrainingDialogOpen] =
    useState(false);
  const [trainingRating, setTrainingRating] = useState(3);
  const [trainingCompletionNotes, setTrainingCompletionNotes] = useState("");
  const [isCompletingTraining, setIsCompletingTraining] = useState(false);

  useEffect(() => {
    loadClearedCandidates();
  }, []);

  const loadClearedCandidates = async () => {
    setIsLoading(true);
    const result = await driverOnboardingService.getApplications({
      status:
        "MVR_PASSED,DRUG_TEST_PASSED,CLEARED_FOR_HIRE,ORIENTATION_SCHEDULED,ORIENTATION_COMPLETED,TRAINING_IN_PROGRESS,TRAINING_COMPLETED,HIRED",
    });
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

  const handleScheduleOrientation = (app: ApplicationWithDetails) => {
    setSelectedApplication(app);
    setOrientationDialogOpen(true);
  };

  const handleSubmitOrientation = async () => {
    if (!selectedApplication) return;

    setIsSubmittingOrientation(true);
    const result = await driverOnboardingService.scheduleOrientation(
      selectedApplication.application.id,
      {
        supervisor_id: "current-user-id", // TODO: Get from auth context
        scheduled_at: orientationDate,
      }
    );

    if (result.success) {
      toast({
        title: "Success",
        description: "Orientation scheduled successfully",
      });
      loadClearedCandidates();
      setOrientationDialogOpen(false);
      setOrientationDate("");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to schedule orientation",
        variant: "destructive",
      });
    }
    setIsSubmittingOrientation(false);
  };

  const handleCompleteOrientation = async (app: ApplicationWithDetails) => {
    const result = await driverOnboardingService.completeOrientation(
      app.application.id,
      orientationNotes
    );

    if (result.success) {
      toast({
        title: "Success",
        description: "Orientation marked as complete",
      });
      loadClearedCandidates();
      setOrientationNotes("");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to complete orientation",
        variant: "destructive",
      });
    }
  };

  const handleScheduleTraining = (app: ApplicationWithDetails) => {
    setSelectedApplication(app);
    setTrainingDialogOpen(true);
  };

  const handleSubmitTraining = async () => {
    if (!selectedApplication) return;

    setIsSubmittingTraining(true);
    const result = await driverOnboardingService.scheduleTraining(
      selectedApplication.application.id,
      {
        mentor_id: trainingMentorId,
        scheduled_start: trainingStartDate,
        scheduled_end: trainingEndDate,
      }
    );

    if (result.success) {
      toast({
        title: "Success",
        description: "Training scheduled successfully",
      });
      loadClearedCandidates();
      setTrainingDialogOpen(false);
      setTrainingStartDate("");
      setTrainingEndDate("");
      setTrainingMentorId("");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to schedule training",
        variant: "destructive",
      });
    }
    setIsSubmittingTraining(false);
  };

  const handleOpenCompleteTraining = (app: ApplicationWithDetails) => {
    setSelectedApplication(app);
    setCompleteTrainingDialogOpen(true);
  };

  const handleSubmitCompleteTraining = async () => {
    if (!selectedApplication) return;

    setIsCompletingTraining(true);
    const result = await driverOnboardingService.completeTraining(
      selectedApplication.application.id,
      {
        rating: trainingRating,
        notes: trainingCompletionNotes,
      }
    );

    if (result.success) {
      toast({
        title: "Success",
        description: "Training marked as complete",
      });
      loadClearedCandidates();
      setCompleteTrainingDialogOpen(false);
      setTrainingRating(3);
      setTrainingCompletionNotes("");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to complete training",
        variant: "destructive",
      });
    }
    setIsCompletingTraining(false);
  };

  const handleApproveAndHire = async (app: ApplicationWithDetails) => {
    const result = await driverOnboardingService.approveAndHire(
      app.application.id
    );

    if (result.success) {
      toast({
        title: "Success",
        description: `${app.candidate.name} has been hired!`,
      });
      loadClearedCandidates();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to approve and hire",
        variant: "destructive",
      });
    }
  };

  // Filter applications based on search query
  const filteredApplications = applications.filter((app) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.candidate.name.toLowerCase().includes(query) ||
      app.candidate.phone.includes(query) ||
      app.candidate.email?.toLowerCase().includes(query) ||
      app.yard?.name.toLowerCase().includes(query)
    );
  });

  const pendingClearanceCandidates = filteredApplications.filter(
    (app) =>
      app.application.status === "MVR_PASSED" ||
      app.application.status === "DRUG_TEST_PASSED"
  );
  const clearedCandidates = filteredApplications.filter(
    (app) => app.application.status === "CLEARED_FOR_HIRE"
  );
  const orientationScheduledCandidates = filteredApplications.filter(
    (app) => app.application.status === "ORIENTATION_SCHEDULED"
  );
  const orientationCompletedCandidates = filteredApplications.filter(
    (app) => app.application.status === "ORIENTATION_COMPLETED"
  );
  const trainingInProgressCandidates = filteredApplications.filter(
    (app) => app.application.status === "TRAINING_IN_PROGRESS"
  );
  const trainingCompletedCandidates = filteredApplications.filter(
    (app) => app.application.status === "TRAINING_COMPLETED"
  );
  const hiredCandidates = filteredApplications.filter(
    (app) => app.application.status === "HIRED"
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        showHomeButton
        onHomeClick={() => navigate("/driver-onboarding")}
      />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Supervisor Portal</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4 grid grid-cols-7 w-full">
            <TabsTrigger value="all">
              All ({filteredApplications.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingClearanceCandidates.length})
            </TabsTrigger>
            <TabsTrigger value="cleared">
              Cleared ({clearedCandidates.length})
            </TabsTrigger>
            <TabsTrigger value="orientation-scheduled">
              Scheduled ({orientationScheduledCandidates.length})
            </TabsTrigger>
            <TabsTrigger value="orientation-completed">
              Oriented ({orientationCompletedCandidates.length})
            </TabsTrigger>
            <TabsTrigger value="training">
              Training (
              {trainingInProgressCandidates.length +
                trainingCompletedCandidates.length}
              )
            </TabsTrigger>
            <TabsTrigger value="hired">
              Hired ({hiredCandidates.length})
            </TabsTrigger>
          </TabsList>

          {/* All Candidates Tab */}
          <TabsContent value="all">
            <Card className="p-0 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {searchQuery ? "No candidates found" : "No candidates"}
                  </p>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((app) => (
                      <TableRow key={app.application.id}>
                        <TableCell className="font-medium">
                          {app.candidate.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{app.candidate.phone}</div>
                          {app.candidate.email && (
                            <div className="text-muted-foreground">
                              {app.candidate.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{app.yard?.name || "-"}</TableCell>
                        <TableCell>
                          {app.application.position_type || "-"}
                        </TableCell>
                        <TableCell>
                          <ApplicationStatusBadge
                            status={app.application.status}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/driver-onboarding/application/${app.application.id}`
                              )
                            }
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Pending Clearance Tab */}
          <TabsContent value="pending">
            <Card className="p-0 overflow-hidden">
              {pendingClearanceCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No candidates pending clearance
                  </p>
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
                      <TableHead>Compliance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingClearanceCandidates.map((app) => (
                      <TableRow key={app.application.id}>
                        <TableCell className="font-medium">
                          {app.candidate.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {app.candidate.phone}
                        </TableCell>
                        <TableCell>{app.yard?.name || "-"}</TableCell>
                        <TableCell>
                          {app.application.position_type || "-"}
                        </TableCell>
                        <TableCell>
                          <ApplicationStatusBadge
                            status={app.application.status}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="space-y-1">
                            {app.compliance?.mvr_eligible && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                <span>MVR Passed</span>
                              </div>
                            )}
                            {app.compliance?.drug_test_result ===
                              "NEGATIVE" && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                <span>Drug Test Passed</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/driver-onboarding/application/${app.application.id}`
                              )
                            }
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Cleared Candidates Tab */}
          <TabsContent value="cleared">
            <Card className="p-0 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : clearedCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No cleared candidates</p>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clearedCandidates.map((app) => (
                      <TableRow key={app.application.id}>
                        <TableCell className="font-medium">
                          {app.candidate.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {app.candidate.phone}
                        </TableCell>
                        <TableCell>{app.yard?.name || "-"}</TableCell>
                        <TableCell>
                          {app.application.position_type || "-"}
                        </TableCell>
                        <TableCell>
                          <ApplicationStatusBadge
                            status={app.application.status}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleScheduleOrientation(app)}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Schedule Orientation
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Orientation Scheduled Tab */}
          <TabsContent value="orientation-scheduled">
            <Card className="p-0 overflow-hidden">
              {orientationScheduledCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No scheduled orientations
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Yard</TableHead>
                      <TableHead>Scheduled For</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orientationScheduledCandidates.map((app) => (
                      <TableRow key={app.application.id}>
                        <TableCell className="font-medium">
                          {app.candidate.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {app.candidate.phone}
                        </TableCell>
                        <TableCell>{app.yard?.name || "-"}</TableCell>
                        <TableCell>
                          {app.onboarding?.orientation_scheduled_at ? (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {format(
                                new Date(
                                  app.onboarding.orientation_scheduled_at
                                ),
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleCompleteOrientation(app)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Orientation Completed Tab */}
          <TabsContent value="orientation-completed">
            <Card className="p-0 overflow-hidden">
              {orientationCompletedCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No completed orientations
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Yard</TableHead>
                      <TableHead>Completed On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orientationCompletedCandidates.map((app) => (
                      <TableRow key={app.application.id}>
                        <TableCell className="font-medium">
                          {app.candidate.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {app.candidate.phone}
                        </TableCell>
                        <TableCell>{app.yard?.name || "-"}</TableCell>
                        <TableCell>
                          {app.onboarding?.orientation_completed_at ? (
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-green-600" />
                              {format(
                                new Date(
                                  app.onboarding.orientation_completed_at
                                ),
                                "MMM d, yyyy"
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleScheduleTraining(app)}
                          >
                            <GraduationCap className="h-4 w-4 mr-1" />
                            Schedule Training
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training">
            <Card className="p-0 overflow-hidden">
              {trainingInProgressCandidates.length === 0 &&
              trainingCompletedCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No candidates in training
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Yard</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Training Period</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ...trainingInProgressCandidates,
                      ...trainingCompletedCandidates,
                    ].map((app) => (
                      <TableRow key={app.application.id}>
                        <TableCell className="font-medium">
                          {app.candidate.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {app.candidate.phone}
                        </TableCell>
                        <TableCell>{app.yard?.name || "-"}</TableCell>
                        <TableCell>
                          <ApplicationStatusBadge
                            status={app.application.status}
                          />
                        </TableCell>
                        <TableCell>
                          {app.onboarding?.training_scheduled_start &&
                          app.onboarding?.training_scheduled_end
                            ? `${format(
                                new Date(
                                  app.onboarding.training_scheduled_start
                                ),
                                "MMM d"
                              )} - ${format(
                                new Date(app.onboarding.training_scheduled_end),
                                "MMM d, yyyy"
                              )}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {app.onboarding?.training_evaluation_rating ? (
                            <div className="flex items-center gap-1">
                              <Award className="h-4 w-4 text-yellow-600" />
                              <span>
                                {app.onboarding.training_evaluation_rating}/5
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {app.application.status ===
                            "TRAINING_IN_PROGRESS" && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenCompleteTraining(app)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                          {app.application.status === "TRAINING_COMPLETED" && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveAndHire(app)}
                            >
                              <Award className="h-4 w-4 mr-1" />
                              Hire
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Hired Tab */}
          <TabsContent value="hired">
            <Card className="p-0 overflow-hidden">
              {hiredCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No hired drivers yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Yard</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Hired On</TableHead>
                      <TableHead>Training Rating</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hiredCandidates.map((app) => (
                      <TableRow key={app.application.id}>
                        <TableCell className="font-medium">
                          {app.candidate.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{app.candidate.phone}</div>
                          {app.candidate.email && (
                            <div className="text-muted-foreground">
                              {app.candidate.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{app.yard?.name || "-"}</TableCell>
                        <TableCell>
                          {app.application.position_type || "-"}
                        </TableCell>
                        <TableCell>
                          {app.onboarding?.hired_at ? (
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-green-600" />
                              {format(
                                new Date(app.onboarding.hired_at),
                                "MMM d, yyyy"
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {app.onboarding?.training_evaluation_rating ? (
                            <div className="flex items-center gap-1">
                              <Award className="h-4 w-4 text-yellow-600" />
                              <span>
                                {app.onboarding.training_evaluation_rating}/5
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/driver-onboarding/application/${app.application.id}`
                              )
                            }
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Schedule Orientation Dialog */}
        <Dialog
          open={orientationDialogOpen}
          onOpenChange={setOrientationDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Orientation</DialogTitle>
              <DialogDescription>
                Schedule orientation for {selectedApplication?.candidate.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="orientation-date">
                  Orientation Date & Time
                </Label>
                <Input
                  id="orientation-date"
                  type="datetime-local"
                  value={orientationDate}
                  onChange={(e) => setOrientationDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOrientationDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitOrientation}
                disabled={isSubmittingOrientation || !orientationDate}
              >
                {isSubmittingOrientation ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Schedule Training Dialog */}
        <Dialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Training</DialogTitle>
              <DialogDescription>
                Schedule training period for{" "}
                {selectedApplication?.candidate.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="mentor-id">Mentor Driver ID</Label>
                <Input
                  id="mentor-id"
                  value={trainingMentorId}
                  onChange={(e) => setTrainingMentorId(e.target.value)}
                  placeholder="Enter mentor driver ID"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="training-start">Training Start Date</Label>
                <Input
                  id="training-start"
                  type="date"
                  value={trainingStartDate}
                  onChange={(e) => setTrainingStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="training-end">Training End Date</Label>
                <Input
                  id="training-end"
                  type="date"
                  value={trainingEndDate}
                  onChange={(e) => setTrainingEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTrainingDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitTraining}
                disabled={
                  isSubmittingTraining ||
                  !trainingMentorId ||
                  !trainingStartDate ||
                  !trainingEndDate
                }
              >
                {isSubmittingTraining ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <GraduationCap className="h-4 w-4 mr-2" />
                )}
                Schedule Training
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Training Dialog */}
        <Dialog
          open={completeTrainingDialogOpen}
          onOpenChange={setCompleteTrainingDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Training</DialogTitle>
              <DialogDescription>
                Record training completion for{" "}
                {selectedApplication?.candidate.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="training-rating">
                  Performance Rating (1-5)
                </Label>
                <Input
                  id="training-rating"
                  type="number"
                  min="1"
                  max="5"
                  value={trainingRating}
                  onChange={(e) => setTrainingRating(parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="training-notes">Training Notes</Label>
                <Textarea
                  id="training-notes"
                  value={trainingCompletionNotes}
                  onChange={(e) => setTrainingCompletionNotes(e.target.value)}
                  placeholder="Enter training evaluation notes..."
                  className="mt-1 min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCompleteTrainingDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitCompleteTraining}
                disabled={isCompletingTraining}
              >
                {isCompletingTraining ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Complete Training
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default SupervisorView;

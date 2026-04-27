import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Header } from "@/components/Header";
import { ApplicationStatusBadge } from "@/components/driver-onboarding/ApplicationStatusBadge";
import { ActivityLog } from "@/components/driver-onboarding/ActivityLog";
import { DocumentUpload } from "@/components/driver-onboarding/DocumentUpload";
import { DriverOnboardingRibbon } from "@/components/driver-onboarding/DriverOnboardingRibbon";
import { DriverApplicationFormView } from "@/components/driver-onboarding/DriverApplicationFormView";
import { driverOnboardingService } from "@/lib/driverOnboardingService";
import { supabase } from "@/lib/supabase";
import {
  sendEmail,
  generateDriverApplicationFormEmailHTML,
  generateDriverApplicationReceivedEmailHTML,
  generateDriverApplicationNotApprovedEmailHTML,
  generateDriverMVRCompletedEmailHTML,
  generateDriverMVRNotClearedEmailHTML,
  generateDriverDrugTestNotClearedEmailHTML,
  generateDriverClearedForOrientationEmailHTML,
  generateDriverOrientationScheduledEmailHTML,
  generateDriverDrugTestOrderEmailHTML,
} from "@/lib/emailService";
import {
  isValidEmail,
  isValidPhoneNumber,
  formatPhoneNumber,
} from "@/lib/validationUtils";
import type {
  ApplicationWithDetails,
  DriverApplicationActivity,
  ApplicationStatus,
} from "@/lib/driverOnboardingTypes";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  Save,
  Loader2,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Trash2,
  ChevronDown,
  FileText,
  ExternalLink,
  Edit,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const ApplicationDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [application, setApplication] = useState<ApplicationWithDetails | null>(
    null
  );
  const [activities, setActivities] = useState<DriverApplicationActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isFormDetailsOpen, setIsFormDetailsOpen] = useState(false);

  // Verification tab state
  const [verificationOutcome, setVerificationOutcome] =
    useState<ApplicationStatus>("CONTACTED");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isSubmittingVerification, setIsSubmittingVerification] =
    useState(false);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [editableCallSummary, setEditableCallSummary] = useState("");
  const [isEditingCallSummary, setIsEditingCallSummary] = useState(false);
  const [isSavingCallSummary, setIsSavingCallSummary] = useState(false);

  // MVR tab state
  const [mvrEligible, setMvrEligible] = useState(true);
  const [mvrSummary, setMvrSummary] = useState("");
  const [isSubmittingMVR, setIsSubmittingMVR] = useState(false);
  const [mvrVerified, setMvrVerified] = useState(false);

  // Drug test tab state
  const [drugTestProvider, setDrugTestProvider] = useState("");
  const [drugTestSite, setDrugTestSite] = useState("");
  const [drugTestDate, setDrugTestDate] = useState("");
  const [drugTestWorkOrderUrl, setDrugTestWorkOrderUrl] = useState("");
  const [isCreatingDrugTest, setIsCreatingDrugTest] = useState(false);

  // New lead form state
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    zip_code: "",
    source: "",
    position_type: "",
    yard_id: "",
  });
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [newLeadValidationErrors, setNewLeadValidationErrors] = useState<{
    email?: string;
    phone?: string;
  }>({});
  const [yards, setYards] = useState<
    Array<{
      id: string;
      name: string;
      address?: string;
      supervisor_name?: string;
      supervisor_phone?: string;
    }>
  >([]);
  const [supervisors, setSupervisors] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Onboarding state
  const [orientationDate, setOrientationDate] = useState("");
  const [orientationSupervisorName, setOrientationSupervisorName] =
    useState("");
  const [orientationYardId, setOrientationYardId] = useState("");
  const [orientationNotes, setOrientationNotes] = useState("");
  const [isSchedulingOrientation, setIsSchedulingOrientation] = useState(false);
  const [isCompletingOrientation, setIsCompletingOrientation] = useState(false);

  // Get filtered supervisors based on selected yard
  const getFilteredSupervisors = () => {
    if (!orientationYardId) return [];
    
    const selectedYard = yards.find((y) => y.id === orientationYardId);
    if (!selectedYard || !selectedYard.supervisor_name) return [];
    
    // Filter supervisors to match the yard's supervisor name
    const matchingSupervisors = supervisors.filter(
      (supervisor) => supervisor.name === selectedYard.supervisor_name
    );
    
    // If no matching supervisor found in users table, create a temporary entry
    // This handles cases where the yard has a supervisor_name but it's not in the users table
    if (matchingSupervisors.length === 0 && selectedYard.supervisor_name) {
      return [
        {
          id: `temp-${selectedYard.id}`,
          name: selectedYard.supervisor_name,
        },
      ];
    }
    
    return matchingSupervisors;
  };

  const [isHiring, setIsHiring] = useState(false);

  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Application form state
  const [isSendingApplicationForm, setIsSendingApplicationForm] =
    useState(false);
  const [isDisapprovingForm, setIsDisapprovingForm] = useState(false);
  const [disapprovalReason, setDisapprovalReason] = useState("");
  const [showDisapprovalDialog, setShowDisapprovalDialog] = useState(false);

  // Edit overview state
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [editCandidateInfo, setEditCandidateInfo] = useState({
    name: "",
    phone: "",
    email: "",
    zip_code: "",
    source: "",
  });
  const [editApplicationInfo, setEditApplicationInfo] = useState({
    yard_id: "",
    position_type: "",
  });
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [overviewValidationErrors, setOverviewValidationErrors] = useState<{
    email?: string;
    phone?: string;
  }>({});

  useEffect(() => {
    if (id && id !== "new") {
      loadApplication();
      loadActivities();
      loadYards();
      loadSupervisors();
    } else if (id === "new") {
      // For new applications, load yards and set loading to false
      loadYards();
      setIsLoading(false);
    }
  }, [id]);

  const loadYards = async () => {
    const result = await driverOnboardingService.getYards();
    if (result.success && result.data) {
      setYards(result.data);
    }
  };

  const loadSupervisors = async () => {
    // Fetch users who can be supervisors (you may want to filter by role)
    const { data, error } = await supabase
      .from("users")
      .select("id, name")
      .order("name");

    if (!error && data) {
      setSupervisors(data);
    }
  };

  // Helper function to determine the next tab after completing current stage
  const getNextTab = (currentTab: string): string => {
    const tabOrder = [
      "verification",
      "documents",
      "mvr",
      "drug_test",
      "orientation",
    ];
    const currentIndex = tabOrder.indexOf(currentTab);
    if (currentIndex >= 0 && currentIndex < tabOrder.length - 1) {
      return tabOrder[currentIndex + 1];
    }
    return currentTab; // Stay on current tab if it's the last one
  };

  const loadApplication = async () => {
    if (!id || id === "new") return;

    setIsLoading(true);
    const result = await driverOnboardingService.getApplicationById(id);
    if (result.success && result.data) {
      setApplication(result.data);
      setNotes(result.data.application.notes || "");

      // Initialize editable call summary if it exists
      if (result.data.candidate.recruiter_call_summary && !isEditingCallSummary) {
        setEditableCallSummary(result.data.candidate.recruiter_call_summary);
      }

      // Auto-populate orientation yard from application yard if not already set
      if (result.data.application.yard_id && !orientationYardId) {
        setOrientationYardId(result.data.application.yard_id);
      }

      // Load MVR verified status if available
      if (result.data.compliance) {
        // Check if mvr_verified exists, otherwise use mvr_status === 'VERIFIED' as fallback
        const verified = (result.data.compliance as any).mvr_verified ?? 
                        (result.data.compliance as any).mvr_status === 'VERIFIED' ?? 
                        false;
        setMvrVerified(verified);
      }
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to load application",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const loadActivities = async () => {
    if (!id || id === "new") return;

    const result = await driverOnboardingService.getApplicationActivities(id);
    if (result.success && result.data) {
      setActivities(result.data);
    }
  };

  const handleSaveNotes = async () => {
    if (!id || id === "new") return;

    setIsSavingNotes(true);
    const result = await driverOnboardingService.updateApplicationNotes(
      id,
      notes
    );
    if (result.success) {
      toast({
        title: "Success",
        description: "Notes saved successfully",
      });
      loadApplication();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save notes",
        variant: "destructive",
      });
    }
    setIsSavingNotes(false);
  };

  const handleStartEditOverview = () => {
    if (!application) return;

    // Initialize edit form with current values
    setEditCandidateInfo({
      name: application.candidate.name || "",
      phone: application.candidate.phone || "",
      email: application.candidate.email || "",
      zip_code: application.candidate.zip_code || "",
      source: application.candidate.source || "",
    });
    setEditApplicationInfo({
      yard_id: application.application.yard_id || "",
      position_type: application.application.position_type || "",
    });
    setOverviewValidationErrors({});
    setIsEditingOverview(true);
  };

  const handleCancelEditOverview = () => {
    setIsEditingOverview(false);
    setOverviewValidationErrors({});
  };

  const handleSaveOverview = async () => {
    if (!id || id === "new" || !application) return;

    // Validate phone number if provided
    if (editCandidateInfo.phone && !isValidPhoneNumber(editCandidateInfo.phone)) {
      setOverviewValidationErrors({
        phone: "Please enter a valid 10-digit phone number",
      });
      toast({
        title: "Validation Error",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate email if provided
    if (editCandidateInfo.email && !isValidEmail(editCandidateInfo.email)) {
      setOverviewValidationErrors({
        email: "Please enter a valid email address",
      });
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSavingOverview(true);

    try {
      // Update candidate info
      const candidateResult = await driverOnboardingService.updateCandidateInfo(
        application.candidate.id,
        {
          name: editCandidateInfo.name,
          phone: editCandidateInfo.phone,
          email: editCandidateInfo.email || undefined,
          zip_code: editCandidateInfo.zip_code || undefined,
          source: editCandidateInfo.source || undefined,
        }
      );

      if (!candidateResult.success) {
        throw new Error(candidateResult.error || "Failed to update candidate info");
      }

      // Update application info
      const applicationResult = await driverOnboardingService.updateApplicationInfo(
        id,
        {
          yard_id: editApplicationInfo.yard_id || null,
          position_type: editApplicationInfo.position_type || null,
        }
      );

      if (!applicationResult.success) {
        throw new Error(applicationResult.error || "Failed to update application info");
      }

      toast({
        title: "Success",
        description: "Information updated successfully",
      });

      setIsEditingOverview(false);
      await loadApplication();
    } catch (error: any) {
      console.error("Error saving overview:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSavingOverview(false);
    }
  };

  const handleStartCall = async () => {
    if (!application?.candidate.phone) {
      toast({
        title: "Error",
        description: "Candidate phone number is required to start a call",
        variant: "destructive",
      });
      return;
    }

    setIsStartingCall(true);
    try {
      const response = await fetch("/api/start-vapi-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: application.candidate.phone,
          candidateName: application.candidate.name,
          candidateId: application.candidate.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to start call");
      }

      // Reload application to get updated call count
      await loadApplication();

      toast({
        title: "Call Initiated",
        description: `Call to ${application.candidate.name} has been started. Call ID: ${data.callId}`,
      });
    } catch (error: any) {
      console.error("Error starting call:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start call",
        variant: "destructive",
      });
    } finally {
      setIsStartingCall(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!id || id === "new") return;

    setIsSubmittingVerification(true);
    const result = await driverOnboardingService.submitInitialVerification(id, {
      call_outcome: verificationOutcome,
      notes: "", // No longer using notes field
    });
    if (result.success) {
      toast({
        title: "Success",
        description: "Verification submitted successfully",
      });
      await loadApplication();
      await loadActivities();

      // Send email to driver based on verification outcome
      if (application?.candidate.email) {
        if (verificationOutcome === "REJECTED") {
          // Application not approved - send rejection email
          const emailHTML = generateDriverApplicationNotApprovedEmailHTML({
            driverName: application.candidate.name,
          });

          const emailResult = await sendEmail({
            to: application.candidate.email,
            subject: "Update on Your Application - Avensis Energy",
            html: emailHTML,
          });

          if (emailResult.success) {
            console.log(
              `✅ Application not approved email sent to ${application.candidate.email}`
            );
          } else {
            console.error(
              `❌ Failed to send application not approved email: ${emailResult.error}`
            );
          }
        }
      }

      // Move to next tab
      setActiveTab(getNextTab("verification"));
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to submit verification",
        variant: "destructive",
      });
    }
    setIsSubmittingVerification(false);
  };

  const handleDocumentUpload = async (
    documentType: "dl" | "medical_card" | "ssn",
    fileUrl: string
  ) => {
    if (!application?.compliance) return;

    const result = await driverOnboardingService.updateDocumentVerification(
      id!,
      application.compliance.id,
      documentType,
      false,
      fileUrl
    );

    if (result.success) {
      // Reload application data without refreshing the page or switching tabs
      await loadApplication();
      // Don't call loadActivities or switch tabs to prevent page refresh feeling
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update document",
        variant: "destructive",
      });
    }
  };

  const handleDocumentVerificationChange = async (
    documentType: "dl" | "medical_card" | "ssn",
    verified: boolean
  ) => {
    if (!application?.compliance) return;

    const result = await driverOnboardingService.updateDocumentVerification(
      id!,
      application.compliance.id,
      documentType,
      verified
    );

    if (result.success) {
      // Update local state immediately without reloading from server
      const columnMap = {
        dl: "drivers_license_verified",
        medical_card: "medical_card_verified",
        ssn: "ssn_verified",
      };

      const updatedCompliance = {
        ...application.compliance,
        [columnMap[documentType]]: verified,
      };

      setApplication({
        ...application,
        compliance: updatedCompliance,
      });

      // Check if all documents are now verified
      const allDocsVerified =
        updatedCompliance.drivers_license_verified &&
        updatedCompliance.medical_card_verified &&
        updatedCompliance.ssn_verified;

      // Move to next tab if all documents are verified
      if (allDocsVerified && verified) {
        setActiveTab(getNextTab("documents"));
        toast({
          title: "Success",
          description: "All documents verified - Compliance tab unlocked",
        });

        // Send "Application Received" email to driver
        if (application.candidate.email) {
          const emailHTML = generateDriverApplicationReceivedEmailHTML({
            driverName: application.candidate.name,
          });

          const emailResult = await sendEmail({
            to: application.candidate.email,
            subject: "Your Application Has Been Received - Avensis Energy",
            html: emailHTML,
          });

          if (emailResult.success) {
            console.log(
              `✅ Application received email sent to ${application.candidate.email}`
            );
          } else {
            console.error(
              `❌ Failed to send application received email: ${emailResult.error}`
            );
          }
        }
      }
      // Don't switch tabs otherwise - stay on documents tab
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update verification",
        variant: "destructive",
      });
    }
  };

  const handleMVRVerificationChange = async (verified: boolean) => {
    if (!application?.compliance || !id || id === "new") return;

    try {
      // Update MVR verified status in database
      const { error } = await supabase
        .from("driver_compliance")
        .update({ mvr_verified: verified })
        .eq("id", application.compliance.id);

      if (error) throw error;

      // Update local state
      setMvrVerified(verified);
      const updatedCompliance = {
        ...application.compliance,
        mvr_verified: verified,
      };
      setApplication({
        ...application,
        compliance: updatedCompliance,
      });

      toast({
        title: "Success",
        description: `MVR ${verified ? "verified" : "unverified"}`,
      });
    } catch (error: any) {
      console.error("Error updating MVR verification:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update MVR verification",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllDocsVerified = async () => {
    if (!id || id === "new") return;

    const result = await driverOnboardingService.markDocumentsVerified(id);
    if (result.success) {
      toast({
        title: "Success",
        description: "All documents marked as verified",
      });
      loadApplication();
      loadActivities();
      // Stay on documents tab
      setActiveTab("documents");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to mark documents verified",
        variant: "destructive",
      });
    }
  };

  const handleSubmitMVR = async () => {
    if (!id || id === "new") return;

    setIsSubmittingMVR(true);
    const result = await driverOnboardingService.markMVRCompleted(id, {
      eligible: mvrEligible,
      summary: mvrSummary,
    });
    if (result.success) {
      toast({
        title: "Success",
        description: `MVR marked as ${mvrEligible ? "passed" : "failed"}`,
      });
      await loadApplication();
      await loadActivities();
      setMvrSummary("");

      // Send email to driver based on MVR result
      if (application?.candidate.email) {
        const emailHTML = mvrEligible
          ? generateDriverMVRCompletedEmailHTML({
              driverName: application.candidate.name,
            })
          : generateDriverMVRNotClearedEmailHTML({
              driverName: application.candidate.name,
            });

        const emailSubject = mvrEligible
          ? "MVR Check Completed - Avensis Energy"
          : "MVR Review Result - Avensis Energy";

        const emailResult = await sendEmail({
          to: application.candidate.email,
          subject: emailSubject,
          html: emailHTML,
        });

        if (emailResult.success) {
          console.log(
            `✅ MVR ${
              mvrEligible ? "completed" : "not cleared"
            } email sent to ${application.candidate.email}`
          );
        } else {
          console.error(`❌ Failed to send MVR email: ${emailResult.error}`);
        }
      }

      // Move to drug test tab
      setActiveTab(getNextTab("mvr"));
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to submit MVR result",
        variant: "destructive",
      });
    }
    setIsSubmittingMVR(false);
  };

  const handleCreateDrugTest = async () => {
    if (!id || id === "new") return;

    setIsCreatingDrugTest(true);
    
    // First, save the work order URL if uploaded
    if (drugTestWorkOrderUrl && application?.compliance) {
      await supabase
        .from("driver_compliance")
        .update({ drug_test_work_order_url: drugTestWorkOrderUrl })
        .eq("id", application.compliance.id);
    }

    const result = await driverOnboardingService.createDrugTestOrder(id, {
      provider: drugTestProvider,
      site: drugTestSite,
      scheduled_date: drugTestDate || undefined,
    });
    if (result.success) {
      toast({
        title: "Success",
        description: "Drug test order created",
      });
      
      // Send email to driver with work order attachment
      if (application?.candidate.email) {
        try {
          // Get work order URL - use state variable if available, otherwise check database
          let workOrderUrl = drugTestWorkOrderUrl;
          
          // If no work order in state, check if it exists in database
          if (!workOrderUrl && application?.compliance?.id) {
            const { data: complianceData } = await supabase
              .from("driver_compliance")
              .select("drug_test_work_order_url")
              .eq("id", application.compliance.id)
              .single();
            
            workOrderUrl = complianceData?.drug_test_work_order_url || undefined;
          }
          
          const emailHTML = generateDriverDrugTestOrderEmailHTML({
            driverName: application.candidate.name,
            provider: drugTestProvider,
            site: drugTestSite,
            scheduledDate: drugTestDate
              ? format(new Date(drugTestDate), "PPP")
              : "TBD",
          });

          const emailResult = await sendEmail({
            to: application.candidate.email,
            subject: "Drug Test Order Created - Avensis Energy",
            html: emailHTML,
            attachmentUrl: workOrderUrl,
          });

          if (emailResult.success) {
            console.log(
              `✅ Drug test order email sent to ${application.candidate.email}`
            );
          } else {
            console.error(
              `❌ Failed to send drug test order email: ${emailResult.error}`
            );
          }
        } catch (emailError) {
          console.error("Error sending drug test order email:", emailError);
          // Don't fail the order creation if email fails
        }
      }

      // Clear form fields
      setDrugTestProvider("");
      setDrugTestSite("");
      setDrugTestDate("");
      setDrugTestWorkOrderUrl("");
      
      // Reload application data and stay on drug test tab
      await loadApplication();
      await loadActivities();
      setActiveTab("drug_test");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create drug test order",
        variant: "destructive",
      });
    }
    setIsCreatingDrugTest(false);
  };

  const handleCreateLead = async () => {
    // Validate required fields
    if (!newLeadForm.name.trim() || !newLeadForm.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and phone are required",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format
    if (!isValidPhoneNumber(newLeadForm.phone)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate email format if provided
    if (newLeadForm.email && !isValidEmail(newLeadForm.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingLead(true);
    const result = await driverOnboardingService.createLead(newLeadForm);

    if (result.success && result.data) {
      toast({
        title: "Success",
        description: "New lead created successfully",
      });
      // Navigate to the newly created application
      navigate(`/driver-onboarding/application/${result.data.application_id}`);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create lead",
        variant: "destructive",
      });
    }
    setIsCreatingLead(false);
  };

  const handleDrugTestResult = async (
    result: "NEGATIVE" | "POSITIVE" | "NO_SHOW"
  ) => {
    if (!id || id === "new") return;

    const response = await driverOnboardingService.markDrugTestResult(
      id,
      result
    );
    if (response.success) {
      toast({
        title: "Success",
        description: `Drug test result recorded: ${result}`,
      });
      await loadApplication();
      await loadActivities();

      // Send email to driver based on drug test result
      // NOTE: Drug test results are NOT shared with drivers per company policy
      if (application?.candidate.email) {
        if (result === "NEGATIVE") {
          // Drug test passed - only send "Cleared for Orientation" email
          // Do NOT send drug test completed email as results are not shared
          const clearedEmailHTML = generateDriverClearedForOrientationEmailHTML(
            {
              driverName: application.candidate.name,
            }
          );

          const clearedEmailResult = await sendEmail({
            to: application.candidate.email,
            subject: "You're Cleared for Orientation - Avensis Energy",
            html: clearedEmailHTML,
          });

          if (clearedEmailResult.success) {
            console.log(
              `✅ Cleared for orientation email sent to ${application.candidate.email}`
            );
          }
        } else {
          // Drug test failed or no-show - send failure email
          const emailHTML = generateDriverDrugTestNotClearedEmailHTML({
            driverName: application.candidate.name,
          });

          const emailResult = await sendEmail({
            to: application.candidate.email,
            subject: "Drug Test Result - Avensis Energy",
            html: emailHTML,
          });

          if (emailResult.success) {
            console.log(
              `✅ Drug test not cleared email sent to ${application.candidate.email}`
            );
          } else {
            console.error(
              `❌ Failed to send drug test email: ${emailResult.error}`
            );
          }
        }
      }

      // Move to next tab if drug test passed
      if (result === "NEGATIVE") {
        setActiveTab(getNextTab("drug_test"));
      } else {
        setActiveTab("drug_test");
      }
    } else {
      toast({
        title: "Error",
        description: response.error || "Failed to record drug test result",
        variant: "destructive",
      });
    }
  };

  // Onboarding handlers
  const handleScheduleOrientation = async () => {
    if (
      !id ||
      id === "new" ||
      !orientationDate ||
      !orientationSupervisorName ||
      !orientationYardId
    ) {
      toast({
        title: "Validation Error",
        description:
          "Please fill in all required fields (supervisor, yard, date/time)",
        variant: "destructive",
      });
      return;
    }

    setIsSchedulingOrientation(true);

    // Update onboarding record with supervisor name and yard
    await supabase
      .from("driver_onboarding")
      .update({
        supervisor_name: orientationSupervisorName,
        yard_id: orientationYardId,
        orientation_notes: orientationNotes,
      })
      .eq("application_id", id);

    const result = await driverOnboardingService.scheduleOrientation(id, {
      supervisor_name: orientationSupervisorName,
      scheduled_at: orientationDate,
    });

    if (result.success) {
      toast({
        title: "Success",
        description: "Orientation scheduled successfully",
      });
      await loadApplication();
      await loadActivities();

      // Send orientation scheduled email to driver
      if (application?.candidate.email) {
        try {
          // Get yard details
          const selectedYard = yards.find((y) => y.id === orientationYardId);
          const yardName = selectedYard?.name || "Yard";
          const yardAddress = selectedYard?.address || undefined;

          // Format the orientation date with time
          // orientationDate is in datetime-local format (YYYY-MM-DDTHH:mm)
          const formattedDate = new Date(orientationDate).toLocaleString(
            "en-US",
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }
          );

          const emailHTML = generateDriverOrientationScheduledEmailHTML({
            driverName: application.candidate.name,
            orientationDate: formattedDate,
            supervisorName: orientationSupervisorName,
            yardName: yardName,
            yardAddress: yardAddress,
            notes: orientationNotes || undefined,
          });

          const emailResult = await sendEmail({
            to: application.candidate.email,
            subject: "Orientation Scheduled - Avensis Energy",
            html: emailHTML,
          });

          if (emailResult.success) {
            console.log(
              `✅ Orientation scheduled email sent to ${application.candidate.email}`
            );
          } else {
            console.error(
              `❌ Failed to send orientation email: ${emailResult.error}`
            );
          }
        } catch (emailError) {
          console.error("Error sending orientation email:", emailError);
          // Don't fail the orientation scheduling if email fails
        }
      }

      setOrientationDate("");
      setOrientationSupervisorName("");
      setOrientationYardId("");
      setOrientationNotes("");
      // Stay on orientation tab (user still needs to complete it)
      setActiveTab("orientation");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to schedule orientation",
        variant: "destructive",
      });
    }
    setIsSchedulingOrientation(false);
  };

  const handleCompleteOrientation = async () => {
    if (!id || id === "new") return;

    setIsCompletingOrientation(true);
    const result = await driverOnboardingService.completeOrientation(
      id,
      orientationNotes
    );

    if (result.success) {
      toast({
        title: "Success",
        description: "Orientation marked as completed",
      });
      await loadApplication();
      await loadActivities();
      setOrientationNotes("");
      // Move to next tab
      setActiveTab(getNextTab("orientation"));
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to complete orientation",
        variant: "destructive",
      });
    }
    setIsCompletingOrientation(false);
  };

  const handleApproveAndHire = async () => {
    if (!id || id === "new") return;

    setIsHiring(true);
    const result = await driverOnboardingService.approveAndHire(id);

    if (result.success) {
      toast({
        title: "Success",
        description: "Candidate approved and hired!",
      });
      loadApplication();
      loadActivities();
      // Stay on onboarding tab
      setActiveTab("onboarding");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to approve and hire",
        variant: "destructive",
      });
    }
    setIsHiring(false);
  };

  const handleDeleteApplication = async () => {
    if (!id || id === "new") return;

    setIsDeleting(true);
    const result = await driverOnboardingService.deleteApplication(id);

    if (result.success) {
      toast({
        title: "Success",
        description: "Application deleted successfully",
      });
      // Redirect to pipeline dashboard
      navigate("/driver-onboarding/pipeline");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete application",
        variant: "destructive",
      });
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSendApplicationForm = async () => {
    if (!id || id === "new" || !application) return;

    // Check if driver has email
    if (!application.candidate?.email) {
      toast({
        title: "Error",
        description: "Driver email is required to send the application form",
        variant: "destructive",
      });
      return;
    }

    setIsSendingApplicationForm(true);

    try {
      // Generate unique token
      const token = crypto.randomUUID();

      // Update application with token and sent timestamp
      const { error: updateError } = await supabase
        .from("driver_applications")
        .update({
          application_form_token: token,
          application_form_sent_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Generate form link
      const formLink = `${window.location.origin}/driver-onboarding/form/${token}`;

      // Format position type for display
      const positionTypeDisplay = application.application.position_type
        ? application.application.position_type
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())
        : "Driver";

      // Generate email HTML
      const emailHTML = generateDriverApplicationFormEmailHTML({
        driverName: application.candidate.name,
        formUrl: formLink,
        positionType: positionTypeDisplay,
      });

      // Send email
      const emailResult = await sendEmail({
        to: application.candidate.email,
        subject: "Complete Your Driver Application - Avensis Energy",
        html: emailHTML,
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error || "Failed to send email");
      }

      toast({
        title: "Application Form Sent",
        description: `Email sent successfully to ${application.candidate.email}`,
      });

      // Reload application to show updated status
      loadApplication();
    } catch (error: any) {
      console.error("Error sending application form:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send application form",
        variant: "destructive",
      });
    } finally {
      setIsSendingApplicationForm(false);
    }
  };

  const handleDisapproveForm = async () => {
    if (!id || id === "new" || !application) return;

    // Validate disapproval reason
    if (!disapprovalReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for disapproving the form",
        variant: "destructive",
      });
      return;
    }

    setIsDisapprovingForm(true);

    try {
      // Get the form ID from the application
      const { data: formData, error: formError } = await supabase
        .from("driver_application_forms")
        .select("id")
        .eq("application_id", id)
        .single();

      if (formError || !formData) {
        throw new Error("Application form not found");
      }

      // Update form status to REJECTED with reason
      const { error: updateError } = await supabase
        .from("driver_application_forms")
        .update({
          status: "REJECTED",
          rejection_reason: disapprovalReason,
          rejected_at: new Date().toISOString(),
        })
        .eq("id", formData.id);

      if (updateError) throw updateError;

      // Send disapproval email to driver
      if (application.candidate.email) {
        const emailHTML = generateDriverApplicationNotApprovedEmailHTML({
          driverName: application.candidate.name,
        });

        const emailResult = await sendEmail({
          to: application.candidate.email,
          subject: "Update on Your Application - Avensis Energy",
          html: emailHTML,
        });

        if (emailResult.success) {
          console.log(
            `✅ Application disapproval email sent to ${application.candidate.email}`
          );
        } else {
          console.error(
            `❌ Failed to send disapproval email: ${emailResult.error}`
          );
        }
      }

      toast({
        title: "Form Disapproved",
        description:
          "The application form has been disapproved and the driver has been notified",
      });

      // Close dialog and reload
      setShowDisapprovalDialog(false);
      setDisapprovalReason("");
      loadApplication();
      loadActivities();
    } catch (error: any) {
      console.error("Error disapproving form:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to disapprove form",
        variant: "destructive",
      });
    } finally {
      setIsDisapprovingForm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header showHomeButton onHomeClick={() => navigate("/home")} />
        <main className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  // Show new lead form when id is "new"
  if (id === "new") {
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
            <h2 className="text-2xl font-bold">Create New Lead</h2>
          </div>

          <Card className="max-w-2xl p-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newLeadForm.name}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, name: e.target.value })
                  }
                  placeholder="Enter candidate name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newLeadForm.phone}
                  onChange={(e) => {
                    setNewLeadForm({ ...newLeadForm, phone: e.target.value });
                    // Clear validation error when user types
                    if (newLeadValidationErrors.phone) {
                      setNewLeadValidationErrors({
                        ...newLeadValidationErrors,
                        phone: undefined,
                      });
                    }
                  }}
                  onBlur={(e) => {
                    // Format phone number on blur
                    const formatted = formatPhoneNumber(e.target.value);
                    setNewLeadForm({ ...newLeadForm, phone: formatted });
                    // Validate phone number
                    if (e.target.value && !isValidPhoneNumber(e.target.value)) {
                      setNewLeadValidationErrors({
                        ...newLeadValidationErrors,
                        phone: "Please enter a valid 10-digit phone number",
                      });
                    }
                  }}
                  placeholder="(555) 123-4567"
                  className={
                    newLeadValidationErrors.phone ? "border-red-500" : ""
                  }
                />
                {newLeadValidationErrors.phone && (
                  <p className="text-sm text-red-500">
                    {newLeadValidationErrors.phone}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) => {
                    setNewLeadForm({ ...newLeadForm, email: e.target.value });
                    // Clear validation error when user types
                    if (newLeadValidationErrors.email) {
                      setNewLeadValidationErrors({
                        ...newLeadValidationErrors,
                        email: undefined,
                      });
                    }
                  }}
                  onBlur={(e) => {
                    // Validate email
                    if (e.target.value && !isValidEmail(e.target.value)) {
                      setNewLeadValidationErrors({
                        ...newLeadValidationErrors,
                        email: "Please enter a valid email address",
                      });
                    }
                  }}
                  placeholder="email@example.com"
                  className={
                    newLeadValidationErrors.email ? "border-red-500" : ""
                  }
                />
                {newLeadValidationErrors.email && (
                  <p className="text-sm text-red-500">
                    {newLeadValidationErrors.email}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  value={newLeadForm.zip_code}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, zip_code: e.target.value })
                  }
                  placeholder="Enter ZIP code"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="source">Source</Label>
                <Select
                  value={newLeadForm.source}
                  onValueChange={(value) =>
                    setNewLeadForm({ ...newLeadForm, source: value })
                  }
                >
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indeed">Indeed</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Meta">Meta</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="position_type">Driver Type</Label>
                <Select
                  value={newLeadForm.position_type}
                  onValueChange={(value) =>
                    setNewLeadForm({ ...newLeadForm, position_type: value })
                  }
                >
                  <SelectTrigger id="position_type">
                    <SelectValue placeholder="Select driver type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employee">
                      Employee
                    </SelectItem>
                    {/*
                    <SelectItem value="Company Driver (Employee)">
                      Company Driver (Employee)
                    </SelectItem>
                    */}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="yard">Yard</Label>
                <Select
                  value={newLeadForm.yard_id}
                  onValueChange={(value) =>
                    setNewLeadForm({ ...newLeadForm, yard_id: value })
                  }
                >
                  <SelectTrigger id="yard">
                    {newLeadForm.yard_id ? (
                      <span className="text-sm">
                        {yards.find((y) => y.id === newLeadForm.yard_id)?.name}
                      </span>
                    ) : (
                      <SelectValue placeholder="Select a yard (optional)" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {yards.map((yard) => (
                      <SelectItem key={yard.id} value={yard.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{yard.name}</span>
                          {yard.address && (
                            <span className="text-xs text-muted-foreground">
                              {yard.address}
                            </span>
                          )}
                          {yard.supervisor_name && (
                            <span className="text-xs text-muted-foreground">
                              Supervisor: {yard.supervisor_name}
                              {yard.supervisor_phone &&
                                ` • ${yard.supervisor_phone}`}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateLead}
                  disabled={
                    isCreatingLead ||
                    !newLeadForm.name.trim() ||
                    !newLeadForm.phone.trim()
                  }
                  className="flex-1"
                >
                  {isCreatingLead ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Create Lead
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/driver-onboarding/pipeline")}
                  disabled={isCreatingLead}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Helper function to determine which tabs should be enabled based on application status
  const isTabEnabled = (tabName: string): boolean => {
    if (!application) return false;

    const status = application.application.status;

    switch (tabName) {
      case "overview":
        return true; // Always enabled
      case "verification":
        return true; // Always enabled - this is where users start
      case "documents":
        // Enabled after verification is done (status changes from NEW)
        return status !== "NEW" && status !== "REJECTED";
      case "mvr":
        // Enabled after all documents are verified
        return (
          (application.compliance?.drivers_license_verified &&
            application.compliance?.medical_card_verified &&
            application.compliance?.ssn_verified) ||
          false
        );
      case "drug_test":
        // Enabled after MVR is completed
        return !!application.compliance?.mvr_completed_at;
      case "orientation":
        // Enabled after compliance is cleared (MVR and Drug Test passed)
        return [
          "CLEARED_FOR_HIRE",
          "ORIENTATION_SCHEDULED",
          "ORIENTATION_COMPLETED",
          "HIRED",
        ].includes(status);
      default:
        return false;
    }
  };

  if (!application) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header showHomeButton onHomeClick={() => navigate("/home")} />
        <main className="container mx-auto px-4 py-8 flex-1">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Application not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/driver-onboarding/pipeline")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pipeline
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Handle home button click - navigate to appropriate homepage based on user role
  const handleHomeClick = () => {
    if (!user) {
      // If not authenticated, redirect to driver login (as per ProtectedRoute default)
      navigate("/driver/login");
      return;
    }

    // Navigate to driver homepage for all authenticated users
    // The ProtectedRoute will handle role-based access
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showHomeButton onHomeClick={handleHomeClick} />
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Header */}
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
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {application.candidate.name}
              </h2>
              <ApplicationStatusBadge status={application.application.status} />
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Application
            </Button>
          </div>
        </div>

        {/* Onboarding Progress Ribbon */}
        <DriverOnboardingRibbon application={application} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full h-auto bg-transparent p-0 grid grid-cols-[auto_1fr] gap-2 border-b">
            <TabsTrigger
              value="overview"
              disabled={!isTabEnabled("overview")}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Overview
            </TabsTrigger>
            <div className="grid grid-cols-6 gap-0">
              <TabsTrigger
                value="verification"
                disabled={!isTabEnabled("verification")}
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent ${
                  !isTabEnabled("verification")
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Initial Connect
                {!isTabEnabled("verification") && " 🔒"}
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                disabled={!isTabEnabled("documents")}
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent ${
                  !isTabEnabled("documents")
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Application
                {!isTabEnabled("documents") && " 🔒"}
              </TabsTrigger>
              <TabsTrigger
                value="mvr"
                disabled={!isTabEnabled("mvr")}
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent ${
                  !isTabEnabled("mvr") ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                MVR Record
                {!isTabEnabled("mvr") && " 🔒"}
              </TabsTrigger>
              <TabsTrigger
                value="drug_test"
                disabled={!isTabEnabled("drug_test")}
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent ${
                  !isTabEnabled("drug_test")
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Drug Test
                {!isTabEnabled("drug_test") && " 🔒"}
              </TabsTrigger>
              <TabsTrigger
                value="orientation"
                disabled={!isTabEnabled("orientation")}
                className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent ${
                  !isTabEnabled("orientation")
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Orientation
                {!isTabEnabled("orientation") && " 🔒"}
              </TabsTrigger>
            </div>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <div className="lg:col-span-2 space-y-6">
                {/* Candidate Info */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Candidate Information
                    </h3>
                    {!isEditingOverview && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStartEditOverview}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {isEditingOverview ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-name">Name *</Label>
                        <Input
                          id="edit-name"
                          value={editCandidateInfo.name}
                          onChange={(e) =>
                            setEditCandidateInfo({
                              ...editCandidateInfo,
                              name: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-phone">Phone *</Label>
                        <Input
                          id="edit-phone"
                          type="tel"
                          value={editCandidateInfo.phone}
                          onChange={(e) => {
                            setEditCandidateInfo({
                              ...editCandidateInfo,
                              phone: e.target.value,
                            });
                            if (overviewValidationErrors.phone) {
                              setOverviewValidationErrors({
                                ...overviewValidationErrors,
                                phone: undefined,
                              });
                            }
                          }}
                          onBlur={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            setEditCandidateInfo({
                              ...editCandidateInfo,
                              phone: formatted,
                            });
                            if (e.target.value && !isValidPhoneNumber(e.target.value)) {
                              setOverviewValidationErrors({
                                ...overviewValidationErrors,
                                phone: "Please enter a valid 10-digit phone number",
                              });
                            }
                          }}
                          className={`mt-1 ${
                            overviewValidationErrors.phone ? "border-red-500" : ""
                          }`}
                          placeholder="(555) 123-4567"
                        />
                        {overviewValidationErrors.phone && (
                          <p className="text-sm text-red-500 mt-1">
                            {overviewValidationErrors.phone}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="edit-email">Email</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={editCandidateInfo.email}
                          onChange={(e) => {
                            setEditCandidateInfo({
                              ...editCandidateInfo,
                              email: e.target.value,
                            });
                            if (overviewValidationErrors.email) {
                              setOverviewValidationErrors({
                                ...overviewValidationErrors,
                                email: undefined,
                              });
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value && !isValidEmail(e.target.value)) {
                              setOverviewValidationErrors({
                                ...overviewValidationErrors,
                                email: "Please enter a valid email address",
                              });
                            }
                          }}
                          className={`mt-1 ${
                            overviewValidationErrors.email ? "border-red-500" : ""
                          }`}
                          placeholder="email@example.com"
                        />
                        {overviewValidationErrors.email && (
                          <p className="text-sm text-red-500 mt-1">
                            {overviewValidationErrors.email}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="edit-zip">Zip Code</Label>
                        <Input
                          id="edit-zip"
                          value={editCandidateInfo.zip_code}
                          onChange={(e) =>
                            setEditCandidateInfo({
                              ...editCandidateInfo,
                              zip_code: e.target.value,
                            })
                          }
                          className="mt-1"
                          placeholder="12345"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-source">Source</Label>
                        <Select
                          value={editCandidateInfo.source}
                          onValueChange={(value) =>
                            setEditCandidateInfo({
                              ...editCandidateInfo,
                              source: value,
                            })
                          }
                        >
                          <SelectTrigger id="edit-source" className="mt-1">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Indeed">Indeed</SelectItem>
                            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                            <SelectItem value="Meta">Meta</SelectItem>
                            <SelectItem value="Referral">Referral</SelectItem>
                            <SelectItem value="Walk-in">Walk-in</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">
                          {application.candidate.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {application.candidate.phone}
                        </p>
                      </div>
                      {application.candidate.email && (
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {application.candidate.email}
                          </p>
                        </div>
                      )}
                      {application.candidate.zip_code && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Zip Code
                          </p>
                          <p className="font-medium flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {application.candidate.zip_code}
                          </p>
                        </div>
                      )}
                      {application.candidate.source && (
                        <div>
                          <p className="text-sm text-muted-foreground">Source</p>
                          <p className="font-medium">
                            {application.candidate.source}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Application Info */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Application Information
                    </h3>
                    {!isEditingOverview && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStartEditOverview}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {isEditingOverview ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-yard">Yard</Label>
                        <Select
                          value={editApplicationInfo.yard_id || undefined}
                          onValueChange={(value) =>
                            setEditApplicationInfo({
                              ...editApplicationInfo,
                              yard_id: value || "",
                            })
                          }
                        >
                          <SelectTrigger id="edit-yard" className="mt-1">
                            <SelectValue placeholder="Select yard (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {yards.map((yard) => (
                              <SelectItem key={yard.id} value={yard.id}>
                                {yard.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="edit-position">Position</Label>
                        <Select
                          value={editApplicationInfo.position_type || undefined}
                          onValueChange={(value) =>
                            setEditApplicationInfo({
                              ...editApplicationInfo,
                              position_type: value || "",
                            })
                          }
                        >
                          <SelectTrigger id="edit-position" className="mt-1">
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Employee">
                              Employee
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {isEditingOverview && (
                        <div className="col-span-2 flex gap-2 pt-4">
                          <Button
                            onClick={handleSaveOverview}
                            disabled={
                              isSavingOverview ||
                              !editCandidateInfo.name.trim() ||
                              !editCandidateInfo.phone.trim()
                            }
                            className="flex-1"
                          >
                            {isSavingOverview ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Changes
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancelEditOverview}
                            disabled={isSavingOverview}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Yard</p>
                        <p className="font-medium">
                          {application.yard?.name || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Position</p>
                        <p className="font-medium">
                          {application.application.position_type || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Source</p>
                        <p className="font-medium">
                          {application.candidate.source || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Applied</p>
                        <p className="font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(
                            new Date(application.application.created_at),
                            "MMM d, yyyy"
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Activity Log */}
              <div className="lg:col-span-1">
                <ActivityLog activities={activities} />
              </div>
            </div>
          </TabsContent>

          {/* Initial Connect Tab */}
          <TabsContent value="verification">
            <Card className="p-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">Initial Connect</h3>
                  {application.candidate.recruiter_call_count !== undefined && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {application.candidate.recruiter_call_count} call
                        {application.candidate.recruiter_call_count !== 1 ? 's' : ''} sent
                      </span>
                    </div>
                  )}
                </div>
                {application.candidate.phone && (
                  <Button
                    onClick={handleStartCall}
                    disabled={isStartingCall}
                    className="flex items-center gap-2"
                  >
                    {isStartingCall ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                    {isStartingCall ? "Starting Call..." : "Start Call"}
                  </Button>
                )}
              </div>

              {/* AI Recruiter Call Summary - Only show after call has been initiated and accepted by driver */}
              {application.candidate.recruiter_call_summary &&
                application.candidate.recruiter_call_date &&
                (application.candidate.recruiter_call_count !== undefined &&
                  application.candidate.recruiter_call_count > 0) && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <p className="font-semibold text-blue-900 dark:text-blue-100">
                        AI Recruiter Call Summary
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {application.candidate.recruiter_call_interest_status && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            application.candidate.recruiter_call_interest_status ===
                            "interested"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {application.candidate.recruiter_call_interest_status ===
                          "interested"
                            ? "Interested"
                            : "Not Interested"}
                        </span>
                      )}
                      {!isEditingCallSummary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditableCallSummary(
                              application.candidate.recruiter_call_summary || ""
                            );
                            setIsEditingCallSummary(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                    Call Date:{" "}
                    {format(
                      new Date(application.candidate.recruiter_call_date),
                      "PPP 'at' p"
                    )}
                  </p>
                  {isEditingCallSummary ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editableCallSummary}
                        onChange={(e) => setEditableCallSummary(e.target.value)}
                        className="bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 min-h-[150px] font-sans"
                        placeholder="Enter call summary..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            setIsSavingCallSummary(true);
                            try {
                              const { error } = await supabase
                                .from("driver_candidates")
                                .update({
                                  recruiter_call_summary: editableCallSummary,
                                })
                                .eq("id", application.candidate.id);

                              if (error) throw error;

                              toast({
                                title: "Success",
                                description: "Call summary updated successfully",
                              });

                              setIsEditingCallSummary(false);
                              await loadApplication();
                            } catch (error: any) {
                              console.error("Error updating call summary:", error);
                              toast({
                                title: "Error",
                                description:
                                  error.message || "Failed to update call summary",
                                variant: "destructive",
                              });
                            } finally {
                              setIsSavingCallSummary(false);
                            }
                          }}
                          disabled={isSavingCallSummary}
                        >
                          {isSavingCallSummary ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingCallSummary(false);
                            setEditableCallSummary(
                              application.candidate.recruiter_call_summary || ""
                            );
                          }}
                          disabled={isSavingCallSummary}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                      <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans">
                        {application.candidate.recruiter_call_summary}
                      </pre>
                    </div>
                  )}
                  {application.candidate.recruiter_call_recording_url && (
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                      <a
                        href={application.candidate.recruiter_call_recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300 hover:underline font-medium"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Listen to Call Recording</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {application.application.initial_verification_call_at && (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="font-medium">Verification Completed</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(
                      new Date(
                        application.application.initial_verification_call_at
                      ),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                  </p>
                  {(() => {
                    // Find the verification activity to get the call outcome
                    const verificationActivity = activities.find(
                      (activity) =>
                        activity.event_type === "INITIAL_VERIFICATION"
                    );
                    const outcomeMatch =
                      verificationActivity?.event_description.match(
                        /completed - (CONTACTED|REJECTED|DOCS_PENDING)/
                      );
                    const outcome = outcomeMatch ? outcomeMatch[1] : null;

                    return outcome ? (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium mb-1">
                          Call Outcome:
                        </p>
                        <p className="text-sm">
                          {outcome === "CONTACTED" && (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              Contacted - Interested
                            </span>
                          )}
                          {outcome === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <XCircle className="h-4 w-4" />
                              Not Interested / Rejected
                            </span>
                          )}
                          {outcome === "DOCS_PENDING" && (
                            <span className="inline-flex items-center gap-1 text-blue-600">
                              <CheckCircle className="h-4 w-4" />
                              Interested - Docs Pending
                            </span>
                          )}
                        </p>
                      </div>
                    ) : null;
                  })()}
                  {application.application.initial_verification_notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-1">Notes:</p>
                      <p className="text-sm text-muted-foreground">
                        {application.application.initial_verification_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="verification-outcome">Call Outcome</Label>
                  <Select
                    value={verificationOutcome}
                    onValueChange={(value) =>
                      setVerificationOutcome(value as ApplicationStatus)
                    }
                  >
                    <SelectTrigger id="verification-outcome" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTACTED">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Contacted - Interested
                        </div>
                      </SelectItem>
                      <SelectItem value="REJECTED">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Not Interested / Rejected
                        </div>
                      </SelectItem>
                      <SelectItem value="DOCS_PENDING">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          Interested - Docs Pending
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSubmitVerification}
                  disabled={isSubmittingVerification}
                  className="w-full h-12 text-base"
                >
                  {isSubmittingVerification ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Submit
                </Button>
              </div>
            </Card>
          </TabsContent>
          {/* Application Tab */}
          <TabsContent value="documents">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Send Application Form Card */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Driver Application Form
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Send the driver a link to complete their application form
                  online. They will fill out all required information and upload
                  documents.
                </p>

                {application.application.application_form_sent_at ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        ✉️ Application form sent on{" "}
                        {format(
                          new Date(
                            application.application.application_form_sent_at
                          ),
                          "PPP 'at' p"
                        )}
                      </p>
                      {application.application.application_form_token && (
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                          Link: {window.location.origin}/driver-onboarding/form/
                          {application.application.application_form_token}
                        </p>
                      )}
                    </div>

                    {application.application.application_form_completed_at ? (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                          <CheckCircle2 className="h-5 w-5" />
                          <p className="font-medium">
                            Form completed on{" "}
                            {format(
                              new Date(
                                application.application.application_form_completed_at
                              ),
                              "PPP 'at' p"
                            )}
                          </p>
                        </div>
                      </div>
                    ) : application.form?.status === "REJECTED" ? (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                          <XCircle className="h-5 w-5" />
                          <p className="font-medium">Form Disapproved</p>
                        </div>
                        {application.form.rejected_at && (
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            Disapproved on{" "}
                            {format(
                              new Date(application.form.rejected_at),
                              "PPP 'at' p"
                            )}
                          </p>
                        )}
                        {application.form.rejection_reason && (
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            Reason: {application.form.rejection_reason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          ⏳ Waiting for driver to complete the form...
                        </p>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      onClick={handleSendApplicationForm}
                      disabled={isSendingApplicationForm}
                      className="h-12 text-base"
                    >
                      {isSendingApplicationForm ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-2" />
                      )}
                      Resend Application Form Link
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleSendApplicationForm}
                    disabled={isSendingApplicationForm}
                    className="h-12 text-base"
                  >
                    {isSendingApplicationForm ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Send Application Form to Driver
                  </Button>
                )}
              </Card>

              {/* Form Details Collapsible Section */}
              {application.application.application_form_completed_at && (
                <>
                  <Collapsible
                    open={isFormDetailsOpen}
                    onOpenChange={setIsFormDetailsOpen}
                  >
                    <Card className="p-6">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">
                            Application Form Details
                          </h3>
                          <ChevronDown
                            className={`h-5 w-5 transition-transform ${
                              isFormDetailsOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <DriverApplicationFormView applicationId={id!} />
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>

                  {/* Disapprove Form Card */}
                  <Card className="p-6 border-red-200 bg-red-50/50 dark:bg-red-900/10">
                    <h3 className="text-lg font-semibold mb-4 text-red-900 dark:text-red-100">
                      Disapprove Application Form
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      If the application form does not meet requirements or
                      contains issues, you can disapprove it. The driver will be
                      notified via email.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDisapprovalDialog(true)}
                      disabled={isDisapprovingForm}
                      className="h-12 text-base"
                    >
                      {isDisapprovingForm ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Disapprove Form
                    </Button>
                  </Card>
                </>
              )}

              {/* Hidden for now - Application Documents section */}
              {true && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Required Application Documents
                  </h3>
                  <div className="space-y-4">
                    <DocumentUpload
                      label="Driver's License"
                      documentType="dl"
                      candidateId={application.candidate.id}
                      complianceId={application.compliance?.id || ""}
                      currentFileUrl={
                        application.compliance?.drivers_license_url || undefined
                      }
                      isVerified={
                        application.compliance?.drivers_license_verified ||
                        false
                      }
                      onUploadComplete={(url) =>
                        handleDocumentUpload("dl", url)
                      }
                      onVerificationChange={(verified) =>
                        handleDocumentVerificationChange("dl", verified)
                      }
                    />
                    <DocumentUpload
                      label="Medical Card"
                      documentType="medical_card"
                      candidateId={application.candidate.id}
                      complianceId={application.compliance?.id || ""}
                      currentFileUrl={
                        application.compliance?.medical_card_url || undefined
                      }
                      isVerified={
                        application.compliance?.medical_card_verified || false
                      }
                      onUploadComplete={(url) =>
                        handleDocumentUpload("medical_card", url)
                      }
                      onVerificationChange={(verified) =>
                        handleDocumentVerificationChange(
                          "medical_card",
                          verified
                        )
                      }
                    />
                    <DocumentUpload
                      label="Social Security Card"
                      documentType="ssn"
                      candidateId={application.candidate.id}
                      complianceId={application.compliance?.id || ""}
                      currentFileUrl={
                        application.compliance?.ssn_url || undefined
                      }
                      isVerified={application.compliance?.ssn_verified || false}
                      onUploadComplete={(url) =>
                        handleDocumentUpload("ssn", url)
                      }
                      onVerificationChange={(verified) =>
                        handleDocumentVerificationChange("ssn", verified)
                      }
                    />
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
          {/* MVR Tab */}
          <TabsContent value="mvr">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Motor Vehicle Record (MVR)
                </h3>

                {application.compliance?.mvr_requested_at && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      MVR requested on{" "}
                      {format(
                        new Date(application.compliance.mvr_requested_at),
                        "MMM d, yyyy"
                      )}
                    </p>
                  </div>
                )}

                {application.compliance?.mvr_completed_at ? (
                  <div className="space-y-3">
                    <div
                      className={`p-4 rounded-lg border ${
                        application.compliance.mvr_eligible
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {application.compliance.mvr_eligible ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <p className="font-medium text-black">
                            {application.compliance.mvr_eligible
                              ? "MVR Passed"
                              : "MVR Failed"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="mvr-verified"
                            checked={mvrVerified}
                            onCheckedChange={(checked) =>
                              handleMVRVerificationChange(checked as boolean)
                            }
                          />
                          <label
                            htmlFor="mvr-verified"
                            className="text-sm font-medium cursor-pointer"
                          >
                            Verified
                          </label>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Completed on{" "}
                        {format(
                          new Date(application.compliance.mvr_completed_at),
                          "MMM d, yyyy"
                        )}
                      </p>
                      {application.compliance.mvr_summary && (
                        <div className="mt-3 pt-3 text-black border-t">
                          <p className="text-sm font-medium mb-1">Summary:</p>
                          <p className="text-sm">
                            {application.compliance.mvr_summary}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <Label className="text-sm font-medium mb-2 block">
                        Upload MVR Report
                      </Label>
                      <DocumentUpload
                        label="MVR Report"
                        documentType="dl"
                        candidateId={application.application.candidate_id}
                        complianceId={application.compliance.id}
                        currentFileUrl={application.compliance.mvr_report_url}
                        isVerified={false}
                        onUploadComplete={async (fileUrl) => {
                          // Update MVR report URL
                          await supabase
                            .from("driver_compliance")
                            .update({ mvr_report_url: fileUrl })
                            .eq("id", application.compliance!.id);
                          loadApplication();
                          toast({
                            title: "Success",
                            description: "MVR report uploaded successfully",
                          });
                        }}
                        onVerificationChange={() => {}}
                      />
                    </div>

                    <div>
                      <Label>MVR Result</Label>
                      <Select
                        value={mvrEligible ? "eligible" : "not_eligible"}
                        onValueChange={(value) =>
                          setMvrEligible(value === "eligible")
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eligible">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Eligible / Passed
                            </div>
                          </SelectItem>
                          <SelectItem value="not_eligible">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              Not Eligible / Failed
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="mvr-summary">MVR Summary</Label>
                      <Textarea
                        id="mvr-summary"
                        value={mvrSummary}
                        onChange={(e) => setMvrSummary(e.target.value)}
                        placeholder="Enter MVR summary or notes..."
                        className="mt-1 min-h-[100px]"
                      />
                    </div>

                    <Button
                      onClick={handleSubmitMVR}
                      disabled={isSubmittingMVR}
                      className="w-full h-12 text-base"
                    >
                      {isSubmittingMVR ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Submit MVR Result
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Drug Test Tab */}
          <TabsContent value="drug_test">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Drug Test</h3>

                {application.compliance?.drug_test_result ? (
                  <div
                    className={`p-4 rounded-lg border ${
                      application.compliance.drug_test_result === "NEGATIVE"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 text-black">
                      {application.compliance.drug_test_result ===
                      "NEGATIVE" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <p className="font-medium">
                        Result: {application.compliance.drug_test_result}
                      </p>
                    </div>
                    {application.compliance.drug_test_completed_at && (
                      <p className="text-sm text-muted-foreground mb-2">
                        Completed on{" "}
                        {format(
                          new Date(
                            application.compliance.drug_test_completed_at
                          ),
                          "MMM d, yyyy"
                        )}
                      </p>
                    )}
                    {application.compliance.drug_test_results_url && (
                      <div className="mt-3 pt-3 border-t">
                        <a
                          href={application.compliance.drug_test_results_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          <span>View Test Results Document</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : application.compliance?.drug_test_ordered_at ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm font-medium text-blue-800 mb-2">
                        Drug Test Ordered
                      </p>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>
                          Provider: {application.compliance.drug_test_provider}
                        </p>
                        <p>Site: {application.compliance.drug_test_site}</p>
                        {application.compliance.drug_test_scheduled_date && (
                          <p>
                            Scheduled:{" "}
                            {format(
                              new Date(
                                application.compliance.drug_test_scheduled_date
                              ),
                              "MMM d, yyyy"
                            )}
                          </p>
                        )}
                      </div>
                      {application.compliance.drug_test_results_url && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <a
                            href={application.compliance.drug_test_results_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-800 hover:underline font-medium"
                          >
                            <FileText className="h-4 w-4" />
                            <span>View Test Results Document</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>


                    <div className="border rounded-lg p-4 bg-muted/30">
                      <Label className="text-sm font-medium mb-2 block">
                        Upload Test Results (from Clinic)
                      </Label>
                      <DocumentUpload
                        label="Drug Test Results"
                        documentType="dl"
                        candidateId={application.application.candidate_id}
                        complianceId={application.compliance.id}
                        currentFileUrl={
                          application.compliance.drug_test_results_url
                        }
                        isVerified={false}
                        onUploadComplete={async (fileUrl) => {
                          // Update test results URL
                          await supabase
                            .from("driver_compliance")
                            .update({ drug_test_results_url: fileUrl })
                            .eq("id", application.compliance!.id);
                          loadApplication();
                          toast({
                            title: "Success",
                            description: "Test results uploaded successfully",
                          });
                        }}
                        onVerificationChange={() => {}}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Upload the test results document received from the
                        clinic
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Record Test Result</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleDrugTestResult("NEGATIVE")}
                          className="border-green-200 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                          Negative
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDrugTestResult("POSITIVE")}
                          className="border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1 text-red-600" />
                          Positive
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDrugTestResult("NO_SHOW")}
                          className="border-orange-200 hover:bg-orange-50"
                        >
                          No Show
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="drug-test-provider">Provider</Label>
                      <Input
                        id="drug-test-provider"
                        value={drugTestProvider}
                        onChange={(e) => setDrugTestProvider(e.target.value)}
                        placeholder="e.g., LabCorp, Quest Diagnostics"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="drug-test-site">Test Site</Label>
                      <Input
                        id="drug-test-site"
                        value={drugTestSite}
                        onChange={(e) => setDrugTestSite(e.target.value)}
                        placeholder="e.g., 123 Main St, City, State"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="drug-test-date">
                        Scheduled Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="drug-test-date"
                        type="date"
                        value={drugTestDate}
                        onChange={(e) => setDrugTestDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="mt-1 dark:bg-background dark:text-foreground dark:[color-scheme:dark]"
                        style={{
                          colorScheme: 'dark',
                        }}
                        required
                      />
                      <style dangerouslySetInnerHTML={{
                        __html: `
                          #drug-test-date::-webkit-calendar-picker-indicator {
                            filter: invert(1);
                            cursor: pointer;
                            opacity: 1;
                          }
                          .dark #drug-test-date::-webkit-calendar-picker-indicator {
                            filter: invert(0);
                          }
                        `
                      }} />
                      <p className="text-xs text-muted-foreground mt-1">
                        Select a future date for the drug test appointment
                      </p>
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/30">
                      <Label className="text-sm font-medium mb-2 block">
                        Upload Work Order (Optional)
                      </Label>
                      <DocumentUpload
                        label="Drug Test Work Order"
                        documentType="dl"
                        candidateId={application.application.candidate_id}
                        complianceId={application.compliance?.id || ""}
                        currentFileUrl={drugTestWorkOrderUrl}
                        showVerification={false}
                        onUploadComplete={async (fileUrl) => {
                          setDrugTestWorkOrderUrl(fileUrl);
                          toast({
                            title: "Success",
                            description: "Work order uploaded successfully",
                          });
                        }}
                        onVerificationChange={() => {}}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Upload the work order document. This will be attached to the email sent to the driver.
                      </p>
                    </div>

                    <Button
                      onClick={handleCreateDrugTest}
                      disabled={
                        isCreatingDrugTest ||
                        !drugTestProvider.trim() ||
                        !drugTestSite.trim() ||
                        !drugTestDate
                      }
                      className="w-full h-12 text-base"
                    >
                      {isCreatingDrugTest ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Create Drug Test Order
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
          {/* Orientation Tab */}
          <TabsContent value="orientation">
            <div className="grid gap-6 max-w-4xl mx-auto">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Orientation</h3>
                {application.onboarding?.orientation_completed_at ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Orientation Completed</span>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Completed:{" "}
                        </span>
                        <span>
                          {format(
                            new Date(
                              application.onboarding.orientation_completed_at
                            ),
                            "PPP"
                          )}
                        </span>
                      </div>
                      {application.onboarding.orientation_notes && (
                        <div>
                          <span className="text-muted-foreground">Notes: </span>
                          <span>
                            {application.onboarding.orientation_notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : application.onboarding?.orientation_scheduled_at ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Orientation Scheduled</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        Scheduled for:{" "}
                      </span>
                      <span>
                        {format(
                          new Date(
                            application.onboarding.orientation_scheduled_at
                          ),
                          "PPP p"
                        )}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="orientation-notes"
                        className="text-base font-medium"
                      >
                        Completion Notes (Optional)
                      </Label>
                      <Textarea
                        id="orientation-notes"
                        value={orientationNotes}
                        onChange={(e) => setOrientationNotes(e.target.value)}
                        placeholder="Add any notes about the orientation..."
                        rows={3}
                        className="text-base"
                      />
                    </div>
                    <Button
                      onClick={handleCompleteOrientation}
                      disabled={isCompletingOrientation}
                      className="w-full h-12 text-base"
                    >
                      {isCompletingOrientation ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Mark as Completed
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No orientation scheduled yet
                    </p>

                    <div className="space-y-2">
                      <Label
                        htmlFor="orientation-yard"
                        className="text-base font-medium"
                      >
                        Yard Location <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={orientationYardId}
                        onValueChange={(value) => {
                          setOrientationYardId(value);
                          // Clear supervisor when yard changes
                          setOrientationSupervisorName("");
                        }}
                      >
                        <SelectTrigger
                          id="orientation-yard"
                          className="h-12 min-h-[48px] text-base"
                        >
                          {orientationYardId ? (
                            <span className="text-sm">
                              {yards.find((y) => y.id === orientationYardId)?.name}
                            </span>
                          ) : (
                            <SelectValue placeholder="Select yard" />
                          )}
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {yards.map((yard) => (
                            <SelectItem
                              key={yard.id}
                              value={yard.id}
                              className="h-auto py-4"
                            >
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-base">
                                  {yard.name}
                                </span>
                                {yard.address && (
                                  <span className="text-sm text-muted-foreground">
                                    {yard.address}
                                  </span>
                                )}
                                {yard.supervisor_name && (
                                  <span className="text-sm text-muted-foreground">
                                    Supervisor: {yard.supervisor_name}
                                    {yard.supervisor_phone &&
                                      ` • ${yard.supervisor_phone}`}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="orientation-supervisor"
                        className="text-base font-medium"
                      >
                        Supervisor <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={orientationSupervisorName}
                        onValueChange={setOrientationSupervisorName}
                        disabled={!orientationYardId}
                      >
                        <SelectTrigger
                          id="orientation-supervisor"
                          className="h-12 text-base"
                          disabled={!orientationYardId}
                        >
                          <SelectValue 
                            placeholder={
                              !orientationYardId
                                ? "Select a yard first"
                                : "Select a supervisor"
                            } 
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {getFilteredSupervisors().length > 0 ? (
                            getFilteredSupervisors().map((supervisor) => (
                              <SelectItem
                                key={supervisor.id}
                                value={supervisor.name}
                                className="text-base"
                              >
                                {supervisor.name}
                              </SelectItem>
                            ))
                          ) : orientationYardId ? (
                            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                              No supervisor found for this yard
                            </div>
                          ) : (
                            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                              Please select a yard first
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {!orientationYardId && (
                        <p className="text-xs text-muted-foreground">
                          Please select a yard location first to see available supervisors
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="orientation-date"
                        className="text-base font-medium"
                      >
                        Date & Time <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground dark:text-foreground pointer-events-none" />
                        <Input
                          id="orientation-date"
                          type="datetime-local"
                          value={orientationDate}
                          onChange={(e) => setOrientationDate(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className="pl-10 h-12 text-base dark:bg-background dark:text-foreground dark:[color-scheme:dark]"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Select a future date and time for orientation
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="orientation-next-steps"
                        className="text-base font-medium"
                      >
                        Next Steps / Instructions
                      </Label>
                      <Textarea
                        id="orientation-next-steps"
                        value={orientationNotes}
                        onChange={(e) => setOrientationNotes(e.target.value)}
                        placeholder="Add any instructions or next steps for the driver..."
                        rows={3}
                        className="text-base"
                      />
                    </div>

                    <Button
                      onClick={handleScheduleOrientation}
                      disabled={
                        !orientationDate ||
                        !orientationSupervisorName ||
                        !orientationYardId ||
                        isSchedulingOrientation
                      }
                      className="w-full h-12 text-base"
                    >
                      {isSchedulingOrientation ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Calendar className="h-4 w-4 mr-2" />
                      )}
                      Schedule Orientation
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this application for{" "}
              <strong>{application.candidate.name}</strong>? This action cannot
              be undone and will permanently remove all associated data
              including documents, compliance records, and activity history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteApplication}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disapprove Form Dialog */}
      <Dialog
        open={showDisapprovalDialog}
        onOpenChange={setShowDisapprovalDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disapprove Application Form</DialogTitle>
            <DialogDescription>
              Please provide a reason for disapproving the application form for{" "}
              <strong>{application.candidate.name}</strong>. The driver will be
              notified via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="disapproval-reason">
                Reason for Disapproval *
              </Label>
              <Textarea
                id="disapproval-reason"
                value={disapprovalReason}
                onChange={(e) => setDisapprovalReason(e.target.value)}
                placeholder="Enter the reason for disapproving this application form..."
                className="mt-2 min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDisapprovalDialog(false);
                setDisapprovalReason("");
              }}
              disabled={isDisapprovingForm}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisapproveForm}
              disabled={isDisapprovingForm || !disapprovalReason.trim()}
            >
              {isDisapprovingForm ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disapproving...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Disapprove Form
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationDetail;

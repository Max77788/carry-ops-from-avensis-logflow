import { supabase } from "./supabase";
import { normalizePhoneToE164 } from "./validationUtils";
import type {
  DriverCandidate,
  DriverApplication,
  DriverCompliance,
  DriverOnboarding,
  DriverApplicationActivity,
  ApplicationWithDetails,
  CreateLeadFormData,
  InitialVerificationFormData,
  MVRFormData,
  DrugTestOrderFormData,
  DrugTestResult,
  OrientationFormData,
  TrainingFormData,
  TrainingCompletionFormData,
} from "./driverOnboardingTypes";

export const driverOnboardingService = {
  // =====================================================
  // Lead Management
  // =====================================================
  async createLead(
    data: CreateLeadFormData
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Ensure empty strings are converted to null for UUID fields
      const yardId =
        data.yard_id && data.yard_id.trim() !== "" ? data.yard_id : null;
      const recruiterId =
        data.recruiter_id && data.recruiter_id.trim() !== ""
          ? data.recruiter_id
          : null;

      // Normalize phone number to E.164 format before saving
      const normalizedPhone = normalizePhoneToE164(data.phone);
      if (!normalizedPhone) {
        return { success: false, error: 'Invalid phone number format' };
      }

      const { data: result, error } = await supabase.rpc(
        "rpc_create_driver_lead",
        {
          p_name: data.name,
          p_phone: normalizedPhone,
          p_email: data.email || null,
          p_zip_code: data.zip_code || null,
          p_source: data.source || null,
          p_yard_id: yardId,
          p_position_type: data.position_type || null,
          p_recruiter_id: recruiterId,
        }
      );

      if (error) throw error;
      return { success: true, data: result };
    } catch (error: any) {
      console.error("Error creating lead:", error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // Application Queries
  // =====================================================
  async getApplications(filters?: {
    yard_id?: string;
    status?: string;
    recruiter_id?: string;
  }): Promise<{
    success: boolean;
    data?: ApplicationWithDetails[];
    error?: string;
  }> {
    try {
      let query = supabase
        .from("driver_applications")
        .select(
          `
          *,
          candidate:driver_candidates(*),
          compliance:driver_compliance(*),
          onboarding:driver_onboarding(*),
          yard:yards(id, name)
        `
        )
        .order("created_at", { ascending: false });

      if (filters?.yard_id) {
        query = query.eq("yard_id", filters.yard_id);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.recruiter_id) {
        query = query.eq("recruiter_id", filters.recruiter_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const applications: ApplicationWithDetails[] = (data || []).map(
        (item: any) => ({
          application: item,
          candidate: Array.isArray(item.candidate)
            ? item.candidate[0]
            : item.candidate,
          compliance: Array.isArray(item.compliance)
            ? item.compliance[0]
            : item.compliance,
          onboarding: Array.isArray(item.onboarding)
            ? item.onboarding[0]
            : item.onboarding,
          yard: Array.isArray(item.yard) ? item.yard[0] : item.yard,
        })
      );

      return { success: true, data: applications };
    } catch (error: any) {
      console.error("Error fetching applications:", error);
      return { success: false, error: error.message };
    }
  },

  async getApplicationById(id: string): Promise<{
    success: boolean;
    data?: ApplicationWithDetails;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from("driver_applications")
        .select(
          `
          *,
          candidate:driver_candidates(*),
          compliance:driver_compliance(*),
          onboarding:driver_onboarding(*),
          yard:yards(id, name)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      const application: ApplicationWithDetails = {
        application: data,
        candidate: Array.isArray(data.candidate)
          ? data.candidate[0]
          : data.candidate,
        compliance: Array.isArray(data.compliance)
          ? data.compliance[0]
          : data.compliance,
        onboarding: Array.isArray(data.onboarding)
          ? data.onboarding[0]
          : data.onboarding,
        yard: Array.isArray(data.yard) ? data.yard[0] : data.yard,
      };

      return { success: true, data: application };
    } catch (error: any) {
      console.error("Error fetching application:", error);
      return { success: false, error: error.message };
    }
  },

  async getApplicationActivities(applicationId: string): Promise<{
    success: boolean;
    data?: DriverApplicationActivity[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from("driver_application_activity")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error("Error fetching activities:", error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // Status Updates
  // =====================================================
  async updateApplicationStatus(
    applicationId: string,
    newStatus: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("rpc_update_application_status", {
        p_application_id: applicationId,
        p_new_status: newStatus,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error updating status:", error);
      return { success: false, error: error.message };
    }
  },

  async updateApplicationNotes(
    applicationId: string,
    notes: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("driver_applications")
        .update({ notes })
        .eq("id", applicationId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error updating notes:", error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // Initial Verification
  // =====================================================
  async submitInitialVerification(
    applicationId: string,
    data: InitialVerificationFormData,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error: updateError } = await supabase
        .from("driver_applications")
        .update({
          status: data.call_outcome,
          initial_verification_call_at: new Date().toISOString(),
          initial_verification_notes: data.notes,
        })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      await supabase.rpc("rpc_log_application_activity", {
        p_application_id: applicationId,
        p_event_type: "INITIAL_VERIFICATION",
        p_event_description: `Initial verification call completed - ${data.call_outcome}`,
        p_user_id: userId || null,
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error submitting verification:", error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // Document Management
  // =====================================================
  async updateDocumentVerification(
    applicationId: string,
    complianceId: string,
    documentType: "dl" | "medical_card" | "ssn",
    verified: boolean,
    fileUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {};

      // Map document types to correct database column names
      const columnMap = {
        dl: {
          verified: "drivers_license_verified",
          url: "drivers_license_url",
        },
        medical_card: {
          verified: "medical_card_verified",
          url: "medical_card_url",
        },
        ssn: { verified: "ssn_verified", url: "ssn_url" },
      };

      const columns = columnMap[documentType];
      updateData[columns.verified] = verified;
      if (fileUrl) {
        updateData[columns.url] = fileUrl;
      }

      const { error } = await supabase
        .from("driver_compliance")
        .update(updateData)
        .eq("id", complianceId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error updating document:", error);
      return { success: false, error: error.message };
    }
  },

  async markDocumentsVerified(
    applicationId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("rpc_mark_documents_verified", {
        p_application_id: applicationId,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error marking documents verified:", error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // MVR Management
  // =====================================================
  async markMVRRequested(
    applicationId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("rpc_mark_mvr_requested", {
        p_application_id: applicationId,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error marking MVR requested:", error);
      return { success: false, error: error.message };
    }
  },

  async markMVRCompleted(
    applicationId: string,
    data: MVRFormData,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("rpc_mark_mvr_completed", {
        p_application_id: applicationId,
        p_eligible: data.eligible,
        p_summary: data.summary || null,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error marking MVR completed:", error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // Drug Test Management
  // =====================================================
  async createDrugTestOrder(
    applicationId: string,
    data: DrugTestOrderFormData,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("rpc_create_drug_test_order", {
        p_application_id: applicationId,
        p_provider: data.provider,
        p_site: data.site,
        p_scheduled_date: data.scheduled_date || null,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error creating drug test order:", error);
      return { success: false, error: error.message };
    }
  },

  async markDrugTestResult(
    applicationId: string,
    result: DrugTestResult,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("rpc_mark_drug_test_result", {
        p_application_id: applicationId,
        p_result: result,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error marking drug test result:", error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // Onboarding Management
  // =====================================================
  async scheduleOrientation(
    applicationId: string,
    data: OrientationFormData,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("rpc_schedule_orientation", {
        p_application_id: applicationId,
        p_supervisor_id: data.supervisor_id || null,
        p_supervisor_name: data.supervisor_name || null,
        p_scheduled_at: data.scheduled_at,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error scheduling orientation:", error);
      return { success: false, error: error.message };
    }
  },

  async completeOrientation(
    applicationId: string,
    notes?: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("rpc_complete_orientation", {
        p_application_id: applicationId,
        p_notes: notes || null,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error completing orientation:", error);
      return { success: false, error: error.message };
    }
  },

  async scheduleTraining(
    applicationId: string,
    data: TrainingFormData,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("rpc_schedule_training", {
        p_application_id: applicationId,
        p_mentor_id: data.mentor_id,
        p_scheduled_start: data.scheduled_start,
        p_scheduled_end: data.scheduled_end,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error scheduling training:", error);
      return { success: false, error: error.message };
    }
  },

  async completeTraining(
    applicationId: string,
    data: TrainingCompletionFormData,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("rpc_complete_training", {
        p_application_id: applicationId,
        p_rating: data.rating,
        p_notes: data.notes || null,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error completing training:", error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // Supervisor Orientation Management
  // =====================================================
  async getOrientationScheduleForDate(
    startDate: string, // ISO date string (YYYY-MM-DD)
    endDate: string, // ISO date string (YYYY-MM-DD)
    yardId?: string
  ): Promise<{
    success: boolean;
    data?: ApplicationWithDetails[];
    error?: string;
  }> {
    try {
      // Get start of first day and end of last day in UTC
      const startOfRange = new Date(startDate);
      startOfRange.setHours(0, 0, 0, 0);
      const endOfRange = new Date(endDate);
      endOfRange.setHours(23, 59, 59, 999);

      // Query driver_onboarding first to get scheduled orientations
      let onboardingQuery = supabase
        .from("driver_onboarding")
        .select("application_id, orientation_scheduled_at, yard_id")
        .gte("orientation_scheduled_at", startOfRange.toISOString())
        .lte("orientation_scheduled_at", endOfRange.toISOString())
        .is("orientation_completed_at", null);

      const { data: onboardingData, error: onboardingError } =
        await onboardingQuery;

      if (onboardingError) throw onboardingError;

      if (!onboardingData || onboardingData.length === 0) {
        return { success: true, data: [] };
      }

      // Get application IDs
      const applicationIds = onboardingData.map(
        (onboarding: any) => onboarding.application_id
      );

      // Now get full application details with all relations
      let query = supabase
        .from("driver_applications")
        .select(
          `
          *,
          candidate:driver_candidates(*),
          compliance:driver_compliance(*),
          onboarding:driver_onboarding(*),
          yard:yards(id, name, address, supervisor_name, supervisor_phone)
        `
        )
        .in("id", applicationIds)
        .eq("status", "ORIENTATION_SCHEDULED");

      // Filter by yard_id if provided - use driver_applications.yard_id (references yards.id)
      if (yardId) {
        query = query.eq("yard_id", yardId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data
      let processedData = (data || []).map((item: any) => {
        const onboarding = Array.isArray(item.onboarding)
          ? item.onboarding[0]
          : item.onboarding;
        const yard = Array.isArray(item.yard) ? item.yard[0] : item.yard;
        
        return {
          application: item,
          candidate: Array.isArray(item.candidate)
            ? item.candidate[0]
            : item.candidate,
          compliance: Array.isArray(item.compliance)
            ? item.compliance[0]
            : item.compliance,
          onboarding,
          yard,
        };
      });

      // Sort by orientation scheduled time
      const sortedData = processedData.sort((a: ApplicationWithDetails, b: ApplicationWithDetails) => {
        const aTime = a.onboarding?.orientation_scheduled_at || "";
        const bTime = b.onboarding?.orientation_scheduled_at || "";
        return aTime.localeCompare(bTime);
      });

      return { success: true, data: sortedData };
    } catch (error: any) {
      console.error("Error getting orientation schedule:", error);
      return { success: false, error: error.message };
    }
  },

  async approveAndHire(
    applicationId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("rpc_approve_and_hire", {
        p_application_id: applicationId,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error approving and hiring:", error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // Delete Application
  // =====================================================
  async deleteApplication(
    applicationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete the application (cascade will handle related records)
      const { error } = await supabase
        .from("driver_applications")
        .delete()
        .eq("id", applicationId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting application:", error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // Update Candidate and Application Info
  // =====================================================
  async updateCandidateInfo(
    candidateId: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      zip_code?: string;
      source?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email || null;
      if (data.zip_code !== undefined) updateData.zip_code = data.zip_code || null;
      if (data.source !== undefined) updateData.source = data.source || null;

      // Handle phone number normalization
      if (data.phone !== undefined) {
        const normalizedPhone = normalizePhoneToE164(data.phone);
        if (!normalizedPhone) {
          return { success: false, error: 'Invalid phone number format' };
        }
        updateData.phone = normalizedPhone;
      }

      const { error } = await supabase
        .from("driver_candidates")
        .update(updateData)
        .eq("id", candidateId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error updating candidate info:", error);
      return { success: false, error: error.message };
    }
  },

  async updateApplicationInfo(
    applicationId: string,
    data: {
      yard_id?: string | null;
      position_type?: string | null;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {};

      if (data.yard_id !== undefined) {
        updateData.yard_id = data.yard_id && data.yard_id.trim() !== "" ? data.yard_id : null;
      }
      if (data.position_type !== undefined) {
        updateData.position_type = data.position_type || null;
      }

      const { error } = await supabase
        .from("driver_applications")
        .update(updateData)
        .eq("id", applicationId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error updating application info:", error);
      return { success: false, error: error.message };
    }
  },

  // =====================================================
  // Yards
  // =====================================================
  async getYards(): Promise<{
    success: boolean;
    data?: Array<{
      id: string;
      name: string;
      address?: string;
      supervisor_name?: string;
      supervisor_phone?: string;
    }>;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from("yards")
        .select("id, name, address, supervisor_name, supervisor_phone")
        .order("name");

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error("Error fetching yards:", error);
      return { success: false, error: error.message };
    }
  },
};

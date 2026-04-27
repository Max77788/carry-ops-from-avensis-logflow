// Driver Onboarding Types

export type ApplicationStatus =
  | "NEW"
  | "CONTACTED"
  | "REJECTED"
  | "DOCS_PENDING"
  | "DOCS_VERIFIED"
  | "MVR_PENDING"
  | "MVR_PASSED"
  | "MVR_FAILED"
  | "DRUG_TEST_ORDERED"
  | "DRUG_TEST_PENDING"
  | "DRUG_TEST_PASSED"
  | "DRUG_TEST_FAILED"
  | "DRUG_TEST_NO_SHOW"
  | "DRUG_TEST_EXPIRED"
  | "CLEARED_FOR_HIRE"
  | "ORIENTATION_SCHEDULED"
  | "ORIENTATION_COMPLETED"
  | "TRAINING_IN_PROGRESS"
  | "TRAINING_COMPLETED"
  | "HIRED";

export type MVRStatus = "NOT_STARTED" | "REQUESTED" | "COMPLETED";

export type DrugTestStatus =
  | "NOT_STARTED"
  | "ORDERED"
  | "SCHEDULED"
  | "COMPLETED";

export type DrugTestResult = "NEGATIVE" | "POSITIVE" | "NO_SHOW" | "EXPIRED";

export interface DriverCandidate {
  id: string;
  name: string;
  phone: string;
  email?: string;
  zip_code?: string;
  source?: string;
  recruiter_call_summary?: string;
  recruiter_call_interest_status?: 'interested' | 'not_interested';
  recruiter_call_recording_url?: string;
  recruiter_call_date?: string;
  recruiter_call_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DriverApplication {
  id: string;
  candidate_id: string;
  yard_id?: string;
  position_type?: string;
  status: ApplicationStatus;
  recruiter_id?: string;
  notes?: string;
  initial_verification_call_at?: string;
  initial_verification_notes?: string;
  application_form_token?: string;
  application_form_sent_at?: string;
  application_form_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverCompliance {
  id: string;
  application_id: string;

  // Documents - matching database column names
  drivers_license_verified?: boolean;
  medical_card_verified?: boolean;
  ssn_verified?: boolean;
  drivers_license_url?: string;
  medical_card_url?: string;
  ssn_url?: string;
  documents_verified_at?: string;

  // MVR
  mvr_requested_at?: string;
  mvr_summary?: string;
  mvr_eligible?: boolean;
  mvr_completed_at?: string;
  mvr_report_url?: string;

  // Drug Test
  drug_test_provider?: string;
  drug_test_site?: string;
  drug_test_scheduled_date?: string;
  drug_test_ordered_at?: string;
  drug_test_expires_at?: string;
  drug_test_result?: string;
  drug_test_completed_at?: string;
  drug_test_work_order_url?: string;
  drug_test_results_url?: string;

  created_at: string;
  updated_at: string;
}

export interface DriverOnboarding {
  id: string;
  application_id: string;

  // Orientation
  supervisor_id?: string;
  supervisor_name?: string;
  yard_id?: string;
  orientation_scheduled_at?: string;
  orientation_completed_at?: string;
  orientation_notes?: string;

  // Training - matching database column names
  mentor_id?: string;
  training_scheduled_start?: string;
  training_scheduled_end?: string;
  training_actual_start_at?: string;
  training_actual_end_at?: string;
  training_evaluation_rating?: number;
  training_evaluation_notes?: string;

  // Final Hire
  hired_at?: string;
  hired_by_user_id?: string;

  created_at: string;
  updated_at: string;
}

export interface DriverApplicationActivity {
  id: string;
  application_id: string;
  event_type: string;
  event_description: string;
  user_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Combined view for display
export interface ApplicationWithDetails {
  application: DriverApplication;
  candidate: DriverCandidate;
  compliance?: DriverCompliance;
  onboarding?: DriverOnboarding;
  yard?: {
    id: string;
    name: string;
    address?: string;
    supervisor_name?: string;
    supervisor_phone?: string;
  };
  recruiter?: { id: string; name: string };
  activities?: DriverApplicationActivity[];
}

// Form data types
export interface CreateLeadFormData {
  name: string;
  phone: string;
  email?: string;
  zip_code?: string;
  source?: string;
  yard_id?: string;
  position_type?: string;
  recruiter_id?: string;
}

export interface InitialVerificationFormData {
  call_outcome: "CONTACTED" | "REJECTED";
  notes: string;
}

export interface MVRFormData {
  eligible: boolean;
  summary?: string;
}

export interface DrugTestOrderFormData {
  provider: string;
  site: string;
  scheduled_date?: string;
}

export interface OrientationFormData {
  supervisor_id?: string;
  supervisor_name?: string;
  scheduled_at: string;
}

export interface TrainingFormData {
  mentor_id: string;
  scheduled_start: string;
  scheduled_end: string;
}

export interface TrainingCompletionFormData {
  rating: number;
  notes?: string;
}

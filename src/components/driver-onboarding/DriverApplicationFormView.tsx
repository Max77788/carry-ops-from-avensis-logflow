import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface DriverApplicationFormViewProps {
  applicationId: string;
}

interface FormData {
  id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  current_address: string;
  previous_address_1: string;
  previous_address_2: string;
  phone_number: string;
  date_of_birth: string;
  years_at_current_address: number;
  legally_authorized_to_work: boolean;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_address: string;
  emergency_contact_phone: string;
  dl_number: string;
  dl_state: string;
  dl_type: string;
  dl_expiration_date: string;
  no_previous_dot_employment: boolean;
  applicant_signature: string;
  applicant_print_name: string;
  fcra_signature: string;
  fcra_print_name: string;
  status: string;
  submitted_at: string;
  current_step: number;
  rejection_reason: string | null;
  rejected_at: string | null;
}

interface DriverExperience {
  equipment_type: string;
  from_date: string;
  to_date: string;
  approx_miles: number;
}

interface AccidentHistory {
  accident_date: string;
  description: string;
  injuries: number;
  fatalities: number;
}

interface TrafficViolation {
  violation_date: string;
  location: string;
  charge: string;
  penalty: string;
}

interface EmploymentHistory {
  employer_name: string;
  employer_address: string;
  employer_phone: string;
  from_date: string;
  to_date: string;
  position: string;
  reason_for_leaving: string;
  subject_to_fmcsrs: boolean;
  subject_to_drug_testing: boolean;
}

interface EmploymentGap {
  activity_description: string;
  from_date: string;
  to_date: string;
  was_unemployed: boolean;
}

interface SafetyQuestions {
  denied_license: boolean;
  denied_license_details: string;
  license_suspended: boolean;
  license_suspended_details: string;
  convicted_cmv_crime: boolean;
  convicted_cmv_crime_details: string;
  convicted_law_violation: boolean;
  convicted_law_violation_details: string;
}

export const DriverApplicationFormView = ({
  applicationId,
}: DriverApplicationFormViewProps) => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [driverExperience, setDriverExperience] = useState<DriverExperience[]>(
    []
  );
  const [accidentHistory, setAccidentHistory] = useState<AccidentHistory[]>([]);
  const [trafficViolations, setTrafficViolations] = useState<
    TrafficViolation[]
  >([]);
  const [employmentHistory, setEmploymentHistory] = useState<
    EmploymentHistory[]
  >([]);
  const [employmentGaps, setEmploymentGaps] = useState<EmploymentGap[]>([]);
  const [safetyQuestions, setSafetyQuestions] =
    useState<SafetyQuestions | null>(null);

  useEffect(() => {
    loadFormData();
  }, [applicationId]);

  const loadFormData = async () => {
    try {
      setLoading(true);

      // Load main form data
      const { data: form, error: formError } = await supabase
        .from("driver_application_forms")
        .select("*")
        .eq("application_id", applicationId)
        .single();

      if (formError) {
        if (formError.code === "PGRST116") {
          // No form found
          setFormData(null);
          setLoading(false);
          return;
        }
        throw formError;
      }

      setFormData(form);

      if (!form?.id) {
        setLoading(false);
        return;
      }

      // Load related data in parallel
      const [
        { data: experience },
        { data: accidents },
        { data: violations },
        { data: employment },
        { data: gaps },
        { data: safety },
      ] = await Promise.all([
        supabase.from("driver_experience").select("*").eq("form_id", form.id),
        supabase
          .from("driver_accident_history")
          .select("*")
          .eq("form_id", form.id),
        supabase
          .from("driver_traffic_violations")
          .select("*")
          .eq("form_id", form.id),
        supabase
          .from("driver_employment_history")
          .select("*")
          .eq("form_id", form.id),
        supabase
          .from("driver_employment_gaps")
          .select("*")
          .eq("form_id", form.id),
        supabase
          .from("driver_safety_questions")
          .select("*")
          .eq("form_id", form.id)
          .single(),
      ]);

      setDriverExperience(experience || []);
      setAccidentHistory(accidents || []);
      setTrafficViolations(violations || []);
      setEmploymentHistory(employment || []);
      setEmploymentGaps(gaps || []);
      setSafetyQuestions(safety || null);
    } catch (error: any) {
      console.error("Error loading form data:", error);
      toast({
        title: "Error",
        description: "Failed to load application form data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          No application form submitted yet
        </p>
      </div>
    );
  }

  const fullName = [
    formData.first_name,
    formData.middle_name,
    formData.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      {/* Form Status */}
      <Card
        className={`p-4 ${
          formData.status === "REJECTED"
            ? "bg-red-50 dark:bg-red-900/20 border-red-200"
            : "bg-muted/50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Form Status</p>
            <p className="font-medium">
              {formData.status === "SUBMITTED" && "✅ Submitted"}
              {formData.status === "DRAFT" && "📝 Draft"}
              {formData.status === "REJECTED" && "❌ Disapproved"}
              {formData.status === "APPROVED" && "✅ Approved"}
            </p>
          </div>
          {formData.submitted_at && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="font-medium">
                {format(
                  new Date(formData.submitted_at),
                  "MMM d, yyyy 'at' h:mm a"
                )}
              </p>
            </div>
          )}
        </div>
        {formData.status === "REJECTED" && formData.rejection_reason && (
          <div className="mt-4 pt-4 border-t border-red-200">
            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
              Reason for Disapproval:
            </p>
            <p className="text-sm text-red-800 dark:text-red-200">
              {formData.rejection_reason}
            </p>
            {formData.rejected_at && (
              <p className="text-xs text-red-600 dark:text-red-300 mt-2">
                Disapproved on{" "}
                {format(
                  new Date(formData.rejected_at),
                  "MMM d, yyyy 'at' h:mm a"
                )}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Applicant Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5" />
          Applicant Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Full Name</p>
            <p className="font-medium">{fullName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date of Birth</p>
            <p className="font-medium">
              {formData.date_of_birth
                ? format(new Date(formData.date_of_birth), "MMM d, yyyy")
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {formData.phone_number || "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Address</p>
            <p className="font-medium">{formData.current_address || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Years at Current Address
            </p>
            <p className="font-medium">
              {formData.years_at_current_address || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Legally Authorized to Work
            </p>
            <p className="font-medium">
              {formData.legally_authorized_to_work ? "Yes" : "No"}
            </p>
          </div>
        </div>

        {formData.previous_address_1 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Previous Addresses
            </p>
            <p className="text-sm">{formData.previous_address_1}</p>
            {formData.previous_address_2 && (
              <p className="text-sm mt-1">{formData.previous_address_2}</p>
            )}
          </div>
        )}
      </Card>

      {/* Emergency Contact */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Emergency Contact
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">
              {formData.emergency_contact_name || "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Relation</p>
            <p className="font-medium">
              {formData.emergency_contact_relation || "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">
              {formData.emergency_contact_phone || "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="font-medium">
              {formData.emergency_contact_address || "-"}
            </p>
          </div>
        </div>
      </Card>

      {/* Driver License */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Driver License Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">License Number</p>
            <p className="font-medium">{formData.dl_number || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">State</p>
            <p className="font-medium">{formData.dl_state || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="font-medium">{formData.dl_type || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expiration Date</p>
            <p className="font-medium">
              {formData.dl_expiration_date
                ? format(new Date(formData.dl_expiration_date), "MMM d, yyyy")
                : "-"}
            </p>
          </div>
        </div>
      </Card>

      {/* Driver Experience */}
      {driverExperience.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Driver Experience
          </h3>
          <div className="space-y-4">
            {driverExperience.map((exp, index) => (
              <div key={index} className="p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Equipment Type
                    </p>
                    <p className="font-medium">{exp.equipment_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Approximate Miles
                    </p>
                    <p className="font-medium">
                      {exp.approx_miles.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="font-medium">
                      {format(new Date(exp.from_date), "MMM yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">To</p>
                    <p className="font-medium">
                      {format(new Date(exp.to_date), "MMM yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Safety Questions */}
      {safetyQuestions && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Safety Questions
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">
                Ever been denied a license, permit, or privilege to operate a
                motor vehicle?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {safetyQuestions.denied_license ? "Yes" : "No"}
              </p>
              {safetyQuestions.denied_license &&
                safetyQuestions.denied_license_details && (
                  <p className="text-sm mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    {safetyQuestions.denied_license_details}
                  </p>
                )}
            </div>
            <div>
              <p className="text-sm font-medium">
                Ever had a license, permit, or privilege suspended or revoked?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {safetyQuestions.license_suspended ? "Yes" : "No"}
              </p>
              {safetyQuestions.license_suspended &&
                safetyQuestions.license_suspended_details && (
                  <p className="text-sm mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    {safetyQuestions.license_suspended_details}
                  </p>
                )}
            </div>
            <div>
              <p className="text-sm font-medium">
                Ever been convicted of a felony involving a CMV?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {safetyQuestions.convicted_cmv_crime ? "Yes" : "No"}
              </p>
              {safetyQuestions.convicted_cmv_crime &&
                safetyQuestions.convicted_cmv_crime_details && (
                  <p className="text-sm mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    {safetyQuestions.convicted_cmv_crime_details}
                  </p>
                )}
            </div>
            <div>
              <p className="text-sm font-medium">
                Ever been convicted of a law violation (other than parking)?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {safetyQuestions.convicted_law_violation ? "Yes" : "No"}
              </p>
              {safetyQuestions.convicted_law_violation &&
                safetyQuestions.convicted_law_violation_details && (
                  <p className="text-sm mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    {safetyQuestions.convicted_law_violation_details}
                  </p>
                )}
            </div>
          </div>
        </Card>
      )}

      {/* Accident History */}
      {accidentHistory.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Accident History</h3>
          <div className="space-y-4">
            {accidentHistory.map((accident, index) => (
              <div key={index} className="p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {format(new Date(accident.accident_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Injuries / Fatalities
                    </p>
                    <p className="font-medium">
                      {accident.injuries} / {accident.fatalities}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm mt-1">{accident.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Traffic Violations */}
      {trafficViolations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Traffic Violations</h3>
          <div className="space-y-4">
            {trafficViolations.map((violation, index) => (
              <div key={index} className="p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {format(
                        new Date(violation.violation_date),
                        "MMM d, yyyy"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{violation.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Charge</p>
                    <p className="font-medium">{violation.charge}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Penalty</p>
                    <p className="font-medium">{violation.penalty}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Employment History */}
      {employmentHistory.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employment History
          </h3>
          <div className="space-y-4">
            {employmentHistory.map((emp, index) => (
              <div key={index} className="p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Employer</p>
                    <p className="font-medium">{emp.employer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="font-medium">{emp.position}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="text-sm">{emp.employer_address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-sm">{emp.employer_phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="font-medium">
                      {format(new Date(emp.from_date), "MMM yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">To</p>
                    <p className="font-medium">
                      {format(new Date(emp.to_date), "MMM yyyy")}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">
                      Reason for Leaving
                    </p>
                    <p className="text-sm mt-1">{emp.reason_for_leaving}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Subject to FMCSRs
                    </p>
                    <p className="text-sm">
                      {emp.subject_to_fmcsrs ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Subject to Drug Testing
                    </p>
                    <p className="text-sm">
                      {emp.subject_to_drug_testing ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {formData.no_previous_dot_employment && (
        <Card className="p-4 bg-muted/50">
          <p className="text-sm">
            ℹ️ Applicant indicated no previous DOT employment
          </p>
        </Card>
      )}

      {/* Employment Gaps */}
      {employmentGaps.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Employment Gaps</h3>
          <div className="space-y-4">
            {employmentGaps.map((gap, index) => (
              <div key={index} className="p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="font-medium">
                      {format(new Date(gap.from_date), "MMM yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">To</p>
                    <p className="font-medium">
                      {format(new Date(gap.to_date), "MMM yyyy")}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Activity</p>
                    <p className="text-sm mt-1">{gap.activity_description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Was Unemployed
                    </p>
                    <p className="text-sm">
                      {gap.was_unemployed ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Signatures */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Applicant Declarations</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Signature</p>
            <p className="font-medium italic">
              {formData.applicant_signature || "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Printed Name</p>
            <p className="font-medium">
              {formData.applicant_print_name || "-"}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">FCRA Disclosure</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Signature</p>
            <p className="font-medium italic">
              {formData.fcra_signature || "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Printed Name</p>
            <p className="font-medium">{formData.fcra_print_name || "-"}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

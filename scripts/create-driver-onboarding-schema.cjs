const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createDriverOnboardingSchema() {
  try {
    console.log("Creating driver onboarding schema...\n");

    const sql = `
      -- =====================================================
      -- 1. Create driver_candidates table
      -- =====================================================
      CREATE TABLE IF NOT EXISTS driver_candidates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        phone text NOT NULL,
        email text,
        zip_code text,
        source text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_candidates_phone ON driver_candidates(phone);
      CREATE INDEX IF NOT EXISTS idx_driver_candidates_email ON driver_candidates(email);

      -- =====================================================
      -- 2. Create driver_applications table
      -- =====================================================
      CREATE TABLE IF NOT EXISTS driver_applications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_id uuid NOT NULL REFERENCES driver_candidates(id) ON DELETE CASCADE,
        yard_id uuid REFERENCES yards(id),
        position_type text,
        status text NOT NULL DEFAULT 'NEW' CHECK (status IN (
          'NEW', 'CONTACTED', 'REJECTED', 'DOCS_PENDING', 'DOCS_VERIFIED',
          'MVR_PENDING', 'MVR_PASSED', 'MVR_FAILED', 'DRUG_TEST_ORDERED',
          'DRUG_TEST_PENDING', 'DRUG_TEST_PASSED', 'DRUG_TEST_FAILED',
          'DRUG_TEST_NO_SHOW', 'DRUG_TEST_EXPIRED', 'CLEARED_FOR_HIRE',
          'ORIENTATION_SCHEDULED', 'ORIENTATION_COMPLETED', 'TRAINING_IN_PROGRESS',
          'TRAINING_COMPLETED', 'HIRED'
        )),
        recruiter_id uuid,
        notes text,
        initial_verification_call_at timestamptz,
        initial_verification_notes text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_applications_candidate_id ON driver_applications(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_driver_applications_yard_id ON driver_applications(yard_id);
      CREATE INDEX IF NOT EXISTS idx_driver_applications_status ON driver_applications(status);
      CREATE INDEX IF NOT EXISTS idx_driver_applications_recruiter_id ON driver_applications(recruiter_id);

      -- =====================================================
      -- 3. Create driver_compliance table
      -- =====================================================
      CREATE TABLE IF NOT EXISTS driver_compliance (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id uuid NOT NULL REFERENCES driver_applications(id) ON DELETE CASCADE,
        
        -- Documents
        dl_verified boolean DEFAULT false,
        medical_card_verified boolean DEFAULT false,
        ssn_verified boolean DEFAULT false,
        dl_file_url text,
        medical_card_file_url text,
        ssn_file_url text,
        documents_verified_at timestamptz,
        
        -- MVR
        mvr_status text CHECK (mvr_status IN ('NOT_STARTED', 'REQUESTED', 'COMPLETED')),
        mvr_summary text,
        mvr_eligible boolean,
        mvr_completed_at timestamptz,
        
        -- Drug Test
        drug_test_provider text,
        drug_test_site text,
        drug_test_scheduled_date timestamptz,
        drug_test_ordered_at timestamptz,
        drug_test_expires_at timestamptz,
        drug_test_status text CHECK (drug_test_status IN ('NOT_STARTED', 'ORDERED', 'SCHEDULED', 'COMPLETED')),
        drug_test_result text CHECK (drug_test_result IN ('NEGATIVE', 'POSITIVE', 'NO_SHOW', 'EXPIRED')),
        drug_test_completed_at timestamptz,
        
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_compliance_application_id ON driver_compliance(application_id);

      -- =====================================================
      -- 4. Create driver_onboarding table
      -- =====================================================
      CREATE TABLE IF NOT EXISTS driver_onboarding (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id uuid NOT NULL REFERENCES driver_applications(id) ON DELETE CASCADE,
        
        -- Orientation
        supervisor_id uuid,
        orientation_scheduled_at timestamptz,
        orientation_completed_at timestamptz,
        orientation_notes text,
        
        -- Training
        mentor_id uuid,
        training_scheduled_start timestamptz,
        training_scheduled_end timestamptz,
        training_actual_start_at timestamptz,
        training_actual_end_at timestamptz,
        training_evaluation_rating integer CHECK (training_evaluation_rating >= 1 AND training_evaluation_rating <= 5),
        training_evaluation_notes text,
        
        -- Final Hire
        hired_at timestamptz,
        hired_by_user_id uuid,
        
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_onboarding_application_id ON driver_onboarding(application_id);
      CREATE INDEX IF NOT EXISTS idx_driver_onboarding_supervisor_id ON driver_onboarding(supervisor_id);
      CREATE INDEX IF NOT EXISTS idx_driver_onboarding_mentor_id ON driver_onboarding(mentor_id);
    `;

    console.log("Executing SQL...");
    const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      console.error("Error creating schema:", error);
      throw error;
    }

    console.log("✅ Driver onboarding schema created successfully!\n");
  } catch (error) {
    console.error("Failed to create driver onboarding schema:", error);
    process.exit(1);
  }
}

createDriverOnboardingSchema();

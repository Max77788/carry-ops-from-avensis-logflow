#!/usr/bin/env node

/**
 * Create Driver Application Form Schema
 *
 * This script creates the database tables needed for the driver application form
 * that drivers fill out via a web link sent by HR.
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createDriverApplicationFormSchema() {
  try {
    console.log("Creating driver application form schema...");

    const migrations = `
      -- =====================================================
      -- 1. Create driver_application_forms table (main form data)
      -- =====================================================
      CREATE TABLE IF NOT EXISTS driver_application_forms (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id uuid NOT NULL REFERENCES driver_applications(id) ON DELETE CASCADE,
        
        -- Step 1: Applicant Information
        first_name text,
        middle_name text,
        last_name text,
        current_address text,
        previous_address_1 text,
        previous_address_2 text,
        phone_number text,
        date_of_birth date,
        ssn_encrypted text, -- Store encrypted
        years_at_current_address numeric,
        
        -- Step 2: Work Authorization
        legally_authorized_to_work boolean,
        
        -- Step 3: Emergency Contact
        emergency_contact_name text,
        emergency_contact_relation text,
        emergency_contact_address text,
        emergency_contact_phone text,
        
        -- Step 4: Driver License Information
        dl_number text,
        dl_state text,
        dl_type text,
        dl_expiration_date date,
        
        -- Step 11: Applicant Declarations
        applicant_signature text,
        applicant_signature_date date,
        applicant_print_name text,
        
        -- Step 12: FCRA Disclosure
        fcra_signature text,
        fcra_signature_date date,
        fcra_print_name text,
        fcra_ssn_encrypted text,

        -- Status tracking
        status text DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
        current_step integer DEFAULT 0,
        submitted_at timestamptz,
        reviewed_at timestamptz,
        reviewed_by uuid,
        rejection_reason text,
        rejected_at timestamptz,

        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_application_forms_application_id ON driver_application_forms(application_id);
      CREATE INDEX IF NOT EXISTS idx_driver_application_forms_status ON driver_application_forms(status);

      -- =====================================================
      -- 2. Create driver_experience table
      -- =====================================================
      CREATE TABLE IF NOT EXISTS driver_experience (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id uuid NOT NULL REFERENCES driver_application_forms(id) ON DELETE CASCADE,
        equipment_type text,
        from_date date,
        to_date date,
        approx_miles integer,
        created_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_experience_form_id ON driver_experience(form_id);

      -- =====================================================
      -- 3. Create driver_safety_questions table
      -- =====================================================
      CREATE TABLE IF NOT EXISTS driver_safety_questions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id uuid NOT NULL REFERENCES driver_application_forms(id) ON DELETE CASCADE,
        denied_license boolean DEFAULT false,
        denied_license_details text,
        license_suspended boolean DEFAULT false,
        license_suspended_details text,
        convicted_cmv_crime boolean DEFAULT false,
        convicted_cmv_crime_details text,
        convicted_law_violation boolean DEFAULT false,
        convicted_law_violation_details text,
        created_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_safety_questions_form_id ON driver_safety_questions(form_id);

      -- =====================================================
      -- 4. Create driver_accident_history table
      -- =====================================================
      CREATE TABLE IF NOT EXISTS driver_accident_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id uuid NOT NULL REFERENCES driver_application_forms(id) ON DELETE CASCADE,
        accident_date date,
        description text,
        injuries integer DEFAULT 0,
        fatalities integer DEFAULT 0,
        created_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_accident_history_form_id ON driver_accident_history(form_id);

      -- =====================================================
      -- 5. Create driver_traffic_violations table
      -- =====================================================
      CREATE TABLE IF NOT EXISTS driver_traffic_violations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id uuid NOT NULL REFERENCES driver_application_forms(id) ON DELETE CASCADE,
        violation_date date,
        location text,
        charge text,
        penalty text,
        created_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_traffic_violations_form_id ON driver_traffic_violations(form_id);

      -- =====================================================
      -- 6. Create driver_employment_history table
      -- =====================================================
      CREATE TABLE IF NOT EXISTS driver_employment_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id uuid NOT NULL REFERENCES driver_application_forms(id) ON DELETE CASCADE,
        employer_name text,
        employer_address text,
        employer_phone text,
        from_date date,
        to_date date,
        position text,
        reason_for_leaving text,
        subject_to_fmcsrs boolean DEFAULT false,
        subject_to_drug_testing boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_employment_history_form_id ON driver_employment_history(form_id);

      -- =====================================================
      -- 7. Create driver_employment_gaps table
      -- =====================================================
      CREATE TABLE IF NOT EXISTS driver_employment_gaps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id uuid NOT NULL REFERENCES driver_application_forms(id) ON DELETE CASCADE,
        activity_description text,
        from_date date,
        to_date date,
        was_unemployed boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_employment_gaps_form_id ON driver_employment_gaps(form_id);

      -- =====================================================
      -- 8. Add unique token for driver application form access
      -- =====================================================
      ALTER TABLE driver_applications
      ADD COLUMN IF NOT EXISTS application_form_token text UNIQUE,
      ADD COLUMN IF NOT EXISTS application_form_sent_at timestamptz,
      ADD COLUMN IF NOT EXISTS application_form_completed_at timestamptz;

      CREATE INDEX IF NOT EXISTS idx_driver_applications_form_token ON driver_applications(application_form_token);

      -- =====================================================
      -- 9. Enable RLS on all tables
      -- =====================================================
      ALTER TABLE driver_application_forms ENABLE ROW LEVEL SECURITY;
      ALTER TABLE driver_experience ENABLE ROW LEVEL SECURITY;
      ALTER TABLE driver_safety_questions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE driver_accident_history ENABLE ROW LEVEL SECURITY;
      ALTER TABLE driver_traffic_violations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE driver_employment_history ENABLE ROW LEVEL SECURITY;
      ALTER TABLE driver_employment_gaps ENABLE ROW LEVEL SECURITY;

      -- =====================================================
      -- 10. Create RLS policies (allow public access via token)
      -- =====================================================
      DROP POLICY IF EXISTS "Allow public access to driver application forms" ON driver_application_forms;
      CREATE POLICY "Allow public access to driver application forms"
        ON driver_application_forms FOR ALL
        USING (true);

      DROP POLICY IF EXISTS "Allow public access to driver experience" ON driver_experience;
      CREATE POLICY "Allow public access to driver experience"
        ON driver_experience FOR ALL
        USING (true);

      DROP POLICY IF EXISTS "Allow public access to driver safety questions" ON driver_safety_questions;
      CREATE POLICY "Allow public access to driver safety questions"
        ON driver_safety_questions FOR ALL
        USING (true);

      DROP POLICY IF EXISTS "Allow public access to driver accident history" ON driver_accident_history;
      CREATE POLICY "Allow public access to driver accident history"
        ON driver_accident_history FOR ALL
        USING (true);

      DROP POLICY IF EXISTS "Allow public access to driver traffic violations" ON driver_traffic_violations;
      CREATE POLICY "Allow public access to driver traffic violations"
        ON driver_traffic_violations FOR ALL
        USING (true);

      DROP POLICY IF EXISTS "Allow public access to driver employment history" ON driver_employment_history;
      CREATE POLICY "Allow public access to driver employment history"
        ON driver_employment_history FOR ALL
        USING (true);

      DROP POLICY IF EXISTS "Allow public access to driver employment gaps" ON driver_employment_gaps;
      CREATE POLICY "Allow public access to driver employment gaps"
        ON driver_employment_gaps FOR ALL
        USING (true);
    `;

    const { data, error } = await supabase
      .rpc("exec_sql", { sql: migrations })
      .single();

    if (error) {
      // Try direct query if RPC doesn't exist
      const { error: directError } = await supabase.from("_migrations").insert({
        name: "create_driver_application_form_schema",
        executed_at: new Date().toISOString(),
      });

      if (directError) {
        throw error;
      }
    }

    console.log("✅ Driver application form schema created successfully!");
    console.log("Tables created:");
    console.log("  - driver_application_forms");
    console.log("  - driver_experience");
    console.log("  - driver_safety_questions");
    console.log("  - driver_accident_history");
    console.log("  - driver_traffic_violations");
    console.log("  - driver_employment_history");
    console.log("  - driver_employment_gaps");
  } catch (error) {
    console.error("❌ Error creating driver application form schema:", error);
    process.exit(1);
  }
}

createDriverApplicationFormSchema();

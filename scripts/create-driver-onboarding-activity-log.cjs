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

async function createActivityLogAndTriggers() {
  try {
    console.log("Creating activity log table and triggers...\n");

    const sql = `
      -- =====================================================
      -- 1. Create driver_application_activity table
      -- =====================================================
      CREATE TABLE IF NOT EXISTS driver_application_activity (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id uuid NOT NULL REFERENCES driver_applications(id) ON DELETE CASCADE,
        event_type text NOT NULL,
        event_description text NOT NULL,
        user_id uuid,
        metadata jsonb,
        created_at timestamptz DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_driver_application_activity_application_id 
        ON driver_application_activity(application_id);
      CREATE INDEX IF NOT EXISTS idx_driver_application_activity_created_at 
        ON driver_application_activity(created_at DESC);

      -- =====================================================
      -- 2. Create updated_at triggers
      -- =====================================================
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_driver_candidates_updated_at ON driver_candidates;
      CREATE TRIGGER update_driver_candidates_updated_at
        BEFORE UPDATE ON driver_candidates
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_driver_applications_updated_at ON driver_applications;
      CREATE TRIGGER update_driver_applications_updated_at
        BEFORE UPDATE ON driver_applications
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_driver_compliance_updated_at ON driver_compliance;
      CREATE TRIGGER update_driver_compliance_updated_at
        BEFORE UPDATE ON driver_compliance
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_driver_onboarding_updated_at ON driver_onboarding;
      CREATE TRIGGER update_driver_onboarding_updated_at
        BEFORE UPDATE ON driver_onboarding
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- =====================================================
      -- 3. Create activity logging trigger
      -- =====================================================
      CREATE OR REPLACE FUNCTION log_application_status_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
          INSERT INTO driver_application_activity (
            application_id,
            event_type,
            event_description,
            metadata
          ) VALUES (
            NEW.id,
            'STATUS_CHANGE',
            'Status changed from ' || COALESCE(OLD.status, 'NULL') || ' to ' || NEW.status,
            jsonb_build_object(
              'old_status', OLD.status,
              'new_status', NEW.status
            )
          );
        END IF;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS log_driver_application_status_change ON driver_applications;
      CREATE TRIGGER log_driver_application_status_change
        AFTER UPDATE ON driver_applications
        FOR EACH ROW
        EXECUTE FUNCTION log_application_status_change();

      -- =====================================================
      -- 4. Modify drivers table to add onboarding references
      -- =====================================================
      ALTER TABLE drivers 
        ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES driver_candidates(id),
        ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES driver_applications(id);

      CREATE INDEX IF NOT EXISTS idx_drivers_candidate_id ON drivers(candidate_id);
      CREATE INDEX IF NOT EXISTS idx_drivers_application_id ON drivers(application_id);

      -- =====================================================
      -- 5. Enable RLS on new tables
      -- =====================================================
      ALTER TABLE driver_candidates ENABLE ROW LEVEL SECURITY;
      ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;
      ALTER TABLE driver_compliance ENABLE ROW LEVEL SECURITY;
      ALTER TABLE driver_onboarding ENABLE ROW LEVEL SECURITY;
      ALTER TABLE driver_application_activity ENABLE ROW LEVEL SECURITY;

      -- =====================================================
      -- 6. Create basic RLS policies (allow all for v1)
      -- =====================================================
      DROP POLICY IF EXISTS "Allow public read access to driver_candidates" ON driver_candidates;
      CREATE POLICY "Allow public read access to driver_candidates"
        ON driver_candidates FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Allow authenticated users to insert driver_candidates" ON driver_candidates;
      CREATE POLICY "Allow authenticated users to insert driver_candidates"
        ON driver_candidates FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow authenticated users to update driver_candidates" ON driver_candidates;
      CREATE POLICY "Allow authenticated users to update driver_candidates"
        ON driver_candidates FOR UPDATE USING (true);

      DROP POLICY IF EXISTS "Allow public read access to driver_applications" ON driver_applications;
      CREATE POLICY "Allow public read access to driver_applications"
        ON driver_applications FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Allow authenticated users to insert driver_applications" ON driver_applications;
      CREATE POLICY "Allow authenticated users to insert driver_applications"
        ON driver_applications FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow authenticated users to update driver_applications" ON driver_applications;
      CREATE POLICY "Allow authenticated users to update driver_applications"
        ON driver_applications FOR UPDATE USING (true);

      DROP POLICY IF EXISTS "Allow public read access to driver_compliance" ON driver_compliance;
      CREATE POLICY "Allow public read access to driver_compliance"
        ON driver_compliance FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Allow authenticated users to insert driver_compliance" ON driver_compliance;
      CREATE POLICY "Allow authenticated users to insert driver_compliance"
        ON driver_compliance FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow authenticated users to update driver_compliance" ON driver_compliance;
      CREATE POLICY "Allow authenticated users to update driver_compliance"
        ON driver_compliance FOR UPDATE USING (true);

      DROP POLICY IF EXISTS "Allow public read access to driver_onboarding" ON driver_onboarding;
      CREATE POLICY "Allow public read access to driver_onboarding"
        ON driver_onboarding FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Allow authenticated users to insert driver_onboarding" ON driver_onboarding;
      CREATE POLICY "Allow authenticated users to insert driver_onboarding"
        ON driver_onboarding FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow authenticated users to update driver_onboarding" ON driver_onboarding;
      CREATE POLICY "Allow authenticated users to update driver_onboarding"
        ON driver_onboarding FOR UPDATE USING (true);

      DROP POLICY IF EXISTS "Allow public read access to driver_application_activity" ON driver_application_activity;
      CREATE POLICY "Allow public read access to driver_application_activity"
        ON driver_application_activity FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Allow authenticated users to insert driver_application_activity" ON driver_application_activity;
      CREATE POLICY "Allow authenticated users to insert driver_application_activity"
        ON driver_application_activity FOR INSERT WITH CHECK (true);
    `;

    console.log("Executing SQL...");
    const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      console.error("Error creating activity log and triggers:", error);
      throw error;
    }

    console.log("✅ Activity log and triggers created successfully!\n");
  } catch (error) {
    console.error("Failed to create activity log and triggers:", error);
    process.exit(1);
  }
}

createActivityLogAndTriggers();

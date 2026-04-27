const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSupervisorNameColumn() {
  try {
    const sql = `
      -- Add supervisor_name column to driver_onboarding table
      ALTER TABLE driver_onboarding
      ADD COLUMN IF NOT EXISTS supervisor_name text;

      -- Update the rpc_schedule_orientation function to accept supervisor_name
      CREATE OR REPLACE FUNCTION rpc_schedule_orientation(
        p_application_id uuid,
        p_supervisor_id uuid DEFAULT NULL,
        p_supervisor_name text DEFAULT NULL,
        p_scheduled_at timestamptz,
        p_user_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      BEGIN
        UPDATE driver_onboarding
        SET 
          supervisor_id = p_supervisor_id,
          supervisor_name = p_supervisor_name,
          orientation_scheduled_at = p_scheduled_at
        WHERE application_id = p_application_id;

        UPDATE driver_applications
        SET status = 'ORIENTATION_SCHEDULED'
        WHERE id = p_application_id;

        PERFORM rpc_log_application_activity(
          p_application_id, 
          'ORIENTATION_SCHEDULED', 
          'Orientation scheduled for ' || p_scheduled_at::text,
          p_user_id
        );

        RETURN jsonb_build_object('success', true);
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log("Attempting direct SQL execution...");
      const { error: directError } = await supabase.from("_sql").insert({ query: sql });
      
      if (directError) {
        throw new Error(`Failed to execute SQL: ${directError.message}`);
      }
    }

    console.log("✅ Successfully added supervisor_name column and updated function");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

addSupervisorNameColumn();


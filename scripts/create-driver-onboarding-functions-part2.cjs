const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createDriverOnboardingFunctionsPart2() {
  try {
    console.log('Creating driver onboarding RPC functions (Part 2)...\n');

    const sql = `
      -- =====================================================
      -- 9. Function to schedule orientation
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_schedule_orientation(
        p_application_id uuid,
        p_supervisor_id uuid,
        p_scheduled_at timestamptz,
        p_user_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      BEGIN
        UPDATE driver_onboarding
        SET 
          supervisor_id = p_supervisor_id,
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

      -- =====================================================
      -- 10. Function to complete orientation
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_complete_orientation(
        p_application_id uuid,
        p_notes text DEFAULT NULL,
        p_user_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      BEGIN
        UPDATE driver_onboarding
        SET 
          orientation_completed_at = now(),
          orientation_notes = p_notes
        WHERE application_id = p_application_id;

        UPDATE driver_applications
        SET status = 'ORIENTATION_COMPLETED'
        WHERE id = p_application_id;

        PERFORM rpc_log_application_activity(
          p_application_id, 
          'ORIENTATION_COMPLETED', 
          'Orientation completed',
          p_user_id
        );

        RETURN jsonb_build_object('success', true);
      END;
      $$ LANGUAGE plpgsql;

      -- =====================================================
      -- 11. Function to schedule training
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_schedule_training(
        p_application_id uuid,
        p_mentor_id uuid,
        p_scheduled_start timestamptz,
        p_scheduled_end timestamptz,
        p_user_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      BEGIN
        UPDATE driver_onboarding
        SET 
          mentor_id = p_mentor_id,
          training_scheduled_start = p_scheduled_start,
          training_scheduled_end = p_scheduled_end
        WHERE application_id = p_application_id;

        UPDATE driver_applications
        SET status = 'TRAINING_IN_PROGRESS'
        WHERE id = p_application_id;

        PERFORM rpc_log_application_activity(
          p_application_id, 
          'TRAINING_SCHEDULED', 
          'Training scheduled from ' || p_scheduled_start::text || ' to ' || p_scheduled_end::text,
          p_user_id
        );

        RETURN jsonb_build_object('success', true);
      END;
      $$ LANGUAGE plpgsql;

      -- =====================================================
      -- 12. Function to complete training
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_complete_training(
        p_application_id uuid,
        p_rating integer,
        p_notes text DEFAULT NULL,
        p_user_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      BEGIN
        UPDATE driver_onboarding
        SET 
          training_actual_start_at = COALESCE(training_actual_start_at, training_scheduled_start),
          training_actual_end_at = now(),
          training_evaluation_rating = p_rating,
          training_evaluation_notes = p_notes
        WHERE application_id = p_application_id;

        UPDATE driver_applications
        SET status = 'TRAINING_COMPLETED'
        WHERE id = p_application_id;

        PERFORM rpc_log_application_activity(
          p_application_id, 
          'TRAINING_COMPLETED', 
          'Training completed with rating: ' || p_rating::text,
          p_user_id
        );

        RETURN jsonb_build_object('success', true);
      END;
      $$ LANGUAGE plpgsql;

      -- =====================================================
      -- 13. Function to approve and hire
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_approve_and_hire(
        p_application_id uuid,
        p_user_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      BEGIN
        UPDATE driver_onboarding
        SET 
          hired_at = now(),
          hired_by_user_id = p_user_id
        WHERE application_id = p_application_id;

        UPDATE driver_applications
        SET status = 'HIRED'
        WHERE id = p_application_id;

        PERFORM rpc_log_application_activity(
          p_application_id, 
          'HIRED', 
          'Candidate approved and hired',
          p_user_id
        );

        RETURN jsonb_build_object('success', true);
      END;
      $$ LANGUAGE plpgsql;
    `;

    console.log('Executing SQL...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error creating functions (Part 2):', error);
      throw error;
    }

    console.log('✅ Driver onboarding RPC functions (Part 2) created successfully!\n');
    
  } catch (error) {
    console.error('Failed to create driver onboarding functions (Part 2):', error);
    process.exit(1);
  }
}

createDriverOnboardingFunctionsPart2();


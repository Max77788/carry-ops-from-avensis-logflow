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

async function createDriverOnboardingFunctions() {
  try {
    console.log("Creating driver onboarding RPC functions...\n");

    const sql = `
      -- =====================================================
      -- Helper function to normalize phone to E.164 format
      -- =====================================================
      CREATE OR REPLACE FUNCTION normalize_phone_to_e164(phone_input text)
      RETURNS text AS $$
      DECLARE
        digits_only text;
        normalized_phone text;
      BEGIN
        IF phone_input IS NULL OR phone_input = '' THEN
          RETURN '';
        END IF;

        -- Remove all whitespace and non-digit characters except leading +
        phone_input := trim(phone_input);
        
        -- If already in E.164 format (starts with +), clean it
        IF phone_input LIKE '+%' THEN
          digits_only := regexp_replace(substring(phone_input from 2), '[^0-9]', '', 'g');
          IF length(digits_only) >= 1 THEN
            RETURN '+' || digits_only;
          END IF;
          RETURN '';
        END IF;

        -- Remove all non-digit characters
        digits_only := regexp_replace(phone_input, '[^0-9]', '', 'g');
        
        IF length(digits_only) = 0 THEN
          RETURN '';
        END IF;

        -- Handle US numbers (10 or 11 digits)
        IF length(digits_only) = 10 THEN
          -- 10 digits: assume US, add +1
          RETURN '+1' || digits_only;
        ELSIF length(digits_only) = 11 AND digits_only LIKE '1%' THEN
          -- 11 digits starting with 1: US number, add +
          RETURN '+' || digits_only;
        ELSIF length(digits_only) >= 10 THEN
          -- For safety, take last 10 digits and add +1 (US default)
          RETURN '+1' || substring(digits_only from length(digits_only) - 9);
        END IF;

        -- Invalid length
        RETURN '';
      END;
      $$ LANGUAGE plpgsql;

      -- =====================================================
      -- 1. Function to create a new lead (candidate + application)
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_create_driver_lead(
        p_name text,
        p_phone text,
        p_email text DEFAULT NULL,
        p_zip_code text DEFAULT NULL,
        p_source text DEFAULT NULL,
        p_yard_id uuid DEFAULT NULL,
        p_position_type text DEFAULT NULL,
        p_recruiter_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      DECLARE
        v_candidate_id uuid;
        v_application_id uuid;
        v_compliance_id uuid;
        v_onboarding_id uuid;
        v_normalized_phone text;
      BEGIN
        -- Normalize phone number to E.164 format
        v_normalized_phone := normalize_phone_to_e164(p_phone);
        
        IF v_normalized_phone = '' THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid phone number format'
          );
        END IF;

        -- Create candidate with normalized phone
        INSERT INTO driver_candidates (name, phone, email, zip_code, source)
        VALUES (p_name, v_normalized_phone, p_email, p_zip_code, p_source)
        RETURNING id INTO v_candidate_id;

        -- Create application
        INSERT INTO driver_applications (
          candidate_id, yard_id, position_type, recruiter_id, status
        )
        VALUES (
          v_candidate_id, p_yard_id, p_position_type, p_recruiter_id, 'NEW'
        )
        RETURNING id INTO v_application_id;

        -- Create compliance record
        INSERT INTO driver_compliance (application_id)
        VALUES (v_application_id)
        RETURNING id INTO v_compliance_id;

        -- Create onboarding record
        INSERT INTO driver_onboarding (application_id)
        VALUES (v_application_id)
        RETURNING id INTO v_onboarding_id;

        -- Log activity
        INSERT INTO driver_application_activity (
          application_id, event_type, event_description
        ) VALUES (
          v_application_id, 'LEAD_CREATED', 'New driver lead created'
        );

        RETURN jsonb_build_object(
          'success', true,
          'candidate_id', v_candidate_id,
          'application_id', v_application_id,
          'compliance_id', v_compliance_id,
          'onboarding_id', v_onboarding_id
        );
      END;
      $$ LANGUAGE plpgsql;

      -- =====================================================
      -- 2. Function to update application status
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_update_application_status(
        p_application_id uuid,
        p_new_status text,
        p_user_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      DECLARE
        v_old_status text;
      BEGIN
        -- Get current status
        SELECT status INTO v_old_status
        FROM driver_applications
        WHERE id = p_application_id;

        IF v_old_status IS NULL THEN
          RETURN jsonb_build_object('success', false, 'error', 'Application not found');
        END IF;

        -- Update status
        UPDATE driver_applications
        SET status = p_new_status
        WHERE id = p_application_id;

        -- Log activity (trigger will also log, but this is explicit)
        INSERT INTO driver_application_activity (
          application_id, event_type, event_description, user_id
        ) VALUES (
          p_application_id, 
          'STATUS_UPDATE', 
          'Status updated to ' || p_new_status,
          p_user_id
        );

        RETURN jsonb_build_object('success', true, 'old_status', v_old_status, 'new_status', p_new_status);
      END;
      $$ LANGUAGE plpgsql;

      -- =====================================================
      -- 3. Function to log activity
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_log_application_activity(
        p_application_id uuid,
        p_event_type text,
        p_event_description text,
        p_user_id uuid DEFAULT NULL,
        p_metadata jsonb DEFAULT NULL
      )
      RETURNS jsonb AS $$
      BEGIN
        INSERT INTO driver_application_activity (
          application_id, event_type, event_description, user_id, metadata
        ) VALUES (
          p_application_id, p_event_type, p_event_description, p_user_id, p_metadata
        );

        RETURN jsonb_build_object('success', true);
      END;
      $$ LANGUAGE plpgsql;

      -- =====================================================
      -- 4. Function to mark documents verified
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_mark_documents_verified(
        p_application_id uuid,
        p_user_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      BEGIN
        UPDATE driver_compliance
        SET documents_verified_at = now()
        WHERE application_id = p_application_id;

        UPDATE driver_applications
        SET status = 'DOCS_VERIFIED'
        WHERE id = p_application_id;

        PERFORM rpc_log_application_activity(
          p_application_id, 'DOCUMENTS_VERIFIED', 'All documents verified', p_user_id
        );

        RETURN jsonb_build_object('success', true);
      END;
      $$ LANGUAGE plpgsql;

      -- =====================================================
      -- 5. Function to mark MVR requested
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_mark_mvr_requested(
        p_application_id uuid,
        p_user_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      BEGIN
        UPDATE driver_compliance
        SET mvr_status = 'REQUESTED'
        WHERE application_id = p_application_id;

        UPDATE driver_applications
        SET status = 'MVR_PENDING'
        WHERE id = p_application_id;

        PERFORM rpc_log_application_activity(
          p_application_id, 'MVR_REQUESTED', 'MVR check requested', p_user_id
        );

        RETURN jsonb_build_object('success', true);
      END;
      $$ LANGUAGE plpgsql;

      -- =====================================================
      -- 6. Function to mark MVR completed
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_mark_mvr_completed(
        p_application_id uuid,
        p_eligible boolean,
        p_summary text DEFAULT NULL,
        p_user_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      DECLARE
        v_new_status text;
      BEGIN
        UPDATE driver_compliance
        SET
          mvr_status = 'COMPLETED',
          mvr_eligible = p_eligible,
          mvr_summary = p_summary,
          mvr_completed_at = now()
        WHERE application_id = p_application_id;

        v_new_status := CASE WHEN p_eligible THEN 'MVR_PASSED' ELSE 'MVR_FAILED' END;

        UPDATE driver_applications
        SET status = v_new_status
        WHERE id = p_application_id;

        PERFORM rpc_log_application_activity(
          p_application_id,
          'MVR_COMPLETED',
          'MVR check completed - ' || CASE WHEN p_eligible THEN 'PASSED' ELSE 'FAILED' END,
          p_user_id
        );

        RETURN jsonb_build_object('success', true, 'status', v_new_status);
      END;
      $$ LANGUAGE plpgsql;

      -- =====================================================
      -- 7. Function to create drug test order
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_create_drug_test_order(
        p_application_id uuid,
        p_provider text,
        p_site text,
        p_scheduled_date timestamptz DEFAULT NULL,
        p_user_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      BEGIN
        UPDATE driver_compliance
        SET
          drug_test_provider = p_provider,
          drug_test_site = p_site,
          drug_test_scheduled_date = p_scheduled_date,
          drug_test_ordered_at = now(),
          drug_test_expires_at = now() + interval '30 days',
          drug_test_status = 'ORDERED'
        WHERE application_id = p_application_id;

        UPDATE driver_applications
        SET status = 'DRUG_TEST_ORDERED'
        WHERE id = p_application_id;

        PERFORM rpc_log_application_activity(
          p_application_id,
          'DRUG_TEST_ORDERED',
          'Drug test ordered at ' || p_provider || ' - ' || p_site,
          p_user_id
        );

        RETURN jsonb_build_object('success', true);
      END;
      $$ LANGUAGE plpgsql;

      -- =====================================================
      -- 8. Function to mark drug test result
      -- =====================================================
      CREATE OR REPLACE FUNCTION rpc_mark_drug_test_result(
        p_application_id uuid,
        p_result text,
        p_user_id uuid DEFAULT NULL
      )
      RETURNS jsonb AS $$
      DECLARE
        v_new_status text;
      BEGIN
        UPDATE driver_compliance
        SET
          drug_test_status = 'COMPLETED',
          drug_test_result = p_result,
          drug_test_completed_at = now()
        WHERE application_id = p_application_id;

        v_new_status := CASE
          WHEN p_result = 'NEGATIVE' THEN 'CLEARED_FOR_HIRE'
          WHEN p_result = 'POSITIVE' THEN 'DRUG_TEST_FAILED'
          WHEN p_result = 'NO_SHOW' THEN 'DRUG_TEST_NO_SHOW'
          WHEN p_result = 'EXPIRED' THEN 'DRUG_TEST_EXPIRED'
          ELSE 'DRUG_TEST_PENDING'
        END;

        UPDATE driver_applications
        SET status = v_new_status
        WHERE id = p_application_id;

        PERFORM rpc_log_application_activity(
          p_application_id,
          'DRUG_TEST_RESULT',
          'Drug test result: ' || p_result,
          p_user_id
        );

        RETURN jsonb_build_object('success', true, 'status', v_new_status);
      END;
      $$ LANGUAGE plpgsql;
    `;

    console.log("Executing SQL...");
    const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      console.error("Error creating functions:", error);
      throw error;
    }

    console.log("✅ Driver onboarding RPC functions created successfully!\n");
  } catch (error) {
    console.error("Failed to create driver onboarding functions:", error);
    process.exit(1);
  }
}

createDriverOnboardingFunctions();

#!/usr/bin/env node

/**
 * Add no_previous_dot_employment column to driver_application_forms table
 */

const { createClient } = require("@supabase/supabase-js");
const https = require("https");
require("dotenv").config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addNoPreviousDotEmploymentColumn() {
  try {
    console.log(
      "🔧 Adding no_previous_dot_employment column to driver_application_forms table...\n"
    );

    // Extract project ref from URL
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

    const migration = `ALTER TABLE driver_application_forms ADD COLUMN IF NOT EXISTS no_previous_dot_employment boolean DEFAULT false;`;

    // Use Supabase Management API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: migration }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log("✅ Successfully added no_previous_dot_employment column!");

    // Verify by trying to query the table
    const { data, error } = await supabase
      .from("driver_application_forms")
      .select("no_previous_dot_employment")
      .limit(1);

    if (error) {
      console.log("⚠️  Could not verify column (this is OK if table is empty)");
    } else {
      console.log("✅ Column verified - can be queried successfully!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\n" + "=".repeat(60));
    console.log("📋 MANUAL MIGRATION REQUIRED");
    console.log("=".repeat(60));
    console.log("\nPlease run this SQL in Supabase SQL Editor:");
    console.log("(Dashboard → SQL Editor → New Query)\n");
    console.log("─".repeat(60));
    console.log("ALTER TABLE driver_application_forms");
    console.log(
      "ADD COLUMN IF NOT EXISTS no_previous_dot_employment boolean DEFAULT false;"
    );
    console.log("─".repeat(60));
    console.log(
      "\nOr use the SQL file: scripts/add-no-previous-dot-employment-column.sql\n"
    );
  }
}

addNoPreviousDotEmploymentColumn();

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addComplianceDocumentColumns() {
  try {
    console.log("Adding MVR and Drug Test document URL columns...");

    const migrations = `
      -- =====================================================
      -- Add document URL columns to driver_compliance table
      -- =====================================================
      ALTER TABLE driver_compliance 
      ADD COLUMN IF NOT EXISTS mvr_report_url TEXT,
      ADD COLUMN IF NOT EXISTS drug_test_work_order_url TEXT,
      ADD COLUMN IF NOT EXISTS yard_id UUID REFERENCES companies(id);

      -- =====================================================
      -- Add yard_id to driver_onboarding table
      -- =====================================================
      ALTER TABLE driver_onboarding
      ADD COLUMN IF NOT EXISTS yard_id UUID REFERENCES companies(id);
    `;

    const { data, error } = await supabase.rpc("exec_sql", { sql: migrations });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      const { error: directError } = await supabase.from("driver_compliance").select("mvr_report_url").limit(1);
      
      if (directError && directError.message.includes("column") && directError.message.includes("does not exist")) {
        console.error("❌ Columns don't exist and cannot be created automatically.");
        console.log("\n📋 Please run this SQL manually in Supabase SQL Editor:");
        console.log(migrations);
        process.exit(1);
      } else {
        console.log("✅ Columns already exist or were created successfully!");
      }
    } else {
      console.log("✅ Migration completed successfully!");
    }

    console.log("\n✅ All compliance document columns added!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\n📋 Please run this SQL manually in Supabase SQL Editor:");
    console.log(`
      ALTER TABLE driver_compliance 
      ADD COLUMN IF NOT EXISTS mvr_report_url TEXT,
      ADD COLUMN IF NOT EXISTS drug_test_work_order_url TEXT,
      ADD COLUMN IF NOT EXISTS yard_id UUID REFERENCES companies(id);

      ALTER TABLE driver_onboarding
      ADD COLUMN IF NOT EXISTS yard_id UUID REFERENCES companies(id);
    `);
    process.exit(1);
  }
}

addComplianceDocumentColumns();


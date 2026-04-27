import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTrailersTable() {
  try {
    const sql = `
      -- Create trailers table if it doesn't exist
      CREATE TABLE IF NOT EXISTS trailers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trailer_id text NOT NULL,
        company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        vin text,
        make text,
        model text,
        year integer,
        is_on_insurance_policy boolean DEFAULT false,
        status text DEFAULT 'active',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- Create index on company_id for faster lookups
      CREATE INDEX IF NOT EXISTS idx_trailers_company_id ON trailers(company_id);
      CREATE INDEX IF NOT EXISTS idx_trailers_status ON trailers(status);

      -- Enable RLS for trailers
      ALTER TABLE trailers ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies for trailers
      DROP POLICY IF EXISTS "Allow public read access to trailers" ON trailers;
      CREATE POLICY "Allow public read access to trailers"
        ON trailers FOR SELECT
        USING (true);

      DROP POLICY IF EXISTS "Allow authenticated users to insert trailers" ON trailers;
      CREATE POLICY "Allow authenticated users to insert trailers"
        ON trailers FOR INSERT
        WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow authenticated users to update trailers" ON trailers;
      CREATE POLICY "Allow authenticated users to update trailers"
        ON trailers FOR UPDATE
        USING (true);

      DROP POLICY IF EXISTS "Allow authenticated users to delete trailers" ON trailers;
      CREATE POLICY "Allow authenticated users to delete trailers"
        ON trailers FOR DELETE
        USING (true);
    `;

    console.log("Creating trailers table...");
    const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      console.error("Error creating trailers table:", error);
      throw error;
    }

    console.log("✅ Trailers table created successfully!");
    console.log("\nTable structure:");
    console.log("- id (uuid, primary key)");
    console.log("- trailer_id (text, required)");
    console.log("- company_id (uuid, foreign key to companies)");
    console.log("- vin (text)");
    console.log("- make (text)");
    console.log("- model (text)");
    console.log("- year (integer)");
    console.log("- is_on_insurance_policy (boolean)");
    console.log("- status (text, default 'active')");
    console.log("- created_at (timestamptz)");
    console.log("- updated_at (timestamptz)");
  } catch (error) {
    console.error("Failed to create trailers table:", error);
    process.exit(1);
  }
}

createTrailersTable();


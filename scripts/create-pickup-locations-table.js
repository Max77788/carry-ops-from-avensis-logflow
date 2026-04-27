import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPickupLocationsTable() {
  try {
    console.log("Creating pickup_locations table...");

    const sql = `
      -- Create pickup_locations table if it doesn't exist
      CREATE TABLE IF NOT EXISTS pickup_locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- Enable RLS for pickup_locations
      ALTER TABLE pickup_locations ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies for pickup_locations
      DROP POLICY IF EXISTS "Allow public read access to pickup_locations" ON pickup_locations;
      CREATE POLICY "Allow public read access to pickup_locations"
        ON pickup_locations FOR SELECT
        USING (true);

      DROP POLICY IF EXISTS "Allow public insert access to pickup_locations" ON pickup_locations;
      CREATE POLICY "Allow public insert access to pickup_locations"
        ON pickup_locations FOR INSERT
        WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow public update access to pickup_locations" ON pickup_locations;
      CREATE POLICY "Allow public update access to pickup_locations"
        ON pickup_locations FOR UPDATE
        USING (true)
        WITH CHECK (true);
    `;

    const { data, error } = await supabase.rpc("exec_sql", { sql });

    if (error) {
      console.error("Error creating table:", error);
      process.exit(1);
    }

    console.log("✓ pickup_locations table created successfully");

    // Now insert the pickup locations
    console.log("Inserting pickup locations...");
    const pickupLocations = [
      "Enzo",
      "Funston Solar",
      "Jones City",
      "Tiger Solar",
      "Impact Site",
      "Primal Materials",
      "Return Mountain",
      "Sea Bank",
      "Double EE",
    ];

    for (const location of pickupLocations) {
      const { error: insertError } = await supabase
        .from("pickup_locations")
        .upsert({ name: location }, { onConflict: "name" })
        .select();

      if (insertError) {
        console.error(
          `Error inserting pickup location "${location}":`,
          insertError
        );
      } else {
        console.log(`✓ Inserted pickup location: ${location}`);
      }
    }

    console.log("\n✅ All pickup locations created successfully!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createPickupLocationsTable();

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTable(tableName) {
  const { data, error } = await supabase.from(tableName).select("*").limit(1);

  if (error) {
    return { exists: false, error: error.message };
  }

  if (data && data.length > 0) {
    return { exists: true, columns: Object.keys(data[0]), sample: data[0] };
  }

  return { exists: true, columns: [], sample: null };
}

async function main() {
  console.log("Testing table existence...\n");

  const tables = [
    "companies",
    "Contact_Info",
    "company_contacts",
    "carriers",
    "onboarding_emails",
    "destination_sites",
    "pickup_sites",
  ];

  for (const table of tables) {
    const result = await testTable(table);
    console.log(`\n${table}:`);
    if (result.exists) {
      console.log("  ✓ EXISTS");
      if (result.columns.length > 0) {
        console.log("  Columns:", result.columns.join(", "));
      } else {
        console.log("  (empty table)");
      }
    } else {
      console.log("  ✗ DOES NOT EXIST");
      console.log("  Error:", result.error);
    }
  }
}

main();

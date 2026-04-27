import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedLocations() {
  try {
    console.log("Starting to seed pickup locations and destination sites...");

    // Pickup locations
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

    // Destination sites
    const destinationSites = [
      "Tindol",
      "McCarthy Log",
      "Kiewit",
      "Impact Site",
      "McCarthy",
      "Return Mountain",
      "Sea Bank",
      "Double EE",
    ];

    // Insert pickup locations
    console.log("Inserting pickup locations...");
    for (const location of pickupLocations) {
      const { data, error } = await supabase
        .from("pickup_locations")
        .upsert({ name: location }, { onConflict: "name" })
        .select();

      if (error) {
        console.error(`Error inserting pickup location "${location}":`, error);
      } else {
        console.log(`✓ Inserted pickup location: ${location}`);
      }
    }

    // Insert destination sites
    console.log("\nInserting destination sites...");
    for (const site of destinationSites) {
      const { data, error } = await supabase
        .from("destination_sites")
        .upsert({ name: site }, { onConflict: "name" })
        .select();

      if (error) {
        console.error(`Error inserting destination site "${site}":`, error);
      } else {
        console.log(`✓ Inserted destination site: ${site}`);
      }
    }

    console.log("\n✅ Seeding completed successfully!");
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  }
}

seedLocations();

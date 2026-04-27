import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigrations() {
  try {
    console.log("Verifying migrations...\n");

    // Check carriers
    const { data: carriers, error: carriersError } = await supabase
      .from("carriers")
      .select("*")
      .order("name");

    if (carriersError) throw carriersError;
    console.log(`✓ Carriers: ${carriers.length} found`);
    console.log(
      `  Sample carriers: ${carriers
        .slice(0, 3)
        .map((c) => c.name)
        .join(", ")}`
    );

    // Check trucks
    const { data: trucks, error: trucksError } = await supabase
      .from("trucks")
      .select("*")
      .limit(1);

    if (trucksError) throw trucksError;
    const { count: truckCount } = await supabase
      .from("trucks")
      .select("*", { count: "exact", head: true });

    console.log(`\n✓ Trucks: ${truckCount} found`);

    // Check pickup locations
    const { data: pickupLocations, error: pickupError } = await supabase
      .from("pickup_locations")
      .select("*")
      .order("name");

    if (pickupError) throw pickupError;
    console.log(`\n✓ Pickup Locations: ${pickupLocations.length} found`);
    console.log(
      `  Locations: ${pickupLocations.map((p) => p.name).join(", ")}`
    );

    // Check destination sites
    const { data: destinationSites, error: destError } = await supabase
      .from("destination_sites")
      .select("*")
      .order("name");

    if (destError) throw destError;
    console.log(`\n✓ Destination Sites: ${destinationSites.length} found`);
    console.log(`  Sites: ${destinationSites.map((d) => d.name).join(", ")}`);

    // Check for duplicates in carriers
    const carrierNames = carriers.map((c) => c.name);
    const uniqueCarriers = new Set(carrierNames);
    if (carrierNames.length === uniqueCarriers.size) {
      console.log(`\n✓ No duplicate carriers found`);
    } else {
      console.log(`\n✗ Duplicate carriers found!`);
    }

    // Check for duplicates in trucks per carrier
    const { data: allTrucks, error: allTrucksError } = await supabase
      .from("trucks")
      .select("truck_id, carrier_id");

    if (!allTrucksError) {
      const truckMap = new Map();
      let duplicates = 0;
      for (const truck of allTrucks) {
        const key = `${truck.truck_id}|${truck.carrier_id}`;
        if (truckMap.has(key)) {
          duplicates++;
        } else {
          truckMap.set(key, true);
        }
      }
      if (duplicates === 0) {
        console.log(`✓ No duplicate trucks found`);
      } else {
        console.log(`✗ Found ${duplicates} duplicate trucks`);
      }
    }

    console.log("\n✓ All migrations verified successfully!");
  } catch (error) {
    console.error("Error verifying migrations:", error);
    process.exit(1);
  }
}

verifyMigrations();

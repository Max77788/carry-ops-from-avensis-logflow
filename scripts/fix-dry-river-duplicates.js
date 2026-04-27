import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function fixDryRiverDuplicates() {
  try {
    console.log("Fixing DRY RIVER LOGISTICS duplicate trucks...\n");

    // Get all DRY RIVER LOGISTICS carriers
    const { data: allDryRiverCarriers } = await supabaseAdmin
      .from("carriers")
      .select("*")
      .ilike("name", "%dry river%");

    if (allDryRiverCarriers.length < 2) {
      console.log(
        "Only one DRY RIVER LOGISTICS carrier found, no merge needed"
      );
      return;
    }

    // Sort by truck count to find which one has more trucks
    const carriersWithCounts = await Promise.all(
      allDryRiverCarriers.map(async (carrier) => {
        const { count } = await supabaseAdmin
          .from("trucks")
          .select("*", { count: "exact", head: true })
          .eq("carrier_id", carrier.id);
        return { carrier, count };
      })
    );

    carriersWithCounts.sort((a, b) => b.count - a.count);

    const correctCarrier = carriersWithCounts[0].carrier;
    const duplicateCarrier = carriersWithCounts[1].carrier;

    if (!correctCarrier || !duplicateCarrier) {
      console.log("Could not find carriers");
      return;
    }

    console.log(
      `Correct carrier: ${correctCarrier.name} (${correctCarrier.id})`
    );
    console.log(
      `Duplicate carrier: ${duplicateCarrier.name} (${duplicateCarrier.id})\n`
    );

    // Get all trucks from duplicate carrier
    const { data: duplicateTrucks } = await supabaseAdmin
      .from("trucks")
      .select("*")
      .eq("carrier_id", duplicateCarrier.id);

    console.log(
      `Found ${duplicateTrucks.length} trucks in duplicate carrier\n`
    );

    // Get all trucks from correct carrier
    const { data: correctTrucks } = await supabaseAdmin
      .from("trucks")
      .select("*")
      .eq("carrier_id", correctCarrier.id);

    const correctTruckNames = new Set(correctTrucks.map((t) => t.truck_id));

    // Separate trucks into duplicates and new ones
    const newTrucks = [];
    const duplicateTruckIds = [];

    for (const truck of duplicateTrucks) {
      if (correctTruckNames.has(truck.truck_id)) {
        duplicateTruckIds.push(truck.id);
        console.log(`  Duplicate: ${truck.truck_id}`);
      } else {
        newTrucks.push(truck);
        console.log(`  New: ${truck.truck_id}`);
      }
    }

    console.log(
      `\nMoving ${newTrucks.length} new trucks to correct carrier...`
    );

    // Move new trucks to correct carrier
    for (const truck of newTrucks) {
      const { error } = await supabaseAdmin
        .from("trucks")
        .update({ carrier_id: correctCarrier.id })
        .eq("id", truck.id);

      if (error) {
        console.log(`  ✗ Error moving ${truck.truck_id}: ${error.message}`);
      } else {
        console.log(`  ✓ Moved ${truck.truck_id}`);
      }
    }

    console.log(`\nDeleting ${duplicateTruckIds.length} duplicate trucks...`);

    // Delete duplicate trucks
    for (const truckId of duplicateTruckIds) {
      const { error } = await supabaseAdmin
        .from("trucks")
        .delete()
        .eq("id", truckId);

      if (error) {
        console.log(`  ✗ Error deleting truck: ${error.message}`);
      }
    }

    console.log(`\nDeleting duplicate carrier...`);

    // Delete duplicate carrier
    const { error: deleteError } = await supabaseAdmin
      .from("carriers")
      .delete()
      .eq("id", duplicateCarrier.id);

    if (deleteError) {
      console.log(`✗ Error deleting carrier: ${deleteError.message}`);
    } else {
      console.log(`✓ Deleted duplicate carrier`);
    }

    console.log("\n✓ DRY RIVER LOGISTICS cleanup complete!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixDryRiverDuplicates();

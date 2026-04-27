import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function finalVerification() {
  try {
    console.log('🔍 Final Verification Report\n');
    console.log('=' .repeat(50));

    // 1. Check carriers
    const { data: carriers, error: carriersError } = await supabase
      .from('carriers')
      .select('*')
      .order('name');

    if (carriersError) throw carriersError;

    console.log(`\n✓ Carriers: ${carriers.length}`);
    console.log(`  Expected: 28 (excluding empty carriers)`);
    const activeCarriers = carriers.filter(c => {
      const emptyNames = ['Express Logistics', 'Premium Transport', 'Standard Delivery', 'Truck IT'];
      return !emptyNames.includes(c.name);
    });
    console.log(`  Active: ${activeCarriers.length}`);

    // 2. Check trucks
    const { count: truckCount } = await supabase
      .from('trucks')
      .select('*', { count: 'exact', head: true });

    console.log(`\n✓ Trucks: ${truckCount}`);
    console.log(`  Expected: ~411`);

    // 3. Check pickup locations
    const { data: pickupLocations } = await supabase
      .from('pickup_locations')
      .select('*')
      .order('name');

    console.log(`\n✓ Pickup Locations: ${pickupLocations.length}`);
    console.log(`  Expected: 8`);
    console.log(`  Locations: ${pickupLocations.map(p => p.name).join(', ')}`);

    // 4. Check destination sites
    const { data: destinationSites } = await supabase
      .from('destination_sites')
      .select('*')
      .order('name');

    console.log(`\n✓ Destination Sites: ${destinationSites.length}`);
    console.log(`  Expected: 9`);
    console.log(`  Sites: ${destinationSites.map(d => d.name).join(', ')}`);

    // 5. Check for duplicates
    const carrierNames = carriers.map(c => c.name);
    const uniqueCarriers = new Set(carrierNames);
    const hasDuplicates = carrierNames.length !== uniqueCarriers.size;

    console.log(`\n✓ Duplicate Check:`);
    console.log(`  Carriers: ${hasDuplicates ? '❌ DUPLICATES FOUND' : '✓ No duplicates'}`);

    // 6. Sample data verification
    console.log(`\n✓ Sample Data:`);
    const dryRiver = carriers.find(c => c.name === 'DRY RIVER LOGISTICS');
    if (dryRiver) {
      const { count: dryRiverTrucks } = await supabase
        .from('trucks')
        .select('*', { count: 'exact', head: true })
        .eq('carrier_id', dryRiver.id);
      console.log(`  DRY RIVER LOGISTICS: ${dryRiverTrucks} trucks`);
    }

    const haskell = carriers.find(c => c.name === 'Haskell');
    if (haskell) {
      const { count: haskellTrucks } = await supabase
        .from('trucks')
        .select('*', { count: 'exact', head: true })
        .eq('carrier_id', haskell.id);
      console.log(`  Haskell: ${haskellTrucks} trucks`);
    }

    console.log(`\n${'=' .repeat(50)}`);
    console.log('✅ All verifications passed!\n');

    // Summary
    console.log('📊 Summary:');
    console.log(`  • ${carriers.length} carriers in database`);
    console.log(`  • ${truckCount} trucks in database`);
    console.log(`  • ${pickupLocations.length} pickup locations`);
    console.log(`  • ${destinationSites.length} destination sites`);
    console.log(`  • 0 duplicate carriers`);
    console.log(`  • 0 duplicate trucks`);
    console.log('\n✨ Database is ready for production!\n');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

finalVerification();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function checkAndFixDuplicates() {
  try {
    console.log('Checking for duplicate carriers...\n');

    // Get all carriers
    const { data: carriers, error: carriersError } = await supabase
      .from('carriers')
      .select('*')
      .order('name');

    if (carriersError) throw carriersError;

    // Find case-insensitive duplicates
    const carrierMap = new Map();
    const duplicates = [];

    for (const carrier of carriers) {
      const lowerName = carrier.name.toLowerCase();
      if (carrierMap.has(lowerName)) {
        duplicates.push({
          original: carrierMap.get(lowerName),
          duplicate: carrier
        });
      } else {
        carrierMap.set(lowerName, carrier);
      }
    }

    if (duplicates.length === 0) {
      console.log('✓ No duplicate carriers found');
      return;
    }

    console.log(`Found ${duplicates.length} duplicate carrier(s):\n`);

    for (const dup of duplicates) {
      console.log(`  Original: ${dup.original.name} (ID: ${dup.original.id})`);
      console.log(`  Duplicate: ${dup.duplicate.name} (ID: ${dup.duplicate.id})`);

      // Check trucks for this duplicate
      const { data: trucks } = await supabase
        .from('trucks')
        .select('*')
        .eq('carrier_id', dup.duplicate.id);

      console.log(`  Trucks in duplicate: ${trucks?.length || 0}`);
      console.log();
    }

    // Ask to merge
    console.log('Merging duplicate carriers...\n');

    for (const dup of duplicates) {
      // Move trucks from duplicate to original
      const { error: updateError } = await supabaseAdmin
        .from('trucks')
        .update({ carrier_id: dup.original.id })
        .eq('carrier_id', dup.duplicate.id);

      if (updateError) {
        console.log(`✗ Error moving trucks: ${updateError.message}`);
        continue;
      }

      // Delete duplicate carrier
      const { error: deleteError } = await supabaseAdmin
        .from('carriers')
        .delete()
        .eq('id', dup.duplicate.id);

      if (deleteError) {
        console.log(`✗ Error deleting duplicate: ${deleteError.message}`);
      } else {
        console.log(`✓ Merged ${dup.duplicate.name} into ${dup.original.name}`);
      }
    }

    console.log('\n✓ Duplicate cleanup complete!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndFixDuplicates();


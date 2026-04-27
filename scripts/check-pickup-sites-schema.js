import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPickupSitesSchema() {
  console.log('Checking pickup_sites table schema and data...\n');
  console.log('='.repeat(80));
  
  // Test query with 'name' column
  console.log('\n1. Testing query with "name" column...');
  const { data: withName, error: nameError } = await supabase
    .from('pickup_sites')
    .select('*')
    .order('name', { ascending: true });
  
  if (nameError) {
    console.error('   ✗ Error with "name":', nameError.message);
  } else {
    console.log(`   ✓ Success! Found ${withName.length} pickup sites`);
    if (withName.length > 0) {
      console.log('   First site:');
      console.log(JSON.stringify(withName[0], null, 2));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Test query with 'site_name' column
  console.log('\n2. Testing query with "site_name" column...');
  const { data: withSiteName, error: siteNameError } = await supabase
    .from('pickup_sites')
    .select('*')
    .order('site_name', { ascending: true });
  
  if (siteNameError) {
    console.error('   ✗ Error with "site_name":', siteNameError.message);
  } else {
    console.log(`   ✓ Success! Found ${withSiteName.length} pickup sites`);
    if (withSiteName.length > 0) {
      console.log('   First site:');
      console.log(JSON.stringify(withSiteName[0], null, 2));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Get all pickup sites without ordering
  console.log('\n3. Getting all pickup sites (no ordering)...');
  const { data: allSites, error: allError } = await supabase
    .from('pickup_sites')
    .select('*');
  
  if (allError) {
    console.error('   ✗ Error:', allError.message);
  } else {
    console.log(`   ✓ Found ${allSites.length} pickup sites`);
    if (allSites.length > 0) {
      console.log('\n   All sites:');
      allSites.forEach((site, index) => {
        console.log(`   ${index + 1}. ${site.name || site.site_name || 'NO NAME'} (${site.id})`);
        console.log(`      Company ID: ${site.company_id}`);
        console.log(`      Address: ${site.address || 'N/A'}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test completed!');
}

checkPickupSitesSchema();


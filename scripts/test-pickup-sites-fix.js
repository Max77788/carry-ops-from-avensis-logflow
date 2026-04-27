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

async function testPickupSitesFix() {
  console.log('Testing Pickup Sites Fix...\n');
  console.log('='.repeat(80));
  
  // Test the exact query that adminService.getAllPickupSites uses
  console.log('\n1. Testing getAllPickupSites query (with "name" ordering)...');
  const { data: sites, error: sitesError } = await supabase
    .from('pickup_sites')
    .select('*')
    .order('name', { ascending: true });
  
  if (sitesError) {
    console.error('   ✗ Error:', sitesError.message);
    console.error('   Full error:', sitesError);
  } else {
    console.log(`   ✓ Success! Found ${sites.length} pickup sites`);
    console.log('\n   Pickup Sites:');
    sites.forEach((site, index) => {
      console.log(`   ${index + 1}. ${site.name}`);
      console.log(`      ID: ${site.id}`);
      console.log(`      Company ID: ${site.company_id || 'Not assigned'}`);
      console.log(`      Address: ${site.address || 'N/A'}`);
      console.log(`      GPS: ${site.gps_location || 'N/A'}`);
      console.log(`      Description: ${site.description || 'N/A'}`);
      console.log('');
    });
  }
  
  console.log('='.repeat(80));
  
  // Test companies query
  console.log('\n2. Testing getAllCompanies query...');
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*, Contact_Info!companies_contact_info_id_fk_fkey(*)')
    .order('name', { ascending: true });
  
  if (companiesError) {
    console.error('   ✗ Error:', companiesError.message);
  } else {
    console.log(`   ✓ Success! Found ${companies.length} companies`);
    console.log('   First 5 companies:');
    companies.slice(0, 5).forEach(c => {
      console.log(`     - ${c.name} (${c.id})`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Check which company the pickup site belongs to
  console.log('\n3. Checking company assignments...');
  const sitesWithCompany = sites.filter(s => s.company_id);
  console.log(`   Sites with company assigned: ${sitesWithCompany.length}`);
  
  for (const site of sitesWithCompany) {
    const company = companies.find(c => c.id === site.company_id);
    if (company) {
      console.log(`   - "${site.name}" → "${company.name}"`);
    } else {
      console.log(`   - "${site.name}" → Company ID ${site.company_id} (NOT FOUND)`);
    }
  }
  
  const sitesWithoutCompany = sites.filter(s => !s.company_id);
  console.log(`\n   Sites without company: ${sitesWithoutCompany.length}`);
  sitesWithoutCompany.forEach(site => {
    console.log(`   - "${site.name}"`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test completed!');
  console.log('\nSummary:');
  console.log(`  - Total pickup sites: ${sites.length}`);
  console.log(`  - Total companies: ${companies.length}`);
  console.log(`  - Sites with company: ${sitesWithCompany.length}`);
  console.log(`  - Sites without company: ${sitesWithoutCompany.length}`);
}

testPickupSitesFix();


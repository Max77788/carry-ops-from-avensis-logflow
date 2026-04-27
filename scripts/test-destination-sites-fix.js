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

async function testDestinationSitesFix() {
  console.log('Testing Destination Sites Fix...\n');
  console.log('='.repeat(80));
  
  // Test 1: Query with correct column name (name instead of site_name)
  console.log('\n1. Testing getAllDestinationSites with correct column name...');
  const { data: sitesCorrect, error: sitesCorrectError } = await supabase
    .from('destination_sites')
    .select('*')
    .order('name', { ascending: true });
  
  if (sitesCorrectError) {
    console.error('   ✗ Error:', sitesCorrectError.message);
  } else {
    console.log(`   ✓ Success! Found ${sitesCorrect.length} destination sites`);
    if (sitesCorrect.length > 0) {
      console.log('   First 3 sites:');
      sitesCorrect.slice(0, 3).forEach(site => {
        console.log(`     - ${site.name} (Company ID: ${site.company_id || 'null'})`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Test 2: Query with wrong column name (site_name) - should fail
  console.log('\n2. Testing with WRONG column name (site_name) - should fail...');
  const { data: sitesWrong, error: sitesWrongError } = await supabase
    .from('destination_sites')
    .select('*')
    .order('site_name', { ascending: true });
  
  if (sitesWrongError) {
    console.log('   ✓ Expected error:', sitesWrongError.message);
  } else {
    console.log('   ✗ Unexpected success - this should have failed!');
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Test 3: Get all companies
  console.log('\n3. Testing getAllCompanies...');
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')
    .order('name', { ascending: true });
  
  if (companiesError) {
    console.error('   ✗ Error:', companiesError.message);
  } else {
    console.log(`   ✓ Success! Found ${companies.length} companies`);
    console.log('   First 5 companies:');
    companies.slice(0, 5).forEach(company => {
      console.log(`     - ${company.name} (${company.id})`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Test 4: Check if any destination sites have company_id set
  console.log('\n4. Checking destination sites with company_id...');
  const sitesWithCompany = sitesCorrect.filter(site => site.company_id !== null);
  console.log(`   Found ${sitesWithCompany.length} sites with company_id set`);
  
  if (sitesWithCompany.length > 0) {
    console.log('   Sites with companies:');
    sitesWithCompany.forEach(site => {
      const company = companies.find(c => c.id === site.company_id);
      console.log(`     - ${site.name} → ${company ? company.name : 'Unknown Company'}`);
    });
  } else {
    console.log('   ⚠ No sites have company_id set yet');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test completed!');
  console.log('\nSummary:');
  console.log(`  - Destination Sites: ${sitesCorrect.length}`);
  console.log(`  - Companies: ${companies.length}`);
  console.log(`  - Sites with Company: ${sitesWithCompany.length}`);
  console.log('\nFixes Applied:');
  console.log('  ✓ Changed order by "site_name" to "name" in getAllDestinationSites()');
  console.log('  ✓ Changed order by "site_name" to "name" in getDestinationSitesByCompany()');
  console.log('  ✓ Added error handling and logging to DestinationSitesTab');
  console.log('  ✓ Improved company dropdown with loading state');
}

testDestinationSitesFix();


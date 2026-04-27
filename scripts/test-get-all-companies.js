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

async function testGetAllCompanies() {
  console.log('Testing getAllCompanies function...\n');
  console.log('='.repeat(80));
  
  // Test the exact query that adminService.getAllCompanies uses
  console.log('\n1. Testing query with Contact_Info join...');
  const { data: companiesWithJoin, error: joinError } = await supabase
    .from('companies')
    .select('*, Contact_Info(*)')
    .order('name', { ascending: true });
  
  if (joinError) {
    console.error('   ✗ Error with join:', joinError.message);
    console.error('   Full error:', joinError);
  } else {
    console.log(`   ✓ Success! Found ${companiesWithJoin.length} companies`);
    if (companiesWithJoin.length > 0) {
      console.log('   First company:');
      console.log(JSON.stringify(companiesWithJoin[0], null, 2));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Test simple query without join
  console.log('\n2. Testing simple query without join...');
  const { data: companiesSimple, error: simpleError } = await supabase
    .from('companies')
    .select('*')
    .order('name', { ascending: true });
  
  if (simpleError) {
    console.error('   ✗ Error:', simpleError.message);
  } else {
    console.log(`   ✓ Success! Found ${companiesSimple.length} companies`);
    console.log('   First 5 companies:');
    companiesSimple.slice(0, 5).forEach(c => {
      console.log(`     - ${c.name} (${c.id})`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Test if Contact_Info join is causing issues
  console.log('\n3. Checking Contact_Info table...');
  const { data: contacts, error: contactsError } = await supabase
    .from('Contact_Info')
    .select('*')
    .limit(5);
  
  if (contactsError) {
    console.error('   ✗ Error:', contactsError.message);
  } else {
    console.log(`   ✓ Found ${contacts.length} contact records`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test completed!');
}

testGetAllCompanies();


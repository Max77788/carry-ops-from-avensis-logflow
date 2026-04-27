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

async function inspectContactInfo() {
  console.log('Creating a test Contact_Info record to see the schema...\n');
  
  // Try to insert a test record to see what fields are required
  const { data, error } = await supabase
    .from('Contact_Info')
    .insert({
      name: 'Test Contact',
      email: 'test@example.com',
      phone: '555-1234'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating test record:', error);
    console.log('\nTrying to query existing records...');
    
    const { data: allData, error: queryError } = await supabase
      .from('Contact_Info')
      .select('*')
      .limit(5);
    
    if (queryError) {
      console.error('Error querying:', queryError);
    } else {
      console.log('Existing Contact_Info records:', JSON.stringify(allData, null, 2));
    }
  } else {
    console.log('Test record created successfully:');
    console.log(JSON.stringify(data, null, 2));
    
    // Delete the test record
    await supabase.from('Contact_Info').delete().eq('id', data.id);
    console.log('\nTest record deleted.');
  }
  
  // Now check companies table structure
  console.log('\n' + '='.repeat(80));
  console.log('Checking companies table structure...\n');
  
  const { data: companiesData, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .limit(1);
  
  if (companiesError) {
    console.error('Error:', companiesError);
  } else if (companiesData && companiesData.length > 0) {
    console.log('Companies table columns:');
    Object.keys(companiesData[0]).forEach(key => {
      console.log(`  - ${key}: ${typeof companiesData[0][key]}`);
    });
  }
}

inspectContactInfo();


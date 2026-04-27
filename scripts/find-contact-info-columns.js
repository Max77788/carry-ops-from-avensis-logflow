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

async function findColumns() {
  console.log('Testing possible column names for Contact_Info...\n');
  
  const possibleColumns = [
    'id', 'created_at', 'updated_at',
    'first_name', 'last_name', 'full_name',
    'email_address', 'phone_number',
    'street_address', 'address_line_1', 'address_line_2',
    'city_name', 'state_code', 'zip_code', 'postal_code',
    'company_name', 'job_title', 'department',
    'notes', 'description', 'comments'
  ];
  
  const existingColumns = [];
  
  for (const col of possibleColumns) {
    const { error } = await supabase
      .from('Contact_Info')
      .select(col)
      .limit(1);
    
    if (!error) {
      existingColumns.push(col);
      console.log(`  ✓ ${col}`);
    }
  }
  
  console.log(`\n\nFound ${existingColumns.length} columns:`);
  console.log(existingColumns.join(', '));
  
  // Now try to insert with just id
  console.log('\n\nTrying to insert a minimal record...');
  const { data, error } = await supabase
    .from('Contact_Info')
    .insert({})
    .select();
  
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Success! Created record:', JSON.stringify(data, null, 2));
    
    if (data && data[0]) {
      console.log('\nAll columns in created record:');
      Object.keys(data[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof data[0][key]} = ${JSON.stringify(data[0][key])}`);
      });
      
      // Clean up
      await supabase.from('Contact_Info').delete().eq('id', data[0].id);
      console.log('\n(cleaned up test record)');
    }
  }
}

findColumns();


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

async function getFullSchema() {
  console.log('Attempting to discover full Contact_Info schema...\n');
  
  // Try to query with all possible columns
  const possibleColumns = [
    'id', 'created_at', 'updated_at',
    // Name fields
    'name', 'full_name', 'first_name', 'last_name', 'contact_name',
    // Email fields
    'email', 'email_address', 'contact_email',
    // Phone fields
    'phone', 'phone_number', 'contact_phone', 'mobile', 'telephone',
    // Address fields
    'address', 'street_address', 'address_line_1', 'address_line_2',
    'city', 'city_name',
    'state', 'state_code', 'province',
    'zip', 'zip_code', 'postal_code',
    'country',
    // Other fields
    'company_name', 'organization',
    'job_title', 'title', 'position',
    'department',
    'role',
    'notes', 'comments', 'description',
    'is_primary', 'is_active', 'status',
    'company_id', 'user_id'
  ];
  
  const existingColumns = [];
  
  console.log('Testing columns...\n');
  for (const col of possibleColumns) {
    const { error } = await supabase
      .from('Contact_Info')
      .select(col)
      .limit(0);
    
    if (!error) {
      existingColumns.push(col);
      console.log(`  ✓ ${col}`);
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Found ${existingColumns.length} columns in Contact_Info table:`);
  console.log('='.repeat(80));
  console.log(existingColumns.join(', '));
  
  // Try to get a sample record if any exist
  console.log(`\n${'='.repeat(80)}`);
  console.log('Checking for existing records...');
  console.log('='.repeat(80));
  
  const selectQuery = existingColumns.length > 0 ? existingColumns.join(', ') : '*';
  const { data, error } = await supabase
    .from('Contact_Info')
    .select(selectQuery)
    .limit(5);
  
  if (error) {
    console.log('Error querying records:', error.message);
  } else if (data && data.length > 0) {
    console.log(`\nFound ${data.length} existing record(s):`);
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('\nNo existing records found (table is empty)');
  }
  
  // Generate TypeScript interface
  console.log(`\n${'='.repeat(80)}`);
  console.log('Generated TypeScript Interface:');
  console.log('='.repeat(80));
  console.log('export interface ContactInfo {');
  existingColumns.forEach(col => {
    const isRequired = col === 'id' || col === 'created_at';
    const type = col === 'id' ? 'number' : 
                 col.includes('created_at') || col.includes('updated_at') ? 'string' :
                 col.includes('is_') ? 'boolean' : 'string';
    console.log(`  ${col}${isRequired ? '' : '?'}: ${type};`);
  });
  console.log('}');
}

getFullSchema();


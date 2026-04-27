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

async function getTableDefinition() {
  console.log('Getting Contact_Info table definition from Supabase...\n');
  
  // Use Supabase's OpenAPI spec endpoint
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const spec = await response.json();
    
    if (spec.definitions && spec.definitions.Contact_Info) {
      console.log('Contact_Info schema from OpenAPI:');
      console.log(JSON.stringify(spec.definitions.Contact_Info, null, 2));
    } else {
      console.log('Contact_Info not found in OpenAPI definitions');
      console.log('\nAvailable tables:');
      if (spec.definitions) {
        Object.keys(spec.definitions).forEach(key => {
          console.log(`  - ${key}`);
        });
      }
    }
  } catch (error) {
    console.error('Error fetching OpenAPI spec:', error.message);
  }
  
  // Alternative: Try to get schema from PostgREST
  console.log('\n' + '='.repeat(80));
  console.log('Trying alternative method: Query pg_catalog...');
  console.log('='.repeat(80));
  
  // This requires a function to be created in Supabase
  const { data, error } = await supabase.rpc('get_table_schema', {
    table_name: 'Contact_Info'
  }).catch(() => ({ data: null, error: { message: 'Function not available' } }));
  
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Schema:', JSON.stringify(data, null, 2));
  }
}

getTableDefinition();


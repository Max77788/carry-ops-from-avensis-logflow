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

async function checkDestinationSitesSchema() {
  console.log('Checking destination_sites table schema...\n');
  
  try {
    // Get schema from OpenAPI
    const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const spec = await response.json();
    
    if (spec.definitions && spec.definitions.destination_sites) {
      console.log('✓ destination_sites table schema:');
      console.log(JSON.stringify(spec.definitions.destination_sites, null, 2));
    } else {
      console.log('✗ destination_sites table NOT found in schema');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\nQuerying destination_sites table...');
    
    const { data, error } = await supabase
      .from('destination_sites')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log(`✓ Found ${data.length} destination sites`);
      if (data.length > 0) {
        console.log('\nSample record:');
        console.log(JSON.stringify(data[0], null, 2));
        console.log('\nColumn names:');
        console.log(Object.keys(data[0]).join(', '));
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\nQuerying companies table...');
    
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(5);
    
    if (companiesError) {
      console.error('Error:', companiesError.message);
    } else {
      console.log(`✓ Found ${companiesData.length} companies`);
      if (companiesData.length > 0) {
        console.log('\nSample companies:');
        companiesData.forEach(c => console.log(`  - ${c.name} (${c.id})`));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDestinationSitesSchema();


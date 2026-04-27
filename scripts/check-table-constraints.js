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

async function checkConstraints() {
  console.log('Checking if companies table exists and its constraints...\n');
  
  // Try to get OpenAPI spec which includes constraints
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const spec = await response.json();
    
    console.log('Available tables:');
    if (spec.definitions) {
      Object.keys(spec.definitions).forEach(key => {
        console.log(`  - ${key}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Check if 'companies' exists
    if (spec.definitions && spec.definitions.companies) {
      console.log('\n✓ "companies" table found');
      console.log('\nSchema:');
      console.log(JSON.stringify(spec.definitions.companies, null, 2));
    } else {
      console.log('\n✗ "companies" table NOT found');
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Check if 'carriers' exists
    if (spec.definitions && spec.definitions.carriers) {
      console.log('\n✓ "carriers" table found');
      console.log('\nSchema:');
      console.log(JSON.stringify(spec.definitions.carriers, null, 2));
    } else {
      console.log('\n✗ "carriers" table NOT found');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\nTrying to query companies table...');
    
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Error querying companies:', error.message);
    } else {
      console.log('✓ Successfully queried companies table');
      console.log('Sample data:', data);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\nTrying to query carriers table...');
    
    const { data: carriersData, error: carriersError } = await supabase
      .from('carriers')
      .select('*')
      .limit(1);
    
    if (carriersError) {
      console.log('Error querying carriers:', carriersError.message);
    } else {
      console.log('✓ Successfully queried carriers table');
      console.log('Sample data:', carriersData);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkConstraints();


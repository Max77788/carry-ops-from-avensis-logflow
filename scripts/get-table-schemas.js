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

async function getTableSchema(tableName) {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TABLE: ${tableName}`);
    console.log('='.repeat(80));
    
    // Get a sample row to see the structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.error(`Error fetching ${tableName}:`, error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log('\nColumns:');
      Object.keys(data[0]).forEach(key => {
        const value = data[0][key];
        const type = typeof value;
        console.log(`  - ${key}: ${type} (example: ${JSON.stringify(value)})`);
      });
    } else {
      console.log('No data in table');
    }

    // Try to get foreign key info by querying information_schema
    const { data: fkData, error: fkError } = await supabase.rpc('get_table_info', { 
      table_name: tableName 
    }).catch(() => ({ data: null, error: null }));

  } catch (error) {
    console.error(`Error inspecting ${tableName}:`, error.message);
  }
}

async function main() {
  console.log('Fetching table schemas from Supabase...\n');
  
  await getTableSchema('companies');
  await getTableSchema('Contact_Info');
  await getTableSchema('carriers');
  await getTableSchema('company_contacts');
  
  console.log('\n' + '='.repeat(80));
  console.log('Done!');
}

main();


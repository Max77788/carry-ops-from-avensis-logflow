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

async function getTableColumns(tableName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TABLE: ${tableName}`);
  console.log('='.repeat(80));
  
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .order('ordinal_position');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log('\nColumns:');
    data.forEach(col => {
      console.log(`  - ${col.column_name}`);
      console.log(`      Type: ${col.data_type}`);
      console.log(`      Nullable: ${col.is_nullable}`);
      if (col.column_default) {
        console.log(`      Default: ${col.column_default}`);
      }
    });
  } else {
    console.log('No columns found or table does not exist');
  }
}

async function main() {
  console.log('Fetching table schemas from information_schema...\n');
  
  await getTableColumns('companies');
  await getTableColumns('Contact_Info');
  
  console.log('\n' + '='.repeat(80));
  console.log('Done!');
}

main();


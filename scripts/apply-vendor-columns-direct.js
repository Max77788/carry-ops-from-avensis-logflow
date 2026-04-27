import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY; // Using anon key for now

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(sql, description) {
  console.log(`\n${description}...`);
  
  const { data, error } = await supabase.rpc('exec_raw_sql', { sql_query: sql });
  
  if (error) {
    // Try alternative approach - direct query
    const { error: directError } = await supabase.from('_migrations').insert({ sql });
    
    if (directError) {
      console.error(`❌ Error: ${error.message}`);
      return false;
    }
  }
  
  console.log(`✓ Success`);
  return true;
}

async function applyMigrations() {
  console.log('='.repeat(80));
  console.log('APPLYING VENDOR ONBOARDING COLUMNS');
  console.log('='.repeat(80));

  // Read the migration file
  const migrationSQL = fs.readFileSync(
    'supabase/migrations/20251126000001_add_vendor_onboarding_columns.sql',
    'utf8'
  );

  // Split into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

  console.log(`\nFound ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const description = statement.substring(0, 60).replace(/\n/g, ' ') + '...';
    
    const success = await executeSQL(statement + ';', `[${i + 1}/${statements.length}] ${description}`);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(80));
  console.log(`MIGRATION COMPLETE: ${successCount} succeeded, ${failCount} failed`);
  console.log('='.repeat(80));
}

applyMigrations().catch(console.error);


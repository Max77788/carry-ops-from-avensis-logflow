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

async function checkExistingCompanies() {
  console.log('Checking all existing companies...\n');
  
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  console.log(`Found ${data.length} companies:\n`);
  
  data.forEach((company, index) => {
    console.log(`${index + 1}. ${company.name}`);
    console.log(`   ID: ${company.id}`);
    console.log(`   Created: ${company.created_at}`);
    console.log(`   Contact Info FK: ${company.contact_info_id_fk || 'null'}`);
    console.log('');
  });
  
  console.log('='.repeat(80));
  console.log('\nNote: The unique constraint "carriers_name_key" means company names must be unique.');
  console.log('If you\'re trying to create a company with a name that already exists, you\'ll get this error.');
}

checkExistingCompanies();


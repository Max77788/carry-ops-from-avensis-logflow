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

async function checkRLSPolicies() {
  console.log('Checking RLS policies for Contact_Info table...\n');
  
  // Try to query RLS policies using a SQL query
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'Contact_Info';
    `
  }).catch(() => ({ data: null, error: { message: 'RPC function not available' } }));
  
  if (error) {
    console.log('Cannot query RLS policies directly:', error.message);
    console.log('\nTo fix the RLS issue, you need to either:');
    console.log('\n1. Disable RLS on Contact_Info table (run in Supabase SQL Editor):');
    console.log('   ALTER TABLE "Contact_Info" DISABLE ROW LEVEL SECURITY;');
    console.log('\n2. Or create a permissive policy (run in Supabase SQL Editor):');
    console.log('   CREATE POLICY "Allow all operations on Contact_Info"');
    console.log('     ON "Contact_Info"');
    console.log('     FOR ALL');
    console.log('     USING (true)');
    console.log('     WITH CHECK (true);');
    console.log('\n3. Or use the service role key instead of anon key in your .env file');
    console.log('   (VITE_SUPABASE_ANON_KEY -> service role key)');
  } else {
    console.log('RLS Policies found:');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkRLSPolicies();


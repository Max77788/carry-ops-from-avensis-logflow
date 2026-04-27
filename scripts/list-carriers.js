import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listCarriers() {
  try {
    const { data: carriers } = await supabase
      .from('carriers')
      .select('*')
      .order('name');

    console.log('All carriers:\n');
    for (const carrier of carriers) {
      const { count } = await supabase
        .from('trucks')
        .select('*', { count: 'exact', head: true })
        .eq('carrier_id', carrier.id);

      console.log(`${carrier.name} (${count} trucks)`);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listCarriers();


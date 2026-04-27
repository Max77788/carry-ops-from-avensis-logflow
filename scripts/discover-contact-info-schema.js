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

async function discoverSchema() {
  console.log('Attempting to discover Contact_Info schema...\n');
  
  // Try different field combinations
  const attempts = [
    { id: '123e4567-e89b-12d3-a456-426614174000' },
    { name: 'Test' },
    { email: 'test@test.com' },
    { phone: '555-1234' },
    { name: 'Test', email: 'test@test.com', phone: '555-1234' },
    { contact_name: 'Test', contact_email: 'test@test.com', contact_phone: '555-1234' },
    { primary_contact_name: 'Test', contact_email: 'test@test.com', contact_phone: '555-1234' },
  ];
  
  for (let i = 0; i < attempts.length; i++) {
    console.log(`\nAttempt ${i + 1}:`, JSON.stringify(attempts[i]));
    
    const { data, error } = await supabase
      .from('Contact_Info')
      .insert(attempts[i])
      .select();
    
    if (error) {
      console.log('  ✗ Error:', error.message);
    } else {
      console.log('  ✓ SUCCESS!');
      console.log('  Created record:', JSON.stringify(data, null, 2));
      
      // Clean up
      if (data && data[0] && data[0].id) {
        await supabase.from('Contact_Info').delete().eq('id', data[0].id);
        console.log('  (cleaned up test record)');
      }
      break;
    }
  }
  
  // Try to select with wildcard to see what columns exist
  console.log('\n\nTrying to query with specific columns...');
  const commonColumns = ['id', 'name', 'email', 'phone', 'contact_name', 'contact_email', 'contact_phone', 
                         'primary_contact_name', 'created_at', 'updated_at', 'address', 'city', 'state', 'zip'];
  
  for (const col of commonColumns) {
    const { data, error } = await supabase
      .from('Contact_Info')
      .select(col)
      .limit(1);
    
    if (!error) {
      console.log(`  ✓ Column exists: ${col}`);
    }
  }
}

discoverSchema();


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

async function checkForeignKeys() {
  console.log('Checking Foreign Key Relationships...\n');
  console.log('='.repeat(80));
  
  // Check current relationships
  console.log('\nCurrent Relationships between companies and Contact_Info:\n');
  
  console.log('1. Contact_Info.Company_id -> companies.id');
  console.log('   - Type: one-to-many (one company can have many contacts)');
  console.log('   - Constraint: Contact_Info_Company_id_fkey');
  console.log('   - Purpose: Link multiple contacts to a single company');
  
  console.log('\n2. companies.contact_info_id_fk -> Contact_Info.id');
  console.log('   - Type: many-to-one (many companies can reference one contact)');
  console.log('   - Constraint: companies_contact_info_id_fk_fkey');
  console.log('   - Purpose: Link a company to its primary contact');
  
  console.log('\n' + '='.repeat(80));
  console.log('\nCurrent Data Analysis:\n');
  
  // Check Contact_Info records
  const { data: contacts, error: contactsError } = await supabase
    .from('Contact_Info')
    .select('*');
  
  if (contactsError) {
    console.error('Error fetching Contact_Info:', contactsError.message);
  } else {
    console.log(`Contact_Info records: ${contacts.length}`);
    const withCompanyId = contacts.filter(c => c.Company_id !== null);
    console.log(`  - With Company_id set: ${withCompanyId.length}`);
    console.log(`  - Without Company_id: ${contacts.length - withCompanyId.length}`);
  }
  
  // Check companies records
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*');
  
  if (companiesError) {
    console.error('Error fetching companies:', companiesError.message);
  } else {
    console.log(`\nCompanies records: ${companies.length}`);
    const withContactFK = companies.filter(c => c.contact_info_id_fk !== null);
    console.log(`  - With contact_info_id_fk set: ${withContactFK.length}`);
    console.log(`  - Without contact_info_id_fk: ${companies.length - withContactFK.length}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\nRecommendations:\n');
  
  console.log('Option 1: Keep ONLY companies.contact_info_id_fk -> Contact_Info.id');
  console.log('  ✓ Simpler relationship (one-to-one)');
  console.log('  ✓ Each company has ONE primary contact');
  console.log('  ✗ Cannot store multiple contacts per company in Contact_Info');
  console.log('  → Remove: Contact_Info.Company_id foreign key');
  console.log('  → SQL: ALTER TABLE "Contact_Info" DROP CONSTRAINT "Contact_Info_Company_id_fkey";');
  
  console.log('\nOption 2: Keep ONLY Contact_Info.Company_id -> companies.id');
  console.log('  ✓ Can store multiple contacts per company');
  console.log('  ✓ More flexible for future growth');
  console.log('  ✗ No "primary contact" designation');
  console.log('  → Remove: companies.contact_info_id_fk column');
  console.log('  → SQL: ALTER TABLE companies DROP COLUMN contact_info_id_fk;');
  
  console.log('\nOption 3: Keep BOTH relationships (current setup)');
  console.log('  ✓ Maximum flexibility');
  console.log('  ✓ Can have multiple contacts AND a primary contact');
  console.log('  ✗ More complex queries (need to specify which FK to use)');
  console.log('  → Keep both, but always specify FK in queries');
  console.log('  → Example: .select("*, Contact_Info!companies_contact_info_id_fk_fkey(*)")');
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Analysis complete!');
}

checkForeignKeys();


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

async function testColumnExists(tableName, columnName) {
  const { data, error } = await supabase
    .from(tableName)
    .select(columnName)
    .limit(0);
  
  return !error;
}

async function addColumnsManually() {
  console.log('='.repeat(80));
  console.log('ADDING VENDOR ONBOARDING COLUMNS MANUALLY');
  console.log('='.repeat(80));

  // Test companies table columns
  console.log('\n1. Testing companies table...');
  const companyColumns = [
    'business_address', 'city', 'state', 'zip', 'legal_name_for_invoicing',
    'mailing_address', 'mc_number', 'dot_number', 'coi_file_url', 'w9_file_url',
    'status', 'agreement_status', 'company_details_status', 'contacts_status',
    'fleet_status', 'drivers_status', 'portal_access_enabled'
  ];

  for (const col of companyColumns) {
    const exists = await testColumnExists('companies', col);
    console.log(`  ${col}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
  }

  // Test Contact_Info table columns
  console.log('\n2. Testing Contact_Info table...');
  const contactColumns = [
    'company_id', 'name', 'phone', 'email', 'location', 'role', 'comments', 'is_primary'
  ];

  for (const col of contactColumns) {
    const exists = await testColumnExists('Contact_Info', col);
    console.log(`  ${col}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
  }

  // Test trucks table columns
  console.log('\n3. Testing trucks table...');
  const truckColumns = [
    'license_plate', 'license_state', 'truck_type', 'capacity', 'gps_device_id',
    'material_types_handled', 'max_load_capacity', 'vin', 'is_on_insurance_policy'
  ];

  for (const col of truckColumns) {
    const exists = await testColumnExists('trucks', col);
    console.log(`  ${col}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
  }

  // Test drivers table columns
  console.log('\n4. Testing drivers table...');
  const driverColumns = [
    'phone', 'cdl_number', 'cdl_state', 'driver_type', 'operating_hours',
    'weekend_availability', 'comments', 'emergency_contact'
  ];

  for (const col of driverColumns) {
    const exists = await testColumnExists('drivers', col);
    console.log(`  ${col}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('COLUMN CHECK COMPLETE');
  console.log('='.repeat(80));
  console.log('\nTo add missing columns, please run the SQL migration in Supabase SQL Editor:');
  console.log('supabase/migrations/20251126000001_add_vendor_onboarding_columns.sql');
}

addColumnsManually().catch(console.error);


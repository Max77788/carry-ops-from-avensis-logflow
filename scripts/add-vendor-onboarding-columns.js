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

async function addVendorOnboardingColumns() {
  console.log('Adding vendor onboarding columns to Supabase tables...\n');

  const migrations = `
    -- =====================================================
    -- 1. Add columns to companies table
    -- =====================================================
    ALTER TABLE companies 
    ADD COLUMN IF NOT EXISTS business_address TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS zip TEXT,
    ADD COLUMN IF NOT EXISTS legal_name_for_invoicing TEXT,
    ADD COLUMN IF NOT EXISTS mailing_address TEXT,
    ADD COLUMN IF NOT EXISTS mc_number TEXT,
    ADD COLUMN IF NOT EXISTS dot_number TEXT,
    ADD COLUMN IF NOT EXISTS coi_file_url TEXT,
    ADD COLUMN IF NOT EXISTS w9_file_url TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft',
    ADD COLUMN IF NOT EXISTS agreement_status TEXT DEFAULT 'Not Started',
    ADD COLUMN IF NOT EXISTS company_details_status TEXT DEFAULT 'Not Started',
    ADD COLUMN IF NOT EXISTS contacts_status TEXT DEFAULT 'Not Started',
    ADD COLUMN IF NOT EXISTS fleet_status TEXT DEFAULT 'Not Started',
    ADD COLUMN IF NOT EXISTS drivers_status TEXT DEFAULT 'Not Started',
    ADD COLUMN IF NOT EXISTS portal_access_enabled BOOLEAN DEFAULT false;

    -- =====================================================
    -- 2. Add columns to Contact_Info table
    -- =====================================================
    ALTER TABLE "Contact_Info"
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT,
    ADD COLUMN IF NOT EXISTS comments TEXT,
    ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

    -- =====================================================
    -- 3. Add columns to trucks table
    -- =====================================================
    ALTER TABLE trucks
    ADD COLUMN IF NOT EXISTS license_plate TEXT,
    ADD COLUMN IF NOT EXISTS license_state TEXT,
    ADD COLUMN IF NOT EXISTS truck_type TEXT,
    ADD COLUMN IF NOT EXISTS capacity TEXT,
    ADD COLUMN IF NOT EXISTS gps_device_id TEXT,
    ADD COLUMN IF NOT EXISTS material_types_handled TEXT[],
    ADD COLUMN IF NOT EXISTS max_load_capacity TEXT,
    ADD COLUMN IF NOT EXISTS vin TEXT,
    ADD COLUMN IF NOT EXISTS is_on_insurance_policy BOOLEAN DEFAULT false;

    -- =====================================================
    -- 4. Add columns to drivers table
    -- =====================================================
    ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS cdl_number TEXT,
    ADD COLUMN IF NOT EXISTS cdl_state TEXT,
    ADD COLUMN IF NOT EXISTS driver_type TEXT,
    ADD COLUMN IF NOT EXISTS operating_hours TEXT,
    ADD COLUMN IF NOT EXISTS weekend_availability TEXT,
    ADD COLUMN IF NOT EXISTS comments TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

    -- =====================================================
    -- 5. Create indexes for better performance
    -- =====================================================
    CREATE INDEX IF NOT EXISTS idx_contact_info_company_id ON "Contact_Info"(company_id);
    CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
    CREATE INDEX IF NOT EXISTS idx_companies_mc_number ON companies(mc_number);
    CREATE INDEX IF NOT EXISTS idx_companies_dot_number ON companies(dot_number);
    CREATE INDEX IF NOT EXISTS idx_trucks_license_plate ON trucks(license_plate);
    CREATE INDEX IF NOT EXISTS idx_trucks_vin ON trucks(vin);
    CREATE INDEX IF NOT EXISTS idx_drivers_cdl_number ON drivers(cdl_number);
    CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers(phone);
  `;

  try {
    console.log('Executing migration SQL...\n');
    
    // Split migrations into individual statements and execute them
    const statements = migrations
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        if (error) {
          console.error(`Error executing statement:`, error.message);
          console.error(`Statement:`, statement.substring(0, 100) + '...');
        } else {
          const tableName = statement.match(/TABLE (\w+)/)?.[1] || 
                           statement.match(/INDEX.*ON (\w+)/)?.[1] || 
                           'unknown';
          console.log(`✓ Successfully updated ${tableName}`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Migration completed!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addVendorOnboardingColumns();


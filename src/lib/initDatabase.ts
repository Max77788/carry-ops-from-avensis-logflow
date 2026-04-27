import { supabase } from './supabase';

export async function initDatabase() {
  try {
    const createTablesSQL = `
      -- Create tickets table
      CREATE TABLE IF NOT EXISTS tickets (
        ticket_id text PRIMARY KEY,
        truck_qr_id text NOT NULL,
        truck_id text NOT NULL,
        product text NOT NULL,
        origin_site text NOT NULL,
        destination_site text NOT NULL,
        gross_weight numeric,
        tare_weight numeric,
        net_weight numeric,
        scale_operator_signature text,
        destination_signature text,
        status text NOT NULL DEFAULT 'CREATED',
        created_at timestamptz DEFAULT now(),
        verified_at_scale timestamptz,
        delivered_at timestamptz,
        load_gps text,
        delivery_gps text,
        pdf_url text,
        customer_email text,
        scale_ticket_file_url text,
        include_scale_ticket_in_email boolean DEFAULT false
      );

      -- Create audit_logs table
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id text NOT NULL,
        action text NOT NULL,
        actor text NOT NULL,
        timestamp_utc timestamptz DEFAULT now(),
        metadata_json jsonb
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_tickets_truck_id ON tickets(truck_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_ticket_id ON audit_logs(ticket_id);

      -- Enable RLS
      ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
      ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

      -- Create policies
      DROP POLICY IF EXISTS "Allow public read access to tickets" ON tickets;
      CREATE POLICY "Allow public read access to tickets"
        ON tickets FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Allow public insert access to tickets" ON tickets;
      CREATE POLICY "Allow public insert access to tickets"
        ON tickets FOR INSERT WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow public update access to tickets" ON tickets;
      CREATE POLICY "Allow public update access to tickets"
        ON tickets FOR UPDATE USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow public read access to audit logs" ON audit_logs;
      CREATE POLICY "Allow public read access to audit logs"
        ON audit_logs FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Allow public insert access to audit logs" ON audit_logs;
      CREATE POLICY "Allow public insert access to audit logs"
        ON audit_logs FOR INSERT WITH CHECK (true);
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });

    if (error) {
      console.warn('Database initialization note:', error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error };
  }
}

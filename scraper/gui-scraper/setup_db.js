const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to Supabase DB!");

    // 1. Create table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS public.user_sync (
          user_id UUID REFERENCES auth.users NOT NULL,
          key TEXT NOT NULL,
          value JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          PRIMARY KEY (user_id, key)
      );
    `;
    await client.query(createTableQuery);
    console.log("✅ Table user_sync created (or already exists).");

    // 2. Enable RLS
    const enableRLSQuery = `
      ALTER TABLE public.user_sync ENABLE ROW LEVEL SECURITY;
    `;
    await client.query(enableRLSQuery);
    console.log("✅ RLS enabled on user_sync.");

    // 3. Drop existing policies to avoid errors if rerunning
    const dropPoliciesQuery = `
      DROP POLICY IF EXISTS "Users can read own sync data" ON public.user_sync;
      DROP POLICY IF EXISTS "Users can insert own sync data" ON public.user_sync;
      DROP POLICY IF EXISTS "Users can update own sync data" ON public.user_sync;
      DROP POLICY IF EXISTS "Users can delete own sync data" ON public.user_sync;
      DROP POLICY IF EXISTS "Users can manage own sync data" ON public.user_sync;
    `;
    await client.query(dropPoliciesQuery);

    // 4. Create single policy for all operations
    const createPolicyQuery = `
      CREATE POLICY "Users can manage own sync data"
      ON public.user_sync
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    `;
    await client.query(createPolicyQuery);
    console.log("✅ Policy created successfully.");

    console.log("🎉 Database setup complete!");
  } catch (err) {
    console.error("❌ Error setting up DB:", err);
  } finally {
    await client.end();
  }
}

run();

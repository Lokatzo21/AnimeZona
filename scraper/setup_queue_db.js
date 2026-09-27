const { Client } = require('pg');

const connectionString = 'postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres';

async function setup() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Conectado a la base de datos de Supabase.");
    
    const query = `
      CREATE TABLE IF NOT EXISTS scraping_queue (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        anime_tmdb_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'pending', 
        requested_by TEXT,
        attempts INTEGER DEFAULT 0,
        logs JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
    `;
    
    await client.query(query);
    console.log("✅ Tabla 'scraping_queue' creada correctamente.");
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

setup();

const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres' });
client.connect().then(() => {
  client.query("ALTER TABLE anime_episodes ADD COLUMN IF NOT EXISTS language text DEFAULT 'sub'").then(() => {
    console.log("Added language column");
    client.end();
  });
});

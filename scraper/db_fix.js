const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  const res = await client.query("UPDATE anime_episodes SET server_name = 'ZONAAPS' WHERE server_name ILIKE '%zonaap%'");
  console.log('Updated rows:', res.rowCount);
  await client.end();
}
run().catch(console.error);

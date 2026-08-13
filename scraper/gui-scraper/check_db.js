const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
});

async function run() {
  await client.connect();
  const res = await client.query(`SELECT * FROM anime_episodes WHERE search_title ILIKE '%Opposite%' OR search_title ILIKE '%Polar%'`);
  console.log("DB Matches:", res.rows.length);
  res.rows.forEach(r => console.log(r.search_title, r.episode_number));
  await client.end();
}
run();

const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres' });
client.connect().then(() => client.query("SELECT episode_number, season_number, episode_name FROM anime_episodes WHERE search_title = 'el mentalista' ORDER BY episode_number LIMIT 5").then(res => { console.log(res.rows); client.end(); }));

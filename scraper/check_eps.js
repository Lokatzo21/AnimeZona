const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
});

async function run() {
    try {
        await client.connect();
        const check = await client.query("SELECT episode_number, season_number, episode_name FROM anime_episodes WHERE search_title = 'el mentalista' AND episode_number > 20 ORDER BY episode_number LIMIT 10");
        console.log(check.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();

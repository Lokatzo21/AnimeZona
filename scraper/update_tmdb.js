const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
});

async function run() {
    try {
        await client.connect();
        
        const update = await client.query("UPDATE anime_episodes SET anime_tmdb_id = '5920' WHERE search_title = 'el mentalista'");
        console.log("Updated " + update.rowCount + " rows.");

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();

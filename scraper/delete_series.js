const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
});

async function run() {
    try {
        await client.connect();
        
        const delEps = await client.query("DELETE FROM anime_episodes WHERE search_title ILIKE '%Así aprenderás%'");
        console.log("Deleted episodes: " + delEps.rowCount);
        
        const delCustom = await client.query("DELETE FROM custom_animes WHERE title ILIKE '%Así aprenderás%'");
        console.log("Deleted custom animes: " + delCustom.rowCount);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();

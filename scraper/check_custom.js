const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
});

async function run() {
    try {
        await client.connect();
        
        const check = await client.query("SELECT * FROM custom_animes WHERE title ILIKE '%mentalista%'");
        console.log(check.rows);
        
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();

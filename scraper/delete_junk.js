const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
});

async function run() {
    try {
        await client.connect();
        
        const delCustom = await client.query("DELETE FROM custom_animes WHERE title ILIKE '%Página no encontrada%' OR title ILIKE '%Desconocido%'");
        console.log("Deleted custom animes: " + delCustom.rowCount);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();

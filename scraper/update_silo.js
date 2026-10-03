const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
});

async function run() {
    try {
        await client.connect();
        
        const update = await client.query(`
            UPDATE custom_animes 
            SET description = 'En un futuro arruinado y tóxico, existe una comunidad en un enorme silo subterráneo cientos de pisos bajo tierra. Ahí, hombres y mujeres viven en una sociedad llena de reglas que creen que están hechas para protegerlos.' 
            WHERE title ILIKE '%Silo%'
        `);
        console.log("Updated rows: " + update.rowCount);

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();

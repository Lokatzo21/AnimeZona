const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
});

async function run() {
    try {
        await client.connect();
        
        const check = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'custom_animes'");
        console.log(check.rows);
        
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();

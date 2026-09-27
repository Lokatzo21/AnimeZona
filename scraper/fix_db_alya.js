const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'
});

async function fix() {
    try {
        await client.connect();
        const query = `
          UPDATE anime_episodes 
          SET server_name = 'ZONAAP', language = 'latino' 
          WHERE search_title = 'alya sometimes hides her feelings in russian'
        `;
        const res = await client.query(query);
        console.log(`[EXITO] Corregidos ${res.rowCount} episodios en la base de datos.`);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

fix();

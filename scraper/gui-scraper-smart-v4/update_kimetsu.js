const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres' }); 
client.connect()
    .then(() => client.query("UPDATE anime_episodes SET anime_tmdb_id = '85937' WHERE search_title = 'kimetsu no yaiba'"))
    .then(res => { console.log('Rows updated:', res.rowCount); client.end(); })
    .catch(e => { console.error(e.message); client.end(); });

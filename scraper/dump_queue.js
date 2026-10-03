const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 
c.connect().then(async ()=>{
    const r = await c.query("SELECT DISTINCT title, anime_tmdb_id, status, logs FROM scraping_queue");
    console.log(r.rows);
    c.end();
});

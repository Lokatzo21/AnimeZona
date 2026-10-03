const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 
c.connect().then(async ()=>{
    const r = await c.query("DELETE FROM anime_episodes WHERE search_title LIKE '%:%'");
    console.log('Borrados:', r.rowCount);
    c.end();
});

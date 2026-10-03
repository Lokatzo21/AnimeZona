const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 
c.connect().then(async ()=>{
    const r = await c.query("SELECT * FROM anime_episodes WHERE search_title = 'frieren: más allá del final del viaje' AND episode_number = 29 LIMIT 1");
    console.log(r.rows[0]);
    c.end();
});

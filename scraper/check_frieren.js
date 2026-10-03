const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 
c.connect().then(async ()=>{
    const r = await c.query("SELECT id, episode_number, season_number, server_name FROM anime_episodes WHERE search_title = 'frieren: más allá del final del viaje' AND episode_number >= 28 ORDER BY episode_number ASC");
    console.log(r.rows);
    c.end();
});

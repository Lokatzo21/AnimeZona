const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 
c.connect().then(async ()=>{
    const r1 = await c.query("SELECT setval('anime_episodes_id_seq', (SELECT MAX(id) FROM anime_episodes));");
    console.log("Sequence fixed:", r1.rows[0]);
    c.end();
});

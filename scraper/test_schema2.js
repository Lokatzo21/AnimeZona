const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 
c.connect().then(async ()=>{
    const r1 = await c.query("SELECT MAX(id) FROM anime_episodes");
    const r2 = await c.query("SELECT last_value FROM anime_episodes_id_seq");
    console.log("Max ID:", r1.rows[0]);
    console.log("Sequence:", r2.rows[0]);
    c.end();
});

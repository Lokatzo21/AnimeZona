const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 
c.connect().then(async ()=>{
    const r = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log(r.rows.map(x => x.table_name));
    c.end();
});

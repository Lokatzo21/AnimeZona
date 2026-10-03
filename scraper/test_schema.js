const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 
c.connect().then(()=>c.query("SELECT * FROM information_schema.columns WHERE table_name = 'anime_episodes'")).then(r=>{console.log(r.rows.map(x => `${x.column_name}: ${x.column_default} (${x.data_type})`)); c.end();});

const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 
c.connect().then(async ()=>{
    const r = await c.query("SELECT COUNT(*) FROM anime_episodes WHERE search_title = 'el mentalista'");
    console.log("El mentalista:", r.rows[0].count);
    
    const r2 = await c.query("SELECT search_title, COUNT(*) FROM anime_episodes GROUP BY search_title ORDER BY COUNT(*) DESC LIMIT 10");
    console.log(r2.rows);
    c.end();
});

const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 
c.connect().then(async ()=>{
    const epTitles = await c.query("SELECT DISTINCT search_title FROM anime_episodes");
    const animes = await c.query("SELECT title FROM custom_animes");
    console.log("Episodes Titles:", epTitles.rows.map(x=>x.search_title));
    console.log("Custom Animes Titles:", animes.rows.map(x=>x.title));
    c.end();
});

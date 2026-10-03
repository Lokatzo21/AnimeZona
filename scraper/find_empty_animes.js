const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 
c.connect().then(async ()=>{
    const r = await c.query(`
        SELECT c.title, c.id 
        FROM custom_animes c
        WHERE NOT EXISTS (
            SELECT 1 
            FROM anime_episodes a 
            WHERE a.anime_tmdb_id = c.id 
               OR c.title ILIKE '%' || a.search_title || '%'
               OR a.search_title ILIKE '%' || c.title || '%'
        )
    `);
    console.log("Animes sin episodios:", r.rows);
    c.end();
});

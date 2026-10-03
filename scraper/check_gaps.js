const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 
c.connect().then(async ()=>{
    const r = await c.query("SELECT id, search_title, created_at FROM anime_episodes ORDER BY id ASC");
    let missing = [];
    let lastId = 0;
    for(let row of r.rows) {
        if(lastId > 0 && row.id > lastId + 1) {
            missing.push({ from: lastId, to: row.id, gap: row.id - lastId - 1, before: r.rows.find(x => x.id===lastId).search_title, after: row.search_title });
        }
        lastId = row.id;
    }
    console.log(missing.sort((a,b) => b.gap - a.gap).slice(0, 10));
    c.end();
});

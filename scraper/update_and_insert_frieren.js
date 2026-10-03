const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 

const data = [
  { ep: 29, name: '¿Nos ponemos en marcha?', url: 'https://ia600903.us.archive.org/2/items/sousou-no-frien/2x01%20-¿Nos%20ponemos%20en%20marcha.mp4' },
  { ep: 30, name: 'El Héroe del Sur', url: 'https://ia600903.us.archive.org/2/items/sousou-no-frien/2x02%20-%20El%20Héroe%20del%20Sur.mp4' },
  { ep: 31, name: 'Su lugar favorito', url: 'https://ia600903.us.archive.org/2/items/sousou-no-frien/2x03%20-%20Su%20lugar%20favorito.mp4' },
  { ep: 32, name: 'La tierra natal de otros', url: 'https://ia600903.us.archive.org/2/items/sousou-no-frien/2x04%20-%20La%20tierra%20natal%20de%20otros.mp4' },
  { ep: 33, name: 'Logística en la altiplanicie norte', url: 'https://ia600903.us.archive.org/2/items/sousou-no-frien/2x05%20-%20Logística%20en%20la%20altiplanicie%20norte.mp4' },
  { ep: 34, name: 'Una solicitud para matar demonios', url: 'https://ia600903.us.archive.org/2/items/sousou-no-frien/2x06%20-%20Una%20solicitud%20para%20matar%20demonios.mp4' },
  { ep: 35, name: 'Rivolte el Divino', url: 'https://ia600903.us.archive.org/2/items/sousou-no-frien/2x07%20-%20Rivolte%20el%20Divino.mp4' },
  { ep: 36, name: 'Un final magnífico', url: 'https://ia600903.us.archive.org/2/items/sousou-no-frien/2x08%20-%20Un%20final%20magnífico.mp4' },
  { ep: 37, name: 'Las memorias de Himmel', url: 'https://ia600903.us.archive.org/2/items/sousou-no-frien/2x09%20-%20Las%20memorias%20de%20Himmel.mp4' },
  { ep: 38, name: 'Un bello espectáculo', url: 'https://ia600903.us.archive.org/2/items/sousou-no-frien/2x10%20-%20Un%20bello%20espectáculo.mp4' }
];

async function run() {
    await c.connect();
    
    try {
        await c.query('BEGIN');
        
        let updatedCount = 0;
        let insertedCount = 0;

        for (const item of data) {
            // 1. Update existing servers for this episode
            const resUpdate = await c.query(
                `UPDATE anime_episodes 
                 SET episode_name = $1, season_number = 2 
                 WHERE search_title = 'frieren: más allá del final del viaje' AND episode_number = $2`,
                [item.name, item.ep]
            );
            updatedCount += resUpdate.rowCount;
            
            // 2. Insert new ARCHIVE server
            const resInsert = await c.query(
                `INSERT INTO anime_episodes 
                 (search_title, episode_number, season_number, server_name, video_url, episode_name, language, anime_tmdb_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                ['frieren: más allá del final del viaje', item.ep, 2, 'ARCHIVE', item.url, item.name, 'latino', '209867']
            );
            insertedCount += resInsert.rowCount;
        }
        
        await c.query('COMMIT');
        console.log(`¡Éxito! Nombres y temporadas actualizados en ${updatedCount} enlaces existentes.`);
        console.log(`¡Éxito! Se insertaron ${insertedCount} enlaces nuevos de ARCHIVE.`);
    } catch (e) {
        await c.query('ROLLBACK');
        console.error("Error durante la operación, se hizo rollback:", e);
    } finally {
        c.end();
    }
}

run();

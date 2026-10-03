const {Client} = require('pg'); 
const c = new Client('postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres'); 

async function run() {
    await c.connect();
    
    try {
        await c.query('BEGIN');
        
        // 1. Borrar los enlaces del episodio 29
        const resDelete = await c.query(
            "DELETE FROM anime_episodes WHERE search_title = 'frieren: más allá del final del viaje' AND episode_number = 29"
        );
        console.log(`Borrados ${resDelete.rowCount} servidores del episodio 29.`);
        
        // 2. Mover todos los episodios del 30 al 39 un número hacia abajo
        const resUpdate = await c.query(
            "UPDATE anime_episodes SET episode_number = episode_number - 1 WHERE search_title = 'frieren: más allá del final del viaje' AND episode_number >= 30"
        );
        console.log(`Actualizados (desplazados) ${resUpdate.rowCount} servidores correspondientes a los episodios 30-39.`);
        
        await c.query('COMMIT');
        console.log("¡Operación completada con éxito!");
    } catch (e) {
        await c.query('ROLLBACK');
        console.error("Error durante la operación, se hizo rollback:", e);
    } finally {
        c.end();
    }
}

run();

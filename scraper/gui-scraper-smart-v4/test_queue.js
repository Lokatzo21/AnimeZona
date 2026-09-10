require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addTestJob() {
    console.log("Inyectando tarea de prueba a la cola...");
    const { data, error } = await supabase
        .from('scraping_queue')
        .insert([
            { 
                anime_tmdb_id: '85937', 
                title: 'Demon Slayer: Kimetsu no Yaiba', // Vamos a buscar uno popular para probar
                status: 'pending' 
            }
        ]);
        
    if (error) {
        console.error("Error al inyectar tarea:", error);
    } else {
        console.log("✅ Tarea agregada exitosamente a la cola de Supabase.");
        console.log("Ahora, corre 'node worker.js' para ver cómo el cerebro lo atrapa!");
    }
}

addTestJob();

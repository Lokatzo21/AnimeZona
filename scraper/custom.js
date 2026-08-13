const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Client } = require('pg');

async function runScraper() {
  const animeTitle = process.argv[2];
  const episode = process.argv[3];
  const targetUrl = process.argv[4];

  if (!animeTitle || !episode || !targetUrl) {
    console.log("⚠️ Uso incorrecto.");
    console.log("Ejemplo: node custom.js \"solo leveling\" 1 \"https://pagina-de-anime.com/ver/video\"");
    return;
  }

  console.log(`[🤖] Iniciando Scraper de Videos Profundos...`);
  console.log(`[🤖] Destino: ${targetUrl}`);
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  try {
    console.log(`[🤖] Navegando a la página...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log(`[🤖] Esperando 5 segundos para que carguen los reproductores ocultos...`);
    // Darle tiempo al reproductor de cargar
    await new Promise(r => setTimeout(r, 5000));
    
    let bestUrl = null;

    // Buscar en TODOS los iframes y sub-ventanas de la página
    const frames = page.frames();
    console.log(`[🤖] Analizando ${frames.length} ventanas internas (iframes)...`);

    for (const frame of frames) {
      try {
        // Buscamos directamente la etiqueta <video> y su src (exactamente lo que haces tú manualmente)
        const videoSrc = await frame.evaluate(() => {
          const videoElement = document.querySelector('video');
          if (videoElement && videoElement.src) {
            return videoElement.src;
          }
          // Si hay tags de <source> dentro del video
          const sourceElement = document.querySelector('video source');
          if (sourceElement && sourceElement.src) {
            return sourceElement.src;
          }
          return null;
        });

        if (videoSrc && videoSrc.includes('http')) {
          bestUrl = videoSrc;
          console.log(`[🎯] ¡BINGO! Encontré la etiqueta <video> en un iframe.`);
          break; // Nos salimos del ciclo apenas encontremos el primero bueno
        }
      } catch (e) {
        // Ignorar iframes que no nos dejan leerlos (Cross-Origin sin permisos)
      }
    }

    if (!bestUrl) {
       console.log(`[❌] No pude encontrar la etiqueta <video>. Puede que el video cargue al darle "Play".`);
       await browser.close();
       return;
    }

    console.log(`[✅] Video crudo extraído: ${bestUrl}`);

    // Guardar en Supabase
    console.log(`[🤖] Conectando a Supabase para guardar...`);
    const client = new Client({
      connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
    });
    await client.connect();
    
    await client.query(`
      INSERT INTO anime_episodes (search_title, episode_number, server_name, video_url)
      VALUES ($1, $2, $3, $4)
    `, [animeTitle.toLowerCase(), parseInt(episode, 10), "Supabase Demo (Latino)", bestUrl]);
    
    console.log(`[🎉] ¡ÉXITO! El episodio ${episode} de ${animeTitle} se guardó en tu base de datos.`);
    await client.end();

  } catch(e) {
    console.error(`[❌] Hubo un error:`, e.message);
  } finally {
    setTimeout(async () => {
      await browser.close();
    }, 2000);
  }
}

runScraper();

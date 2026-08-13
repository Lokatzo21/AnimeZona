const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Client } = require('pg');

async function runScraper() {
  const animeTitle = process.argv[2];
  const episode = process.argv[3];

  if (!animeTitle || !episode) {
    console.log("⚠️ Uso incorrecto.");
    console.log("Ejemplo: node index.js \"solo leveling\" 1");
    return;
  }

  console.log(`[🤖] Iniciando Scraper Semi-Automático...`);
  console.log(`[🤖] Buscando: ${animeTitle} - Episodio ${episode} (Latino)`);
  
  // headless: false abre el navegador visiblemente para que pases Cloudflare
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Buscamos en AnimeFLV
    const searchUrl = `https://www3.animeflv.net/browse?q=${encodeURIComponent(animeTitle + " latino")}`;
    console.log(`[🤖] Navegando a: ${searchUrl}`);
    console.log(`[⚠️] Si ves Cloudflare, por favor resuélvelo en la ventana que se abrió.`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // 2. Extraer slug
    const html = await page.content();
    let slugMatch = html.match(/<a href="\/anime\/([^"]+)">/);
    
    if (!slugMatch) {
       console.log(`[🤖] No se encontró versión latino. Buscando normal...`);
       await page.goto(`https://www3.animeflv.net/browse?q=${encodeURIComponent(animeTitle)}`, { waitUntil: 'networkidle2' });
       const html2 = await page.content();
       slugMatch = html2.match(/<a href="\/anime\/([^"]+)">/);
    }

    if (!slugMatch) {
       console.log(`[❌] No se encontró el anime "${animeTitle}" en AnimeFLV.`);
       await browser.close();
       return;
    }

    const slug = slugMatch[1];
    console.log(`[🤖] Slug encontrado: ${slug}`);

    // 3. Navegar al episodio
    const epUrl = `https://www3.animeflv.net/ver/${slug}-${episode}`;
    console.log(`[🤖] Yendo al episodio: ${epUrl}`);
    await page.goto(epUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // 4. Extraer videos
    const epHtml = await page.content();
    const videoMatch = epHtml.match(/var videos = ({.*?});/);
    
    let bestUrl = null;
    let serverName = null;

    if (videoMatch) {
      const videosObj = JSON.parse(videoMatch[1]);
      
      // Intentar audio LAT, luego SUB
      const tracks = videosObj["LAT"] || videosObj["SUB"] || [];
      
      if (tracks.length > 0) {
        bestUrl = tracks[0].code.replace(/&amp;/g, "&");
        serverName = tracks[0].title || 'AnimeFLV';
        console.log(`[✅] Video extraído exitosamente: ${bestUrl}`);
      } else {
        console.log(`[❌] No hay servidores disponibles para este episodio.`);
      }
    } else {
      console.log(`[❌] No se pudo encontrar el código de videos. Quizás la página cambió.`);
    }

    // 5. Guardar en Supabase
    if (bestUrl) {
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
      console.log(`[🎉] Ya puedes ir a tu página y reproducirlo.`);
      await client.end();
    }

  } catch(e) {
    console.error(`[❌] Hubo un error:`, e.message);
  } finally {
    // Mantener abierto unos segundos para ver qué pasó antes de cerrar
    setTimeout(async () => {
      await browser.close();
    }, 3000);
  }
}

runScraper();

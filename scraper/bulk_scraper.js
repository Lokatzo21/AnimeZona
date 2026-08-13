const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Client } = require('pg');

async function runBulkScraper() {
  const seriesUrl = process.argv[2];

  if (!seriesUrl || !seriesUrl.includes('http')) {
    console.log("⚠️ Uso incorrecto.");
    console.log("Ejemplo: node bulk_scraper.js \"https://zonaaps.com/tvshows/solo-leveling/\"");
    return;
  }

  console.log(`[🤖] Iniciando Scraper Masivo (Nivel Dios)...`);
  console.log(`[🤖] Analizando serie en: ${seriesUrl}`);
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Ir a la página de la serie
    console.log(`[🤖] Navegando a la página principal...`);
    await page.goto(seriesUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // 2. Extraer Título del Anime
    let animeTitle = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (h1) return h1.innerText.trim();
      return "Anime Desconocido"; 
    });
    
    // Limpiar el título quitando cosas como "(Latino - Sub)" para que coincida con tu BD
    animeTitle = animeTitle.replace(/\s*\(.*?\)/g, '').trim();
    
    console.log(`[🤖] Título detectado y limpiado: ${animeTitle}`);

    // 3. Extraer todos los enlaces de episodios
    console.log(`[🤖] Buscando episodios...`);
    const episodesFound = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const episodeData = [];
      
      links.forEach(link => {
        const url = link.href;
        if (url && (url.includes('episode') || url.includes('episodio') || url.match(/\d+x\d+/))) {
          const match = url.match(/\d+x(\d+)/);
          let epNum = null;
          
          if (match) {
            epNum = parseInt(match[1], 10);
          } else {
            const numMatch = url.match(/-(\d+)\/?$/);
            if (numMatch) epNum = parseInt(numMatch[1], 10);
          }

          if (epNum && !episodeData.find(e => e.epNum === epNum)) {
            episodeData.push({ epNum, url });
          }
        }
      });
      return episodeData;
    });

    if (episodesFound.length === 0) {
      console.log(`[❌] No se encontraron enlaces de episodios en esta página. Asegúrate de que los episodios estén visibles.`);
      await browser.close();
      return;
    }

    // Ordenar de menor a mayor
    episodesFound.sort((a, b) => a.epNum - b.epNum);
    console.log(`[✅] Se encontraron ${episodesFound.length} episodios en la página.`);

    // 4. Conectar a Base de Datos para ver cuáles ya existen
    const client = new Client({
      connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
    });
    await client.connect();

    const { rows } = await client.query(`
      SELECT episode_number FROM anime_episodes 
      WHERE search_title = $1
    `, [animeTitle.toLowerCase()]);
    
    const existingEpisodes = rows.map(r => r.episode_number);
    console.log(`[🤖] Tienes ${existingEpisodes.length} episodios de esta serie guardados en tu base de datos.`);

    // 5. Procesar los que faltan
    for (const ep of episodesFound) {
      if (existingEpisodes.includes(ep.epNum)) {
        console.log(`[⏭️] Saltando Episodio ${ep.epNum} (Ya lo tienes en la base de datos)`);
        continue;
      }

      console.log(`[📥] Extrayendo Episodio ${ep.epNum}...`);
      
      try {
        epPage = await browser.newPage();
        
        // ¡Bloqueador de Pop-ups Extremo!
        // Evita que la página abra pestañas "about:blank" o anuncios que te roban la pantalla
        await epPage.evaluateOnNewDocument(() => {
          window.open = () => null;
        });

        await epPage.goto(ep.url, { waitUntil: 'networkidle2', timeout: 60000 });
        await epPage.bringToFront(); // Forzar que esta pestaña esté siempre al frente
        
        // Configurar el rastreador de red (Network Interception)
        let networkVideoUrl = null;
        epPage.on('request', request => {
          const url = request.url();
          if (url.includes('.mp4') || url.includes('.m3u8')) {
            // Ignorar anuncios o cosas que sepamos que no son el video
            if (!url.includes('banner') && !url.includes('ad')) {
              networkVideoUrl = url;
            }
          }
        });

        // Intentar seleccionar la opción "Latino" antes de extraer
        console.log(`[🤖] Buscando la opción de idioma "Latino"...`);
        await epPage.evaluate(() => {
          // Buscar botones, pestañas o elementos de la lista de servidores
          const elements = Array.from(document.querySelectorAll('li, a, button, div.server, span'));
          for (const el of elements) {
            const text = el.innerText ? el.innerText.toLowerCase() : '';
            if (text.includes('latino') && !text.includes('sub')) {
              el.click();
              break;
            }
          }
        });

        // Esperar reproductores
        console.log(`[⏳] Cargando página (10s). ¡Si ves un botón de Play, DALE CLIC TÚ MISMO rápido para ayudar al robot!`);
        await new Promise(r => setTimeout(r, 10000));
        
        let bestUrl = networkVideoUrl;

        // Función interna para buscar en los frames por si acaso la red no lo capturó
        const searchVideoInFrames = async () => {
          const frames = epPage.frames();
          for (const frame of frames) {
            try {
              const videoSrc = await Promise.race([
                frame.evaluate(() => {
                  const videoElement = document.querySelector('video');
                  if (videoElement && videoElement.src) return videoElement.src;
                  const sourceElement = document.querySelector('video source');
                  if (sourceElement && sourceElement.src) return sourceElement.src;
                  return null;
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000))
              ]);

              if (videoSrc && videoSrc.includes('http')) {
                return videoSrc;
              }
            } catch (e) {
              // Ignorar
            }
          }
          return null;
        };

        if (!bestUrl) {
          bestUrl = await searchVideoInFrames();
        }

        // Si no lo encontró a la primera, simulamos un clic para "despertar" al reproductor
        if (!bestUrl) {
           console.log(`[🤖] El reproductor está dormido (Falta el src). Intentando forzar el Play automáticamente...`);
           try {
             // Encontrar el iframe y hacer clic justo en el centro de ese iframe
             const iframeHandle = await epPage.$('iframe');
             if (iframeHandle) {
               const box = await iframeHandle.boundingBox();
               if (box) {
                 await epPage.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                 console.log(`[🤖] Clic automático realizado en el centro del reproductor.`);
               }
             } else {
               await epPage.mouse.click(500, 300); // Fallback
             }
             
             console.log(`[⏳] Esperando 8 segundos extra a que cargue el video (¡AYÚDAME Y DALE CLIC TÚ SI VES EL PLAY!)...`);
             await new Promise(r => setTimeout(r, 8000));
             
             // Volvemos a revisar si la red lo atrapó o si el DOM se actualizó
             bestUrl = networkVideoUrl || await searchVideoInFrames();
           } catch (e) {
             console.log(`[⚠️] No se pudo hacer clic automático.`);
           }
        }

        if (bestUrl) {
          console.log(`[✅] Video extraído: ${bestUrl}`);
          await client.query(`
            INSERT INTO anime_episodes (search_title, episode_number, server_name, video_url)
            VALUES ($1, $2, $3, $4)
          `, [animeTitle.toLowerCase(), ep.epNum, "Supabase Demo (Latino)", bestUrl]);
          console.log(`[🎉] Episodio ${ep.epNum} guardado exitosamente.`);
        } else {
          console.log(`[❌] No se pudo extraer el video del Episodio ${ep.epNum}. Puede que necesites darle Play manualmente.`);
        }
      } catch (navigationError) {
        console.log(`[⚠️] Error en el Episodio ${ep.epNum}: ${navigationError.message}. Saltando al siguiente...`);
      } finally {
        if (epPage) {
          try { await epPage.close(); } catch(e) {}
        }
      }
    }

    console.log(`[🏆] ¡ESCANEO COMPLETADO! Todo actualizado.`);
    await client.end();

  } catch(e) {
    console.error(`[❌] Hubo un error crítico:`, e.message);
  } finally {
    setTimeout(async () => {
      await browser.close();
    }, 2000);
  }
}

runBulkScraper();

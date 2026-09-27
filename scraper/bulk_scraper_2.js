const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true, interceptResolutionPriority: 0 }));
const { Client } = require('pg');
const fs = require('fs'); // CRITICAL RESTORE

// Ignorar TODOS los errores que contengan Target closed o Protocol error
process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.message && (reason.message.includes('Target closed') || reason.message.includes('Protocol error'))) {
    // Silencio absoluto
  } else {
    console.error('Unhandled Rejection:', reason);
  }
});

async function runBulkScraper() {
  const seriesUrl = process.argv[2];

  if (!seriesUrl || !seriesUrl.includes('http')) {
    console.log("⚠️ Uso incorrecto.");
    console.log("Ejemplo: node bulk_scraper.js \"https://zonaaps.com/tvshows/solo-leveling/\"");
    return;
  }

  console.log(`[🤖] Iniciando Scraper Masivo (Nivel Dios)...`);
  console.log(`[🤖] Analizando serie en: ${seriesUrl}`);
  
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  let edgePath = edgePaths.find(p => fs.existsSync(p));

  const path = require('path');
  const ublockPath = path.join(__dirname, 'ublock', 'uBlock0.chromium');

  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    executablePath: edgePath || undefined, // Usa Edge si existe, si no, usa Chromium
    args: [
      `--disable-extensions-except=${ublockPath}`,
      `--load-extension=${ublockPath}`
    ]
  });
  
  // Cerrar cualquier pestaña emergente (popups) inmediatamente
  browser.on('targetcreated', async target => {
     if (target.type() === 'page') {
        const opener = target.opener();
        if (opener) {
           console.log(`[🛡️] Bloqueando ventana emergente publicitaria...`);
           try { 
              const newPage = await target.page();
              if (newPage) {
                  // Darle 1 segundo al Stealth Plugin para inicializarse y evitar que crashee
                  setTimeout(async () => {
                      try { await newPage.close(); } catch(e) {}
                  }, 1000);
              } 
           } catch(e) {}
        }
     }
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

        await epPage.goto(ep.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => {
            if (e.message.includes('detached')) {
                console.log(`[🤖] (Aviso) Navegación interrumpida por un frame bloqueado, continuando...`);
            } else {
                throw e;
            }
        });
        await epPage.bringToFront(); // Forzar que esta pestaña esté siempre al frente
        
        // Configurar el rastreador de red (Network Interception)
        let networkVideoUrl = null;
        let foundVipUrl = false;
        
        epPage.on('request', request => {
          const url = request.url();
          if (url.includes('.mp4') || url.includes('.m3u8')) {
             // Ignorar los trackers de JWPlayer que contienen el link en sus parámetros
             if (url.includes('ping.gif') || url.includes('jwpltx.com')) {
                 return; 
             }
             
             if (url.includes('1a-1791.com') || url.includes('rumble.cloud')) {
                 networkVideoUrl = url;
                 foundVipUrl = true; // Solo guardamos si es VIP estricto
             }
          }
        });

        let bestUrl = null;
        
        // Bucle "Infinito" de intentos hasta que logre sacar el enlace
        for (let attempt = 1; attempt <= 999; attempt++) {
            if (attempt > 1) {
                console.log(`[🤖] El reproductor parece haberse trabado. Reiniciando secuencia (Intento ${attempt})...`);
            }

            // Truco de las pestañas: Opción 2 -> Opción 1 -> Opción 2
            console.log(`[🤖] Seleccionando la 'Opción 2' (Servidor seguro de ZonaAPS)...`);
            await epPage.evaluate(() => {
              const elements = Array.from(document.querySelectorAll('#playeroptionsul li, .dooplay_player_option'));
              const opt2 = elements.find(el => el.innerText && (el.innerText.toLowerCase().includes('opción 2') || el.innerText.toLowerCase().includes('opcion 2')));
              if (opt2) { opt2.click(); const a = opt2.querySelector('a'); if(a) a.click(); }
            });
            
            await new Promise(r => setTimeout(r, 800)); 
            
            console.log(`[🤖] Seleccionando la 'Opción 1' para resetear el iframe...`);
            await epPage.evaluate(() => {
              const elements = Array.from(document.querySelectorAll('#playeroptionsul li, .dooplay_player_option'));
              const opt1 = elements.find(el => el.innerText && (el.innerText.toLowerCase().includes('opción 1') || el.innerText.toLowerCase().includes('opcion 1')));
              if (opt1) { opt1.click(); const a = opt1.querySelector('a'); if(a) a.click(); }
            });
            
            await new Promise(r => setTimeout(r, 800)); 
            
            console.log(`[🤖] Seleccionando la 'Opción 2' de nuevo y definitivamente...`);
            await epPage.evaluate(() => {
              const elements = Array.from(document.querySelectorAll('#playeroptionsul li, .dooplay_player_option'));
              let clicked = false;
              // 1. Clic definitivo en Opción 2
              for (const el of elements) {
                const text = el.innerText ? el.innerText.toLowerCase() : '';
                if (text.includes('opción 2') || text.includes('opcion 2')) {
                  el.click();
                  const a = el.querySelector('a');
                  if(a) a.click();
                  clicked = true;
                  break;
                }
              }
              // 2. Fallback si no hay Opción 2
              if (!clicked) {
                 for (const el of elements) {
                    const text = el.innerText ? el.innerText.toLowerCase() : '';
                    if (!text.includes('auto embed') && !text.includes('auto_embed')) {
                       el.click();
                       const a = el.querySelector('a');
                       if(a) a.click();
                       break;
                    }
                 }
              }
            });
            
            await new Promise(r => setTimeout(r, 2000)); // Dar tiempo a que el iframe aparezca en el DOM
            
            console.log(`[🤖] Dando clic de Play directamente en el botón de JWPlayer...`);
            const allFrames = epPage.frames();
            for (let f of allFrames) {
                if (!f.isDetached()) {
                    f.evaluate(() => {
                        const playBtn = document.querySelector('.jw-icon-display, [aria-label="Reproducir"], .vjs-big-play-button');
                        if (playBtn) playBtn.click();
                        
                        // Asegurar también que los videos arranquen si se puede
                        const vids = document.querySelectorAll('video');
                        vids.forEach(v => { try { v.play(); } catch(e){} });
                    }).catch(e=>{});
                }
            }

            // Función interna para buscar en los frames por si acaso la red no lo capturó
            const searchVideoInFrames = async () => {
              const frames = epPage.frames();
              for (const frame of frames) {
                if (frame.isDetached()) continue; // Prevenir errores de frame desconectado
                try {
                  const videoSrc = await Promise.race([
                    frame.evaluate(() => {
                      // 1. Intentar robar el link directo desde la configuración de JWPlayer (Evita Ads)
                      try {
                        if (typeof jwplayer === 'function') {
                           const playlist = jwplayer().getPlaylist();
                           if (playlist && playlist.length > 0) {
                              const item = playlist[0];
                              const sources = item.sources || item.file;
                              if (Array.isArray(sources)) {
                                 const best = sources.find(s => s.file && (s.file.includes('1a-1791.com') || s.file.includes('rumble.cloud')));
                                 if (best) return best.file;
                              } else if (typeof sources === 'string' && (sources.includes('1a-1791.com') || sources.includes('rumble.cloud'))) {
                                 return sources;
                              }
                           }
                        }
                      } catch(e) {}

                      // 2. Buscar etiquetas de video normales
                      const videoElement = document.querySelector('video');
                      if (videoElement && videoElement.src && (videoElement.src.includes('1a-1791.com') || videoElement.src.includes('rumble.cloud'))) return videoElement.src;
                      const sourceElement = document.querySelector('video source');
                      if (sourceElement && sourceElement.src && (sourceElement.src.includes('1a-1791.com') || sourceElement.src.includes('rumble.cloud'))) return sourceElement.src;
                      return null;
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000))
                  ]);

                  if (videoSrc && videoSrc.includes('http')) {
                    return videoSrc;
                  }
                } catch (e) {
                  // Ignorar errores de frames desconectados (detached)
                }
              }
              return null;
            };

            // Ciclo de espera rápida (hasta 15s) pero validando constantemente
            let waitTime = 0;
            bestUrl = networkVideoUrl;
            
            while (!bestUrl && waitTime < 15000) {
                await new Promise(r => setTimeout(r, 1000));
                waitTime += 1000;
                bestUrl = networkVideoUrl || await searchVideoInFrames();
            }
            
            if (bestUrl) {
                break; // Lo encontró, salimos del bucle de intentos
            }
        }

        if (bestUrl) {
          // --- RUTINA ANTI-TRAMPAS (NIVEL DIOS DEFINITIVO) ---
          
          if (bestUrl.includes('1a-1791.com') || bestUrl.includes('rumble.cloud')) {
              // Magia Negra: Forzamos la estructura pura del archivo.
              // El regex busca la ÚLTIMA barra, extrae el ID y descarta todo lo demás.
              // Ejemplo: .../O/ab8Oz.caa.tar -> .../O/ab8Oz.aaa.mp4
              bestUrl = bestUrl.replace(/\/([^\/\.]+)\.[^\/]*$/i, '/$1.aaa.mp4');
          }
          
          console.log(`[✅] Video extraído: ${bestUrl}`);
          await client.query(`
            INSERT INTO anime_episodes (search_title, episode_number, server_name, language, video_url)
            VALUES ($1, $2, $3, $4, $5)
          `, [animeTitle.toLowerCase(), ep.epNum, "ZONAAP", "latino", bestUrl]);
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
      if (typeof browser !== 'undefined' && browser !== null) {
          try { await browser.close(); } catch(e) {}
      }
    }, 2000);
  }
}

runBulkScraper();

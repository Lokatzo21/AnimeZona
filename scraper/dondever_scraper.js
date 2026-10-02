const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true, interceptResolutionPriority: 0 }));
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.message && (reason.message.includes('Target closed') || reason.message.includes('Protocol error'))) {
    // Silencio
  } else {
    console.error('Unhandled Rejection:', reason);
  }
});

async function runScraper() {
    const targetUrl = process.argv[2];
    const modoNum = process.argv[3]; // "2" = numeración absoluta
    
    if (!targetUrl || !targetUrl.includes('dondever.net')) {
        console.log("⚠️ Uso incorrecto. Proporciona una URL válida de dondever.net (ej: https://dondever.net/tvshows/el-mentalista/)");
        return;
    }

    console.log(`[🤖] Iniciando Scraper DondeVer...`);
    console.log(`[🤖] Analizando URL: ${targetUrl}`);

    const client = new Client({
        connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
    });
    await client.connect();

    const edgePaths = [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    let edgePath = edgePaths.find(p => fs.existsSync(p));
    const ublockPath = path.join(__dirname, 'ublock', 'uBlock0.chromium');

    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        executablePath: edgePath || undefined,
        args: [
          `--disable-extensions-except=${ublockPath}`,
          `--load-extension=${ublockPath}`,
          `--disable-features=msSmartScreenProtection`,
          `--safebrowsing-disable-download-protection`,
          `--disable-client-side-phishing-detection`,
          `--disable-site-isolation-trials`,
          `--disable-web-security`
        ]
    });

    const page = await browser.newPage();
    
    // Bloquear popups
    browser.on('targetcreated', async target => {
        if (target.type() === 'page') {
            const opener = target.opener();
            if (opener) {
                try { 
                    const newPage = await target.page();
                    if (newPage) {
                        setTimeout(async () => {
                            try { await newPage.close(); } catch(e) {}
                        }, 500);
                    } 
                } catch(e) {}
            }
        }
    });

    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        let seriesTitle = await page.evaluate(() => {
            const metaOg = document.querySelector('meta[property="og:title"]');
            if (metaOg) return metaOg.content.replace(/ - DondeVer.*$/i, '').trim();
            const h1 = document.querySelector('h1');
            return h1 ? h1.innerText.trim() : "Desconocido";
        });
        
        // Remover formatos "2x01", "2x1", etc., y limpiar los dos puntos o guiones que queden sueltos al final
        seriesTitle = seriesTitle.replace(/\d+x\d+/i, '').replace(/[\s:\-]+$/, '').trim();
        
        if (seriesTitle.toLowerCase().includes('página no encontrada') || seriesTitle.toLowerCase().includes('page not found') || seriesTitle.toLowerCase().includes('desconocido')) {
            console.log(`[❌] ERROR CRÍTICO: El enlace que pusiste no existe en DondeVer (Error 404). Verifica que copiaste bien la URL.`);
            await client.end();
            setTimeout(async () => {
                if (browser) {
                    try { await browser.close(); } catch(e) {}
                }
                process.exit(1);
            }, 1000);
            return;
        }

        console.log(`[🤖] Título detectado: ${seriesTitle}`);

        // AUTO-CREAR SERIE EN LA WEB SI NO EXISTE
        try {
            const cleanSearchTitle = seriesTitle.toLowerCase();
            const { rows: existCustom } = await client.query('SELECT id FROM custom_animes WHERE title ILIKE $1 LIMIT 1', [`%${seriesTitle}%`]);
            
            if (existCustom.length === 0) {
                console.log(`[✨] Serie no encontrada en tu web. ¡Auto-creando ficha de "${seriesTitle}"!`);
                
                // Extraer metadata de la pgina
                const metaData = await page.evaluate(() => {
                    let img = 'https://via.placeholder.com/225x318?text=No+Image';
                    let desc = 'Sin sinopsis disponible.';
                    
                    // Buscar imagen en el JSON data-nt-sources
                    const jsonScript = document.querySelector('script[data-nt-sources]');
                    if (jsonScript) {
                        try {
                            const data = JSON.parse(jsonScript.innerText);
                            if (data.cast && data.cast.img) img = data.cast.img;
                        } catch(e) {}
                    }
                    
                    // Buscar descripcion real de la serie
                    const pDesc = document.querySelector('p.nt-hero-text');
                    if (pDesc && pDesc.innerText.trim().length > 5) {
                        desc = pDesc.innerText.trim();
                    } else {
                        // Respaldo por si no tiene la clase nt-hero-text
                        const descMeta = document.querySelector('meta[property="og:description"]');
                        if (descMeta) {
                            let text = descMeta.content;
                            text = text.replace(/Ver.*?(completa|online).*?(En|en).*?(Cuevana|Cinecalidad|Dondever|Cinetux|Repelis|Seriesflix|Pelisplus|repelishd|inkapelis|Pelisplanet|Gnula).*/gi, '').trim();
                            if (text.length > 5) desc = text;
                        }
                    }
                    
                    return { img, desc };
                });
                
                const newCustomId = 'custom-' + Date.now();
                await client.query(`
                    INSERT INTO custom_animes (id, title, image, description, total_episodes, genres, status, is_secret)
                    VALUES ($1, $2, $3, $4, 1, ARRAY['Action & Adventure', 'Drama'], 'Finalizado', false)
                `, [newCustomId, seriesTitle, metaData.img, metaData.desc]);
                
                console.log(`[✅] Ficha de "${seriesTitle}" creada con xito en tu base de datos.`);
            }
        } catch(e) {
            console.log(`[⚠️] Advertencia: No se pudo auto-crear la serie en la web (${e.message})`);
        }


        console.log(`[🤖] Abriendo el reproductor...`);
        
        let modalOpen = await page.evaluate(() => !!document.querySelector('.nt-modal.is-open'));
        if (!modalOpen) {
            await page.evaluate(() => {
                const isEpisodePage = window.location.href.includes('/episodes/');
                if (isEpisodePage) {
                    // Si estamos directo en un episodio, le damos click al botón principal "Reproducir"
                    const playBox = document.querySelector('button[data-nt-play]') || document.querySelector('.nt-ep-play, .play-box, .nt-stage');
                    if (playBox) playBox.click();
                } else {
                    // Si estamos en la serie, empezamos a ver desde el botón principal
                    const empezarBtn = document.querySelector('a.nt-btn--primary[data-nt-ep]');
                    if (empezarBtn) {
                        empezarBtn.click();
                        return;
                    }
                    // Si no está, buscar una miniatura cualquiera
                    const thumbBtn = document.querySelector('.nt-ep-thumb');
                    if (thumbBtn) thumbBtn.click();
                }
            });
            
            try {
                await page.waitForSelector('.nt-modal.is-open', { timeout: 15000 });
            } catch (e) {
                console.log(`[❌] No se pudo abrir el reproductor (modal). Verifica si la página cargó correctamente.`);
                return;
            }
        }

        await new Promise(r => setTimeout(r, 2000));

        // Bucle continuo que avanza con el botón "Siguiente" DENTRO del reproductor
        while (true) {
            try {
                // Solo esperar el botón de servidor, no el iframe (porque a veces no hay iframe inicial)
                await page.waitForSelector('button[data-nt-menu-btn="server"]', { timeout: 15000 });
            } catch (e) {
                console.log(`[⚠️] El reproductor o los controles tardaron demasiado en cargar.`);
            }

            // Extraer metadatos leyendo el título dentro del modal ("El Mentalista · 1x01 · Piloto")
            const epData = await page.evaluate(() => {
                const titleEl = document.querySelector('[data-nt-titulo]');
                if(!titleEl) return null;
                const text = titleEl.innerText;
                const parts = text.split('·').map(s => s.trim());
                let s = 1, e = 1;
                if(parts[1]) {
                    const se = parts[1].split('x');
                    s = parseInt(se[0], 10) || 1;
                    e = parseInt(se[1], 10) || 1;
                }
                return { season: s, episode: e, title: parts[2] || `Episodio ${e}` };
            });

            if (!epData) {
                console.log(`[❌] No se pudieron leer los datos del episodio en el reproductor.`);
                break;
            }

            let currentEpNumToSave = epData.episode;
            
            if (modoNum === "2") {
                // Modo Absoluto: Revisar si ya existe este episodio exacto en la BD (para reutilizar su número si lo re-scrapean)
                const existingEp = await client.query(
                    `SELECT episode_number FROM anime_episodes WHERE search_title=$1 AND season_number=$2 AND episode_name=$3 LIMIT 1`,
                    [seriesTitle.toLowerCase(), epData.season, epData.title]
                );
                
                if (existingEp.rows.length > 0) {
                    currentEpNumToSave = existingEp.rows[0].episode_number;
                } else {
                    // Si es nuevo, buscar el episodio absoluto más alto de toda la serie y sumarle 1
                    const maxEpQuery = await client.query(
                        `SELECT MAX(episode_number) as max_ep FROM anime_episodes WHERE search_title=$1`,
                        [seriesTitle.toLowerCase()]
                    );
                    currentEpNumToSave = (maxEpQuery.rows[0].max_ep || 0) + 1;
                }
            }

            console.log(`\n[📥] Procesando Temporada ${epData.season} - Episodio ${currentEpNumToSave} (${epData.title})`);

            console.log(`[🤖] Seleccionando audio Latino...`);
            await page.evaluate(async () => {
                const audioBtn = document.querySelector('button[data-nt-menu-btn="audio"]');
                if(audioBtn) {
                    audioBtn.click();
                    await new Promise(r => setTimeout(r, 150));
                    const audios = Array.from(document.querySelectorAll('div[data-nt-menu="audio"] button'));
                    const latino = audios.find(b => b.innerText.toLowerCase().includes('latino'));
                    if(latino) {
                        latino.click();
                    } else {
                        audioBtn.click(); // cerrar el menú si no hay
                    }
                }
            });
            
            // Pausa reducida después de seleccionar audio
            await new Promise(r => setTimeout(r, 400));


            // ----- NUEVO: DETECCIÓN DE REPRODUCTOR MULTI-SERVIDOR INTERNO (finalizePlayer) -----
            let multiServerFound = false;
            console.log(`[🤖] Buscando reproductores internos multi-servidor (StreamWish, FileLions)...`);
            
            for (const frame of page.frames()) {
                try {
                    const content = await frame.content();
                    const match = content.match(/finalizePlayer\s*\(\s*(\{.*?\})\s*\)/);
                    if (match && match[1]) {
                        const jsonData = JSON.parse(match[1]);
                        
                        const processLangServers = async (langObj, langName) => {
                            if (!langObj) return;
                            let filelionsCount = 0;
                            let streamwishCount = 0;
                            for (const [srvKey, srvUrl] of Object.entries(langObj)) {
                                const keyUpper = srvKey.toUpperCase();
                                if (keyUpper.includes('STREAMWISH') || keyUpper.includes('FILELIONS')) {
                                    multiServerFound = true;
                                    
                                    let displayName = keyUpper.includes('STREAMWISH') ? 'STREAMWISH' : 'FILELIONS';
                                    if (keyUpper.includes('FILELIONS')) {
                                        filelionsCount++;
                                        if (filelionsCount > 1) {
                                            displayName = `FILELIONS ${filelionsCount}`;
                                        }
                                    }
                                    if (keyUpper.includes('STREAMWISH')) {
                                        streamwishCount++;
                                        if (streamwishCount > 1) {
                                            displayName = `STREAMWISH ${streamwishCount}`;
                                        }
                                    }
                                    
                                    console.log(`[✅] Servidor interno detectado: ${displayName} -> ${srvUrl}`);
                                    
                                    try {
                                        const check = await client.query(
                                            `SELECT id FROM anime_episodes WHERE search_title=$1 AND episode_number=$2 AND season_number=$3 AND server_name=$4`,
                                            [seriesTitle.toLowerCase(), currentEpNumToSave, epData.season, displayName]
                                        );
                                        
                                        if (check.rows.length === 0) {
                                            await client.query(`
                                                INSERT INTO anime_episodes (search_title, episode_number, season_number, episode_name, server_name, language, video_url, anime_tmdb_id)
                                                VALUES ($1, $2, $3, $4, $5, $6, $7, null)
                                            `, [
                                                seriesTitle.toLowerCase(), 
                                                currentEpNumToSave, 
                                                epData.season, 
                                                epData.title, 
                                                displayName, 
                                                langName, 
                                                srvUrl
                                            ]);
                                            console.log(`[🎉] Guardado en BD con éxito (${displayName}).`);
                                        } else {
                                            console.log(`[⏭️] Ya existe en la base de datos, saltando (${displayName}).`);
                                        }
                                    } catch(err) {
                                        console.error(`[❌] Error SQL:`, err.message);
                                    }
                                }
                            }
                        };
                        
                        // Procesamos los servidores del JSON en orden de preferencia de idioma
                        if (jsonData.latino) {
                            await processLangServers(jsonData.latino, "latino");
                        } else if (jsonData.subtitulado) {
                            await processLangServers(jsonData.subtitulado, "subtitulado");
                        } else if (jsonData.castellano) {
                            await processLangServers(jsonData.castellano, "castellano");
                        }
                    }
                } catch(e) {
                    // Ignorar errores de acceso al iframe cruzado si los hay
                }
            }
            
            if(!multiServerFound) {
                console.log(`[🤖] No se detectó menú interno, continuando con Servidores Externos...`);
            } else {
                console.log(`[🤖] Extracción interna completada. Buscando servidores externos adicionales...`);
            }

            // Leer lista de servidores excluyendo el "Servidor 1"
            const serversToScrape = await page.evaluate(() => {
                const btn = document.querySelector('button[data-nt-menu-btn="server"]');
                if(btn) btn.click();
                
                const srvBtns = Array.from(document.querySelectorAll('div[data-nt-menu="server"] button'));
                const results = [];
                srvBtns.forEach((b, idx) => {
                    if (!b.innerText.toLowerCase().includes('servidor 1')) {
                        results.push({ name: b.innerText.trim(), index: idx });
                    }
                });
                return results;
            });

            console.log(`[🤖] Hay ${serversToScrape.length} servidores válidos.`);

            for (const srv of serversToScrape) {
                console.log(`[🤖] Extrayendo de: ${srv.name}...`);
                
                await page.evaluate(async (idx) => {
                    const btn = document.querySelector('button[data-nt-menu-btn="server"]');
                    if(btn) btn.click();
                    await new Promise(r => setTimeout(r, 150));
                    const srvBtns = Array.from(document.querySelectorAll('div[data-nt-menu="server"] button'));
                    if(srvBtns[idx]) srvBtns[idx].click();
                }, srv.index);

                // Esperar a que cargue el nuevo iframe, tiempo fijo más rápido
                await new Promise(r => setTimeout(r, 2200));

                const iframeSrc = await page.evaluate(() => {
                    const iframe = document.querySelector('.nt-stage iframe');
                    if(iframe) return iframe.src;
                    return null;
                });

                if (iframeSrc) {
                    let finalServerName = srv.name; 
                    if (iframeSrc.includes('uqload')) finalServerName = 'Uqload';
                    else if (iframeSrc.includes('bysezoxexe')) finalServerName = 'DondeVerByse';
                    else if (iframeSrc.includes('audinifer')) finalServerName = 'Audinifer (DondeVer)';
                    else finalServerName = `DONDEVER - ${srv.name}`;

                    console.log(`[✅] Enlace: ${iframeSrc} -> (${finalServerName})`);
                    
                    try {
                        const check = await client.query(
                            `SELECT id FROM anime_episodes WHERE search_title=$1 AND episode_number=$2 AND season_number=$3 AND server_name=$4`,
                            [seriesTitle.toLowerCase(), currentEpNumToSave, epData.season, finalServerName]
                        );
                        
                        if (check.rows.length === 0) {
                            await client.query(`
                                INSERT INTO anime_episodes (search_title, episode_number, season_number, episode_name, server_name, language, video_url, anime_tmdb_id)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, null)
                            `, [
                                seriesTitle.toLowerCase(), 
                                currentEpNumToSave, 
                                epData.season, 
                                epData.title, 
                                finalServerName, 
                                "latino", 
                                iframeSrc
                            ]);
                            console.log(`[🎉] Guardado en BD con éxito.`);
                        } else {
                            console.log(`[⏭️] Ya existe en la base de datos, saltando.`);
                        }
                    } catch(err) {
                        console.error(`[❌] Error SQL:`, err.message);
                    }
                } else {
                    console.log(`[❌] No se detectó iframe embed para ${srv.name}.`);
                }
            }

            // Click al botón "Siguiente" (nt-ctl--sig) dentro del reproductor
            const hasNext = await page.evaluate(() => {
                const sigBtn = document.querySelector('.nt-ctl--sig');
                // Verificamos si existe y si no está escondido por CSS
                if (sigBtn && !sigBtn.hasAttribute('hidden') && sigBtn.offsetParent !== null) {
                    sigBtn.click();
                    return true;
                }
                return false;
            });

            if (!hasNext) {
                console.log(`\n[🛑] No hay botón "Siguiente" disponible en el reproductor. ¡Fin de la serie!`);
                break;
            }

            console.log(`[🔗] Cargando siguiente episodio...`);
            await new Promise(r => setTimeout(r, 2500));
        }

        console.log(`\n[🏆] ¡ESCANEO COMPLETADO FINALIZADO! Todos los embeds guardados.`);

    } catch (e) {
        console.error(`[❌] Hubo un error crítico:`, e.message);
    } finally {
        await client.end();
        setTimeout(async () => {
            if (browser) {
                try { await browser.close(); } catch(e) {}
            }
        }, 2000);
    }
}

runScraper();

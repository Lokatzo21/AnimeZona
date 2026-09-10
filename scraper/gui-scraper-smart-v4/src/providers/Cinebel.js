const BaseProvider = require('./BaseProvider');

class CinebelProvider extends BaseProvider {
  constructor(browser, client) {
    super(browser, client);
    this.name = 'Cinebel Scraper';
  }

  async scrape(url, title, startEpisode) {
    this.log(`Iniciando módulo de Cinebel para: ${url}`, 'info');
    
    let targetPage = await this.browser.newPage();
    
    // Bloqueador extremo de pop-ups nativo
    await targetPage.evaluateOnNewDocument(() => {
        window.open = () => null;
        window.close = () => null;
    });

    targetPage.on('dialog', async dialog => {
        try { await dialog.dismiss(); } catch(e) {}
    });
    
    this.log('Navegando a la página de Cinebel...');
    try {
      await targetPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (err) {
      this.log(`Advertencia: ${err.message}`, 'warning');
    }

    // Lógica para resolver Cloudflare
    this.log('Esperando por Cloudflare o cargando página...', 'info');
    let isSeriesPageLoaded = false;
    for (let i = 0; i < 60; i++) {
      try {
        const pageTitle = await targetPage.title();
        if (!pageTitle.toLowerCase().includes('just a moment') && 
            !pageTitle.toLowerCase().includes('cloudflare') &&
            !pageTitle.toLowerCase().includes('verificación') &&
            !pageTitle.toLowerCase().includes('security check')) {
           const hasEpisodes = await targetPage.evaluate(() => {
              return document.querySelector('a[href*="/episodes/"]') != null;
           });
           if (hasEpisodes) {
              isSeriesPageLoaded = true;
              break;
           }
        } else {
          // Intentar hacer click en el Turnstile
          const frames = targetPage.frames();
          for (const frame of frames) {
            if (frame.url().includes('cloudflare')) {
              await frame.waitForSelector('.cf-turnstile, input[type="checkbox"]', { timeout: 1000 }).catch(() => {});
              await frame.evaluate(() => {
                const box = document.querySelector('.cf-turnstile') || document.querySelector('input[type="checkbox"]');
                if (box) box.click();
              });
            }
          }
        }
      } catch (e) {}
      if (isSeriesPageLoaded) break;
      await this.delay(2000);
    }

    if (!isSeriesPageLoaded) {
      throw new Error('No se encontraron episodios en la página tras 2 minutos. Asegúrate de haber resuelto Cloudflare.');
    }

    this.log('Analizando estructura de episodios en Cinebel...');
    
    const episodeLinks = await targetPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('/episodes/'));
        return [...new Set(links)];
    });

    if (episodeLinks.length === 0) {
        throw new Error('No se encontraron episodios en la página proporcionada.');
    }

    episodeLinks.sort((a, b) => {
        const matchA = a.match(/(\d+)x(\d+)\/?$/);
        const matchB = b.match(/(\d+)x(\d+)\/?$/);
        if (matchA && matchB) {
            const seasonA = parseInt(matchA[1], 10);
            const epA = parseInt(matchA[2], 10);
            const seasonB = parseInt(matchB[1], 10);
            const epB = parseInt(matchB[2], 10);
            return (seasonA * 1000 + epA) - (seasonB * 1000 + epB);
        }
        return 0;
    });

    this.log(`Se encontraron ${episodeLinks.length} episodios en total!`, 'success');

    let fallbackAbsoluteNumber = 1;

    for (let i = 0; i < episodeLinks.length; i++) {
        const epUrl = episodeLinks[i];
        
        let currentEpisodeNumber = fallbackAbsoluteNumber;
        const match = epUrl.match(/(\d+)x(\d+)\/?$/);
        if (match) {
            const parsedSeason = parseInt(match[1], 10);
            const parsedEpisode = parseInt(match[2], 10);
            
            if (this.tmdbEpisodesMap && this.tmdbEpisodesMap.length > 0) {
                const tmdbEp = this.tmdbEpisodesMap.find(ep => ep.season_number === parsedSeason && ep.episode_number === parsedEpisode);
                if (tmdbEp) {
                    currentEpisodeNumber = tmdbEp.absolute_number;
                } else {
                    // Fallback to strict sequential if not found in TMDB
                    currentEpisodeNumber = fallbackAbsoluteNumber;
                }
            } else {
                currentEpisodeNumber = fallbackAbsoluteNumber;
            }
        }

        if (currentEpisodeNumber < startEpisode) {
            fallbackAbsoluteNumber = currentEpisodeNumber + 1;
            continue;
        }

        await this.scrapeSingleInner(targetPage, epUrl, title, currentEpisodeNumber);
        
        fallbackAbsoluteNumber = currentEpisodeNumber + 1;
    }
  }

  async scrapeSingle(episodeUrl, title, episodeNumber) {
      let targetPage = await this.browser.newPage();
      targetPage.on('dialog', async dialog => {
          try { await dialog.dismiss(); } catch(e) {}
      });
      await this.scrapeSingleInner(targetPage, episodeUrl, title, episodeNumber);
  }

  async scrapeSingleInner(targetPage, episodeUrl, title, currentEpisodeNumber, attempt = 1) {
    this.log(`Procesando Episodio ${currentEpisodeNumber}${attempt > 1 ? ` (Intento ${attempt}/3)` : ''}...`, 'info');
    const extractedUrlsThisEpisode = new Set();
    let extractedMultiAudio = false;
    let extractedCinebel = false;
    
    // Nivel DIOS: Capturar las solicitudes de red pasivamente
    let networkVideoUrl = null;
    if (!targetPage.isIntercepting) {
        try {
            targetPage.isIntercepting = true;
            targetPage.on('request', request => {
                const reqUrl = request.url();
                const adKeywords = ['banner', 'ad.', '/ad/', '-ad-', 'ads', 'silent-basis', 'track', 'metric', 'doubleclick', 'pop'];
                const isAd = adKeywords.some(keyword => reqUrl.toLowerCase().includes(keyword));
                if (reqUrl.includes('.mp4') && !isAd) {
                    networkVideoUrl = reqUrl;
                }
            });
            await targetPage.evaluateOnNewDocument(() => {
                window.open = () => null;
                window.close = () => null;
            });
        } catch(e) {}
    }

    const { rows } = await this.client.query(`SELECT language, server_name FROM anime_episodes WHERE search_title = $1 AND episode_number = $2`, [title.toLowerCase(), currentEpisodeNumber]);
    const existingServers = {};
    for (const r of rows) {
       const key = r.language;
       if (!existingServers[key]) existingServers[key] = new Set();
       existingServers[key].add(r.server_name.toUpperCase());
    }

    try {
      await targetPage.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch(e) {}

    try { await targetPage.bringToFront(); } catch(e) {}
    
    // Lógica para resolver Cloudflare en el episodio
    this.log('Esperando por Cloudflare o cargando reproductor...', 'info');
    let isPlayerLoaded = false;
    for (let i = 0; i < 60; i++) {
      try {
        const pageTitle = await targetPage.title();
        if (!pageTitle.toLowerCase().includes('just a moment') && 
            !pageTitle.toLowerCase().includes('cloudflare') &&
            !pageTitle.toLowerCase().includes('verificación') &&
            !pageTitle.toLowerCase().includes('security check')) {
           const hasPlayer = await targetPage.evaluate(() => {
              return document.querySelector('li.dooplay_player_option') || document.querySelector('iframe') != null;
           });
           if (hasPlayer) {
              isPlayerLoaded = true;
              break;
           }
        } else {
          // Intentar hacer click en el Turnstile
          const frames = targetPage.frames();
          for (const frame of frames) {
            if (frame.url().includes('cloudflare')) {
              await frame.waitForSelector('.cf-turnstile, input[type="checkbox"]', { timeout: 1000 }).catch(() => {});
              await frame.evaluate(() => {
                const box = document.querySelector('.cf-turnstile') || document.querySelector('input[type="checkbox"]');
                if (box) box.click();
              });
            }
          }
        }
      } catch (e) {}
      if (isPlayerLoaded) break;
      await this.delay(2000);
    }

    const languagesToExtract = await targetPage.evaluate(() => {
      const lis = Array.from(document.querySelectorAll('li.dooplay_player_option'));
      const langs = [];
      
      const latLi = lis.find(li => {
         const h = li.innerHTML.toLowerCase();
         return h.includes('mx.png') || h.includes('latino');
      });
      if (latLi) langs.push({ lang: 'latino', elIndex: lis.indexOf(latLi) });
      
      const subLi = lis.find(li => {
         const h = li.innerHTML.toLowerCase();
         return h.includes('jp.png') || h.includes('subtitulado') || h.includes('es.png');
      });
      if (subLi) langs.push({ lang: 'sub', elIndex: lis.indexOf(subLi) });
      
      if (langs.length === 0) {
          langs.push({ lang: 'sub', elIndex: -1 });
      }
      return langs;
    });

    this.log(`Idiomas detectados: ${languagesToExtract.map(l => l.lang.toUpperCase()).join(', ')}`, 'info');

    if (languagesToExtract.length === 0) {
        this.log('No se encontraron idiomas en este episodio.', 'warning');
        return;
    }

    let successCount = 0;
    let hasOpcion2 = false;
    
    for (const langObj of languagesToExtract) {
        this.log(`\n=== Procesando Idioma: ${langObj.lang.toUpperCase()} ===`, 'info');

    const availableOptions = await targetPage.evaluate((targetLangIdx) => {
        const lis = Array.from(document.querySelectorAll('li.dooplay_player_option'));
        const found = [];
        lis.forEach((li, index) => {
            const h = li.innerHTML.toLowerCase();
            const text = li.textContent.toLowerCase();
            let isLat = h.includes('mx.png') || h.includes('latino');
            let isSub = h.includes('jp.png') || h.includes('subtitulado') || h.includes('es.png');
            let isMulti = text.includes('multi-audio') || text.includes('multi audio');
            
            if (targetLangIdx.lang === 'latino' && (isLat || isMulti)) {
                found.push({ index, text });
            } else if (targetLangIdx.lang === 'sub' && (isSub || isMulti || (!isLat && !isSub && !isMulti))) {
                found.push({ index, text });
            }
        });
        
        // Priorizar "Opción 2", luego "Multi-Audio 2", "Multi-Audio", "Opción 1"
        found.sort((a, b) => {
            const getScore = (text) => {
                if (text.includes('opción 2') || text.includes('opcion 2')) return 4;
                if (text.includes('multi-audio 2') || text.includes('multi audio 2')) return 3;
                if (text.includes('multi-audio') || text.includes('multi audio')) return 2;
                if (text.includes('opción 1') || text.includes('opcion 1')) return 1;
                return 0;
            };
            return getScore(b.text) - getScore(a.text);
        });

        return found; // Return { index, text } objects
    }, langObj);

    if (availableOptions.length === 0) {
        this.log(`No hay opciones para extraer en ${langObj.lang}.`, 'warning');
        continue;
    }

    this.log(`Opciones a revisar: ${availableOptions.length}`, 'info');

    hasOpcion2 = hasOpcion2 || availableOptions.some(opt => opt.text.includes('opción 2') || opt.text.includes('opcion 2'));

    for (const opt of availableOptions) {
        let baseServerName = 'CINEBEL';
        if (opt.text.includes('multi-audio') || opt.text.includes('multi audio') || (opt.text.includes('opci') && opt.text.includes('2'))) {
            baseServerName = 'MULTI-AUDIO Z';
        }

        let isMultiAudioOption = baseServerName === 'MULTI-AUDIO Z';
        // Eliminado: Saltos restrictivos de opciones para permitir extraer TODAS las opciones funcionales (Opción 1 y Opción 2).

        this.log(`-> Evaluando Opción "${opt.text}" usando la técnica Anti-Trampas...`, 'info');
        try {
            // Secuencia mágica de clicks: Actual -> Opción 1 -> Actual
        await targetPage.evaluate((idx) => {
            const elements = document.querySelectorAll('li.dooplay_player_option');
            const targetLi = elements[idx];
            if (targetLi) {
                targetLi.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                targetLi.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                targetLi.click();
                const a = targetLi.querySelector('a');
                if (a) {
                    a.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                    a.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                    a.click();
                }
            }
        }, opt.index);
        
        await this.delay(1500);

        const iframeLoaded = await targetPage.evaluate(() => {
            const iframes = Array.from(document.querySelectorAll('iframe'));
            // Buscar solo iframes que parezcan ser el reproductor de video
            return iframes.some(ifr => ifr.src && (ifr.src.includes('embed') || ifr.src.includes('player') || ifr.src.includes('11231data')));
        });

        if (!iframeLoaded) {
            this.log('Reproductor ausente. Aplicando salto de pestaña para forzar recarga...', 'info');
            await targetPage.evaluate(() => {
                const elements = document.querySelectorAll('li.dooplay_player_option');
                const opt1 = Array.from(elements).find(el => el.textContent && (el.textContent.toLowerCase().includes('opción 1') || el.textContent.toLowerCase().includes('opcion 1')));
                if (opt1) {
                    opt1.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                    opt1.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                    opt1.click();
                    const a = opt1.querySelector('a');
                    if (a) {
                        a.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                        a.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                        a.click();
                    }
                }
            });

            await this.delay(1500);

            await targetPage.evaluate((idx) => {
                const elements = document.querySelectorAll('li.dooplay_player_option');
                const targetLi = elements[idx];
                if (targetLi) {
                    targetLi.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                    targetLi.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                    targetLi.click();
                    const a = targetLi.querySelector('a');
                    if (a) {
                        a.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                        a.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
                        a.click();
                    }
                }
            }, opt.index);

            await this.delay(2000); 
        } else {
            this.log('Reproductor ya presente. Omitiendo salto de pestaña destructivo.', 'info');
        }

        // TRUCO MAESTRO: Si la página detecta el bot, carga "embed-pro.php" que está vacío o bloqueado.
        // Un usuario normal carga "cinebel-player.xyz/embed3.php" con los mismos parámetros.
        // Vamos a reescribir el iframe nosotros mismos para forzar el reproductor real.
        await targetPage.evaluate(() => {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                if (iframe.src.includes('embed-pro.php') || iframe.src.includes('embed.php')) {
                    let newSrc = iframe.src;
                    newSrc = newSrc.replace('cinebel.cc/embed-pro.php', 'cinebel-player.xyz/embed3.php');
                    newSrc = newSrc.replace('cinebel.cc/embed.php', 'cinebel-player.xyz/embed3.php');
                    iframe.src = newSrc;
                }
            });
        });

        // Esperar a que el nuevo iframe cargue
        await this.delay(3000);

        let videoUrl = null;
        let serverName = null;
        const knownHosts = ['filemoon', 'filemooon', 'filelions', 'earnvids', 'uqload', 'streamtape', 'zoplayer', 'streamwish', 'savefiles', 'vidara', 'gupload'];

        for (let attempt = 0; attempt < 5; attempt++) { 
            // Intentar hacer clic en el botón de play por si el video no carga el mp4 hasta interactuar
            // Intentar hacer clic en el botón de play por si el video no carga el mp4 hasta interactuar
            // Eliminar widgets de chat y capas superpuestas que bloquean el clic
            await targetPage.evaluate(() => {
                const removeSelectors = ['#chatango', '[id*="OMW"]', '.chatango-overlay', '.ad-overlay', '[style*="z-index: 2147483647"]'];
                removeSelectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => el.remove());
                });
            });

            try {
                // 1. Simular click físico en el centro de cada iframe (ayuda a quitar fake posters)
                const iframes = await targetPage.$$('iframe');
                for (const iframe of iframes) {
                    try {
                        const box = await iframe.boundingBox();
                        if (box && box.width > 0 && box.height > 0) {
                            // Mover el mouse primero para simular hover
                            await targetPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                            await new Promise(r => setTimeout(r, 500));
                            
                            // Hacer clic múltiples veces para romper las capas de anuncios invisibles (popunders)
                            for (let clickCount = 0; clickCount < 3; clickCount++) {
                                await targetPage.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                                await new Promise(r => setTimeout(r, 2000));
                            }
                        }
                    } catch (e) {}
                }

                // 2. Intentar click vía JS dentro de cada frame (para evadir CORS)
                for (const frame of targetPage.frames()) {
                    try {
                        await Promise.race([
                            frame.evaluate(() => {
                                // Intentar forzar play mediante la API nativa de JWPlayer si existe
                                try {
                                    if (typeof jwplayer === 'function') {
                                        jwplayer().play();
                                    }
                                } catch (e) {}

                                // Buscar el botón normal
                                const playBtn = document.querySelector('.jw-icon-display') || 
                                              document.querySelector('.jw-display-icon-container') || 
                                              document.querySelector('.vjs-big-play-button') || 
                                              document.querySelector('.plyr__control--overlaid') ||
                                              document.querySelector('.play-button') ||
                                              document.querySelector('#play');
                                if (playBtn && playBtn.offsetHeight > 0) playBtn.click();
                                
                                // Click directo a la imagen de preview por si es un fake poster
                                const jwPreview = document.querySelector('.jw-preview');
                                if (jwPreview && jwPreview.offsetHeight > 0) jwPreview.click();

                                const fakePoster = document.querySelector('.vjs-poster') || document.querySelector('img.poster');
                                if (fakePoster && fakePoster.offsetHeight > 0) fakePoster.click();
                                
                                // Click genérico en el body
                                if (document.body) document.body.click();
                            }).catch(() => {}),
                            new Promise(r => setTimeout(r, 1000))
                        ]);
                    } catch(e) {}
                }
            } catch(e) {}

            if (networkVideoUrl) {
                videoUrl = networkVideoUrl;
                serverName = baseServerName;
                this.log('¡Video encontrado mediante intercepción de red!', 'success');
                break;
            }

            const directVideo = await targetPage.evaluate(() => {
                const videos = Array.from(document.querySelectorAll('video'));
                const adKeywords = ['banner', 'ad.', '/ad/', '-ad-', 'ads', 'silent-basis', 'track', 'metric', 'doubleclick', 'pop'];
                for (const v of videos) {
                    if (v.src && v.src.includes('.mp4') && !v.src.startsWith('blob:')) {
                        const isAd = adKeywords.some(keyword => v.src.toLowerCase().includes(keyword));
                        if (!isAd) return v.src;
                    }
                }
                return null;
            });

            if (directVideo) {
                videoUrl = directVideo;
                serverName = baseServerName; 
                break;
            }

            for (const frame of targetPage.frames()) {
               const fUrl = frame.url().toLowerCase();

               if (baseServerName.includes('MULTI-AUDIO') && fUrl.includes('11231data.com')) {
                   videoUrl = frame.url();
                   serverName = baseServerName;
                   break;
               }

               if (knownHosts.some(host => fUrl.includes(host))) {
                  videoUrl = frame.url();
                  const foundHost = knownHosts.find(host => fUrl.includes(host));
                  serverName = foundHost.toUpperCase();
                  if (serverName === 'FILEMOOON') serverName = 'FILEMOON';
                  if (serverName === 'GUPLOAD') serverName = 'ZOPLAYER';
                  break;
               }
               try {
                   // Usamos evaluate en lugar de $eval para evitar timeouts nativos
                   const v = await Promise.race([
                       frame.evaluate(() => {
                           const vid = document.querySelector('video');
                           const adKeywords = ['banner', 'ad.', '/ad/', '-ad-', 'ads', 'silent-basis', 'track', 'metric', 'doubleclick', 'pop'];
                           if (vid && vid.src && vid.src.includes('.mp4') && !vid.src.startsWith('blob:')) {
                               const isAd = adKeywords.some(keyword => vid.src.toLowerCase().includes(keyword));
                                if (!isAd) return vid.src;
                           }
                           return null;
                       }).catch(() => null),
                       new Promise(r => setTimeout(r, 1000))
                   ]);
                   if (v) {
                       videoUrl = v;
                       serverName = baseServerName;
                       break;
                   }
               } catch(e) {}
            }
            if (videoUrl) break;
            await this.delay(1000);
        }

        // Aplicar Magia Negra (Reemplazo .aaa.mp4 para Rumble/VIP)
        if (videoUrl && (videoUrl.includes('1a-1791.com') || videoUrl.includes('rumble.cloud'))) {
            this.log('[IA] Aplicando extracción profunda para servidor VIP (.aaa.mp4)', 'info');
            videoUrl = videoUrl.replace(/\/([^\/\.]+)\.[^\/]*$/i, '/$1.aaa.mp4');
        }

        if (!videoUrl) {
            this.log(`No se pudo extraer URL para la opción (o es un formato no soportado como blob).`, 'warning');
        } else {
            if (extractedUrlsThisEpisode.has(videoUrl)) {
                this.log(`Omitiendo ${serverName} (URL idéntica a otra opción extraída)`, 'info');
                continue;
            }

            const alreadySaved = existingServers[langObj.lang] || new Set();
            const badServers = ['STREAMTAPE', 'MIXDROP', 'HEXUPLOAD'];
            
            if (alreadySaved.has(serverName.toUpperCase())) {
                if (serverName === 'CINEBEL' || serverName.includes('MULTI-AUDIO')) {
                    serverName = `${serverName} OP-${alreadySaved.size + 1}`; 
                } else if (badServers.includes(serverName.toUpperCase()) && alreadySaved.size > 0) {
                    this.log(`Omitiendo ${serverName} (ya existe o es un servidor secundario descartable)`, 'info');
                    continue;
                } else {
                    this.log(`Omitiendo ${serverName} (ya existe y no es principal)`, 'info');
                    continue;
                }
            } else if (badServers.includes(serverName.toUpperCase()) && alreadySaved.size > 0) {
                this.log(`Omitiendo ${serverName} (servidor secundario descartable)`, 'info');
                continue;
            }

            let isAlive = true;
            if (videoUrl.includes('.mp4')) {
                this.log(`[IA] Verificando integridad del link MP4 de ${serverName}...`, 'info');
                try {
                    // Ignoramos certificados SSL inválidos para algunos servidores piratas
                    const fetchOptions = { 
                        method: 'HEAD', 
                        headers: { 
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Referer': targetPage.url(),
                            'Origin': new URL(targetPage.url()).origin
                        } 
                    };
                    const response = await fetch(videoUrl, fetchOptions);
                    
                    if (response.status === 404 || response.status === 403 || response.status === 410 || response.status === 500) {
                        isAlive = false;
                        this.log(`[ALERTA IA] El enlace mp4 devolvió error ${response.status}. El servidor está caído o bloqueado.`, 'error');
                    } else if (response.status === 200 || response.status === 206) {
                        const contentLength = response.headers.get('content-length');
                        if (contentLength && parseInt(contentLength, 10) < 100000) { 
                            isAlive = false;
                            this.log(`[ALERTA IA] El enlace mp4 es un archivo inusualmente pequeño (${contentLength} bytes). Es probable que sea una página de error encubierta.`, 'error');
                        } else {
                            this.log(`[IA] Link verificado y funcional (${response.status}).`, 'success');
                        }
                    }
                } catch (err) {
                    isAlive = false;
                    this.log(`[ALERTA IA] Falló la conexión al verificar el enlace: ${err.message}`, 'error');
                }
            }

            if (!isAlive) {
                this.log(`[IA] Descartando la opción de ${serverName} para evitar almacenar un link muerto.`, 'warning');
                continue;
            }

            const query = `
                INSERT INTO anime_episodes 
                (search_title, episode_number, server_name, video_url, language, season_number, episode_name, anime_tmdb_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;

            let s_num = null;
            let e_name = null;
            if (this.tmdbEpisodesMap && this.tmdbEpisodesMap.length > 0) {
                const tmdbEp = this.tmdbEpisodesMap.find(ep => ep.absolute_number === currentEpisodeNumber);
                if (tmdbEp) {
                    s_num = tmdbEp.season_number;
                    e_name = tmdbEp.name;
                }
            }

            await this.client.query(query, [title.toLowerCase(), currentEpisodeNumber, serverName, videoUrl, langObj.lang, s_num, e_name, this.tmdbId]);

            if (!existingServers[langObj.lang]) existingServers[langObj.lang] = new Set();
            existingServers[langObj.lang].add(serverName);
            extractedUrlsThisEpisode.add(videoUrl);
            if (serverName.includes('MULTI-AUDIO')) {
                extractedMultiAudio = true;
            }
            if (serverName === 'CINEBEL') {
                extractedCinebel = true;
            }

            this.log(`✅ [EXITO] Guardado ${serverName} (${langObj.lang})`, 'success');
            successCount++;
        } // Cierra el else (!videoUrl)
        } catch (error) {
            this.log(`[ALERTA IA] Error al procesar esta opción (probablemente vacía o bloqueada): ${error.message}`, 'error');
            continue;
        }
    }
    } // Cierra el for langObj
    
    if (hasOpcion2 && !extractedCinebel && attempt < 3) {
        this.log(`[ALERTA IA] CINEBEL falló. Recargando la página para intentar de nuevo (Intento ${attempt + 1}/3)...`, 'warning');
        return await this.scrapeSingleInner(targetPage, episodeUrl, title, currentEpisodeNumber, attempt + 1);
    }
    
    if (successCount > 0) {
        this.log(`✅ Episodio ${currentEpisodeNumber} completado (${successCount} servidores guardados).`, 'success');
    } else {
        this.log(`❌ No se pudo guardar ningún servidor nuevo para el episodio ${currentEpisodeNumber}.`, 'warning');
    }
  }
}

module.exports = CinebelProvider;

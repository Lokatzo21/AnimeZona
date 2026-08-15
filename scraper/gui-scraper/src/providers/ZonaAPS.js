const BaseProvider = require('./BaseProvider');

class ZonaAPSProvider extends BaseProvider {
  constructor(browser, client) {
    super(browser, client);
    this.name = 'ZonaAPS Scraper';
  }

  async scrape(url, title, startEpisode) {
    this.log(`Iniciando módulo de ZonaAPS para: ${url}`, 'info');
    
    let targetPage = await this.browser.newPage();
    
    // Nivel DIOS: Capturar las solicitudes de red para encontrar el mp4 incluso si el reproductor está ofuscado
    let networkVideoUrl = null;
    targetPage.on('request', request => {
        const reqUrl = request.url();
        if (reqUrl.includes('.mp4') && !reqUrl.includes('banner') && !reqUrl.includes('ad')) {
            networkVideoUrl = reqUrl;
        }
        request.continue();
    });
    await targetPage.setRequestInterception(true);

    // Bloqueador extremo de pop-ups nativo
    await targetPage.evaluateOnNewDocument(() => {
        window.open = () => null;
    });

    targetPage.on('dialog', async dialog => {
        try { await dialog.dismiss(); } catch(e) {}
    });
    
    this.log('Navegando a la página de ZonaAPS...');
    try {
      await targetPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (err) {
      this.log(`Advertencia: ${err.message}`, 'warning');
    }

    this.log('Analizando estructura de episodios en ZonaAPS...');
    await this.delay(3000);
    
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
            const epA = parseInt(matchA[2], 10);
            const epB = parseInt(matchB[2], 10);
            return epA - epB;
        }
        return 0;
    });

    this.log(`Se encontraron ${episodeLinks.length} episodios en total!`, 'success');

    let currentEpisodeNumber = parseInt(startEpisode, 10) || 1;

    for (let i = 0; i < episodeLinks.length; i++) {
        const epUrl = episodeLinks[i];
        
        const match = epUrl.match(/(\d+)x(\d+)\/?$/);
        let epNumFromUrl = currentEpisodeNumber;
        if (match) {
            epNumFromUrl = parseInt(match[2], 10);
        }

        if (epNumFromUrl < startEpisode) {
            continue;
        }
        
        currentEpisodeNumber = epNumFromUrl;

        await this.scrapeSingleInner(targetPage, epUrl, title, currentEpisodeNumber);
        
        currentEpisodeNumber++;
    }
  }

  async scrapeSingle(episodeUrl, title, episodeNumber) {
      let targetPage = await this.browser.newPage();
      targetPage.on('dialog', async dialog => {
          try { await dialog.dismiss(); } catch(e) {}
      });
      await this.scrapeSingleInner(targetPage, episodeUrl, title, episodeNumber);
  }

  async scrapeSingleInner(targetPage, episodeUrl, title, currentEpisodeNumber) {
    this.log(`Procesando Episodio ${currentEpisodeNumber}...`, 'info');
    
    // Nivel DIOS: Capturar las solicitudes de red
    let networkVideoUrl = null;
    if (!targetPage.isIntercepting) {
        try {
            await targetPage.setRequestInterception(true);
            targetPage.isIntercepting = true;
            targetPage.on('request', request => {
                const reqUrl = request.url();
                if (reqUrl.includes('.mp4') && !reqUrl.includes('banner') && !reqUrl.includes('ad')) {
                    networkVideoUrl = reqUrl;
                }
                request.continue();
            });
            await targetPage.evaluateOnNewDocument(() => {
                window.open = () => null;
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
      await targetPage.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch(e) {}

    await targetPage.bringToFront();
    await this.delay(5000); 

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

    let targetLanguage = languagesToExtract.find(l => l.lang === 'latino');
    if (!targetLanguage) targetLanguage = languagesToExtract.find(l => l.lang === 'sub');
    if (!targetLanguage && languagesToExtract.length > 0) targetLanguage = languagesToExtract[0];

    if (!targetLanguage) {
        this.log('No se encontraron idiomas en este episodio.', 'warning');
        return;
    }

    let successCount = 0;
    const langObj = targetLanguage;
    this.log(`\n=== Procesando ÚNICO Idioma Elegido: ${langObj.lang.toUpperCase()} ===`, 'info');

    const availableOptions = await targetPage.evaluate((targetLangIdx) => {
        const lis = Array.from(document.querySelectorAll('li.dooplay_player_option'));
        const found = [];
        lis.forEach((li, index) => {
            const h = li.innerHTML.toLowerCase();
            const text = li.textContent.toLowerCase();
            let isLat = h.includes('mx.png') || h.includes('latino');
            let isSub = h.includes('jp.png') || h.includes('subtitulado');
            
            if (targetLangIdx.lang === 'latino' && isLat) {
                found.push({ index, text });
            } else if (targetLangIdx.lang === 'sub' && (isSub || (!isLat && !isSub))) {
                found.push({ index, text });
            }
        });
        
        // Priorizar "Opción 2"
        found.sort((a, b) => {
            const aIsOpt2 = a.text.includes('opción 2') || a.text.includes('opcion 2');
            const bIsOpt2 = b.text.includes('opción 2') || b.text.includes('opcion 2');
            if (aIsOpt2 && !bIsOpt2) return -1;
            if (!aIsOpt2 && bIsOpt2) return 1;
            return 0;
        });

        return found.map(f => f.index);
    }, targetLanguage);

    if (availableOptions.length === 0) {
        this.log(`No hay opciones para extraer en ${langObj.lang}.`, 'warning');
        return;
    }

    this.log(`Opciones a revisar: ${availableOptions.length}`, 'info');

    for (const optIndex of availableOptions) {
        this.log(`-> Evaluando Opción...`, 'info');

        await targetPage.evaluate((idx) => {
            const li = document.querySelectorAll('li.dooplay_player_option')[idx];
            if (li) li.click();
        }, optIndex);

        this.log('Esperando a que cargue el reproductor...');
        await this.delay(2000); 

        // TRUCO MAESTRO: Si la página detecta el bot, carga "embed-pro.php" que está vacío o bloqueado.
        // Un usuario normal carga "zonaaps-player.xyz/embed3.php" con los mismos parámetros.
        // Vamos a reescribir el iframe nosotros mismos para forzar el reproductor real.
        await targetPage.evaluate(() => {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                if (iframe.src.includes('embed-pro.php') || iframe.src.includes('embed.php')) {
                    let newSrc = iframe.src;
                    newSrc = newSrc.replace('zonaaps.com/embed-pro.php', 'zonaaps-player.xyz/embed3.php');
                    newSrc = newSrc.replace('zonaaps.com/embed.php', 'zonaaps-player.xyz/embed3.php');
                    iframe.src = newSrc;
                }
            });
        });

        // Esperar a que el nuevo iframe cargue
        await this.delay(3000);

        let videoUrl = null;
        let serverName = null;
        const knownHosts = ['filemoon', 'filemooon', 'filelions', 'earnvids', 'uqload', 'streamtape', 'zoplayer', 'streamwish', 'savefiles', 'vidara', 'gupload'];

        for (let attempt = 0; attempt < 20; attempt++) { 
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
                                await new Promise(r => setTimeout(r, 500));
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
                            }),
                            new Promise(r => setTimeout(r, 1000))
                        ]);
                    } catch(e) {}
                }
            } catch(e) {}

            if (networkVideoUrl) {
                videoUrl = networkVideoUrl;
                serverName = 'ZONAAPS';
                this.log('¡Video encontrado mediante intercepción de red!', 'success');
                break;
            }

            const directVideo = await targetPage.evaluate(() => {
                const videos = Array.from(document.querySelectorAll('video'));
                for (const v of videos) {
                    if (v.src && v.src.includes('.mp4') && !v.src.startsWith('blob:')) {
                        return v.src;
                    }
                }
                return null;
            });

            if (directVideo) {
                videoUrl = directVideo;
                serverName = 'ZONAAPS'; 
                break;
            }

            for (const frame of targetPage.frames()) {
               const fUrl = frame.url().toLowerCase();
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
                           return (vid && vid.src && vid.src.includes('.mp4') && !vid.src.startsWith('blob:')) ? vid.src : null;
                       }),
                       new Promise(r => setTimeout(r, 1000))
                   ]);
                   if (v) {
                       videoUrl = v;
                       serverName = 'ZONAAPS';
                       break;
                   }
               } catch(e) {}
            }
            if (videoUrl) break;
            await this.delay(1000);
        }

        if (!videoUrl) {
            this.log(`No se pudo extraer URL para la opción (o es un formato no soportado como blob).`, 'warning');
        } else {
            const alreadySaved = existingServers[langObj.lang] || new Set();
            if (alreadySaved.has(serverName) || (serverName === 'STREAMTAPE' && alreadySaved.size > 0)) {
                this.log(`Omitiendo ${serverName} (ya existe o es Streamtape secundario)`, 'info');
                continue;
            }

            await this.client.query(
                `INSERT INTO anime_episodes (search_title, episode_number, server_name, video_url, language) VALUES ($1, $2, $3, $4, $5)`,
                [title.toLowerCase(), currentEpisodeNumber, serverName, videoUrl, langObj.lang]
            );
            if (!existingServers[langObj.lang]) existingServers[langObj.lang] = new Set();
            existingServers[langObj.lang].add(serverName);

            this.log(`[EXITO] Guardado ${serverName} (${langObj.lang})`, 'success');
            successCount++;
        }
    }
    
    if (successCount > 0) {
        this.log(`✅ Episodio ${currentEpisodeNumber} completado (${successCount} servidores guardados).`, 'success');
    } else {
        this.log(`❌ No se pudo guardar ningún servidor nuevo para el episodio ${currentEpisodeNumber}.`, 'warning');
    }
  }
}

module.exports = ZonaAPSProvider;

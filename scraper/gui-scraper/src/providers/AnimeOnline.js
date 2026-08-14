const BaseProvider = require('./BaseProvider');

class AnimeOnlineProvider extends BaseProvider {
  constructor(browser, client) {
    super(browser, client);
    this.name = 'AnimeOnline Ninja';
  }

  async scrape(url, title, startEpisode) {
    let currentEpisodeNumber = startEpisode;
    let targetPage = await this.browser.newPage();

    this.log('Verificando episodios, idiomas y servidores existentes en la BD...');
    const { rows } = await this.client.query(`SELECT episode_number, language, server_name FROM anime_episodes WHERE search_title = $1`, [title.toLowerCase()]);
    
    // Agrupar servidores existentes por episodio e idioma
    const existingServers = {};
    for (const r of rows) {
       const key = `${r.episode_number}_${r.language}`;
       if (!existingServers[key]) existingServers[key] = new Set();
       existingServers[key].add(r.server_name.toUpperCase());
    }
    
    this.log(`Se encontraron registros previos en la BD.`, 'success');

    this.log('Navegando a la página principal del anime...');
    try {
      await targetPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (err) {
      this.log(`Advertencia: ${err.message}`, 'warning');
    }

    this.log('Esperando a que cargue la serie (tienes 2 minutos para resolver Cloudflare si aparece)...');
    let isSeriesPageLoaded = false;
    for (let i = 0; i < 60; i++) {
      const pages = await this.browser.pages();
      for (const p of pages) {
        try {
          if (p.url().includes('animeonline.ninja/online') || p.url().includes('animeonline.ninja/tv') || p.url().includes('animeonline.ninja/')) {
            targetPage = p;
            
            // Verificamos si realmente cargó la página de la serie buscando el contenedor de episodios
            const hasEpisodes = await p.evaluate(() => {
              return !!(document.querySelector('#seasons') || document.querySelector('.seasons') || document.querySelector('ul.episodios') || document.querySelector('.seasons-episodios'));
            });
            
            if (hasEpisodes) {
              isSeriesPageLoaded = true;
              break;
            }
          }
        } catch (e) {}
      }
      if (isSeriesPageLoaded) break;
      await this.delay(2000);
    }

    if (!isSeriesPageLoaded) {
      throw new Error('No se encontraron episodios en la página tras 2 minutos. Asegúrate de haber resuelto Cloudflare.');
    }

    await targetPage.bringToFront();
    this.log('Extrayendo lista de episodios...', 'info');

    const urlParts = url.split('/online/')[1] || url.split('/tv/')[1];
    let baseSlug = "";
    if (urlParts) {
       const fullSlug = urlParts.split('/')[0].split('?')[0]; 
       const slugParts = fullSlug.split('-').filter(part => isNaN(part)); 
       baseSlug = slugParts.slice(0, 2).join('-'); 
    }

    let episodeLinks = await targetPage.evaluate((base) => {
       let container = document.querySelector('#seasons') || document.querySelector('.seasons') || document.querySelector('ul.episodios') || document.querySelector('.seasons-episodios');
       let exactContainerFound = !!container;
       
       if (!container) container = document;

       const anchors = Array.from(container.querySelectorAll('a'));
       let eps = anchors
          .filter(a => a.href.includes('/episodio/'))
          .map(a => {
             const row = a.closest('li') || a;
             return { url: a.href, text: row.innerText.toLowerCase() };
          });
       
       // SOLO filtramos por palabra clave si tuvimos que buscar en toda la página
       // Si encontramos el contenedor específico de temporadas, no filtramos nada para evitar perder episodios con nombres invertidos
       if (base && !exactContainerFound) {
           eps = eps.filter(ep => ep.url.includes(base));
       }
       
       const uniqueEps = [];
       const seenUrls = new Set();
       for (const ep of eps) {
           if (!seenUrls.has(ep.url)) {
               seenUrls.add(ep.url);
               uniqueEps.push(ep);
           }
       }

       uniqueEps.sort((a, b) => {
           const isOvaA = a.text.includes('ova') || a.url.includes('ova') || a.text.includes('- 0.');
           const isOvaB = b.text.includes('ova') || b.url.includes('ova') || b.text.includes('- 0.');
           if (isOvaA && !isOvaB) return 1;
           if (!isOvaA && isOvaB) return -1;
           return 0;
       });

       return uniqueEps.map(ep => ep.url);
    }, baseSlug);

    if (episodeLinks.length === 0) {
        throw new Error('No se encontraron episodios en esta página.');
    }

    this.log(`Se encontraron ${episodeLinks.length} episodios en total!`, 'success');

    for (let i = 0; i < episodeLinks.length; i++) {
        const epUrl = episodeLinks[i];
        
        this.log(`Procesando Episodio ${currentEpisodeNumber}...`, 'info');
        
        const rndDelay = Math.floor(Math.random() * 2000) + 2000;
        await this.delay(rndDelay);
        
        const currentUrl = targetPage.url();
        try {
          await targetPage.goto(epUrl, { referer: currentUrl, waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch(e) {}

        let isOnEpPage = false;
        for (let j = 0; j < 30; j++) {
           const pages = await this.browser.pages();
           for (const p of pages) {
             try {
               if (p.url().includes('/episodio/')) {
                 targetPage = p;
                 isOnEpPage = true;
                 break;
               }
             } catch(e) {}
           }
           if (isOnEpPage) break;
           await this.delay(2000);
        }

        if (!isOnEpPage) {
            this.log(`No se pudo cargar el episodio ${currentEpisodeNumber}. Saltando...`, 'error');
            currentEpisodeNumber++;
            continue;
        }
        
        await targetPage.bringToFront();
        await this.delay(5000); // UI load

        let playerFrame = null;
        for (const frame of targetPage.frames()) {
          if (frame.url().includes('saidochesto.top')) {
            playerFrame = frame;
            break;
          }
        }
        if (!playerFrame) playerFrame = targetPage.mainFrame(); 

        const languagesToExtract = await playerFrame.evaluate(() => {
          const lis = Array.from(document.querySelectorAll('li'));
          const langs = [];
          
          const latLi = lis.find(li => {
             const o = li.getAttribute('onclick') || '';
             const t = li.textContent.toUpperCase();
             const h = li.innerHTML.toUpperCase();
             return o.includes('LAT') || t.includes('LATINO') || t.includes(' LAT ') || h.includes('LAT.PNG');
          });
          if (latLi) langs.push({ lang: 'latino', elIndex: lis.indexOf(latLi) });
          
          const subLi = lis.find(li => {
             const o = li.getAttribute('onclick') || '';
             const t = li.textContent.toUpperCase();
             const h = li.innerHTML.toUpperCase();
             return o.includes('SUB') || t.includes('SUBTITULADO') || t.includes(' SUB ') || h.includes('SUB.PNG');
          });
          if (subLi) langs.push({ lang: 'sub', elIndex: lis.indexOf(subLi) });
          
          const castLi = lis.find(li => {
             const o = li.getAttribute('onclick') || '';
             const t = li.textContent.toUpperCase();
             const h = li.innerHTML.toUpperCase();
             return o.includes('CAST') || t.includes('CASTELLANO') || h.includes('CAST.PNG');
          });
          if (castLi) langs.push({ lang: 'castellano', elIndex: lis.indexOf(castLi) });
          
          if (langs.length === 0) {
              // Si no hay botones de idioma, asumimos que estamos en una pestaña y extraemos en 'sub' (o lo que venga por defecto)
              langs.push({ lang: 'sub', elIndex: -1 });
          }
          
          return langs;
        });

        this.log(`Idiomas detectados: ${languagesToExtract.map(l => l.lang.toUpperCase()).join(', ')}`, 'info');

        // Seleccionar ÚNICAMENTE el MEJOR idioma disponible
        let targetLanguage = languagesToExtract.find(l => l.lang === 'latino');
        if (!targetLanguage) targetLanguage = languagesToExtract.find(l => l.lang === 'sub');
        if (!targetLanguage && languagesToExtract.length > 0) targetLanguage = languagesToExtract[0];

        if (!targetLanguage) {
            this.log('No se encontraron idiomas en este episodio.', 'warning');
            currentEpisodeNumber++;
            continue;
        }

        let successCount = 0;
        const langObj = targetLanguage;
        
        this.log(`\n=== Procesando ÚNICO Idioma Elegido: ${langObj.lang.toUpperCase()} ===`, 'info');
        
        if (langObj.elIndex !== -1) {
                // Hacemos click en el idioma
                await playerFrame.evaluate((idx) => {
                    const li = document.querySelectorAll('li')[idx];
                    if (li) {
                        li.click();
                        try { const fn = new Function(li.getAttribute('onclick')); fn.call(li); } catch(e) {}
                    }
                }, langObj.elIndex);
                await this.delay(3000); // Esperar a que carguen los botones de los servidores
            }

            // Detectar servidores disponibles para este idioma
            const availableServers = await playerFrame.evaluate(() => {
                const lis = Array.from(document.querySelectorAll('li'));
                // Servidores recomendados por el usuario
                const priorities = ['ZOPLAYER', 'EARNVIDS', 'STREAMWISH', 'SAVEFILES', 'FILEMOON', 'VIDARA', 'FILELIONS', 'UQLOAD', 'STREAMTAPE'];
                const found = [];
                
                for (const serverName of priorities) {
                    const btn = lis.find(li => li.textContent && li.textContent.toUpperCase().includes(serverName) && li.offsetWidth > 0 && li.offsetHeight > 0);
                    if (btn) {
                        found.push({ name: serverName, index: lis.indexOf(btn) });
                    }
                }
                
                // Fallbacks si no se encontró nada de los recomendados
                if (found.length === 0) {
                    const hdBtn = lis.find(li => li.textContent && li.textContent.toUpperCase().includes('HD') && li.offsetWidth > 0 && li.offsetHeight > 0);
                    if (hdBtn) found.push({ name: 'HD_FALLBACK', index: lis.indexOf(hdBtn) });
                    
                    if (found.length === 0) {
                        const anyBtn = lis.find(li => li.offsetWidth > 0 && li.offsetHeight > 0 && !li.innerHTML.toUpperCase().includes('PNG') && !li.textContent.toUpperCase().includes('LAT') && !li.textContent.toUpperCase().includes('SUB'));
                        if (anyBtn) found.push({ name: 'ANY_FALLBACK', index: lis.indexOf(anyBtn) });
                    }
                }
                
                return found;
            });

            // Lógica STREAMTAPE: Quitarlo si hay otras opciones en la web
            let serversToExtract = availableServers;
            if (availableServers.length > 1) {
                serversToExtract = serversToExtract.filter(s => s.name.toUpperCase() !== 'STREAMTAPE');
            }

            // Omitir servidores que ya existen en la BD para este episodio e idioma
            const dbKey = `${currentEpisodeNumber}_${langObj.lang}`;
            const alreadySaved = existingServers[dbKey] || new Set();
            
            serversToExtract = serversToExtract.filter(s => !alreadySaved.has(s.name.toUpperCase()));

            if (serversToExtract.length === 0) {
                this.log(`No hay servidores nuevos para extraer en ${langObj.lang} (todos fueron omitidos o ya existen).`, 'warning');
                currentEpisodeNumber++;
                continue;
            }

            this.log(`Servidores a extraer para ${langObj.lang}: ${serversToExtract.map(s => s.name).join(', ')}`, 'info');

            for (const server of serversToExtract) {
                this.log(`-> Extrayendo servidor: ${server.name}`, 'info');

                // Click en el servidor
                await playerFrame.evaluate((idx) => {
                    const li = document.querySelectorAll('li')[idx];
                    if (li) li.click();
                }, server.index);

                this.log('Esperando a que cargue el reproductor (resolviendo captchas automatizados si existen)...');
                await this.delay(3000); // Dar tiempo al iframe interno a que se genere

                let videoUrl = null;
                const knownHosts = ['filemoon', 'filemooon', 'filelions', 'earnvids', 'uqload', 'streamtape', 'zoplayer', 'streamwish', 'savefiles', 'vidara', 'gupload'];

                for (let attempt = 0; attempt < 20; attempt++) { // Reducimos intentos por servidor de 30 a 20 para no tardar una eternidad
                    if (playerFrame) {
                        try {
                            await playerFrame.evaluate(() => {
                                const botHumano = document.querySelector('.BotHumano');
                                if (botHumano && botHumano.offsetHeight > 0) botHumano.click();
                                else {
                                    const divs = Array.from(document.querySelectorAll('div'));
                                    const clickDiv = divs.find(d => d.innerText && d.innerText.includes('Haz clic en el botón de reproducción'));
                                    if (clickDiv) clickDiv.click();
                                }
                            });
                        } catch(e) {}
                    }

                    // 1. Buscar en todos los frames cargados en Puppeteer
                    for (const frame of targetPage.frames()) {
                       const fUrl = frame.url().toLowerCase();
                       if (knownHosts.some(host => fUrl.includes(host))) {
                          videoUrl = frame.url();
                          break;
                       }
                    }
                    if (videoUrl) break;

                    // 2. Buscar inyecciones directas en el DOM del playerFrame
                    if (playerFrame && !videoUrl) {
                        try {
                            videoUrl = await playerFrame.evaluate((hosts) => {
                                const ifr = document.querySelector('iframe#IFR');
                                if (ifr && ifr.src && hosts.some(h => ifr.src.toLowerCase().includes(h))) {
                                    return ifr.src;
                                }
                                
                                const iframes = Array.from(document.querySelectorAll('iframe'));
                                for (const f of iframes) {
                                    if (f.src) {
                                        const srcLower = f.src.toLowerCase();
                                        if (hosts.some(host => srcLower.includes(host))) {
                                            return f.src;
                                        }
                                    }
                                }
                                return null;
                            }, knownHosts);
                        } catch(e) {}
                    }
                    if (videoUrl) break;

                    await this.delay(2000);
                }

                if (!videoUrl) {
                    this.log(`No se pudo extraer URL para ${server.name} (${langObj.lang}).`, 'warning');
                } else {
                    await this.client.query(
                        `INSERT INTO anime_episodes (search_title, episode_number, server_name, video_url, language) VALUES ($1, $2, $3, $4, $5)`,
                        [title.toLowerCase(), currentEpisodeNumber, server.name, videoUrl, langObj.lang]
                    );
                    this.log(`[EXITO] Guardado ${server.name} (${langObj.lang})`, 'success');
                    successCount++;
                }
            }
        if (successCount > 0) {
            this.log(`✅ Episodio ${currentEpisodeNumber} completado (${successCount} servidores guardados).`, 'success');
        } else {
            this.log(`❌ No se pudo guardar ningún servidor para el episodio ${currentEpisodeNumber}.`, 'error');
        }

        currentEpisodeNumber++;
    }
  }
}

module.exports = AnimeOnlineProvider;

const BaseProvider = require('./BaseProvider');

class AnimeOnlineProvider extends BaseProvider {
  constructor(browser, client) {
    super(browser, client);
    this.name = 'AnimeOnline Ninja';
  }

  async scrape(url, title, startEpisode) {
    let currentEpisodeNumber = startEpisode;
    let targetPage = await this.browser.newPage();

    this.log('Verificando episodios existentes en la BD...');
    const { rows } = await this.client.query(`SELECT episode_number FROM anime_episodes WHERE search_title = $1`, [title.toLowerCase()]);
    const existingEpisodes = new Set(rows.map(r => r.episode_number));
    this.log(`Se encontraron ${existingEpisodes.size} episodios guardados previamente.`, 'success');

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
        
        if (existingEpisodes.has(currentEpisodeNumber)) {
            this.log(`Saltando Episodio ${currentEpisodeNumber} (Ya existe en la BD).`, 'warning');
            currentEpisodeNumber++;
            continue;
        }

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

        const languageResult = await playerFrame.evaluate(() => {
          const lis = Array.from(document.querySelectorAll('li'));
          const latLi = lis.find(li => {
             const onclickStr = li.getAttribute('onclick') || '';
             const textStr = li.textContent.toUpperCase();
             const htmlStr = li.innerHTML.toUpperCase();
             return onclickStr.includes('LAT') || textStr.includes('LATINO') || textStr.includes(' LAT ') || htmlStr.includes('LAT.PNG');
          });
          
          if (latLi) {
            latLi.click();
            try { const fn = new Function(latLi.getAttribute('onclick')); fn.call(latLi); } catch(e) {}
            return { found: true, lang: 'LAT' };
          }
          
          const subLi = lis.find(li => {
             const onclickStr = li.getAttribute('onclick') || '';
             const textStr = li.textContent.toUpperCase();
             const htmlStr = li.innerHTML.toUpperCase();
             return onclickStr.includes('SUB') || textStr.includes('SUBTITULADO') || textStr.includes(' SUB ') || htmlStr.includes('SUB.PNG');
          });
          
          if (subLi) {
            subLi.click();
            try { const fn = new Function(subLi.getAttribute('onclick')); fn.call(subLi); } catch(e) {}
            return { found: true, lang: 'SUB' };
          }
          return { found: false, lang: 'UNKNOWN' };
        });

        let serverName = "Supabase Demo (Latino)";
        if (languageResult.lang === 'SUB') {
           serverName = "Supabase Demo (Subtitulado)";
           this.log(`Idioma Latino no disponible. Usando Subtitulado.`, 'warning');
        }

        await this.delay(4000);

        const serverSelected = await playerFrame.evaluate(() => {
          const lis = Array.from(document.querySelectorAll('li'));
          
          // Orden de prioridad (mejores primero)
          const priorities = ['FILEMOON', 'EARNVIDS', 'FILELIONS', 'UQLOAD', 'STREAMTAPE'];
          
          for (const serverName of priorities) {
            const btn = lis.find(li => li.textContent && li.textContent.toUpperCase().includes(serverName) && li.offsetWidth > 0 && li.offsetHeight > 0);
            if (btn) {
              btn.click();
              return serverName;
            }
          }
          
          // Fallback: el primero visible que diga HD
          const hdBtn = lis.find(li => li.textContent && li.textContent.toUpperCase().includes('HD') && li.offsetWidth > 0 && li.offsetHeight > 0);
          if (hdBtn) {
            hdBtn.click();
            return 'HD_FALLBACK';
          }
          
          // Fallback final: cualquier botón visible
          const anyVisibleBtn = lis.find(li => li.offsetWidth > 0 && li.offsetHeight > 0);
          if (anyVisibleBtn) {
            anyVisibleBtn.click();
            return 'ANY_FALLBACK';
          }
          
          return null;
        });
        
        if (serverSelected) {
          this.log(`Servidor de video seleccionado: ${serverSelected}`, 'info');
        } else {
          this.log(`No se encontró ningún botón de servidor de video.`, 'warning');
        }
        
        this.log('Esperando a que cargue el reproductor (si ves un botón de verificar, hazle clic)...', 'info');

        let videoUrl = null;
        const knownHosts = ['filemoon', 'filemooon', 'filelions', 'earnvids', 'uqload', 'streamtape'];

        for (let attempt = 0; attempt < 30; attempt++) {
            // Intentar auto-clickear el botón de humano si existe en playerFrame
            if (playerFrame) {
                try {
                    await playerFrame.evaluate(() => {
                        const botHumano = document.querySelector('.BotHumano');
                        if (botHumano && botHumano.offsetHeight > 0) {
                            botHumano.click();
                        } else {
                            // Buscar por texto
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

            // 2. Buscar inyecciones directas en el DOM del playerFrame (como iframe#IFR)
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

            await this.delay(2000); // Esperar 2 segundos antes de volver a checar
        }

        if (!videoUrl) {
           this.log(`No se pudo extraer la URL del video para el episodio ${currentEpisodeNumber}.`, 'error');
        } else {
           await this.client.query(`DELETE FROM anime_episodes WHERE search_title = $1 AND episode_number = $2`, [title.toLowerCase(), currentEpisodeNumber]);
           await this.client.query(`INSERT INTO anime_episodes (search_title, episode_number, server_name, video_url) VALUES ($1, $2, $3, $4)`, [title.toLowerCase(), currentEpisodeNumber, serverName, videoUrl]);
           this.log(`Episodio ${currentEpisodeNumber} guardado correctamente! (${languageResult.lang} | ${serverSelected})`, 'success');
        }

        currentEpisodeNumber++;
    }
  }
}

module.exports = AnimeOnlineProvider;

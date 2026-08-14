const BaseProvider = require('./BaseProvider');

class ZonaAPSProvider extends BaseProvider {
  constructor(browser, client) {
    super(browser, client);
    this.name = 'ZonaAPS Scraper';
  }

  async scrape(url, title, startEpisode) {
    this.log(`Iniciando módulo de ZonaAPS para: ${url}`, 'info');
    
    let targetPage = await this.browser.newPage();
    
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
      await this.scrapeSingleInner(targetPage, episodeUrl, title, episodeNumber);
  }

  async scrapeSingleInner(targetPage, episodeUrl, title, currentEpisodeNumber) {
    this.log(`Procesando Episodio ${currentEpisodeNumber}...`, 'info');
    
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
            let isLat = h.includes('mx.png') || h.includes('latino');
            let isSub = h.includes('jp.png') || h.includes('subtitulado');
            
            if (targetLangIdx.lang === 'latino' && isLat) {
                found.push(index);
            } else if (targetLangIdx.lang === 'sub' && (isSub || (!isLat && !isSub))) {
                found.push(index);
            }
        });
        return found; 
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
        await this.delay(4000); 

        let videoUrl = null;
        let serverName = null;
        const knownHosts = ['filemoon', 'filemooon', 'filelions', 'earnvids', 'uqload', 'streamtape', 'zoplayer', 'streamwish', 'savefiles', 'vidara', 'gupload'];

        for (let attempt = 0; attempt < 20; attempt++) { 
            // Intentar hacer clic en el botón de play por si el video no carga el mp4 hasta interactuar
            try {
                await targetPage.evaluate(() => {
                    const clickPlay = (doc) => {
                        const playBtn = doc.querySelector('.jw-icon-display') || doc.querySelector('.jw-display-icon-container') || doc.querySelector('.vjs-big-play-button');
                        if (playBtn && playBtn.offsetHeight > 0) playBtn.click();
                    };
                    clickPlay(document);
                    document.querySelectorAll('iframe').forEach(ifr => {
                        try { clickPlay(ifr.contentWindow.document); } catch(e) {}
                    });
                });
            } catch(e) {}

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
                   const v = await frame.$eval('video', el => el.src);
                   if (v && v.includes('.mp4') && !v.startsWith('blob:')) {
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

const fs = require('fs');

const code = const BaseProvider = require('./BaseProvider');

class AnimeDBSProvider extends BaseProvider {
  constructor(browser, client) {
    super(browser, client);
    this.name = 'AnimeDBS Scraper';
  }

  async scrape(url, title, startEpisode) {
    this.log('Iniciando modulo de AnimeDBS para: ' + url, 'info');
    
    let targetPage = await this.browser.newPage();
    
    await targetPage.evaluateOnNewDocument(() => {
        window.open = () => null;
        window.close = () => null;
    });

    targetPage.on('dialog', async dialog => {
        try { await dialog.dismiss(); } catch(e) {}
    });

    try {
        await targetPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (e) {
        this.log('Error navegando a ' + url + ': ' + e.message, 'error');
        await targetPage.close();
        return;
    }

    let episodes = await targetPage.evaluate(() => {
        const epLinks = Array.from(document.querySelectorAll('.eplister li a'));
        let eps = [];
        epLinks.forEach(link => {
            const url = link.href;
            const epNumText = link.querySelector('.epl-num')?.innerText || link.innerText;
            const match = epNumText.match(/(\\d+)/);
            if (match) {
                eps.push({ url, number: parseInt(match[1], 10) });
            }
        });
        
        if (eps.length === 0) {
            const allLinks = Array.from(document.querySelectorAll('a'));
            const verLinks = allLinks.filter(a => a.href.includes('-capitulo-') || a.href.includes('-episodio-'));
            verLinks.forEach(link => {
                const match = link.href.match(/-(?:capitulo|episodio)-(\\d+)/i);
                if (match) {
                    eps.push({ url: link.href, number: parseInt(match[1], 10) });
                }
            });
            const unique = [];
            const seen = new Set();
            for (let e of eps) {
                if (!seen.has(e.url)) {
                    seen.add(e.url);
                    unique.push(e);
                }
            }
            eps = unique;
        }
        
        return eps.sort((a, b) => a.number - b.number);
    });

    if (episodes.length === 0) {
        this.log('No se encontraron episodios en esta pagina.', 'warning');
        await targetPage.close();
        return;
    }

    this.log('Se encontraron ' + episodes.length + ' episodios.', 'success');

    const epsToScrape = episodes.filter(ep => ep.number >= startEpisode);
    this.log('Se comenzara a scrapear desde el episodio ' + startEpisode + '. Total a procesar: ' + epsToScrape.length);

    const isLatino = url.includes('latino') || url.includes('lat') || url.includes('-audio-latino');
    const defaultLang = isLatino ? 'latino' : 'sub';
    this.log('Idioma asumido para esta serie: ' + defaultLang, 'info');

    for (const ep of epsToScrape) {
        this.log('\\n===========================================', 'info');
        this.log('Procesando Episodio ' + ep.number + '...', 'info');
        this.log('URL: ' + ep.url, 'info');

        try {
            await targetPage.goto(ep.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await targetPage.waitForTimeout(2000); 
            
            const servers = await targetPage.evaluate(() => {
                const results = [];
                
                const sources = Array.from(document.querySelectorAll('source'));
                sources.forEach((src, idx) => {
                    if (src.src) {
                        results.push({
                            name: idx === 0 ? 'AnimeDBS Direct (MP4)' : 'AnimeDBS MP4 - ' + (idx+1),
                            url: src.src
                        });
                    }
                });

                const iframes = Array.from(document.querySelectorAll('.video-content iframe, .play-video iframe, iframe'));
                iframes.forEach((ifr, idx) => {
                    if (ifr.src && !ifr.src.includes('facebook.com/plugins') && !ifr.src.includes('youtube.com')) {
                        let name = 'Servidor Externo';
                        if (ifr.src.includes('terabox')) name = 'Terabox';
                        else if (ifr.src.includes('ok.ru')) name = 'Ok.ru';
                        else if (ifr.src.includes('fembed')) name = 'Fembed';
                        else if (ifr.src.includes('uqload')) name = 'Uqload';
                        else if (ifr.src.includes('mp4upload')) name = 'Mp4Upload';
                        else if (ifr.src.includes('voe.sx')) name = 'Voe';
                        else if (ifr.src.includes('dood')) name = 'Doodstream';
                        else name = 'Opcion Alternativa ' + (idx+1);
                        
                        results.push({ name, url: ifr.src });
                    }
                });

                const links = Array.from(document.querySelectorAll('a'));
                const dlLinks = links.filter(a => a.href.toLowerCase().includes('mega.nz') || a.href.toLowerCase().includes('mediafire.com'));
                dlLinks.forEach(dl => {
                    let name = 'Descarga';
                    if (dl.href.includes('mega.nz')) name = 'MEGA (Descarga)';
                    if (dl.href.includes('mediafire.com')) name = 'MediaFire (Descarga)';
                    
                    results.push({ name, url: dl.href });
                });

                return results;
            });

            this.log('Se encontraron ' + servers.length + ' servidores/opciones para el Episodio ' + ep.number + '.', 'success');

            const uniqueServers = [];
            const seenUrls = new Set();
            for (let s of servers) {
                if (!seenUrls.has(s.url)) {
                    seenUrls.add(s.url);
                    uniqueServers.push(s);
                }
            }

            if (uniqueServers.length > 0) {
                const newEpsData = [{
                    anime_title: title,
                    episode_number: ep.number,
                    lang: defaultLang,
                    servers: uniqueServers.map(s => ({
                        server: s.name,
                        url: s.url
                    }))
                }];

                await this.client.processEpisodes(newEpsData, false);
            } else {
                this.log('No se extrajo ningun servidor valido para el Episodio ' + ep.number + '.', 'warning');
            }

        } catch (e) {
            this.log('Error al procesar el Episodio ' + ep.number + ': ' + e.message, 'error');
        }
    }

    this.log('Modulo de AnimeDBS terminado para ' + title + '.', 'success');
    await targetPage.close();
  }
}

module.exports = AnimeDBSProvider;
;
fs.writeFileSync('scraper/gui-scraper-smart-v4/src/providers/AnimeDBS.js', code);
console.log('Fixed');

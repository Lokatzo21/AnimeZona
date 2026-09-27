const BaseProvider = require('./BaseProvider');

class AnimeDBSProvider extends BaseProvider {
  constructor(browser, client) {
    super(browser, client);
    this.name = 'AnimeDBS Scraper';
  }

  async scrape(url, title, startEpisode) {
    this.log(`Iniciando mödulo de AnimeDBS para: ${url}`, 'info');
    
    let targetPage = await this.browser.newPage();
    
    await targetPage.evaluateOnNewDocument(() => {
        window.close = () => null;
        window.open = () => null;
    });

    targetPage.on('dialog', async dialog => {
        try { await dialog.dismiss(); } catch(e) {}
    });

    try {
        await targetPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        this.log('Esperando resolucion de Cloudflare (10 segundos)...', 'info');
        await new Promise(r => setTimeout(r, 10000));
        
        // Refrescamos la pagina para evitar el bug de 'Detached Frame' de Puppeteer tras Cloudflare
        await targetPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
        await new Promise(r => setTimeout(r, 3000));
    } catch (e) {
        this.log(`Error navegando a ${url}: ${e.message}`, 'error');
        try { await targetPage.close(); } catch(err){}
        return;
    }

    let episodes = [];
    try {
        episodes = await targetPage.evaluate(() => {
            const epLinks = Array.from(document.querySelectorAll('.eplister li a'));
            let eps = [];
            epLinks.forEach(link => {
                const url = link.href;
                const epNumText = link.querySelector('.epl-num')?.innerText || link.innerText;
                const match = epNumText.match(/(\d)+/);
                if(match) { eps.push({ url, number: parseInt(match[1], 10) }); }
            });
            
            if (eps.length === 0) {
                const allLinks = Array.from(document.querySelectorAll('a'));
                const verLinks = allLinks.filter(a => a.href.includes('-capitulo-') || a.href.includes('-episodio-'));
                verLinks.forEach(link => {
                    const match = link.href.match(/-(?:capitulo|episodio)-(\d)+/i);
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
    } catch (e) {
        this.log('Reintentando extraccion de episodios debido a Cloudflare...', 'warning');
        await new Promise(r => setTimeout(r, 6000));
        episodes = await targetPage.evaluate(() => {
            const epLinks = Array.from(document.querySelectorAll('.eplister li a'));
            let eps = [];
            epLinks.forEach(link => {
                const url = link.href;
                const epNumText = link.querySelector('.epl-num')?.innerText || link.innerText;
                const match = epNumText.match(/(\d)+/);
                if(match) { eps.push({ url, number: parseInt(match[1], 10) }); }
            });
            
            if (eps.length === 0) {
                const allLinks = Array.from(document.querySelectorAll('a'));
                const verLinks = allLinks.filter(a => a.href.includes('-capitulo-') || a.href.includes('-episodio-'));
                verLinks.forEach(link => {
                    const match = link.href.match(/-(?:capitulo|episodio)-(\d)+/i);
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
    }

    if (episodes.length === 0) {
        this.log('No se encontraron episodios en esta página.', 'warning');
        await targetPage.close();
        return;
    }

    this.log(`Se encontraron ${episodes.length} episodios.`, 'success');

    const epsToScrape = episodes.filter(ep => ep.number >= startEpisode);
    this.log(`Se comenzará a scrapear desde el episodio ${startEpisode}. Total a procesar: ${epsToScrape.length}`);

    const isLatino = url.includes('latino') || url.includes('lat') || url.includes('-audio-latino');
    const defaultLang = isLatino ? 'latino' : 'sub';
    this.log(`Idioma asumido para esta serie: ${defaultLang}`, 'info');

    for (const ep of epsToScrape) {
        this.log(`\n ================================================`, 'info');
        this.log(`Procesando Episodio ${ep.number}...`, 'info');
        this.log(`URL: ${ep.url}`, 'info');

        try {
            await targetPage.goto(ep.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await new Promise(r => setTimeout(r, 6000));
            
            // Refrescar para limpiar el frame de Puppeteer tras el redirect de Cloudflare
            await targetPage.goto(ep.url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
            await new Promise(r => setTimeout(r, 3000)); 
            
            let servers = [];
            try {
                servers = await targetPage.evaluate(() => {
                    const results = [];
                    
                    const sources = Array.from(document.querySelectorAll('source'));
                    sources.forEach((src, idx) => {
                        if (src.src) {
                            results.push({
                                name: idx === 0 ? 'AnimeDBS Direct (MP4)' : `AnimeDBS MP4 - ${idx+1}`,
                                url: src.src
                            });
                        }
                    });

                    // Extraer los servidores de la lista desplegable (estan en base64)
                    const options = Array.from(document.querySelectorAll('select.mirror option, .mirror option, .server_line option, ul.idTabs li a, div.bixbox li'));
                    options.forEach(opt => {
                        let val = opt.value || opt.getAttribute('data-src') || opt.getAttribute('data-url') || '';
                        if (!val) return;
                        
                        let name = opt.innerText.trim() || 'Servidor Externo';
                        
                        // Si el valor es HTML codificado en base64 (ej: <iframe...)
                        if (val.startsWith('PGlmcmFtZ') || val.includes('iframe')) {
                            try {
                                const decoded = atob(val);
                                const match = decoded.match(/src=["'](.*?)["']/i);
                                if (match && match[1]) val = match[1];
                            } catch(e) {}
                        }
                        
                        if(val.startsWith('http')) {
                            results.push({ name, url: val });
                        }
                    });

                    const iframes = Array.from(document.querySelectorAll('.video-content iframe, .play-video iframe, iframe'));
                    iframes.forEach((ifr, idx) => {
                        if (ifr.src && !ifr.src.includes('facebook.com/plugins') && !ifr.src.includes('youtube.com')) {
                            if (!results.some(r => r.url === ifr.src)) {
                                let name = 'Servidor Alternativo';
                                if (ifr.src.includes('terabox')) name = 'Terabox';
                                else if (ifr.src.includes('ok.ru')) name = 'Ok.ru';
                                else if (ifr.src.includes('fembed')) name = 'Fembed';
                                else if (ifr.src.includes('uqload')) name = 'Uqload';
                                else if (ifr.src.includes('mp4upload')) name = 'Mp4Upload';
                                else if (ifr.src.includes('voe.sx')) name = 'Voe';
                                else if (ifr.src.includes('dood')) name = 'Doodstream';
                                results.push({ name, url: ifr.src });
                            }
                        }
                    });

                    const links = Array.from(document.querySelectorAll('a'));
                    const dlLinks = links.filter(a => a.href.toLowerCase().includes('mega.nz') || a.href.toLowerCase().includes('mediafire.com'));
                    dlLinks.forEach(dl => {
                        let name = 'Descarga';
                        if (dl.href.includes('mega.nz')) name = 'MEGA (Descarga)';
                        if (dl.href.includes('mediafire.com')) name = 'MediaFire (Descarga)';
                        if (!results.some(r => r.url === dl.href)) {
                            results.push({ name, url: dl.href });
                        }
                    });

                    return results;
                });
            } catch (e) {
                this.log('Reintentando extraccion de servidores debido a Cloudflare...', 'warning');
                await new Promise(r => setTimeout(r, 6000));
                servers = await targetPage.evaluate(() => {
                    const results = [];
                    
                    const sources = Array.from(document.querySelectorAll('source'));
                    sources.forEach((src, idx) => {
                        if (src.src) {
                            results.push({
                                name: idx === 0 ? 'AnimeDBS Direct (MP4)' : `AnimeDBS MP4 - ${idx+1}`,
                                url: src.src
                            });
                        }
                    });

                    // Extraer los servidores de la lista desplegable (estan en base64)
                    const options = Array.from(document.querySelectorAll('select.mirror option, .mirror option, .server_line option, ul.idTabs li a, div.bixbox li'));
                    options.forEach(opt => {
                        let val = opt.value || opt.getAttribute('data-src') || opt.getAttribute('data-url') || '';
                        if (!val) return;
                        
                        let name = opt.innerText.trim() || 'Servidor Externo';
                        
                        // Si el valor es HTML codificado en base64 (ej: <iframe...)
                        if (val.startsWith('PGlmcmFtZ') || val.includes('iframe')) {
                            try {
                                const decoded = atob(val);
                                const match = decoded.match(/src=["'](.*?)["']/i);
                                if (match && match[1]) val = match[1];
                            } catch(e) {}
                        }
                        
                        if(val.startsWith('http')) {
                            results.push({ name, url: val });
                        }
                    });

                    const iframes = Array.from(document.querySelectorAll('.video-content iframe, .play-video iframe, iframe'));
                    iframes.forEach((ifr, idx) => {
                        if (ifr.src && !ifr.src.includes('facebook.com/plugins') && !ifr.src.includes('youtube.com')) {
                            if (!results.some(r => r.url === ifr.src)) {
                                let name = 'Servidor Alternativo';
                                if (ifr.src.includes('terabox')) name = 'Terabox';
                                else if (ifr.src.includes('ok.ru')) name = 'Ok.ru';
                                else if (ifr.src.includes('fembed')) name = 'Fembed';
                                else if (ifr.src.includes('uqload')) name = 'Uqload';
                                else if (ifr.src.includes('mp4upload')) name = 'Mp4Upload';
                                else if (ifr.src.includes('voe.sx')) name = 'Voe';
                                else if (ifr.src.includes('dood')) name = 'Doodstream';
                                results.push({ name, url: ifr.src });
                            }
                        }
                    });

                    const links = Array.from(document.querySelectorAll('a'));
                    const dlLinks = links.filter(a => a.href.toLowerCase().includes('mega.nz') || a.href.toLowerCase().includes('mediafire.com'));
                    dlLinks.forEach(dl => {
                        let name = 'Descarga';
                        if (dl.href.includes('mega.nz')) name = 'MEGA (Descarga)';
                        if (dl.href.includes('mediafire.com')) name = 'MediaFire (Descarga)';
                        if (!results.some(r => r.url === dl.href)) {
                            results.push({ name, url: dl.href });
                        }
                    });

                    return results;
                });
            }

            this.log(`Se encontraron ${servers.length} servidores/opciones para el Episodio ${ep.number}.`, 'success');

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
                this.log(`No se extrajo ningún servidor válido para el Episodio ${ep.number}.`, 'warning');
            }

        } catch (e) {
            this.log(`Error al procesar el Episodio ${ep.number}: ${e.message}`, 'error');
        }
    }

    this.log(`Módulo de AnimeDBS terminado para ${title}.`, 'success');
    await targetPage.close();
  }
}

module.exports = AnimeDBSProvider;

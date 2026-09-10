require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CinebelProvider = require('./src/providers/Cinebel');
const AnimeOnlineProvider = require('./src/providers/AnimeOnline');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const pgClient = new Client({ connectionString: 'postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres' });
pgClient.connect();

const MAX_CONCURRENT_JOBS = 1; // Empezaremos con 1 para pruebas seguras
let activeJobs = 0;
let browser = null;

// Fake UI logger para que los providers no fallen al llamar global.logToUI
global.logToUI = (msg, type = 'info') => {
    console.log(`[Worker] ${msg}`);
};

async function updateJobStatus(id, status, logMessage) {
    console.log(`[Job ${id}] ${status}: ${logMessage}`);
    const { data } = await supabase.from('scraping_queue').select('logs').eq('id', id).single();
    let logs = data?.logs || [];
    logs.push({ timestamp: new Date().toISOString(), message: logMessage });

    await supabase.from('scraping_queue').update({ status, logs, updated_at: new Date().toISOString() }).eq('id', id);
}

async function searchInProvider(page, title, providerUrl, jobId) {
    let searchQueries = [title];
    
    // Si tiene dos puntos, buscar por partes (ej. Shingeki no Kyojin: The Final Season)
    if (title.includes(':')) {
        searchQueries.push(title.split(':')[1].trim());
        searchQueries.push(title.split(':')[0].trim());
    }
    
    // Si tiene puntos o caracteres especiales, a\u00f1adir una versi\u00f3n limpia (ej. Dr. Stone -> Dr Stone)
    const cleanTitle = title.replace(/[^\w\s\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1]/gi, '').replace(/\s+/g, ' ').trim();
    if (cleanTitle !== title && !searchQueries.includes(cleanTitle)) {
        searchQueries.push(cleanTitle);
    }
    
    let allMatches = [];

    for (const q of searchQueries) {
        const searchUrl = `${providerUrl}/?s=${encodeURIComponent(q)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        
        console.log(`\n======================================================`);
        console.log(`>> ATENCION: REVISA LA VENTANA DE CHROME <<`);
        console.log(`>> SI HAY UN CAPTCHA DE CLOUDFLARE, RESUELVELO MANUALMENTE <<`);
        console.log(`======================================================\n`);
        await updateJobStatus(jobId, 'processing', `Esperando a pasar Cloudflare o buscar resultados para: ${q}...`);
        
        try {
            await page.waitForFunction(
                (searchTitle) => {
                    const cleanSearch = searchTitle.replace(/[^\w\s\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1]/gi, ' ').toLowerCase();
                    const searchWords = cleanSearch.split(/\s+/).filter(w => w.length > 2);
                    const links = Array.from(document.querySelectorAll('a'));
                    return links.some(a => {
                        const text = a.textContent.toLowerCase();
                        const href = a.href.toLowerCase();
                        if (href.includes('/page/') || href.includes('/category/') || href.includes('/tag/') || href.includes('/episodio/') || href.includes('/episode/')) {
                            return false;
                        }
                        const hasKeyword = searchWords.length > 0 ? searchWords.some(w => text.includes(w)) : text.includes(searchTitle.toLowerCase());
                        return hasKeyword && (href.includes('/anime/') || href.includes('/tvshows/') || href.includes('/movies/') || href.includes('/online/') || href.includes('/series/') || href.includes('/tv/'));
                    });
                },
                { timeout: 15000 },
                title // Pasamos el t\u00edtulo original para que lo limpie ah\u00ed adentro
            );
        } catch (e) {
            console.log(`[Worker] Timeout esperando resultados de ${q} en ${providerUrl}`);
            continue; 
        }

        const pageMatches = await page.evaluate((searchTitle) => {
            const links = Array.from(document.querySelectorAll('a'));
            
            // Clean punctuation from searchTitle to make words matching bulletproof
            const cleanSearch = searchTitle.replace(/[^\w\s\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1]/gi, ' ').toLowerCase();
            const searchWords = cleanSearch.split(/\s+/).filter(w => w.length > 2);
            
            let matches = links.filter(a => {
                const text = a.textContent.toLowerCase();
                const href = a.href.toLowerCase();
                
                if (href.includes('/page/') || href.includes('/category/') || href.includes('/tag/') || href.includes('/episodio/') || href.includes('/episode/')) {
                    return false;
                }

                const hasKeyword = searchWords.length > 0 ? searchWords.some(w => text.includes(w)) : text.includes(searchTitle.toLowerCase());
                
                return hasKeyword && (href.includes('/anime/') || href.includes('/tvshows/') || href.includes('/movies/') || href.includes('/online/') || href.includes('/series/') || href.includes('/tv/'));
            });
            
            return matches.map(a => ({ href: a.href, textContent: a.textContent }));
        }, title);

        allMatches.push(...pageMatches);
    }

    if (allMatches.length === 0) return null;

    // Remove duplicates based on href
    const uniqueMatchesMap = new Map();
    allMatches.forEach(m => uniqueMatchesMap.set(m.href, m));
    const uniqueMatches = Array.from(uniqueMatchesMap.values());

    // Sort to find the absolute best match among ALL queries
    uniqueMatches.sort((a, b) => {
        const aIsTv = a.href.includes('/tvshows/') || a.href.includes('/anime/') || a.href.includes('/online/');
        const bIsTv = b.href.includes('/tvshows/') || b.href.includes('/anime/') || b.href.includes('/online/');
        if (aIsTv && !bIsTv) return -1;
        if (!aIsTv && bIsTv) return 1;
        return Math.abs(a.textContent.length - title.length) - Math.abs(b.textContent.length - title.length);
    });

    return uniqueMatches[0].href;
}

async function processJob(job) {
    activeJobs++;
    let page = null;
    try {
        let cleanTitle = job.title;
        let providerPref = 'both';
        let startEp = 1;
        let searchTitle = '';
        
        if (cleanTitle.includes('||')) {
            const parts = cleanTitle.split('||');
            cleanTitle = parts[0];
            providerPref = parts[1] || 'both';
            startEp = parseInt(parts[2]) || 1;
            if (parts[3] && parts[3].trim() !== '') {
                searchTitle = parts[3].trim();
            }
        }
        if (!searchTitle) searchTitle = cleanTitle;
        
        job.title = cleanTitle; // Reemplazar para que de aquí en adelante use el texto limpio (para guardar)
        
        await updateJobStatus(job.id, 'processing', `Iniciando búsqueda para: ${searchTitle} (Guardando como: ${job.title}) (Prov: ${providerPref}) - Empezando en Ep ${startEp}`);
        
        if (!browser) {
            const fs = require('fs');
            
            const path = require('path');
            let executablePath = null;
            const chromePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
            ];
            for (const p of chromePaths) {
                if (fs.existsSync(p)) { executablePath = p; break; }
            }
            const extensionPath = path.join(__dirname, '..', 'ublock', 'uBlock0.chromium');

            browser = await puppeteer.launch({ 
                headless: false,
                executablePath: executablePath,
                userDataDir: path.join(__dirname, 'chrome_profile_worker'),
                defaultViewport: null,
                ignoreDefaultArgs: ['--enable-automation'],
                args: [
                    '--start-maximized', 
                    '--disable-blink-features=AutomationControlled',
                    '--disable-infobars',
                    `--disable-extensions-except=${extensionPath}`,
                    `--load-extension=${extensionPath}`,
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            });
        }

        page = await browser.newPage();
        
        let targetUrl = null;
        let providerClass = null;

        // 1. Buscar en Cinebel
        if (providerPref === 'both' || providerPref === 'cinebel') {
            targetUrl = await searchInProvider(page, searchTitle, 'https://cinebel.cc', job.id);
            if (targetUrl) {
                providerClass = CinebelProvider;
            }
        }

        // 2. Si no lo encuentra, o si solo queremos AnimeOnline, buscar en AnimeOnline
        if (!targetUrl && (providerPref === 'both' || providerPref === 'animeonline')) {
            await updateJobStatus(job.id, 'processing', `Buscando en AnimeOnline Ninja...`);
            targetUrl = await searchInProvider(page, searchTitle, 'https://animeonline.ninja', job.id);
            providerClass = AnimeOnlineProvider;
        }

        if (!targetUrl) {
            throw new Error(`El anime "${job.title}" no se encontró en ninguno de los proveedores.`);
        }

        await updateJobStatus(job.id, 'processing', `Encontrado! URL: ${targetUrl}. Iniciando extracción masiva...`);
        
        // 3. Iniciar extracción
        // Necesitamos cerrar esta pestaña extra porque el Provider abre las suyas
        await page.close();
        page = null;

        // Obtener los datos de TMDB para sacar temporada y nombres de episodios
        let tmdbEpisodes = [];
        try {
            if (job.anime_tmdb_id) {
                await updateJobStatus(job.id, 'processing', `Obteniendo datos de TMDB para mapear temporadas...`);
                const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${job.anime_tmdb_id}?api_key=${process.env.VITE_TMDB_API_KEY}&language=es-MX`);
                const tmdbData = await tmdbRes.json();
                
                if (tmdbData.seasons) {
                    // Filtrar especiales (season 0)
                    const realSeasons = tmdbData.seasons.filter(s => s.season_number > 0);
                    for (const season of realSeasons) {
                        const seasonRes = await fetch(`https://api.themoviedb.org/3/tv/${job.anime_tmdb_id}/season/${season.season_number}?api_key=${process.env.VITE_TMDB_API_KEY}&language=es-MX`);
                        const seasonData = await seasonRes.json();
                        if (seasonData.episodes) {
                            for (const ep of seasonData.episodes) {
                                tmdbEpisodes.push({
                                    season_number: ep.season_number,
                                    episode_number: ep.episode_number, // local de la temporada
                                    name: ep.name,
                                    absolute_number: tmdbEpisodes.length + 1
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.log("Error obteniendo TMDB:", e.message);
        }

        const scraper = new providerClass(browser, pgClient);
        scraper.log = (msg, type) => updateJobStatus(job.id, 'processing', msg);
        scraper.tmdbEpisodesMap = tmdbEpisodes;
        scraper.tmdbId = job.anime_tmdb_id;
        
        let cinebelError = null;
        if (targetUrl && providerClass === CinebelProvider) {
            try {
                await scraper.scrape(targetUrl, job.title, startEp);
            } catch (scrapeErr) {
                cinebelError = scrapeErr;
                await updateJobStatus(job.id, 'processing', `[Alerta] Fall\u00f3 extracci\u00f3n en Cinebel (${scrapeErr.message}).`);
            }
        } else if (targetUrl && providerClass === AnimeOnlineProvider) {
            try {
                await scraper.scrape(targetUrl, job.title, startEp);
            } catch (scrapeErr) {
                await updateJobStatus(job.id, 'processing', `[Alerta] Fall\u00f3 extracci\u00f3n en AnimeOnline (${scrapeErr.message}).`);
            }
        }
        
        // CORRER SIEMPRE ANIMEONLINE PARA EXTRAER M\u00c1S SERVIDORES (Solo si se permite y no se acaba de correr como primario)
        if ((providerPref === 'both' || providerPref === 'animeonline') && providerClass !== AnimeOnlineProvider) {
            await updateJobStatus(job.id, 'processing', `Buscando servidores extra en AnimeOnline Ninja...`);
            const animeOnlinePage = await browser.newPage();
            let animeOnlineUrl = await searchInProvider(animeOnlinePage, searchTitle, 'https://animeonline.ninja', job.id);
            await animeOnlinePage.close();
            
            if (animeOnlineUrl) {
                const fallbackScraper = new AnimeOnlineProvider(browser, pgClient);
                fallbackScraper.log = (msg, type) => updateJobStatus(job.id, 'processing', msg);
                fallbackScraper.tmdbEpisodesMap = tmdbEpisodes;
                fallbackScraper.tmdbId = job.anime_tmdb_id;
                try {
                    await fallbackScraper.scrape(animeOnlineUrl, job.title, startEp);
                } catch(e) {
                    await updateJobStatus(job.id, 'processing', `[Alerta] Fall\u00f3 extracci\u00f3n en AnimeOnline Ninja (${e.message}).`);
                }
            } else {
                await updateJobStatus(job.id, 'processing', `No se encontr\u00f3 en AnimeOnline Ninja para servidores extra.`);
                if (cinebelError && !targetUrl) throw new Error("Tampoco se encontr\u00f3 en AnimeOnline Ninja");
            }
        }
        
        await updateJobStatus(job.id, 'completed', `🎉 Scraping completado exitosamente para ${job.title}`);
    } catch (error) {
        await updateJobStatus(job.id, 'error', `Error crítico: ${error.message}`);
    } finally {
        if (page && !page.isClosed()) await page.close();
        activeJobs--;
    }
}

async function pollQueue() {
    if (activeJobs >= MAX_CONCURRENT_JOBS) return;

    const { data: jobs, error } = await supabase.from('scraping_queue').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(1);

    if (jobs && jobs.length > 0) {
        await supabase.from('scraping_queue').update({ status: 'processing' }).eq('id', jobs[0].id);
        processJob(jobs[0]);
    }
}

setInterval(pollQueue, 5000);
console.log("CEREBRO V3 INICIADO - Esperando tareas en la base de datos...");
pollQueue();

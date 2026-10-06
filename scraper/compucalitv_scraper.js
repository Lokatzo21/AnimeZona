const { Client } = require('pg');
const readline = require('readline');

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve((ans || '').trim());
    }));
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    if (reason && reason.message && reason.message.includes('fetch failed')) {
        // Silencio en errores de red esperados
    } else {
        console.error('[⚠️] Promesa no manejada:', reason);
    }
});

// Lista de dominios/servidores explícitamente bloqueados
const BLOCKED_DOMAINS = [
    'suzihaza.com',
    'suzihaza',
    'sbfast.com',
    'sbfast'
];

// Mapeo oficial de géneros CompucaliTV
const COMPUCALI_GENRES = {
    "26": "Acción",
    "9306": "Action & Adventure",
    "51": "Animación",
    "25": "Aventura",
    "158": "Bélica",
    "27": "Ciencia ficción",
    "192": "Comedia",
    "136": "Crimen",
    "23209": "Documental",
    "157": "Drama",
    "52": "Familia",
    "86": "Fantasía",
    "404": "Historia",
    "9307": "Kids",
    "249": "Misterio",
    "307": "Música",
    "9496": "Película de TV",
    "15487": "Reality",
    "215": "Romance",
    "9334": "Sci-Fi & Fantasy",
    "23714": "Soap",
    "87": "Suspense",
    "48809": "Talk",
    "422": "Terror",
    "9582": "War & Politics",
    "1594": "Western"
};

const TMDB_API_KEY = '372574501f2196723577821c44adb688';
const tmdbSeasonCache = new Map();

async function getRealEpisodeName(showId, seasonNumber, episodeNumber, rawTitle, cleanSearchTitle) {
    // 1. Intentar consultar TMDB oficial para obtener el nombre real en español
    if (showId) {
        const cacheKey = `${showId}_s${seasonNumber}`;
        if (!tmdbSeasonCache.has(cacheKey)) {
            try {
                const url = `https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=es-MX`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    const epMap = new Map();
                    if (Array.isArray(data.episodes)) {
                        for (const e of data.episodes) {
                            if (e.name) epMap.set(e.episode_number, e.name.trim());
                        }
                    }
                    tmdbSeasonCache.set(cacheKey, epMap);
                } else {
                    tmdbSeasonCache.set(cacheKey, new Map());
                }
            } catch (e) {
                tmdbSeasonCache.set(cacheKey, new Map());
            }
        }

        const epMap = tmdbSeasonCache.get(cacheKey);
        const tmdbName = epMap?.get(episodeNumber);
        if (tmdbName && tmdbName.trim().length > 0 && !tmdbName.toLowerCase().startsWith('episodio ') && !tmdbName.toLowerCase().startsWith('episode ')) {
            return tmdbName.trim();
        } else if (tmdbName && tmdbName.trim().length > 0) {
            return tmdbName.trim();
        }
    }

    // 2. Limpieza inteligente del título de CompucaliTV
    if (rawTitle) {
        let cleaned = rawTitle
            .replace(new RegExp(`^${cleanSearchTitle}\\s*:\\s*`, 'i'), '')
            .replace(/Temporada\s+\d+\s+Episodio\s+\d+\s*[-:]?\s*/i, '')
            .replace(/^Episodio\s+\d+\s*[-:]?\s*/i, '')
            .trim();
        
        if (cleaned.length > 0 && !/^Episodio\s+\d+$/i.test(cleaned)) {
            return cleaned;
        }
    }

    return `Episodio ${episodeNumber}`;
}

async function searchTmdbShowId(title) {
    try {
        const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(title)}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results[0]) {
                return data.results[0].id;
            }
        }
    } catch(e) {}
    return null;
}

// Normalizar nombres de servidores para AnimeZona
function normalizeServerName(host, server, url) {
    const h = (host || '').toLowerCase();
    const s = (server || '').toLowerCase();
    const u = (url || '').toLowerCase();
    
    if (h.includes('vimeo') || u.includes('vimeo')) return 'VIMEO';
    if (h.includes('goodstream') || u.includes('goodstream')) return 'GOODSTREAM';
    if (h.includes('streamwish') || h.includes('embedwish') || h.includes('wishembed') || h.includes('hlswish') || u.includes('hlswish')) return 'STREAMWISH';
    if (h.includes('filelion') || h.includes('morencius') || u.includes('filelion')) return 'FILELIONS';
    if (h.includes('voe') || u.includes('voe.sx')) return 'VOE';
    if (h.includes('uqload') || u.includes('uqload')) return 'UQLOAD';
    if (h.includes('filemoon') || u.includes('filemoon')) return 'FILEMOON';
    if (h.includes('vidara') || u.includes('vidara')) return 'VIDARA';
    if (h.includes('fastream') || u.includes('fastream')) return 'FASTREAM';
    if (h.includes('gamovideo') || u.includes('gamovideo')) return 'GAMOVIDEO';
    if (h.includes('dood') || h.includes('ds2play') || u.includes('dood')) return 'DOODSTREAM';
    if (h.includes('streamruby') || u.includes('streamruby')) return 'STREAMRUBY';
    if (h.includes('mega.nz') || h.includes('mega.') || u.includes('mega.nz')) return 'MEGA';
    if (h.includes('1fichier') || u.includes('1fichier')) return '1FICHIER';
    if (h.includes('videoapp') || u.includes('videoapp') || s.includes('videoapp')) return 'VIDEOAPP';
    
    if (host) {
        const domainParts = host.split('.');
        const main = domainParts.length > 1 ? domainParts[domainParts.length - 2] : domainParts[0];
        return main.toUpperCase();
    }
    
    if (url) {
        try {
            const parsed = new URL(url);
            const parts = parsed.hostname.split('.');
            return (parts.length > 1 ? parts[parts.length - 2] : parts[0]).toUpperCase();
        } catch(e) {}
    }
    
    return (server || 'ONLINE').toUpperCase();
}

// Normalizar idioma a los formatos de AnimeZona ('latino', 'sub', 'castellano')
function normalizeLanguage(lang) {
    const l = (lang || '').toLowerCase();
    if (l.includes('latino') && !l.includes('sub')) return 'latino';
    if (l.includes('castellano') || l.includes('español')) return 'castellano';
    if (l.includes('sub') || l.includes('japon')) return 'sub';
    if (l.includes('latino')) return 'latino';
    return 'latino';
}

// Detector de enlaces caídos, eliminados, expirados o bloqueados
async function checkServerLink(videoUrl) {
    if (!videoUrl || typeof videoUrl !== 'string') {
        return { alive: false, blocked: false, reason: 'URL inválida o vacía' };
    }

    const lowerUrl = videoUrl.toLowerCase();
    for (const blocked of BLOCKED_DOMAINS) {
        if (lowerUrl.includes(blocked)) {
            return { alive: false, blocked: true, reason: `Servidor bloqueado (${blocked})` };
        }
    }

    // 1. Verificación especializada para FILEMOON
    // Filemoon siempre devuelve HTTP 200 en /e/{code} con una plantilla SPA React ('Byse Frontend')
    // incluso cuando el video fue borrado o no existe (404). Su API interna revela el estado real.
    const filemoonMatch = videoUrl.match(/filemoon\.[a-z]+\/(?:e|d)\/([a-zA-Z0-9_-]+)/i);
    if (filemoonMatch) {
        const code = filemoonMatch[1];
        try {
            const controllerFm = new AbortController();
            const timeoutFm = setTimeout(() => controllerFm.abort(), 6500);
            const fmRes = await fetch(`https://filemoon.sx/api/videos/${code}/`, {
                signal: controllerFm.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': `https://filemoon.sx/e/${code}`
                }
            });
            clearTimeout(timeoutFm);
            if (fmRes.status === 404) {
                return { alive: false, blocked: false, reason: '404 Not Found (Video eliminado en Filemoon)' };
            }
            if (fmRes.status >= 400) {
                return { alive: false, blocked: false, reason: `HTTP ${fmRes.status} en Filemoon API` };
            }
            const fmData = await fmRes.json().catch(() => ({}));
            if (fmData && fmData.error) {
                return { alive: false, blocked: false, reason: `Filemoon: ${fmData.error}` };
            }
            return { alive: true, blocked: false, reason: 'OK' };
        } catch (fmErr) {
            if (fmErr.name === 'AbortError') {
                return { alive: false, blocked: false, reason: 'Tiempo de espera agotado en Filemoon (> 6.5s)' };
            }
            return { alive: false, blocked: false, reason: `Fallo al verificar Filemoon (${fmErr.message})` };
        }
    }

    // 2. Verificación especializada para VIDEOAPP (videoapp.zip)
    // VideoApp sirve un player iframe cuando está activo (~19 KB).
    // Si el contenido fue borrado o no existe, devuelve una página corta (~500 B) con título "No disponible".
    if (lowerUrl.includes('videoapp.zip') || lowerUrl.includes('videoapp')) {
        try {
            const controllerVa = new AbortController();
            const timeoutVa = setTimeout(() => controllerVa.abort(), 6500);
            const vaRes = await fetch(videoUrl, {
                signal: controllerVa.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://compucalitv.tv/'
                }
            });
            clearTimeout(timeoutVa);
            if (vaRes.status >= 400) {
                return { alive: false, blocked: false, reason: `HTTP ${vaRes.status} en VideoApp` };
            }
            const vaHtml = await vaRes.text();
            if (vaHtml.includes('<title>No disponible</title>') || (vaHtml.length < 1000 && vaHtml.includes('Contenido no disponible'))) {
                return { alive: false, blocked: false, reason: 'VideoApp: Contenido no disponible' };
            }
            if (vaHtml.includes('id="player"') || vaHtml.includes('<iframe') || vaHtml.length > 5000) {
                return { alive: true, blocked: false, reason: 'OK' };
            }
            return { alive: false, blocked: false, reason: 'VideoApp: Estructura no válida' };
        } catch (vaErr) {
            if (vaErr.name === 'AbortError') return { alive: false, blocked: false, reason: 'Tiempo de espera agotado en VideoApp (> 6.5s)' };
            return { alive: false, blocked: false, reason: `Fallo al verificar VideoApp (${vaErr.message})` };
        }
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6500);

        const res = await fetch(videoUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://compucalitv.tv/'
            }
        });
        clearTimeout(timeout);

        // Cualquier código de error HTTP 4xx o 5xx indica que el video no se puede reproducir
        if (res.status >= 400) {
            return { alive: false, blocked: false, reason: `HTTP ${res.status} (${res.status === 404 ? '404 Not Found' : (res.statusText || 'Error')})` };
        }

        // Detectar si fue redirigido a una página de error (ej: /404, /error, /deleted, /expired)
        if (res.url && res.url !== videoUrl) {
            const finalLower = res.url.toLowerCase();
            if (/(?:[\/?&=]404|\/not-?found|\/deleted|\/error|\/expired|\/removed|\/unavailable)/i.test(finalLower)) {
                return { alive: false, blocked: false, reason: `Redirección a página de error (${res.url})` };
            }
        }

        const rawHtml = await res.text();
        if (!rawHtml || rawHtml.trim().length === 0) {
            return { alive: false, blocked: false, reason: 'Respuesta vacía (0 bytes)' };
        }

        // Revisar el título de la página (<title>)
        const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch) {
            const pageTitle = titleMatch[1].trim().toLowerCase();
            if (
                pageTitle.includes('404') ||
                pageTitle.includes('not found') ||
                pageTitle.includes('no encontrado') ||
                pageTitle.includes('no such file') ||
                pageTitle.includes('no disponible') ||
                pageTitle.includes('deleted') ||
                pageTitle.includes('eliminado') ||
                pageTitle.includes('video removed') ||
                pageTitle.includes('file removed')
            ) {
                return { alive: false, blocked: false, reason: `Título indica enlace caído: "${titleMatch[1].trim()}"` };
            }
        }

        // Limpiar HTML para extraer solo el texto visible, eliminando diálogos modales o notices ocultos
        const cleanText = rawHtml
            .replace(/<div[^>]*class="[^"]*notice[^"]*"[\s\S]*?<\/div>/gi, '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

        // Frases clave que indican que el video/archivo fue borrado, expiró o está caído
        const deadPatterns = [
            /404\s*not\s*found/i,
            /error\s*404/i,
            /404\s*error/i,
            /page\s*not\s*found/i,
            /video\s*not\s*found/i,
            /file\s*not\s*found/i,
            /not\s*found/i,
            /no\s*such\s*file/i,
            /no\s*such\s*user/i,
            /file\s*is\s*no\s*longer\s*available/i,
            /as\s*it\s*expired\s*or\s*has\s*been\s*deleted/i,
            /file.*has\s*been\s*deleted/i,
            /file.*was\s*deleted/i,
            /file.*deleted/i,
            /video.*deleted/i,
            /video.*removed/i,
            /archivo.*ha\s*sido\s*eliminado/i,
            /archivo.*eliminado/i,
            /archivo\s*no\s*encontrado/i,
            /video.*eliminado/i,
            /video\s*no\s*encontrado/i,
            /no\s*se\s*encontr[oó]/i,
            /el\s*video\s*no\s*existe/i,
            /el\s*archivo\s*no\s*existe/i,
            /no\s*longer\s*available/i,
            /no\s*available/i,
            /not\s*available/i,
            /no\s*disponible/i,
            /contenido\s*no\s*disponible/i,
            /has\s*been\s*removed/i,
            /ha\s*sido\s*borrado/i,
            /enlace\s*ca[ií]do/i,
            /el\s*enlace\s*ha\s*expirado/i,
            /el\s*archivo\s*ha\s*expirado/i,
            /enlace\s*expirado/i,
            /archivo\s*expirado/i,
            /link\s*expired/i,
            /file\s*expired/i,
            /video\s*record\s*missing/i
        ];

        for (const pat of deadPatterns) {
            if (pat.test(cleanText)) {
                return { alive: false, blocked: false, reason: `Detectado mensaje de enlace caído: "${cleanText.slice(0, 50)}..."` };
            }
        }

        return { alive: true, blocked: false, reason: 'OK' };
    } catch (err) {
        if (err.name === 'AbortError') {
            return { alive: false, blocked: false, reason: 'Tiempo de espera agotado (> 6.5s)' };
        }
        return { alive: false, blocked: false, reason: `Fallo de conexión (${err.message})` };
    }
}

// Parser de URLs universales de CompucaliTV
function parseCompucaliUrl(rawUrl) {
    if (!rawUrl) return null;
    const url = rawUrl.trim();

    // Comprobar si el usuario ingresó una página general de catálogo
    if (/compucalitv\.tv\/(peliculas|pelicula|series|serie|animes|anime|tvshows)\/?$/i.test(url) ||
        /compucalitv\.tv\/?$/i.test(url) || /compucalitv\.tv\/#\/?$/i.test(url)) {
        return { isCatalog: true };
    }

    const clean = url.replace(/#\/?/, '');

    // Formato 1: Con ID numérico (ej: /pelicula/533535/deadpool-wolverine)
    const idMatch = clean.match(/(anime|animes|pelicula|peliculas|movie|movies|serie|series|tvshow|tvshows)\/(\d+)(?:\/([^\/?#]+))?/i);
    if (idMatch) {
        const rawKind = idMatch[1].toLowerCase();
        let kind = 'anime';
        let post_type = 'animes';
        if (rawKind.startsWith('pelicula') || rawKind.startsWith('movie')) {
            kind = 'pelicula';
            post_type = 'movies';
        } else if (rawKind.startsWith('serie') || rawKind.startsWith('tvshow')) {
            kind = 'serie';
            post_type = 'tvshows';
        }

        const id = parseInt(idMatch[2], 10);
        const slug = idMatch[3] ? idMatch[3].replace(/\/+$/, '') : '';
        const sMatch = clean.match(/temporada\/(\d+)/i);
        const eMatch = clean.match(/episodio\/(\d+)/i);

        return {
            kind,
            post_type,
            tmdbId: id,
            slug,
            startSeason: sMatch ? parseInt(sMatch[1], 10) : null,
            startEpisode: eMatch ? parseInt(eMatch[1], 10) : null
        };
    }

    // Formato 2: Con Slug directo (ej: /peliculas/el-quinto-elemento-1997/)
    const slugMatch = clean.match(/(anime|animes|pelicula|peliculas|movie|movies|serie|series|tvshow|tvshows)\/([^\/?#]+)/i);
    if (slugMatch) {
        const rawKind = slugMatch[1].toLowerCase();
        let kind = 'anime';
        let post_type = 'animes';
        if (rawKind.startsWith('pelicula') || rawKind.startsWith('movie')) {
            kind = 'pelicula';
            post_type = 'movies';
        } else if (rawKind.startsWith('serie') || rawKind.startsWith('tvshow')) {
            kind = 'serie';
            post_type = 'tvshows';
        }

        const slug = slugMatch[2].replace(/\/+$/, '');
        const sMatch = clean.match(/temporada\/(\d+)/i);
        const eMatch = clean.match(/episodio\/(\d+)/i);

        return {
            kind,
            post_type,
            tmdbId: null,
            slug,
            startSeason: sMatch ? parseInt(sMatch[1], 10) : null,
            startEpisode: eMatch ? parseInt(eMatch[1], 10) : null
        };
    }

    return null;
}

// Helper para fetch con timeout y headers
async function fetchJson(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://compucalitv.tv/',
            'Origin': 'https://compucalitv.tv',
            'Accept': 'application/json, text/plain, */*'
        }
    });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} al solicitar ${url}`);
    }
    return await res.json();
}

// Obtener datos del item mediante la API de CompucaliTV
async function getItemData(parsed) {
    // 1. Intentar por slug directo con fastApi
    if (parsed.slug) {
        try {
            const singleUrl = `https://compucalitv.tv/api/rest/single?post_name=${parsed.slug}&post_type=${parsed.post_type}`;
            const res = await fetchJson(singleUrl);
            if (!res.error && res.data && res.data._id) {
                return res.data;
            }
        } catch (e) {}

        // Si falló, intentar búsqueda por palabras clave del slug
        try {
            const queryWords = parsed.slug.replace(/-\d{4}$/, '').replace(/-/g, ' ').trim();
            const searchUrl = `https://compucalitv.tv/api/rest/search?post_type=${parsed.post_type}&query=${encodeURIComponent(queryWords.slice(0, 15))}`;
            const sRes = await fetchJson(searchUrl);
            if (!sRes.error && sRes.data?.posts?.length > 0) {
                const found = sRes.data.posts.find(p => p.slug === parsed.slug || p.slug.includes(parsed.slug) || parsed.slug.includes(p.slug)) || sRes.data.posts[0];
                if (found) {
                    try {
                        const postUrl = `https://compucalitv.tv/api/rest/single?post_name=${found.slug}&post_type=${parsed.post_type}`;
                        const postRes = await fetchJson(postUrl);
                        if (!postRes.error && postRes.data) return postRes.data;
                    } catch(e) {}
                    return found;
                }
            }
        } catch (e) {}
    }

    // 2. Si vino con ID TMDB (API externa tmdb.compucalitv.tv)
    if (parsed.tmdbId) {
        try {
            const tmdbRes = await fetchJson(`https://tmdb.compucalitv.tv/v1/items/${parsed.kind}/${parsed.tmdbId}`);
            if (tmdbRes && (tmdbRes.item || tmdbRes.title)) {
                return tmdbRes.item || tmdbRes;
            }
        } catch (e) {}
    }

    return null;
}

async function processTargetUrl(targetUrl, modoNum) {
    if (!targetUrl.includes('compucalitv')) {
        console.log("\n⚠️ Uso incorrecto. Proporciona una URL válida de compucalitv.tv");
        console.log("Ejemplos:");
        console.log("  Película: https://compucalitv.tv/peliculas/el-quinto-elemento-1997/");
        console.log("  Película: https://compucalitv.tv/#/pelicula/533535/deadpool-wolverine");
        console.log("  Serie:    https://compucalitv.tv/series/the-boys-2019/");
        console.log("  Anime:    https://compucalitv.tv/#/anime/213331/boushoku-no-berserk");
        return;
    }

    const parsed = parseCompucaliUrl(targetUrl);
    if (!parsed) {
        console.log(`\n[❌] No se pudo identificar el tipo y contenido de la URL: ${targetUrl}`);
        return;
    }

    if (parsed.isCatalog) {
        console.log(`\n===================================================`);
        console.log(`⚠️ ATENCIÓN: Has introducido la página general del catálogo.`);
        console.log(`Para extraer una película o serie específica, introduce el link completo de esa película.`);
        console.log(`Ejemplo de película:`);
        console.log(`  👉 https://compucalitv.tv/peliculas/el-quinto-elemento-1997/`);
        console.log(`  👉 https://compucalitv.tv/#/pelicula/533535/deadpool-wolverine`);
        console.log(`===================================================\n`);
        return;
    }

    const isMovie = parsed.kind === 'pelicula' || parsed.post_type === 'movies';

    if (isMovie) {
        modoNum = "1";
    } else if (!modoNum) {
        console.log("\n[?] ¿Cómo quieres numerar los episodios en tu base de datos?");
        console.log("1) Por Temporada (El número reinicia a 1 en cada temporada)");
        console.log("2) Numeración Absoluta Continua (1, 2, 3... 25, 26... sin reiniciar)");
        const ans = await askQuestion("Selecciona 1 o 2 (Por defecto = 1): ");
        modoNum = ans === "2" ? "2" : "1";
    }

    console.log("\n===================================================");
    console.log(`       🤖 SCRAPER AUTOMÁTICO COMPUCALITV ${isMovie ? '(MODO PELÍCULA)' : ''} `);
    console.log("===================================================");
    console.log(`[🔗] URL objetivo: ${targetUrl}`);
    console.log(`[🔎] Tipo detectado: ${isMovie ? '🎬 PELÍCULA (Directo, 1 Episodio)' : '📺 SERIE / ANIME'}`);
    if (!isMovie) {
        console.log(`[⚙️] Modo de numeración: ${modoNum === "2" ? "2 (Absoluta Continua)" : "1 (Por Temporada)"}`);
    }

    // Conectar a Supabase PostgreSQL
    const client = new Client({
        connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
    });

    try {
        await client.connect();
        console.log(`[🔌] Conectado a Supabase PostgreSQL.`);
    } catch (e) {
        console.error(`[❌] Error al conectar con la base de datos:`, e.message);
        return;
    }

    try {
        // 1. Obtener datos del item
        console.log(`[📡] Consultando información en CompucaliTV...`);
        const item = await getItemData(parsed);

        if (!item) {
            console.log(`[❌] No se pudo obtener la información del contenido en CompucaliTV.`);
            console.log(`Verifica que la URL esté escrita correctamente.`);
            return;
        }

        // Título limpio (remover año al final "(1997)")
        const rawTitle = item.title || item.original_title || parsed.slug || 'Película';
        const cleanSearchTitle = rawTitle.replace(/\s*\(\d{4}\)\s*$/, '').trim();

        // Poster y descripción
        let posterUrl = 'https://via.placeholder.com/225x318?text=No+Image';
        if (item.images?.poster) {
            posterUrl = `https://compucalitv.tv/wp-content/uploads${item.images.poster}`;
        } else if (item.poster_path) {
            posterUrl = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
        }

        const description = item.overview || 'Sin sinopsis disponible.';

        // Géneros
        let genres = ['Acción'];
        if (Array.isArray(item.genres) && item.genres.length > 0) {
            genres = item.genres.map(g => {
                if (typeof g === 'number' || !isNaN(g)) {
                    return COMPUCALI_GENRES[String(g)] || 'Acción';
                }
                return g.title || g.slug || String(g);
            }).filter(Boolean);
        }

        const status = isMovie ? 'Finalizado' : ((item.status === 'Ended' || item.status === 'Canceled') ? 'Finalizado' : 'En emisión');

        console.log(`\n[✨] Título: "${cleanSearchTitle}"`);
        console.log(`[🖼️] Póster: ${posterUrl}`);
        console.log(`[🏷️] Géneros: ${genres.join(', ')}`);

        // 2. Si es serie/anime, consultar lista de episodios por adelantado para conocer el total real
        let episodesList = [];
        if (!isMovie) {
            console.log(`\n[📚] Consultando episodios de "${cleanSearchTitle}"...`);
            if (item._id) {
                try {
                    const epRes = await fetchJson(`https://compucalitv.tv/api/rest/episodes?post_id=${item._id}`);
                    if (epRes && Array.isArray(epRes.data)) episodesList = epRes.data;
                } catch(e) {}
            }

            if (episodesList.length > 0) {
                console.log(`[🔢] Total de episodios encontrados: ${episodesList.length}`);
                // Agrupar por temporada y ordenar
                episodesList.sort((a, b) => {
                    if (a.season_number !== b.season_number) return a.season_number - b.season_number;
                    return a.episode_number - b.episode_number;
                });
            }
        }

        const calculatedInitialTotalEps = isMovie ? 1 : Math.max(episodesList.length, item.number_of_episodes || 1);

        // 3. Comprobar si existe en custom_animes o auto-crearlo
        let customId = null;
        let existingEpisodeNames = {};
        let currentTotalEps = 0;

        const { rows: existCustom } = await client.query(
            'SELECT id, total_episodes, episode_names FROM custom_animes WHERE title ILIKE $1 LIMIT 1',
            [cleanSearchTitle]
        );

        if (existCustom.length > 0) {
            customId = existCustom[0].id;
            existingEpisodeNames = existCustom[0].episode_names || {};
            currentTotalEps = existCustom[0].total_episodes || 0;
            console.log(`[📁] Ficha existente encontrada en tu web con ID: ${customId}`);

            // Si en BD tenía 1 o menos y ahora sabemos que tiene más episodios, actualizarlo de inmediato
            if (!isMovie && calculatedInitialTotalEps > currentTotalEps) {
                await client.query('UPDATE custom_animes SET total_episodes = $1 WHERE id = $2', [calculatedInitialTotalEps, customId]);
                currentTotalEps = calculatedInitialTotalEps;
            }
        } else {
            customId = 'custom-' + Date.now();
            console.log(`[✨] No existe en tu web. Auto-creando ficha de "${cleanSearchTitle}"...`);

            await client.query(`
                INSERT INTO custom_animes (id, title, image, description, total_episodes, genres, status, is_secret, episode_names)
                VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8)
            `, [
                customId,
                cleanSearchTitle,
                posterUrl,
                description,
                calculatedInitialTotalEps,
                genres,
                status,
                {}
            ]);
            console.log(`[✅] Ficha creada con éxito en la base de datos (ID: ${customId}, total_episodes: ${calculatedInitialTotalEps}).`);
        }

        let totalSaved = 0;
        let totalSkipped = 0;
        let totalDead = 0;
        let totalBlocked = 0;

        // 3. PROCESAMIENTO: MODO PELÍCULA O MODO SERIE/ANIME
        if (isMovie) {
            console.log(`\n[🎬] Extrayendo servidores de Película: "${cleanSearchTitle}"...`);

            let embeds = [];
            // Intentar fastApi player
            if (item._id) {
                try {
                    const pData = await fetchJson(`https://compucalitv.tv/api/rest/player?post_id=${item._id}`);
                    if (pData && Array.isArray(pData.data)) embeds = pData.data;
                } catch(e) {}
            }

            // Si vino de playback tmdb
            if (embeds.length === 0 && (parsed.tmdbId || item.id)) {
                try {
                    const pb = await fetchJson(`https://tmdb.compucalitv.tv/v1/playback/pelicula/${parsed.tmdbId || item.id}`);
                    if (pb && Array.isArray(pb.embeds)) embeds = pb.embeds;
                } catch(e) {}
            }

            console.log(`[📺] Total de servidores encontrados en CompucaliTV: ${embeds.length}`);

            if (embeds.length === 0) {
                console.log(`[⚠️] No se encontraron reproductores disponibles para esta película.`);
            }

            for (const emb of embeds) {
                const srvName = normalizeServerName(emb.host, emb.server, emb.url);
                const srvLang = normalizeLanguage(emb.lang);
                const videoUrl = emb.url;

                // Verificación de enlace caído / servidor bloqueado
                process.stdout.write(`  ⏳ Verificando [${srvName} - ${srvLang}]: ${videoUrl.substring(0, 48)}... `);
                const linkStatus = await checkServerLink(videoUrl);

                if (!linkStatus.alive) {
                    if (linkStatus.blocked) {
                        console.log(`🚫 BLOQUEADO (${linkStatus.reason})`);
                        totalBlocked++;
                    } else {
                        console.log(`❌ CAÍDO (${linkStatus.reason})`);
                        totalDead++;
                    }
                    continue;
                }

                console.log(`✅ VIVO`);

                try {
                    const check = await client.query(
                        `SELECT id FROM anime_episodes WHERE search_title=$1 AND episode_number=1 AND season_number=1 AND (server_name=$2 OR video_url=$3) LIMIT 1`,
                        [cleanSearchTitle.toLowerCase(), srvName, videoUrl]
                    );

                    if (check.rows.length === 0) {
                        await client.query(`
                            INSERT INTO anime_episodes (search_title, episode_number, season_number, episode_name, server_name, language, video_url, anime_tmdb_id)
                            VALUES ($1, 1, 1, $2, $3, $4, $5, $6)
                        `, [
                            cleanSearchTitle.toLowerCase(),
                            cleanSearchTitle,
                            srvName,
                            srvLang,
                            videoUrl,
                            null // anime_tmdb_id siempre null para evitar custom-*
                        ]);
                        console.log(`    [🎉] Guardado en BD: ${srvName} (${srvLang})`);
                        totalSaved++;
                    } else {
                        console.log(`    [⏭️] Ya existe en BD (${srvName} - ${srvLang})`);
                        totalSkipped++;
                    }
                } catch (sqlErr) {
                    console.error(`    [❌] Error SQL:`, sqlErr.message);
                }
            }

            existingEpisodeNames["1"] = { name: cleanSearchTitle, season: 1, episode: 1 };

            // Asegurar que en custom_animes total_episodes sea exactamente 1
            await client.query(`
                UPDATE custom_animes 
                SET total_episodes = 1, episode_names = $1 
                WHERE id = $2
            `, [JSON.stringify(existingEpisodeNames), customId]);

        } else {
            // MODO SERIE O ANIME
            if (episodesList.length > 0) {

                let absoluteCounter = 1;
                if (modoNum === "2") {
                    const maxEpRes = await client.query(
                        `SELECT MAX(episode_number) as max_ep FROM anime_episodes WHERE search_title=$1`,
                        [cleanSearchTitle.toLowerCase()]
                    );
                    const currentMaxInDb = maxEpRes.rows[0].max_ep || 0;
                    absoluteCounter = currentMaxInDb > 0 ? (currentMaxInDb + 1) : 1;
                }

                let detectedShowId = parsed.tmdbId || item.show_id || item.tmdb_id || (episodesList[0] ? episodesList[0].show_id : null);
                if (!detectedShowId && cleanSearchTitle) {
                    detectedShowId = await searchTmdbShowId(cleanSearchTitle);
                }

                for (const ep of episodesList) {
                    const sNum = ep.season_number || 1;
                    const eNum = ep.episode_number || 1;
                    const thisShowId = ep.show_id || detectedShowId;
                    const epTitle = await getRealEpisodeName(thisShowId, sNum, eNum, ep.title, cleanSearchTitle);

                    if (parsed.startSeason && sNum < parsed.startSeason) continue;
                    if (parsed.startSeason && sNum === parsed.startSeason && parsed.startEpisode && eNum < parsed.startEpisode) continue;

                    let currentEpNumToSave = eNum;
                    if (modoNum === "2") {
                        const existingEp = await client.query(
                            `SELECT episode_number FROM anime_episodes WHERE search_title=$1 AND season_number=$2 AND episode_name=$3 LIMIT 1`,
                            [cleanSearchTitle.toLowerCase(), sNum, epTitle]
                        );
                        if (existingEp.rows.length > 0) {
                            currentEpNumToSave = existingEp.rows[0].episode_number;
                        } else {
                            currentEpNumToSave = absoluteCounter++;
                        }
                    }

                    console.log(`\n[📥] Temporada ${sNum} - Episodio ${currentEpNumToSave} (${epTitle})`);

                    existingEpisodeNames[String(currentEpNumToSave)] = {
                        name: epTitle,
                        season: sNum,
                        episode: eNum
                    };

                    let embeds = [];
                    try {
                        const pData = await fetchJson(`https://compucalitv.tv/api/rest/player?post_id=${ep._id}`);
                        if (pData && Array.isArray(pData.data)) embeds = pData.data;
                    } catch(e) {}

                    for (const emb of embeds) {
                        const srvName = normalizeServerName(emb.host, emb.server, emb.url);
                        const srvLang = normalizeLanguage(emb.lang);
                        const videoUrl = emb.url;

                        const linkStatus = await checkServerLink(videoUrl);
                        if (!linkStatus.alive) {
                            if (linkStatus.blocked) totalBlocked++;
                            else totalDead++;
                            continue;
                        }

                        try {
                            const check = await client.query(
                                `SELECT id FROM anime_episodes WHERE search_title=$1 AND episode_number=$2 AND season_number=$3 AND (server_name=$4 OR video_url=$5) LIMIT 1`,
                                [cleanSearchTitle.toLowerCase(), currentEpNumToSave, sNum, srvName, videoUrl]
                            );

                            if (check.rows.length === 0) {
                                await client.query(`
                                    INSERT INTO anime_episodes (search_title, episode_number, season_number, episode_name, server_name, language, video_url, anime_tmdb_id)
                                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                                `, [
                                    cleanSearchTitle.toLowerCase(),
                                    currentEpNumToSave,
                                    sNum,
                                    epTitle,
                                    srvName,
                                    srvLang,
                                    videoUrl,
                                    null
                                ]);
                                console.log(`  [🎉] Guardado: ${srvName} (${srvLang})`);
                                totalSaved++;
                            } else {
                                totalSkipped++;
                            }
                        } catch (sqlErr) {
                            console.error(`  [❌] Error SQL:`, sqlErr.message);
                        }
                    }

                    await new Promise(r => setTimeout(r, 100));
                }
            }
        }

        // 4. Actualizar total_episodes y episode_names en custom_animes
        try {
            const countRes = await client.query(
                `SELECT COUNT(DISTINCT episode_number) as total_scraped, MAX(episode_number) as max_ep FROM anime_episodes WHERE search_title=$1`,
                [cleanSearchTitle.toLowerCase()]
            );
            const totalCount = parseInt(countRes.rows[0].total_scraped, 10) || 1;
            const maxEp = parseInt(countRes.rows[0].max_ep, 10) || 1;
            const finalTotal = isMovie ? 1 : Math.max(currentTotalEps, calculatedInitialTotalEps, totalCount, maxEp);

            await client.query(`
                UPDATE custom_animes 
                SET total_episodes = $1, episode_names = $2 
                WHERE id = $3
            `, [
                finalTotal,
                JSON.stringify(existingEpisodeNames),
                customId
            ]);
            console.log(`\n[📊] Ficha actualizada: total_episodes = ${finalTotal}`);
        } catch (updErr) {
            console.log(`[⚠️] Error al actualizar metadatos finales: ${updErr.message}`);
        }

        console.log(`\n===================================================`);
        console.log(`🏆 ¡ESCANEO FINALIZADO CON ÉXITO!`);
        console.log(`[📥] Nuevos servidores agregados: ${totalSaved}`);
        console.log(`[⏭️] Servidores ya existentes:   ${totalSkipped}`);
        console.log(`[❌] Enlaces caídos descartados: ${totalDead}`);
        console.log(`[🚫] Servidores bloqueados:      ${totalBlocked}`);
        console.log(`===================================================`);

    } catch (e) {
        console.error(`[❌] Error crítico en el scraper:`, e.message);
    } finally {
        await client.end();
    }
}

async function runScraper() {
    let targetUrlFromArg = (process.argv[2] || '').trim();
    let modoNumFromArg = (process.argv[3] || '').trim();
    let isFirst = true;

    while (true) {
        let targetUrl = '';
        let modoNum = '';

        if (isFirst && targetUrlFromArg) {
            targetUrl = targetUrlFromArg;
            modoNum = modoNumFromArg;
        } else {
            console.log("\n===================================================");
            console.log("        🤖 SCRAPER AUTOMÁTICO COMPUCALITV          ");
            console.log("===================================================\n");
            console.log("[💡] TIP: Puedes pegar un enlace de Película, Serie o Anime.");
            console.log("Ejemplos:");
            console.log("  - Película: https://compucalitv.tv/peliculas/el-quinto-elemento-1997/");
            console.log("  - Película: https://compucalitv.tv/#/pelicula/533535/deadpool-wolverine");
            console.log("  - Serie:    https://compucalitv.tv/series/the-boys-2019/");
            console.log("  - Anime:    https://compucalitv.tv/#/anime/213331/boushoku-no-berserk");
            console.log("  - (O escribe 'salir' para cerrar)\n");

            targetUrl = await askQuestion("👉 Introduce la URL de CompucaliTV: ");
        }

        isFirst = false;
        targetUrlFromArg = ''; // Limpiar para que las siguientes iteraciones pidan la URL

        if (!targetUrl || targetUrl.toLowerCase() === 'salir' || targetUrl.toLowerCase() === 'exit' || targetUrl.toLowerCase() === 'q') {
            console.log("\n👋 ¡Hasta luego! Cerrando el scraper.");
            break;
        }

        await processTargetUrl(targetUrl, modoNum);

        console.log("\n---------------------------------------------------");
        console.log("¿Qué deseas hacer ahora?");
        console.log("  1) 🔄 Extraer otra película o serie");
        console.log("  2) ❌ Salir y cerrar");
        const nextAction = await askQuestion("Selecciona 1 o 2 (Por defecto = 1): ");
        if (nextAction === "2" || nextAction.toLowerCase() === "salir" || nextAction.toLowerCase() === "no" || nextAction.toLowerCase() === "exit") {
            console.log("\n👋 ¡Hasta luego! Gracias por usar AnimeZona Scraper.");
            break;
        }
    }
}

runScraper();


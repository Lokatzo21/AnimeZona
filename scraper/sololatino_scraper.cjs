/**
 * ============================================================================
 * CONVERTIDOR INTELIGENTE SOLOLATINO -> MEDIAFIRE DIRECTO & SUPABASE
 * ============================================================================
 * Extrae enlaces directos (.bin?.mp4) y permanentes de Mediafire
 * para Películas, Series completas y Animes desde https://sololatino.net
 * 
 * - Numeración continua de episodios (Temporada 1 del 1 al 12, Temporada 2 del 13 en adelante).
 * - Detección automática o manual de Título y TMDB ID oficial.
 * - Archivo único permanente acumulativo en: results/mediafire_permanentes.txt
 * - Inserción directa / upsert en Supabase (anime_episodes y custom_animes).
 * - Enlaces de video guardados listos para streaming directo con "?.mp4".
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

// Importar cliente Postgres
let Client = null;
try {
  Client = require(path.join(__dirname, 'node_modules', 'pg')).Client;
} catch (e1) {
  try {
    Client = require('pg').Client;
  } catch (e2) {
    Client = null;
  }
}

const DB_CONN = 'postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres';
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || '372574501f2196723577821c44adb688';

const VERCEL_RESOLVER_BASE = 'https://animezona.vercel.app/api/mediafire';
const RESULTS_DIR = path.join(__dirname, '..', 'results');
const PERMANENTS_FILE = path.join(RESULTS_DIR, 'mediafire_permanentes.txt');

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, ans => resolve(ans.trim())));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function normalizeLanguage(rawLang) {
  const l = String(rawLang || 'latino').trim().toLowerCase();
  if (l.includes('sub') || l.includes('jap') || l.includes('jp')) return 'sub';
  if (l.includes('cast') || l.includes('esp') || l === 'es') return 'castellano';
  return 'latino';
}

function fnv1a(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0).toString(16);
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function httpsRequest(urlStr, options = {}, bodyData = null) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const reqOptions = {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          ...options.headers
        },
        timeout: 15000
      };

      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        }));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout de conexión (15s)'));
      });

      req.on('error', reject);
      if (bodyData) req.write(bodyData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function parseCookies(setCookieHeaders) {
  const cookies = {};
  if (!setCookieHeaders) return cookies;
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const c of list) {
    const parts = c.split(';')[0].split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  }
  return cookies;
}

function cookieString(cookies) {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

/**
 * Consulta oficial de TMDB para autodetectar metadatos
 */
async function searchTmdb(title, isMovie = false) {
  try {
    const endpoint = isMovie ? 'movie' : 'tv';
    const cleanTitle = title.replace(/\s*\(\d{4}\)\s*/, '').replace(/[-_]/g, ' ').trim();
    const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}&language=es-MX&include_adult=false`;
    const res = await httpsRequest(url);
    if (res.statusCode === 200) {
      const data = JSON.parse(res.data);
      if (data.results && data.results.length > 0) {
        return data.results[0];
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Consulta en Supabase el último número de episodio para numeración continua
 */
async function getSupabaseMaxEpisode(title, tmdbId) {
  if (!Client) return 0;
  let c = null;
  try {
    c = new Client({ connectionString: DB_CONN });
    await c.connect();
    const res = await c.query(
      `SELECT COALESCE(MAX(episode_number), 0) as max_ep, COUNT(id) as total_found
       FROM anime_episodes 
       WHERE LOWER(search_title) = LOWER($1) OR (anime_tmdb_id = $2 AND anime_tmdb_id IS NOT NULL AND anime_tmdb_id != '')`,
      [title, String(tmdbId || '')]
    );
    await c.end();
    return parseInt(res.rows[0]?.max_ep || '0', 10);
  } catch (e) {
    if (c) try { await c.end(); } catch (_) {}
    return 0;
  }
}

/**
 * Extrae enlace directo y permanente de Mediafire desde una página de SoloLatino
 */
async function extractMediafireSingle(targetUrl) {
  let cookieJar = {};
  const resPage = await httpsRequest(targetUrl);
  if (resPage.statusCode !== 200) {
    throw new Error(`HTTP ${resPage.statusCode} al obtener página: ${targetUrl}`);
  }
  Object.assign(cookieJar, parseCookies(resPage.headers['set-cookie']));

  // Token del servidor
  const tokenMatch = resPage.data.match(/class=["'][^"']*server-btn[^"']*["'][^>]*data-player-token=["']([^"']+)["']/i);
  if (!tokenMatch) {
    throw new Error('No se encontró botón de servidor con data-player-token en la página');
  }
  const playerToken = tokenMatch[1];

  // Cookie CSRF
  const resCsrf = await httpsRequest('https://sololatino.net/sanctum/csrf-cookie', {
    headers: { 'Cookie': cookieString(cookieJar), 'Referer': targetUrl }
  });
  Object.assign(cookieJar, parseCookies(resCsrf.headers['set-cookie']));
  const xsrfToken = cookieJar['XSRF-TOKEN'] ? decodeURIComponent(cookieJar['XSRF-TOKEN']) : '';

  // Player URL
  const resApi = await httpsRequest('https://sololatino.net/api/player-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': cookieString(cookieJar),
      'Referer': targetUrl,
      'X-XSRF-TOKEN': xsrfToken,
      'Origin': 'https://sololatino.net'
    }
  }, JSON.stringify({ t: playerToken }));

  let playerJson = {};
  try { playerJson = JSON.parse(resApi.data); } catch (e) {}
  let playerUrl = playerJson?.url;
  if (!playerUrl) {
    process.stdout.write('⏳ [API de SoloLatino ocupada, esperando 15s]... ');
    await sleep(15000);
    const retryApi = await httpsRequest('https://sololatino.net/api/player-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': cookieString(cookieJar),
        'Referer': targetUrl,
        'X-XSRF-TOKEN': xsrfToken,
        'Origin': 'https://sololatino.net'
      }
    }, JSON.stringify({ t: playerToken }));
    try { playerJson = JSON.parse(retryApi.data); } catch (e) {}
    playerUrl = playerJson?.url;
  }
  if (!playerUrl) {
    throw new Error('No se obtuvo URL del reproductor');
  }

  // Token y firmas del reproductor
  const resPlayer = await httpsRequest(playerUrl, {
    headers: { 'Referer': 'https://sololatino.net/' }
  });

  const tokMatch = resPlayer.data.match(/const\s+_t\s*=\s*['"]([a-f0-9]+)['"]/);
  const qkMatch = resPlayer.data.match(/var\s+_qk\s*=\s*(\[[^\]]+\]);/);
  const qcMatch = resPlayer.data.match(/var\s+_qc\s*=\s*['"]([^'"]+)['"]/);

  if (!tokMatch || !qkMatch || !qcMatch) {
    throw new Error('No se pudieron extraer variables de seguridad del reproductor');
  }

  const tok = tokMatch[1];
  const qk = JSON.parse(qkMatch[1]);
  const qc = qcMatch[1];
  const qv = qk[1] + qk[3] + qk[0] + qk[2];
  const qt = fnv1a(qv + '|clk|' + qc);

  function callS(params) {
    const postBody = new URLSearchParams({ ...params, rt: qv, tk: qt }).toString();
    return httpsRequest('https://player.pelisserieshoy.com/s.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': playerUrl,
        'Origin': 'https://player.pelisserieshoy.com'
      }
    }, postBody).then(r => {
      try { return JSON.parse(r.data); } catch (e) { return r.data; }
    });
  }

  // Click & scan con manejo inteligente y cooldown real de rate_limited
  await callS({ a: 'click', tok: tok, ts: '1' });
  let scan = await callS({ a: '1', tok: tok });

  if (scan && scan.msg === 'rate_limited') {
    process.stdout.write('⏳ [Rate limit: enfriando servidor 18s]... ');
    await sleep(18000);
    scan = await callS({ a: '1', tok: tok });
    if (scan && scan.msg === 'rate_limited') {
      process.stdout.write('⏳ [esperando 25s más]... ');
      await sleep(25000);
      scan = await callS({ a: '1', tok: tok });
    }
  }

  if (!scan || !scan.s || !Array.isArray(scan.s)) {
    throw new Error('Respuesta no válida del reproductor: ' + JSON.stringify(scan));
  }

  const playerPlus = scan.s.find(item => item[0].includes('Player+') || item[0].includes('Principal'));
  if (!playerPlus) {
    throw new Error('El servidor Player+ (Mediafire) no está disponible en este episodio');
  }

  const serverHash = playerPlus[1];

  // Stream endpoint con reintento si hay rate_limited
  let resA2 = await callS({ a: '2', v: serverHash, tok: tok });
  if (resA2 && resA2.msg === 'rate_limited') {
    process.stdout.write('⏳ [enfriando servidor 18s]... ');
    await sleep(18000);
    resA2 = await callS({ a: '2', v: serverHash, tok: tok });
  }

  if (!resA2 || !resA2.u) {
    throw new Error(`Respuesta no válida del reproductor: ${JSON.stringify(resA2)}`);
  }

  // Redirección 302 a Mediafire
  const resRedirect = await httpsRequest('https://player.pelisserieshoy.com' + resA2.u, {
    headers: { 'Referer': playerUrl }
  });

  let mediafireDirect = resRedirect.headers['location'];
  if (!mediafireDirect) {
    throw new Error('No se recibió la redirección hacia Mediafire');
  }

  // Link permanente
  const mfParts = mediafireDirect.match(/mediafire\.com\/[^\/]+\/([a-zA-Z0-9]+)\/([^\/?#]+)/);
  let permanentLink = '';
  if (mfParts) {
    permanentLink = `https://www.mediafire.com/file/${mfParts[1]}/${mfParts[2]}/file`;
  }

  // HEAD check rápido
  let sizeMB = '0.00';
  let isAlive = false;
  try {
    const u = new URL(mediafireDirect);
    const headRes = await new Promise((resolve) => {
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname,
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 8000
      }, (res) => {
        resolve({
          status: res.statusCode,
          contentLength: res.headers['content-length']
        });
      });
      req.on('timeout', () => { req.destroy(); resolve({ status: 408 }); });
      req.on('error', () => resolve({ status: 500 }));
      req.end();
    });

    if (headRes.status === 200 || headRes.status === 206) {
      isAlive = true;
      if (headRes.contentLength) {
        sizeMB = (parseInt(headRes.contentLength, 10) / (1024 * 1024)).toFixed(2);
      }
    } else if (permanentLink) {
      // Si el enlace de SoloLatino vino expirado (302 repair), renovarlo directamente de Mediafire
      try {
        const pageRes = await httpsRequest(permanentLink);
        if (pageRes.statusCode === 200) {
          const directMatch = pageRes.data.match(/https?:\/\/download\d+\.mediafire\.com\/[^\s"']+/i);
          if (directMatch) {
            mediafireDirect = directMatch[0];
            const u2 = new URL(mediafireDirect);
            const head2 = await new Promise((resolve) => {
              const req = https.request({
                hostname: u2.hostname,
                path: u2.pathname,
                method: 'HEAD',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 8000
              }, (res) => resolve({ status: res.statusCode, contentLength: res.headers['content-length'] }));
              req.on('timeout', () => { req.destroy(); resolve({ status: 408 }); });
              req.on('error', () => resolve({ status: 500 }));
              req.end();
            });
            if (head2.status === 200 || head2.status === 206) {
              isAlive = true;
              if (head2.contentLength) {
                sizeMB = (parseInt(head2.contentLength, 10) / (1024 * 1024)).toFixed(2);
              }
            }
          }
        }
      } catch (errRenew) {}
    }
  } catch (e) {}

  return {
    directLink: mediafireDirect,
    streamUrl: mediafireDirect + '?.mp4',
    permanentLink: permanentLink,
    sizeMB: sizeMB,
    alive: isAlive,
    resolverUrl: `${VERCEL_RESOLVER_BASE}?url=${encodeURIComponent(permanentLink)}`
  };
}

/**
 * Obtiene lista completa de episodios de una serie o anime
 */
async function fetchSeriesEpisodes(seriesUrl) {
  const res = await httpsRequest(seriesUrl);
  if (res.statusCode !== 200) {
    throw new Error(`HTTP ${res.statusCode} al consultar serie`);
  }

  const titleMatch = res.data.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const seriesTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Serie';

  const matches = [...res.data.matchAll(/href=["'](https?:\/\/sololatino\.net\/serie\/[^\/]+\/temporada-(\d+)\/episodio-(\d+))["']/gi)];
  
  const episodesMap = new Map();
  for (const m of matches) {
    const fullUrl = m[1];
    const season = parseInt(m[2], 10);
    const episode = parseInt(m[3], 10);
    const key = `S${String(season).padStart(2, '0')}E${String(episode).padStart(3, '0')}`;
    if (!episodesMap.has(key)) {
      episodesMap.set(key, { season, episode, url: fullUrl });
    }
  }

  const list = Array.from(episodesMap.values()).sort((a, b) => {
    if (a.season !== b.season) return a.season - b.season;
    return a.episode - b.episode;
  });

  return {
    title: seriesTitle,
    episodes: list
  };
}

/**
 * Guarda y acumula enlaces permanentes en el archivo único central:
 * results/mediafire_permanentes.txt
 */
function appendToMasterPermanentsFile(title, tmdbId, items) {
  let block = `\n================================================================================\n`;
  block += `[${new Date().toLocaleString()}] ${title.toUpperCase()} (TMDB: ${tmdbId || 'N/A'})\n`;
  block += `================================================================================\n`;

  let lastSeason = -1;
  for (const item of items) {
    if (item.season && item.season !== lastSeason) {
      lastSeason = item.season;
      block += `--- TEMPORADA ${lastSeason} ---\n`;
    }

    if (item.episode) {
      block += `• T${item.season}E${item.episode} (Ep. continuo ${item.episode_number || item.episode})${item.sizeMB ? ` [${item.sizeMB} MB]` : ''}:\n`;
      block += `  - Permanente:  ${item.permanentLink || 'N/A'}\n`;
      if (item.resolverUrl) {
        block += `  - Inmortal Vercel: ${item.resolverUrl}\n`;
      }
      if (item.video_url || item.streamUrl) {
        block += `  - Stream .mp4:    ${item.video_url || item.streamUrl}\n`;
      }
    } else {
      block += `• Película${item.sizeMB ? ` [${item.sizeMB} MB]` : ''}:\n`;
      block += `  - Permanente:  ${item.permanentLink || 'N/A'}\n`;
      if (item.video_url || item.streamUrl) {
        block += `  - Stream .mp4: ${item.video_url || item.streamUrl}\n`;
      }
    }
  }

  fs.appendFileSync(PERMANENTS_FILE, block, 'utf8');
}

/**
 * Inserta o actualiza en Supabase (anime_episodes y custom_animes)
 */
async function syncSupabaseRecord(client, record, tmdbInfo = null) {
  if (!client) return null;

  // 1. Asegurar registro en custom_animes si tenemos título e ID TMDB
  if (record.anime_tmdb_id) {
    try {
      const checkAnime = await client.query(
        'SELECT id FROM custom_animes WHERE id = $1 OR LOWER(title) = LOWER($2) LIMIT 1',
        [String(record.anime_tmdb_id), record.search_title]
      );

      const poster = tmdbInfo?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbInfo.poster_path}` : '';
      const overview = tmdbInfo?.overview || '';
      const genres = tmdbInfo?.genre_ids ? ['Acción', 'Drama'] : ['General'];

      if (checkAnime.rows.length === 0) {
        await client.query(
          `INSERT INTO custom_animes (id, title, image, description, total_episodes, genres, status, is_secret)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [String(record.anime_tmdb_id), record.search_title, poster, overview, record.total_episodes || 1, genres, 'Finalizado', false]
        );
      }
    } catch (e) {
      // Ignorar si custom_animes falla para no detener el guardado de episodios
    }
  }

  // 2. Insertar o actualizar en anime_episodes
  const check = await client.query(
    `SELECT id FROM anime_episodes
     WHERE LOWER(search_title) = LOWER($1)
       AND episode_number = $2
       AND season_number = $3
       AND UPPER(server_name) = UPPER($4)
       AND LOWER(language) = LOWER($5)
     LIMIT 1`,
    [record.search_title, record.episode_number, record.season_number, record.server_name, record.language]
  );

  if (check.rows.length === 0) {
    const insertRes = await client.query(
      `INSERT INTO anime_episodes (search_title, episode_number, season_number, episode_name, server_name, language, video_url, anime_tmdb_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        record.search_title,
        record.episode_number,
        record.season_number,
        record.episode_name,
        record.server_name,
        record.language,
        record.video_url,
        String(record.anime_tmdb_id || '')
      ]
    );
    return { action: 'inserted', id: insertRes.rows[0].id };
  } else {
    await client.query(
      `UPDATE anime_episodes
       SET video_url = $1, episode_name = COALESCE($2, episode_name), language = $3, server_name = $4, anime_tmdb_id = COALESCE($5, anime_tmdb_id)
       WHERE id = $6`,
      [
        record.video_url,
        record.episode_name,
        record.language,
        record.server_name,
        String(record.anime_tmdb_id || ''),
        check.rows[0].id
      ]
    );
    return { action: 'updated', id: check.rows[0].id };
  }
}

/**
 * Bucle Principal Interactivo
 */
async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.clear();
  console.log('================================================================');
  console.log('     🎬 CONVERTIDOR INTELIGENTE SOLOLATINO -> MEDIAFIRE 🚀      ');
  console.log('      (Soporte Películas, Series completas y Animes)           ');
  console.log('      (Numeración Continua de Episodios + Supabase Directo)     ');
  console.log('================================================================');

  let dbClient = null;
  if (Client) {
    try {
      dbClient = new Client({ connectionString: DB_CONN });
      await dbClient.connect();
      console.log('🟢 Conexión a Base de Datos Supabase: ACTIVA');
    } catch (err) {
      console.log('🟡 Conexión a Supabase no disponible:', err.message);
      dbClient = null;
    }
  }

  try {
    while (true) {
      console.log('\n----------------------------------------------------------------');
      const inputUrl = await ask(rl, '👉 Pega el enlace de SoloLatino (Película, Serie, Anime o Episodio) [o "q" para salir]: ');

      if (!inputUrl || inputUrl.toLowerCase() === 'q' || inputUrl.toLowerCase() === 'salir') {
        console.log('\n👋 ¡Listo! Cerrando convertidor...');
        break;
      }

      try {
        const u = new URL(inputUrl);
        const segments = u.pathname.split('/').filter(Boolean);
        const isSingleEpisode = segments.includes('temporada-') || u.pathname.includes('/episodio-');
        const isMovie = segments[0] === 'pelicula';
        const isSeriesOrAnime = segments[0] === 'serie' && !isSingleEpisode;

        let detectedTitle = segments[segments.length - 1].replace(/-/g, ' ');
        if (isSeriesOrAnime) {
          detectedTitle = segments[1].replace(/-/g, ' ');
        }

        console.log(`\n[🔎] Analizando URL de SoloLatino...`);
        console.log(`     Tipo identificado: ${isMovie ? '🎬 Película' : (isSeriesOrAnime ? '📺 Serie / Anime' : '🍿 Episodio individual')}`);

        // Autodetección en TMDB
        console.log(`[🔎] Buscando título oficial en TMDB para "${detectedTitle}"...`);
        const tmdbData = await searchTmdb(detectedTitle, isMovie);
        let defaultTmdbId = tmdbData ? String(tmdbData.id) : '';
        let defaultTitle = tmdbData ? (tmdbData.title || tmdbData.name) : (detectedTitle.charAt(0).toUpperCase() + detectedTitle.slice(1));

        if (tmdbData) {
          console.log(`🎬 TMDB Detectado : "${defaultTitle}" (ID: ${defaultTmdbId})`);
          console.log(`📅 Año Estreno    : ${tmdbData.release_date || tmdbData.first_air_date || 'N/A'}`);
          if (tmdbData.poster_path) {
            console.log(`🖼️  Póster Oficial: https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`);
          }
        } else {
          console.log(`⚠️  No se encontró en TMDB automáticamente.`);
        }

        console.log('\n----------------------------------------------------------------');
        console.log('📝 CONFIGURACIÓN DE METADATOS (Presiona Enter para usar sugerido)');
        console.log('----------------------------------------------------------------');

        const sTitle = (await ask(rl, `Título / Búsqueda [${defaultTitle}]: `)) || defaultTitle;
        const tmdbId = (await ask(rl, `ID TMDB [${defaultTmdbId}]: `)) || defaultTmdbId;

        // Si se ingresó o cambió el TMDB ID manualmente, obtener metadatos oficiales completos de TMDB
        if (tmdbId && (!tmdbData || String(tmdbData.id) !== String(tmdbId))) {
          try {
            const fetchEndpoint = isMovie ? 'movie' : 'tv';
            const fetchRes = await httpsRequest(`https://api.themoviedb.org/3/${fetchEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX`);
            if (fetchRes.statusCode === 200) {
              tmdbData = JSON.parse(fetchRes.data);
              if (tmdbData.poster_path) {
                console.log(`🖼️  Póster Oficial Recuperado: https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`);
              }
            }
          } catch (e) {}
        }

        const rawLang = (await ask(rl, `Idioma [latino]: `)) || 'latino';
        const lang = normalizeLanguage(rawLang);

        // =====================================================================
        // CASO 1: PELÍCULA O EPISODIO ÚNICO
        // =====================================================================
        if (isMovie || isSingleEpisode) {
          let epNum = 1;
          let seasonNum = 1;

          if (isSingleEpisode) {
            const sMatch = u.pathname.match(/temporada-(\d+)/);
            const eMatch = u.pathname.match(/episodio-(\d+)/);
            seasonNum = sMatch ? parseInt(sMatch[1], 10) : 1;
            const seasonEp = eMatch ? parseInt(eMatch[1], 10) : 1;

            // Consultar número continuo si ya hay en BD
            const maxEpInDb = await getSupabaseMaxEpisode(sTitle, tmdbId);
            const suggestedContinuous = maxEpInDb > 0 ? (maxEpInDb + 1) : seasonEp;
            const chosenEp = await ask(rl, `Número de Episodio Continuo [${suggestedContinuous}]: `);
            epNum = chosenEp ? parseInt(chosenEp, 10) : suggestedContinuous;
          }

          console.log(`\n[⏳] Extrayendo enlace directo de Mediafire...`);
          const res = await extractMediafireSingle(inputUrl);

          console.log('\n================================================================');
          console.log('🎯 ENLACE EXTRAÍDO CON ÉXITO:');
          console.log('================================================================');
          console.log(`   Stream Directo (.mp4): ${res.streamUrl}`);
          console.log(`   Enlace Permanente:     ${res.permanentLink}`);
          console.log(`   Tamaño / Estado:       ${res.sizeMB} MB | ${res.alive ? '✅ VIVO' : '🟡 NO CONFIRMADO'}`);

          // Guardar en archivo permanente único
          appendToMasterPermanentsFile(sTitle, tmdbId, [{
            season: seasonNum,
            episode: isMovie ? null : epNum,
            episode_number: isMovie ? null : epNum,
            permanentLink: res.permanentLink,
            streamUrl: res.streamUrl,
            sizeMB: res.sizeMB
          }]);
          console.log(`\n💾 Guardado en archivo maestro: ${PERMANENTS_FILE}`);

          // Insertar en Supabase
          if (dbClient) {
            console.log('\nTipo de enlace a guardar en Supabase:');
            console.log('  [1] Directo de Mediafire (downloadXXXX...?.mp4) [Recomendado - 100% Compatible]');
            console.log('  [2] Vercel Resolver (Puede fallar con 403 en archivos > 1GB por Cloudflare)');
            const linkTypeChoice = (await ask(rl, 'Opción [1-2, Enter = 1]: ')) || '1';
            const chosenUrl = linkTypeChoice === '2' ? res.resolverUrl : res.streamUrl;

            const doInsert = (await ask(rl, '\n¿Deseas insertar/actualizar este registro en Supabase? (S/N, Enter = S): ')).toLowerCase();
            if (doInsert !== 'n' && doInsert !== 'no') {
              console.log('⏳ Guardando en Supabase...');
              const record = {
                search_title: sTitle,
                episode_number: epNum,
                season_number: seasonNum,
                episode_name: `${sTitle}${isMovie ? '' : ` T${seasonNum}E${epNum}`}`,
                server_name: 'MEDIAFIRE',
                language: lang,
                video_url: chosenUrl,
                anime_tmdb_id: tmdbId
              };
              const result = await syncSupabaseRecord(dbClient, record, tmdbData);
              console.log(`✅ ¡Guardado con éxito en anime_episodes! (${result.action})`);
            }
          }

        // =====================================================================
        // CASO 2: SERIE O ANIME COMPLETO (NUMERACIÓN CONTINUA)
        // =====================================================================
        } else if (isSeriesOrAnime) {
          console.log(`\n[⏳] Obteniendo lista completa de temporadas y episodios...`);
          const seriesData = await fetchSeriesEpisodes(inputUrl);
          const totalEps = seriesData.episodes.length;

          if (totalEps === 0) {
            console.log('❌ No se encontraron episodios en esa página.');
            continue;
          }

          const seasons = [...new Set(seriesData.episodes.map(e => e.season))].sort((a, b) => a - b);
          console.log(`\n📺 Serie / Anime: ${seriesData.title}`);
          console.log(`📊 Encontradas ${seasons.length} temporadas y ${totalEps} episodios en total:`);
          seasons.forEach(s => {
            const count = seriesData.episodes.filter(e => e.season === s).length;
            console.log(`   • Temporada ${s}: ${count} episodios`);
          });

          // Consultar BD para ver cuántos episodios ya tiene registrados
          const maxEpInDb = await getSupabaseMaxEpisode(sTitle, tmdbId);
          let suggestedStart = 1;
          if (maxEpInDb > 0) {
            suggestedStart = maxEpInDb + 1;
            console.log(`\n💡 Aviso: Ya existen ${maxEpInDb} episodios en Supabase para "${sTitle}".`);
            console.log(`   Siguiente número de episodio continuo sugerido: ${suggestedStart}`);
          }

          console.log('\n¿Qué deseas extraer?');
          console.log('  [1] Todas las temporadas y episodios (Continuo desde el inicio)');
          console.log('  [2] Una sola temporada específica');
          console.log('  [3] Un rango de episodios');
          const mode = (await ask(rl, 'Opción [1-3, Enter = 1]: ')) || '1';

          let selectedEpisodes = seriesData.episodes;
          if (mode === '2') {
            const chosenSeason = parseInt(await ask(rl, `Ingresa la temporada a extraer (ej. ${seasons[0]}): `), 10);
            selectedEpisodes = seriesData.episodes.filter(e => e.season === chosenSeason);
            console.log(`Filtrados ${selectedEpisodes.length} episodios de la Temporada ${chosenSeason}.`);
          } else if (mode === '3') {
            const start = parseInt(await ask(rl, 'Episodio global inicial (ej. 1): '), 10) || 1;
            const end = parseInt(await ask(rl, `Episodio global final (ej. ${totalEps}): `), 10) || totalEps;
            selectedEpisodes = seriesData.episodes.slice(start - 1, end);
            console.log(`Filtrados ${selectedEpisodes.length} episodios.`);
          }

          const continuousStartInput = await ask(rl, `¿Número de episodio continuo inicial? [${suggestedStart}]: `);
          let currentContinuousEp = continuousStartInput ? parseInt(continuousStartInput, 10) : suggestedStart;

          let autoInsertSupabase = false;
          let linkTypeChoice = '1';
          if (dbClient) {
            const askDb = (await ask(rl, `¿Deseas insertar automáticamente a Supabase conforme se extraigan? (S/N, Enter = S): `)).toLowerCase();
            autoInsertSupabase = (askDb !== 'n' && askDb !== 'no');
            if (autoInsertSupabase) {
              console.log('\nTipo de enlace a guardar en Supabase:');
              console.log('  [1] Directo de Mediafire (downloadXXXX...?.mp4) [Recomendado - 100% Compatible]');
              console.log('  [2] Vercel Resolver (Puede fallar con 403 en archivos > 1GB por Cloudflare)');
              linkTypeChoice = (await ask(rl, 'Opción [1-2, Enter = 1]: ')) || '1';
            }
          }

          console.log(`\n🚀 INICIANDO EXTRACCIÓN DE ${selectedEpisodes.length} EPISODIOS...\n`);

          const extractedList = [];
          let successCount = 0;

          for (let i = 0; i < selectedEpisodes.length; i++) {
            const ep = selectedEpisodes[i];
            const continuousNumber = currentContinuousEp + i;
            const progress = `[${i + 1}/${selectedEpisodes.length}] T${ep.season} E${ep.episode} (Ep. continuo ${continuousNumber})`;

            // Verificar si ya existe previamente en Supabase con MEDIAFIRE
            if (autoInsertSupabase && dbClient) {
              try {
                const existingCheck = await dbClient.query(
                  `SELECT id FROM anime_episodes 
                   WHERE LOWER(search_title) = LOWER($1) 
                     AND episode_number = $2 
                     AND season_number = $3 
                     AND UPPER(server_name) = 'MEDIAFIRE' 
                   LIMIT 1`,
                  [sTitle, continuousNumber, ep.season]
                );
                if (existingCheck.rows.length > 0) {
                  process.stdout.write(`${progress}: ⏭️  Ya existe en Supabase (Omitiendo)\n`);
                  successCount++;
                  continue;
                }
              } catch (e) {}
            }

            process.stdout.write(`${progress}: Extrayendo... `);

            try {
              let res = await extractMediafireSingle(ep.url);

              // Si dio 0.00 MB, reintentar renovación automática directa de Mediafire
              if (res.sizeMB === '0.00' && res.permanentLink) {
                process.stdout.write('⚠️ [0.00 MB, renovando directo de Mediafire]... ');
                try {
                  const pageRes = await httpsRequest(res.permanentLink);
                  if (pageRes.statusCode === 200) {
                    const directMatch = pageRes.data.match(/https?:\/\/download\d+\.mediafire\.com\/[^\s"']+/i);
                    if (directMatch) {
                      res.directLink = directMatch[0];
                      res.streamUrl = directMatch[0] + '?.mp4';
                      const u2 = new URL(res.directLink);
                      const head2 = await new Promise((resolve) => {
                        const req = https.request({
                          hostname: u2.hostname,
                          path: u2.pathname,
                          method: 'HEAD',
                          headers: { 'User-Agent': getRandomUserAgent() },
                          timeout: 8000
                        }, (r) => resolve({ status: r.statusCode, contentLength: r.headers['content-length'] }));
                        req.on('timeout', () => { req.destroy(); resolve({ status: 408 }); });
                        req.on('error', () => resolve({ status: 500 }));
                        req.end();
                      });
                      if (head2.status === 200 || head2.status === 206) {
                        res.alive = true;
                        if (head2.contentLength) {
                          res.sizeMB = (parseInt(head2.contentLength, 10) / (1024 * 1024)).toFixed(2);
                        }
                      }
                    }
                  }
                } catch (eRetry) {}
              }

              if (res.sizeMB === '0.00') {
                process.stdout.write(`⚠️ ALERTA (${res.sizeMB} MB - Enlace aún no activo)`);
              } else {
                process.stdout.write(`✅ OK (${res.sizeMB} MB)`);
              }

              const itemRecord = {
                search_title: sTitle,
                episode_number: continuousNumber,
                season_number: ep.season,
                episode_name: `${sTitle} T${ep.season}E${ep.episode}`,
                server_name: 'MEDIAFIRE',
                language: lang,
                video_url: (linkTypeChoice === '2' ? res.resolverUrl : res.streamUrl),
                permanentLink: res.permanentLink,
                resolverUrl: res.resolverUrl,
                anime_tmdb_id: tmdbId,
                sizeMB: res.sizeMB,
                alive: res.alive,
                total_episodes: totalEps
              };

              extractedList.push(itemRecord);
              successCount++;

              if (autoInsertSupabase && dbClient) {
                try {
                  const dbResult = await syncSupabaseRecord(dbClient, itemRecord, tmdbData);
                  process.stdout.write(` | DB: ${dbResult.action}\n`);
                } catch (dbErr) {
                  process.stdout.write(` | DB Error: ${dbErr.message}\n`);
                }
              } else {
                process.stdout.write('\n');
              }
            } catch (err) {
              process.stdout.write(`❌ Error: ${err.message}\n`);
            }

            // Pausa educada entre episodios (3.5 segundos evita el rate limit de SoloLatino)
            await sleep(3500);

            // Cada 6 episodios procesados seguidos, pausa preventiva de 10s para no saturar SoloLatino
            if ((successCount % 6 === 0) && (i + 1 < selectedEpisodes.length)) {
              console.log('   ☕ [Pausa preventiva de 10s para enfriar el servidor]...');
              await sleep(10000);
            }
          }

          // Guardar en archivo maestro permanente
          appendToMasterPermanentsFile(sTitle, tmdbId, extractedList);

          // Guardar backup JSON específico
          const slug = segments[1] || 'serie';
          const jsonPath = path.join(RESULTS_DIR, `sololatino_${slug}.json`);
          fs.writeFileSync(jsonPath, JSON.stringify(extractedList, null, 2), 'utf8');

          console.log('\n================================================================');
          console.log('🎉 ¡EXTRACCIÓN Y REGISTRO COMPLETADOS!');
          console.log('================================================================');
          console.log(`   Total procesados:       ${selectedEpisodes.length}`);
          console.log(`   Exitosos en Mediafire:  ${successCount}`);
          console.log(`   Numeración Continua:    Del episodio ${currentContinuousEp} al ${currentContinuousEp + extractedList.length - 1}`);
          console.log(`\n💾 Archivo maestro de permanentes actualizado:`);
          console.log(`   📄 ${PERMANENTS_FILE}`);
          console.log(`💾 Backup JSON:`);
          console.log(`   📊 ${jsonPath}`);
        }
      } catch (err) {
        console.error('\n❌ ERROR procesando URL:', err.message);
      }

      console.log('\n================================================================');
      const again = (await ask(rl, '🔄 ¿Deseas convertir/extraer otro título de SoloLatino? (S/N, Enter = S): ')).toLowerCase();
      if (again === 'n' || again === 'no') {
        console.log('\n👋 ¡Listo! Gracias por usar el convertidor de SoloLatino.');
        break;
      }
    }
  } finally {
    if (dbClient) {
      await dbClient.end();
    }
    rl.close();
  }
}

main().catch(console.error);

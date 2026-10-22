const puppeteer = require('puppeteer');
const { Client } = require('pg');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const delay = ms => new Promise(res => setTimeout(res, ms));

const TMDB_API_KEY = '372574501f2196723577821c44adb688';
const MOVIEDAYS_URL = 'https://moviedays.lat/';
const SUPABASE_CONNECTION_STRING = 'postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, ans => resolve(ans.trim())));
}

/**
 * Nunca permitir extraer enlaces shortcode de moviedays.lat (ej. https://moviedays.lat/OgDpWB)
 */
function isForbiddenShortcodeUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return true;
  const u = urlStr.trim().toLowerCase();
  if (!u.startsWith('http')) return true;
  if (/^https?:\/\/(www\.)?moviedays\.lat(\/|$)/i.test(u)) return true;
  return false;
}

/**
 * Detecta si un enlace es un proxy temporal / worker efímero (Cloudflare Workers)
 */
function isTemporaryWorkerUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const u = urlStr.toLowerCase();
  return (
    u.includes('workers.dev') ||
    u.includes('stream-player') ||
    u.includes('fasaterospro')
  );
}

/**
 * Normaliza enlaces directos de Rumble / 1a-1791 a .aaa.mp4
 */
function normalizeDirectMp4(urlStr) {
  if (!urlStr) return urlStr;
  let finalUrl = urlStr.trim();
  if (finalUrl.includes('1a-1791.com') || finalUrl.includes('rumble.cloud')) {
    finalUrl = finalUrl.replace(/\/([^\/\.]+)\.[^\/]*$/i, '/$1.aaa.mp4');
  }
  return finalUrl;
}

/**
 * Normaliza el idioma a minúsculas compatible con AnimeZona Web y Roku ('latino', 'sub', 'castellano')
 */
function normalizeLanguage(rawLang) {
  const l = String(rawLang || 'latino').trim().toLowerCase();
  if (l.includes('sub') || l.includes('jap') || l === 'jp') return 'sub';
  if (l.includes('cast') || l.includes('esp') || l === 'es') return 'castellano';
  return 'latino';
}

/**
 * Consulta la lista de pestañas activas del puerto de depuración de Brave
 */
function getDebugTargets(port) {
  return new Promise(resolve => {
    const req = http.get(`http://127.0.0.1:${port}/json`, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve([]);
    });
  });
}

async function connectToBrave(port, maxRetries = 15) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const browser = await puppeteer.connect({
        browserURL: `http://127.0.0.1:${port}`,
        defaultViewport: null
      });
      return browser;
    } catch (e) {
      await delay(1000);
    }
  }
  throw new Error('No se pudo conectar al puerto de depuración de Brave.');
}

function isAllowedDomain(urlStr) {
  if (!urlStr || urlStr === 'about:blank' || urlStr.startsWith('chrome://') || urlStr.startsWith('devtools://')) {
    return true;
  }
  const u = urlStr.toLowerCase();
  return (
    u.includes('moviedays.lat') ||
    u.includes('moviedays.top') ||
    u.includes('vimeos.net') ||
    u.includes('vimeos.zip') ||
    u.includes('cinebel') ||
    u.includes('zonaaps') ||
    u.includes('11231data.com') ||
    u.includes('clickdoki.com') ||
    u.includes('1a-1791.com') ||
    u.includes('rumble.cloud') ||
    u.includes('google.com/recaptcha') ||
    u.includes('gstatic.com') ||
    u.includes('cloudflare.com') ||
    u.includes('workers.dev') ||
    u.includes('fasaterospro') ||
    u.includes('API-cutty.php'.toLowerCase())
  );
}

const scraperState = {
  isResolvingClickDoki: false,
  capturedCuttyUrl: null,
  detectedPermanentMp4Url: null,
  detectedTemporaryMp4: false
};

function attachPopupBlocker(browser) {
  browser.removeAllListeners('targetcreated');
  browser.on('targetcreated', async target => {
    try {
      if (target.type() !== 'page') return;
      const newP = await target.page();
      if (!newP) return;

      const handlePopupUrl = async (urlStr) => {
        if (!urlStr || urlStr === 'about:blank') return;

        if (urlStr.includes('API-cutty.php') || urlStr.includes('clickdoki.com')) {
          scraperState.capturedCuttyUrl = urlStr;
          if (!scraperState.isResolvingClickDoki) {
            try { await newP.close(); } catch (e) {}
            return;
          }
        }

        if (!isAllowedDomain(urlStr)) {
          console.log(`   [🛡️] Cerrando ventana publicitaria: ${urlStr.substring(0, 50)}...`);
          try { await newP.close(); } catch (e) {}
        }
      };

      await handlePopupUrl(newP.url());
      newP.on('framenavigated', async frame => {
        if (frame === newP.mainFrame()) {
          await handlePopupUrl(frame.url());
        }
      });
    } catch (e) {}
  });
}

const ANTI_ADBLOCK_INJECTION = () => {
  const host = (window.location.hostname || '').toLowerCase();
  if (
    host.includes('cloudflare') ||
    host.includes('google') ||
    host.includes('gstatic') ||
    host.includes('recaptcha') ||
    host.includes('clickdoki')
  ) {
    return;
  }

  window.open = function(url) {
    try {
      if (url && typeof url === 'string') {
        let fullUrl = url;
        if (url.startsWith('/')) fullUrl = window.location.origin + url;
        if (fullUrl.includes('API-cutty.php') || fullUrl.includes('clickdoki.com') || fullUrl.includes('token=')) {
          window.__interceptedDownloadUrl = fullUrl;
          if (typeof window.__reportCuttyUrl === 'function') {
            window.__reportCuttyUrl(fullUrl);
          }
        }
      }
    } catch (e) {}
    return null;
  };
};

async function setupMainPageListeners(page) {
  if (page.__mdListenersAttached) return;
  page.__mdListenersAttached = true;

  page.on('dialog', async dialog => {
    try { await dialog.dismiss(); } catch (e) {}
  });

  try {
    await page.exposeFunction('__reportCuttyUrl', (url) => {
      if (url && (url.includes('API-cutty.php') || url.includes('clickdoki.com') || url.includes('token='))) {
        scraperState.capturedCuttyUrl = url;
      }
    });
  } catch (e) {}

  await page.evaluateOnNewDocument(ANTI_ADBLOCK_INJECTION);

  page.on('request', req => {
    try {
      const u = req.url();
      const uLower = u.toLowerCase();
      if (u.includes('API-cutty.php') || u.includes('clickdoki.com')) {
        scraperState.capturedCuttyUrl = u;
      }
      if (uLower.includes('.mp4') || uLower.includes('/video/')) {
        if (!uLower.includes('ping.gif') && !uLower.includes('jwpltx.com')) {
          if (uLower.includes('1a-1791.com') || uLower.includes('rumble.cloud')) {
            scraperState.detectedPermanentMp4Url = u;
          } else if (uLower.includes('workers.dev') || uLower.includes('stream-player') || uLower.includes('fasaterospro')) {
            scraperState.detectedTemporaryMp4 = true;
          }
        }
      }
    } catch (e) {}
  });

  page.on('response', async res => {
    try {
      const u = res.url();
      const uLower = u.toLowerCase();
      if (uLower.includes('.mp4') || uLower.includes('/video/')) {
        if (!uLower.includes('ping.gif') && !uLower.includes('jwpltx.com')) {
          if (uLower.includes('1a-1791.com') || uLower.includes('rumble.cloud')) {
            scraperState.detectedPermanentMp4Url = u;
          } else if (uLower.includes('workers.dev') || uLower.includes('stream-player') || uLower.includes('fasaterospro')) {
            scraperState.detectedTemporaryMp4 = true;
          }
        }
      }
    } catch (e) {}
  });
}

/**
 * Busca en MovieDays API / TMDB por título y devuelve la lista de resultados
 */
async function searchByTitle(query, contentType) {
  const apiType = contentType === 'movie' ? 'movie' : 'tv';
  try {
    const res = await fetch(`https://moviedays.lat/api/search.php?q=${encodeURIComponent(query)}&type=${apiType}`, {
      headers: { Referer: MOVIEDAYS_URL }
    });
    const json = await res.json();
    if (json && json.success && Array.isArray(json.results) && json.results.length > 0) {
      return json.results;
    }
  } catch (e) {}

  // Fallback directo a TMDB API
  try {
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/search/${apiType}?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(query)}`
    );
    const tmdbJson = await tmdbRes.json();
    if (tmdbJson && Array.isArray(tmdbJson.results)) {
      return tmdbJson.results.slice(0, 10).map(item => ({
        id: item.id,
        title: item.title || item.name || item.original_title || item.original_name,
        year: (item.release_date || item.first_air_date || '').substring(0, 4),
        vote: item.vote_average || 0,
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null
      }));
    }
  } catch (e) {}

  return [];
}

/**
/**
 * Obtiene información de temporadas y cantidad de episodios por temporada desde TMDB
 */
async function getTmdbSeasonsInfo(tmdbId) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX`);
    if (!res.ok) return null;
    const data = await res.json();
    const seasons = (data.seasons || [])
      .filter(s => s.season_number >= 1 && s.episode_count > 0)
      .map(s => ({
        seasonNumber: s.season_number,
        episodeCount: s.episode_count,
        name: s.name || `Temporada ${s.season_number}`,
        airDate: s.air_date || null
      }))
      .sort((a, b) => a.seasonNumber - b.seasonNumber);

    return {
      title: data.name || data.original_name || '',
      originalTitle: data.original_name || '',
      totalSeasons: data.number_of_seasons || seasons.length,
      totalEpisodes: data.number_of_episodes || 0,
      seasons
    };
  } catch (e) {
    return null;
  }
}

/**
 * Si el usuario ingresó un ID de Película de TMDB estando en modo Serie o Anime
 * (por ejemplo 1529190 para "Lord of Mysteries: The Fool" cuando el Anime es 232230 "Lord of Mysteries"),
 * detecta automáticamente la Serie/Anime equivalente en TMDB.
 */
async function resolveSeriesOrAnimeTmdbId(tmdbId, contentType) {
  const existingTv = await getTmdbSeasonsInfo(tmdbId);
  if (existingTv) {
    return { tmdbId, tmdbInfo: existingTv };
  }

  try {
    // Consultar si ese ID corresponde a una Película en TMDB (en inglés y español)
    const [resEs, resEn] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX`).catch(() => null),
      fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`).catch(() => null)
    ]);

    const movieEs = resEs && resEs.ok ? await resEs.json() : null;
    const movieEn = resEn && resEn.ok ? await resEn.json() : null;
    const movieData = movieEn || movieEs;

    if (movieData && (movieData.title || movieData.original_title)) {
      const candidateTitles = [
        movieEn && movieEn.title,
        movieEs && movieEs.title,
        movieData.original_title
      ].filter(Boolean);

      for (const rawTitle of candidateTitles) {
        // Extraer nombre base antes de ":" o "-" (ej. "Lord of Mysteries: The Fool" -> "Lord of Mysteries")
        const baseName = rawTitle.split(/[:\-–—]/)[0].trim();
        const queriesToTry = [baseName, rawTitle].filter(q => q && q.length >= 2);

        for (const q of queriesToTry) {
          const tvResults = await searchByTitle(q, contentType);
          if (tvResults && tvResults.length > 0) {
            const best = tvResults[0];
            const bestTvInfo = await getTmdbSeasonsInfo(best.id);
            if (bestTvInfo) {
              console.log(`\n⚠️ El TMDB ID ${tmdbId} corresponde a una Película en TMDB ("${rawTitle}"), no al Anime/Serie.`);
              console.log(`🔄 Redirigiendo automáticamente al Anime/Serie correcto: "${best.title}" (${best.year || 'S/A'}) -> TMDB ID: ${best.id}`);
              return { tmdbId: best.id, tmdbInfo: bestTvInfo, redirectedTitle: best.title };
            }
          }
        }
      }
    }
  } catch (e) {}

  return { tmdbId, tmdbInfo: null };
}

/**
 * Obtiene el nombre de un episodio desde TMDB como respaldo si MovieDays no lo incluye
 */
async function getTmdbEpisodeName(tmdbId, seasonNum, epInSeason) {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}/episode/${epInSeason}?api_key=${TMDB_API_KEY}&language=es-MX`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.name ? data.name.trim() : null;
  } catch (e) {
    return null;
  }
}

/**
 * Separa el título devuelto por MovieDays (ej. "Linternas — T1E5: Luces fuera")
 * en { baseTitle, episodeName, hasEpisodeMarker }
 */
function parseMovieDaysTitle(rawTitle, contentType) {
  const clean = String(rawTitle || '').trim();
  if (contentType === 'movie') {
    return { baseTitle: clean, episodeName: clean, hasEpisodeMarker: true };
  }
  const match = clean.match(/^(.*?)\s+[—\-–]\s*T(\d+)E(\d+)\s*:\s*(.+)$/i);
  if (match) {
    return {
      baseTitle: match[1].trim(),
      episodeName: match[4].trim(),
      hasEpisodeMarker: true
    };
  }
  const matchNoName = clean.match(/^(.*?)\s+[—\-–]\s*T(\d+)E(\d+)$/i);
  if (matchNoName) {
    return {
      baseTitle: matchNoName[1].trim(),
      episodeName: null,
      hasEpisodeMarker: true
    };
  }
  return {
    baseTitle: clean,
    episodeName: null,
    hasEpisodeMarker: false
  };
}

/**
 * Renueva automáticamente el token de seguridad de MovieDays (window.MD_EMBED_TS y window.MD_EMBED_SIG)
 * para evitar el error "Token expirado" cuando el navegador lleva varios minutos abierto.
 */
let lastTokenRefreshAt = 0;

async function refreshMovieDaysToken(page, force = false) {
  const now = Date.now();
  // Renovar cada 3 minutos de forma preventiva o cuando force=true
  if (!force && lastTokenRefreshAt > 0 && (now - lastTokenRefreshAt) < 180000) {
    const hasToken = await page.evaluate(() => Boolean(window.MD_EMBED_TS && window.MD_EMBED_SIG)).catch(() => false);
    if (hasToken) return true;
  }

  try {
    // 1. Intentar obtener el HTML fresco desde la misma sesión de Brave y actualizar window.MD_EMBED_TS / MD_EMBED_SIG sin perder estado
    const refreshedInPlace = await page.evaluate(async () => {
      try {
        const res = await fetch(`/?_refresh=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' });
        if (!res.ok) return false;
        const html = await res.text();
        const tsMatch = html.match(/window\.MD_EMBED_TS\s*=\s*(\d+)/);
        const sigMatch = html.match(/window\.MD_EMBED_SIG\s*=\s*["']([^"']+)["']/);
        if (tsMatch && sigMatch) {
          window.MD_EMBED_TS = parseInt(tsMatch[1], 10);
          window.MD_EMBED_SIG = sigMatch[1];
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    }).catch(() => false);

    if (refreshedInPlace) {
      lastTokenRefreshAt = Date.now();
      return true;
    }

    // 2. Respaldo: recargar la página https://moviedays.lat/ directamente en Brave
    await page.goto(MOVIEDAYS_URL, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
    await delay(1200);
    lastTokenRefreshAt = Date.now();
    return true;
  } catch (e) {
    return false;
  }
}

function isTokenExpiredError(errStr) {
  if (!errStr) return false;
  const s = String(errStr).toLowerCase();
  return s.includes('token expirado') || s.includes('token') || s.includes('firma') || s.includes('expired');
}

/**
 * Ejecuta la búsqueda en la interfaz de https://moviedays.lat/ en Brave
 * y devuelve el objeto JSON de respuesta (state.data o error).
 * Si el token expiró, lo renueva automáticamente y reintenta sin fallar.
 */
async function performSearchOnPage(page, { tmdbId, contentType, seasonNum, epInSeason }, retryCount = 0) {
  try {
    if (!page.url().includes('moviedays.lat')) {
      await page.goto(MOVIEDAYS_URL, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
      await delay(1200);
      lastTokenRefreshAt = Date.now();
    }

    // Asegurar que el token MD_EMBED_TS / MD_EMBED_SIG esté fresco antes de buscar
    await refreshMovieDaysToken(page, false);

    // 1. Seleccionar el tipo arriba (Película / Serie / Anime)
    await page.evaluate((type) => {
      const btn = document.querySelector(`.type-btn[data-type="${type}"]`);
      if (btn) btn.click();
    }, contentType);

    await delay(250);

    // 2. Rellenar #tmdbInput y (#seasonInput + #episodeInput si es serie/anime) y presionar #searchBtn
    await page.evaluate(({ id, type, se, ep }) => {
      const setNativeValue = (el, val) => {
        if (!el) return;
        el.value = String(val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const searchInput = document.querySelector('#searchInput');
      if (searchInput && searchInput.value) {
        setNativeValue(searchInput, '');
      }

      const tmdbInput = document.querySelector('#tmdbInput');
      setNativeValue(tmdbInput, id);

      if (type === 'serie' || type === 'anime') {
        const seasonInput = document.querySelector('#seasonInput');
        const episodeInput = document.querySelector('#episodeInput');
        setNativeValue(seasonInput, se);
        setNativeValue(episodeInput, ep);
      }

      const searchBtn = document.querySelector('#searchBtn');
      if (searchBtn) searchBtn.click();
    }, {
      id: String(tmdbId),
      type: contentType,
      se: seasonNum != null ? String(seasonNum) : '',
      ep: epInSeason != null ? String(epInSeason) : ''
    });

    // 3. Esperar a que termine de cargar (#loadingState se oculte y aparezca #resultsContent o #errorState)
    let pageResult = null;
    for (let i = 0; i < 30; i++) {
      await delay(500);
      pageResult = await page.evaluate(() => {
        const loadingEl = document.querySelector('#loadingState');
        const errorEl = document.querySelector('#errorState');
        const errorMsgEl = document.querySelector('#errorMsg');
        const resultsEl = document.querySelector('#resultsContent');

        const isLoading = loadingEl && !loadingEl.classList.contains('hidden');
        if (isLoading) return null;

        const isError = errorEl && !errorEl.classList.contains('hidden');
        if (isError) {
          return {
            success: false,
            error: (errorMsgEl ? errorMsgEl.textContent : 'No se encontraron servidores').trim()
          };
        }

        const hasResults = resultsEl && !resultsEl.classList.contains('hidden') && resultsEl.innerHTML.trim().length > 0;
        if (hasResults) {
          return {
            success: true,
            domReady: true
          };
        }
        return null;
      }).catch(() => null);

      if (pageResult) break;
    }

    // Si la interfaz reportó "Token expirado", renovar token y reintentar automáticamente
    if (pageResult && !pageResult.success && isTokenExpiredError(pageResult.error) && retryCount < 3) {
      console.log(`   [🔄] Token de MovieDays expirado. Renovando sesión automáticamente y reintentando...`);
      await refreshMovieDaysToken(page, true);
      return await performSearchOnPage(page, { tmdbId, contentType, seasonNum, epInSeason }, retryCount + 1);
    }

    // 4. Obtener el JSON completo de api/embed.php usando las firmas de la página
    const apiData = await page.evaluate(async ({ id, type, se, ep }) => {
      try {
        const params = new URLSearchParams({ tmdb: String(id), type });
        if (type === 'serie' || type === 'anime') {
          params.set('se', String(se));
          params.set('ep', String(ep));
        }
        params.set('_ts', String(window.MD_EMBED_TS || ''));
        params.set('_sig', String(window.MD_EMBED_SIG || ''));
        if (window.MD_USER_KEY) params.set('key', window.MD_USER_KEY);

        const res = await fetch(`api/embed.php?${params.toString()}`);
        return await res.json();
      } catch (e) {
        return { success: false, error: e.message || 'Error consultando api/embed.php' };
      }
    }, {
      id: String(tmdbId),
      type: contentType,
      se: seasonNum,
      ep: epInSeason
    });

    // Si api/embed.php reportó "Token expirado", renovar token y reintentar automáticamente
    if (apiData && !apiData.success && isTokenExpiredError(apiData.error) && retryCount < 3) {
      console.log(`   [🔄] Token de MovieDays expirado en API. Renovando sesión automáticamente y reintentando...`);
      await refreshMovieDaysToken(page, true);
      return await performSearchOnPage(page, { tmdbId, contentType, seasonNum, epInSeason }, retryCount + 1);
    }

    if (pageResult && !pageResult.success && (!apiData || !apiData.success)) {
      return { success: false, error: (apiData && apiData.error) || pageResult.error };
    }
    return apiData;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Inspecciona y valida un servidor individual en MovieDays:
 * 1) Selecciona la tarjeta del servidor en la derecha (.server-card[data-server-id="..."])
 * 2) Da clic al reproductor para iniciar reproducción
 * 3) Verifica que NO tenga errores ("Error de Reproducción", "Error: Parámetro 'v' no encontrado.", "Código de Error: 232011", etc.)
 * 4) Extrae el link real (nunca https://moviedays.lat/OgDpWB)
 */
async function extractFromServer(browserRef, page, server) {
  const srvName = String(server.name || '').trim();
  const srvNameLower = srvName.toLowerCase();
  const srvUrl = String(server.url || server.embed || '').trim();

  if (!srvUrl || isForbiddenShortcodeUrl(srvUrl)) {
    console.log(`   [⚠️] Omitiendo URL shortcode no permitida: ${srvUrl}`);
    return null;
  }

  scraperState.capturedCuttyUrl = null;
  scraperState.detectedPermanentMp4Url = null;
  scraperState.detectedTemporaryMp4 = false;

  // 1. Seleccionar el servidor en la barra lateral derecha de MovieDays
  await page.evaluate((serverId) => {
    const btn = document.querySelector(`.server-card[data-server-id="${CSS.escape(serverId)}"]`);
    if (btn) btn.click();
  }, server.id).catch(() => {});

  await delay(1000);

  // Asegurar inyección anti-adblock en los frames
  for (const frame of page.frames()) {
    try { await frame.evaluate(ANTI_ADBLOCK_INJECTION); } catch (e) {}
  }

  // 2. Hacer clic en el botón de Play del reproductor en Brave para que cargue el link en Inspeccionar Elementos
  const clickPlayerInBrave = async () => {
    for (const frame of page.frames()) {
      try {
        await frame.evaluate(() => {
          try {
            if (typeof jwplayer === 'function') {
              jwplayer().play();
            }
          } catch (e) {}
          const playBtn = document.querySelector(
            '.jw-icon-display, .jw-display-icon-container, [aria-label="Reproducir"], [aria-label="Play"], .vjs-big-play-button, .jw-preview'
          );
          if (playBtn) playBtn.click();
          document.querySelectorAll('video').forEach(v => { try { v.play(); } catch (e) {} });
        });
      } catch (e) {}
    }

    try {
      const playerIframe = await page.$('#playerIframe');
      if (playerIframe) {
        const box = await playerIframe.boundingBox();
        if (box && box.width > 80 && box.height > 80) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        }
      }
    } catch (e) {}
  };

  await clickPlayerInBrave();
  await delay(1200);

  // =========================================================================
  // CASO A: Servidores CineLink (mp4) y CineLink (hls) alojados en moviedays.top
  // =========================================================================
  if (srvUrl.includes('moviedays.top') || srvNameLower.includes('cinelink')) {
    try {
      const resp = await fetch(srvUrl, { headers: { Referer: MOVIEDAYS_URL } });
      const html = await resp.text();

      // Verificar error directo en el HTML del reproductor
      if (
        html.includes("Parámetro 'v' no encontrado") ||
        html.includes('Parámetro "v" no encontrado') ||
        html.includes('Parametro \'v\' no encontrado')
      ) {
        console.log(`   [❌] ${srvName} (${srvUrl}): "Error: Parámetro 'v' no encontrado." -> Omitiendo.`);
        return null;
      }

      // Si el reproductor contiene un bloque de datos JSON con embeds internos (ej. Vimeos embebido)
      const dataScriptMatch = html.match(/<script type=["']text\/json["'] id=["']data["']>([\s\S]*?)<\/script>/i);
      if (dataScriptMatch) {
        try {
          const parsedData = JSON.parse(dataScriptMatch[1]);
          if (Array.isArray(parsedData.embeds) && parsedData.embeds.length > 0) {
            for (const emb of parsedData.embeds) {
              if (emb.url && emb.url.includes('vimeos.net')) {
                console.log(`   [🔍] ${srvName}: Encontrado servidor Vimeos dentro del reproductor multi-embed -> ${emb.url}`);
                return await extractFromServer(browserRef, page, {
                  name: emb.server || 'Vimeos',
                  url: emb.url,
                  lang: emb.lang || server.lang || server.audio
                });
              }
            }
          }
        } catch (e) {}
      }

      const configIdMatch = html.match(/configId\s*=\s*["']([a-f0-9]+)["']/i);
      const encryptedUrlMatch = html.match(/encryptedUrl\s*=\s*["']([^"']+)["']/i);
      const configId = configIdMatch ? configIdMatch[1] : null;
      const encryptedUrl = encryptedUrlMatch ? encryptedUrlMatch[1] : null;

      if (!configId) {
        console.log(`   [❌] ${srvName} (${srvUrl}): Reproductor sin configuración válida -> Omitiendo.`);
        return null;
      }

      const originObj = new URL(srvUrl);
      const configUrl = `${originObj.origin}/get_video_config.php?id=${configId}`;
      const cfgResp = await fetch(configUrl, { headers: { Referer: srvUrl } });
      if (!cfgResp.ok) {
        console.log(`   [❌] ${srvName}: Error al obtener get_video_config.php (${cfgResp.status}) -> Omitiendo.`);
        return null;
      }

      const cfgJson = await cfgResp.json();
      const firstSource = cfgJson && Array.isArray(cfgJson.sources) && cfgJson.sources[0] ? cfgJson.sources[0] : null;
      if (!firstSource || !firstSource.file) {
        console.log(`   [❌] ${srvName}: Error de Reproducción (Fuentes no disponibles) -> Omitiendo.`);
        return null;
      }

      const fileUrl = String(firstSource.file).trim();
      const isTempWorker = isTemporaryWorkerUrl(fileUrl);

      // 1) Si el archivo en get_video_config.php es un MP4 directo permanente (rumble.cloud / 1a-1791.com)
      if (fileUrl.includes('rumble.cloud/video/') || fileUrl.includes('1a-1791.com/video/') || (fileUrl.endsWith('.mp4') && !isTempWorker && !fileUrl.includes('?'))) {
        if (isForbiddenShortcodeUrl(fileUrl)) return null;
        const normalizedMp4 = normalizeDirectMp4(fileUrl);
        console.log(`   [✅] ${srvName}: Enlace MP4 directo permanente extraído del reproductor -> ${normalizedMp4}`);
        return {
          dbServerName: 'CINEBEL',
          videoUrl: normalizedMp4,
          isDirectMp4: true,
          lang: normalizeLanguage(server.lang || server.audio)
        };
      }

      // 2) Si es un proxy temporal de Cloudflare Workers (stream-player/workers.dev) y tiene botón de descarga (ClickDoki)
      if (isTempWorker && encryptedUrl) {
        console.log(`   [⚠️] ${srvName}: El reproductor usa proxy temporal de Cloudflare Workers.`);
        console.log(`   [📥] Abriendo flujo de descarga de ClickDoki para rescatar el MP4 permanente de Rumble...`);
        const cuttyFullUrl = `${originObj.origin}/API-cutty.php?token=${encodeURIComponent(encryptedUrl)}`;
        const resolvedMp4 = await resolveClickDoki(browserRef, cuttyFullUrl);
        if (resolvedMp4 && !isForbiddenShortcodeUrl(resolvedMp4)) {
          const normalizedMp4 = normalizeDirectMp4(resolvedMp4);
          console.log(`   [🎉] ${srvName}: ¡Enlace permanente de Rumble extraído con éxito vía ClickDoki! -> ${normalizedMp4}`);
          return {
            dbServerName: 'CINEBEL',
            videoUrl: normalizedMp4,
            isDirectMp4: true,
            lang: normalizeLanguage(server.lang || server.audio)
          };
        } else {
          console.log(`   [⚠️] ${srvName}: No se completó la descarga en ClickDoki -> Continuando con otros servidores.`);
        }
      }

      // 2) Si es un stream HLS (/video.php?token=...) como en CineLink (hls) / Multi-Audio Z
      if (fileUrl.startsWith('/video.php') || firstSource.type === 'hls' || srvNameLower.includes('hls')) {
        const checkStreamUrl = fileUrl.startsWith('/') ? `${originObj.origin}${fileUrl}` : fileUrl;
        const streamResp = await fetch(checkStreamUrl, { headers: { Referer: srvUrl } });
        const streamBody = await streamResp.text();

        if (
          !streamResp.ok ||
          streamBody.includes('ERROR:') ||
          streamBody.includes('corrupto') ||
          streamBody.includes('Error de Reproducción') ||
          !streamBody.includes('#EXTM3U')
        ) {
          console.log(`   [❌] ${srvName} (${srvUrl}): Error de Reproducción ("${streamBody.slice(0, 60).trim()}") -> Omitiendo.`);
          return null;
        }

        // Si el stream HLS funciona correctamente (200 #EXTM3U), es Multi-Audio Z
        if (!isForbiddenShortcodeUrl(srvUrl)) {
          console.log(`   [✅] ${srvName} (Multi - Audio Z): Reproductor verificado sin errores -> ${srvUrl}`);
          return {
            dbServerName: 'MULTI-AUDIO Z',
            videoUrl: srvUrl,
            isDirectMp4: false,
            lang: normalizeLanguage(server.lang || server.audio)
          };
        }
      }

      // 3) Si el reproductor en DOM cargó un MP4 directo o temporal tras hacer clic en Play
      for (let w = 0; w < 6; w++) {
        if (scraperState.detectedPermanentMp4Url) {
          const normalizedMp4 = normalizeDirectMp4(scraperState.detectedPermanentMp4Url);
          console.log(`   [✅] ${srvName}: Enlace MP4 detectado en inspección del reproductor -> ${normalizedMp4}`);
          return {
            dbServerName: 'CINEBEL',
            videoUrl: normalizedMp4,
            isDirectMp4: true,
            lang: normalizeLanguage(server.lang || server.audio)
          };
        }

        // Verificar si apareció el modal "Error de Reproducción" dentro del iframe en Brave
        let hasDomError = false;
        for (const frame of page.frames()) {
          try {
            const errFound = await frame.evaluate(() => {
              const txt = (document.body ? document.body.innerText : '') || '';
              return (
                txt.includes('Error de Reproducción') ||
                txt.includes('hemos encontrado un problema al reproducir') ||
                txt.includes("Parámetro 'v' no encontrado") ||
                txt.includes('Código de Error: 232011')
              );
            });
            if (errFound) {
              hasDomError = true;
              break;
            }
          } catch (e) {}
        }

        if (hasDomError) {
          console.log(`   [❌] ${srvName}: Error de Reproducción detectado en el reproductor -> Omitiendo.`);
          return null;
        }

        await delay(800);
      }

      // 4) Si tiene un link temporal pero cuenta con encryptedUrl para API-cutty -> ClickDoki
      if (encryptedUrl) {
        const cuttyFullUrl = `${originObj.origin}/API-cutty.php?token=${encodeURIComponent(encryptedUrl)}`;
        console.log(`   [📥] Resolviendo enlace permanente vía API-cutty / ClickDoki...`);
        const resolvedMp4 = await resolveClickDoki(browserRef, cuttyFullUrl);
        if (resolvedMp4 && !isForbiddenShortcodeUrl(resolvedMp4)) {
          const normalizedMp4 = normalizeDirectMp4(resolvedMp4);
          return {
            dbServerName: 'CINEBEL',
            videoUrl: normalizedMp4,
            isDirectMp4: true,
            lang: normalizeLanguage(server.lang || server.audio)
          };
        }
      }

      return null;
    } catch (e) {
      console.log(`   [❌] Error verificando ${srvName}: ${e.message} -> Omitiendo.`);
      return null;
    }
  }

  // =========================================================================
  // CASO B: Servidor Vimeos (vimeos.net) u otros servidores
  // =========================================================================
  if (srvUrl.includes('vimeos.net') || srvNameLower.includes('vimeos')) {
    try {
      const resp = await fetch(srvUrl, { headers: { Referer: MOVIEDAYS_URL } });
      if (!resp.ok) {
        console.log(`   [❌] ${srvName} (${srvUrl}): HTTP ${resp.status} -> Omitiendo.`);
        return null;
      }
      const html = await resp.text();

      if (
        html.includes('232011') ||
        html.includes('Este archivo de video no se puede reproducir') ||
        html.includes('File is no longer available') ||
        html.includes('Video not found')
      ) {
        console.log(`   [❌] ${srvName}: Este archivo de video no se puede reproducir (Código de Error: 232011) -> Omitiendo.`);
        return null;
      }

      // Desempaquetar el script de JWPlayer en vimeos.net para verificar que el master.m3u8 responda 200 OK
      const packedMatch = html.match(/eval\((function\(p,a,c,k,e,d\).*?)\)\s*<\/script>/s);
      if (packedMatch) {
        let unpacked = '';
        try {
          unpacked = eval('(' + packedMatch[1] + ')');
        } catch (e) {}

        const fileMatch = unpacked.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"']+)["']/i) ||
                          unpacked.match(/file\s*:\s*["'](https?:[^"']+\.m3u8[^"']*)["']/i);
        if (!fileMatch || !fileMatch[1]) {
          console.log(`   [❌] ${srvName}: No se encontró stream reproducible dentro de Vimeos -> Omitiendo.`);
          return null;
        }

        const m3u8Url = fileMatch[1];
        try {
          const m3u8Resp = await fetch(m3u8Url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Referer: srvUrl
            }
          });
          if (!m3u8Resp.ok) {
            console.log(`   [❌] ${srvName}: Este archivo de video no se puede reproducir (Código de Error: 232011 / HTTP ${m3u8Resp.status}) -> Omitiendo.`);
            return null;
          }
          const m3u8Text = await m3u8Resp.text();
          if (!m3u8Text.includes('#EXTM3U')) {
            console.log(`   [❌] ${srvName}: Stream inválido en Vimeos (Código de Error: 232011) -> Omitiendo.`);
            return null;
          }
        } catch (errFetch) {
          console.log(`   [❌] ${srvName}: Este archivo de video no se puede reproducir (Código de Error: 232011 - ${errFetch.message}) -> Omitiendo.`);
          return null;
        }
      }

      // Verificar también en el DOM del iframe en Brave por si mostró el texto de error 232011
      for (const frame of page.frames()) {
        try {
          if (frame.url().includes('vimeos.net')) {
            const domErr = await frame.evaluate(() => {
              const txt = (document.body ? document.body.innerText : '') || '';
              return (
                txt.includes('232011') ||
                txt.includes('Este archivo de video no se puede reproducir') ||
                txt.includes('Error de Reproducción')
              );
            });
            if (domErr) {
              console.log(`   [❌] ${srvName}: Error 232011 detectado en el reproductor -> Omitiendo.`);
              return null;
            }
          }
        } catch (e) {}
      }

      console.log(`   [✅] ${srvName}: Reproductor Vimeos verificado y funcionando -> ${srvUrl}`);
      return {
        dbServerName: 'VIMEOS',
        videoUrl: srvUrl,
        isDirectMp4: false,
        lang: normalizeLanguage(server.lang || server.audio)
      };
    } catch (e) {
      console.log(`   [❌] Error verificando Vimeos: ${e.message} -> Omitiendo.`);
      return null;
    }
  }

  return null;
}

/**
 * Resuelve la cadena de API-cutty -> ClickDoki para extraer el archivo MP4 permanente de Rumble
 */
async function resolveClickDoki(browserRef, cuttyUrl) {
  scraperState.isResolvingClickDoki = true;
  const clickPage = await browserRef.browser.newPage();

  let capturedDirectMp4 = null;
  const openedPages = new Set([clickPage]);

  // Listener para nuevas pestañas/popups abiertas por ClickDoki que contengan Rumble
  const targetListener = async target => {
    try {
      const u = target.url();
      if (u.includes('rumble.cloud/video/') || u.includes('1a-1791.com/video/')) {
        capturedDirectMp4 = u;
      }
      if (target.type() === 'page') {
        const p = await target.page();
        if (p) {
          openedPages.add(p);
          p.on('request', req => {
            const ru = req.url();
            if (ru.includes('rumble.cloud/video/') || ru.includes('1a-1791.com/video/')) {
              capturedDirectMp4 = ru;
            }
          });
        }
      }
    } catch (e) {}
  };
  browserRef.browser.on('targetcreated', targetListener);

  clickPage.on('request', req => {
    const u = req.url();
    if (u.includes('1a-1791.com/video/') || u.includes('rumble.cloud/video/')) {
      capturedDirectMp4 = u;
    }
  });

  clickPage.on('response', async res => {
    try {
      const u = res.url();
      if (u.includes('1a-1791.com/video/') || u.includes('rumble.cloud/video/')) {
        capturedDirectMp4 = u;
      }
      // Respuesta JSON del backend de clickdoki con la URL de destino final
      if (u.includes('clickdoki.com') && res.request().method() === 'POST') {
        const json = await res.json().catch(() => null);
        if (json && json.url && (json.url.includes('rumble.cloud') || json.url.includes('1a-1791.com'))) {
          capturedDirectMp4 = json.url;
        }
      }
    } catch (e) {}
  });

  try {
    // 1) Resolver la URL corta de ClickDoki directamente sin esperar la animación de API-cutty
    let targetDokiUrl = cuttyUrl;
    try {
      const fastCuttyUrl = cuttyUrl + (cuttyUrl.includes('?') ? '&' : '?') + 'get_short_link=1';
      const fastRes = await fetch(fastCuttyUrl, {
        headers: { Referer: 'https://moviedays.lat/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const fastText = await fastRes.text();
      const finalUrlMatch = fastText.match(/\"finalUrl\"\s*:\s*\"([^\"]+)\"/);
      if (finalUrlMatch) {
        targetDokiUrl = finalUrlMatch[1].replace(/\\\//g, '/');
      }
    } catch (e) {}

    console.log(`\n   ================================================================`);
    console.log(`   👉 [CLICKDOKI] Abriendo enlace en Brave: ${targetDokiUrl}`);
    console.log(`      1. Si aparece el captcha ("No soy un robot"), márcalo en Brave.`);
    console.log(`      2. El scraper esperará los 10 segundos y pulsará "Obtener vínculo"`);
    console.log(`         automáticamente para extraer el MP4 directo de Rumble.`);
    console.log(`   ================================================================\n`);

    await clickPage.goto(targetDokiUrl, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
    try { await clickPage.bringToFront(); } catch (e) {}

    // 2) Esperar a que cargue la interfaz de ClickDoki
    for (let i = 0; i < 15; i++) {
      if (capturedDirectMp4) break;
      const cur = clickPage.url();
      if (cur.includes('1a-1791.com') || cur.includes('rumble.cloud')) {
        capturedDirectMp4 = cur;
        break;
      }
      const hasUI = await clickPage.evaluate(() => {
        return (
          window.location.href.includes('clickdoki') ||
          document.querySelector('#invisibleCaptchaShortlink, a.get-link, iframe[src*="recaptcha"]') != null
        );
      }).catch(() => false);
      if (hasUI) break;
      await delay(1000);
    }

    // 3) Paso 1: Resolver Captcha (espera al usuario pacientemente sin interferir si requiere selección manual)
    let hasAttemptedInitialClick = false;
    let manualNoticeShown = false;
    const maxWaitSeconds = 240; // 4 minutos de espera para que el usuario no tenga ninguna prisa

    for (let w = 0; w < maxWaitSeconds; w++) {
      if (capturedDirectMp4) break;

      const curUrl = clickPage.url();
      if (curUrl.includes('rumble.cloud') || curUrl.includes('1a-1791.com')) {
        capturedDirectMp4 = curUrl;
        break;
      }

      // Intentar marcar checkbox de reCAPTCHA SOLO UNA VEZ para intentar resolución automática.
      // Si no pasa solo (aparece selector de imágenes), NO volver a hacer clic en el anchor
      // para que NO parpadee, no se reinicie ni se cierre ("quite y pone").
      if (!hasAttemptedInitialClick) {
        for (const frame of clickPage.frames()) {
          try {
            if (frame.url().includes('recaptcha')) {
              const anchor = await frame.$('#recaptcha-anchor');
              if (anchor) {
                const checked = await frame.evaluate(el => el.getAttribute('aria-checked'), anchor);
                if (checked !== 'true') {
                  await delay(600);
                  await anchor.click().catch(() => {});
                  hasAttemptedInitialClick = true;
                  await delay(1200);
                  break;
                }
              }
            }
          } catch (e) {}
        }
      }

      const captchaState = await clickPage.evaluate(() => {
        const token = document.querySelector('#g-recaptcha-response, textarea[name="g-recaptcha-response"]');
        const solved = Boolean(token && token.value && token.value.trim().length > 0);
        const text = (document.body ? document.body.innerText : '') || '';
        const isStep2 = text.includes('SU ENLACE ESTÁ CASI LISTO') || text.includes('Segundos') || document.querySelector('a.get-link') != null;
        return { solved, isStep2 };
      }).catch(() => ({ solved: false, isStep2: false }));

      if (captchaState.isStep2) {
        break; // Ya pasó a la pantalla del contador
      }

      if (captchaState.solved) {
        console.log(`   [✅] Captcha resuelto. Enviando hacia el paso 2 (contador de 10 seg)...`);
        await clickPage.evaluate(() => {
          const btn = document.querySelector('#invisibleCaptchaShortlink');
          if (btn) {
            btn.disabled = false;
            btn.click();
          }
          const form = document.querySelector('#link-view');
          if (form) form.submit();
        }).catch(() => {});
        await delay(2000);
        break;
      }

      // Si ya intentamos el clic inicial y requiere selección manual de imágenes, avisar y esperar en silencio sin tocar nada
      if (hasAttemptedInitialClick && !manualNoticeShown) {
        console.log(`   [🧩] Se requiere resolver el captcha en Brave.`);
        console.log(`   👉 Selecciona las imágenes en la ventana de Brave. El scraper esperará pacientemente a que termines sin interrumpirte.`);
        manualNoticeShown = true;
      }

      await delay(1000);
    }

    // 4) Paso 2: Cuenta regresiva de 10 segundos
    console.log(`   [⏳] Esperando la cuenta regresiva de 10 segundos en ClickDoki...`);
    for (let sec = 0; sec < 35; sec++) {
      if (capturedDirectMp4) break;

      const curUrl = clickPage.url();
      if (curUrl.includes('rumble.cloud') || curUrl.includes('1a-1791.com')) {
        capturedDirectMp4 = curUrl;
        break;
      }

      const step2Info = await clickPage.evaluate(() => {
        // 1. Revisar si algún enlace en la página ya tiene la URL de Rumble
        const allLinks = Array.from(document.querySelectorAll('a'));
        for (const a of allLinks) {
          const h = a.href || '';
          if (h.includes('rumble.cloud/video/') || h.includes('1a-1791.com/video/')) {
            return { readyUrl: h };
          }
        }

        // 2. Revisar el botón Get Link / Obtener vínculo
        const getLinkBtn = document.querySelector('a.get-link, a.btn-success.get-link, a.btn-success, #link-view a');
        if (getLinkBtn) {
          const href = getLinkBtn.href || '';
          const isDisabled = getLinkBtn.classList.contains('disabled');
          if (href && (href.includes('rumble.cloud') || href.includes('1a-1791.com'))) {
            return { readyUrl: href };
          }
          if (!isDisabled) {
            return { canClick: true, href };
          }
        }
        return null;
      }).catch(() => null);

      if (step2Info) {
        if (step2Info.readyUrl) {
          console.log(`   [🎉] Enlace directo de Rumble detectado en ClickDoki -> ${step2Info.readyUrl}`);
          capturedDirectMp4 = step2Info.readyUrl;
          break;
        }
        if (step2Info.canClick) {
          console.log(`   [🔘] ¡Contador finalizado! Pulsando botón "Obtener vínculo"...`);
          await clickPage.evaluate(() => {
            const btn = document.querySelector('a.get-link, a.btn-success.get-link, a.btn-success, #link-view a');
            if (btn) btn.click();
          }).catch(() => {});
          await delay(1500);
        }
      }

      await delay(1000);
    }

    // 5) Verificación final por si hubo redirección tardía
    for (let finalWait = 0; finalWait < 8; finalWait++) {
      if (capturedDirectMp4) break;
      const cur = clickPage.url();
      if (cur.includes('rumble.cloud') || cur.includes('1a-1791.com')) {
        capturedDirectMp4 = cur;
        break;
      }
      await delay(1000);
    }

    return capturedDirectMp4 || null;
  } catch (e) {
    console.log(`   [❌] Error en resolveClickDoki: ${e.message}`);
    return null;
  } finally {
    try {
      if (typeof browserRef.browser.off === 'function') {
        browserRef.browser.off('targetcreated', targetListener);
      }
    } catch (e) {}
    scraperState.isResolvingClickDoki = false;
    for (const p of openedPages) {
      try { await p.close(); } catch (e) {}
    }
  }
}

/**
 * Obtiene el search_title existente en Supabase para un anime_tmdb_id (si ya existe),
 * para mantener todos los episodios agrupados bajo el mismo título.
 */
async function getExistingSearchTitleInDb(client, tmdbId, fallbackTitle) {
  try {
    const res = await client.query(
      `SELECT search_title FROM anime_episodes
       WHERE anime_tmdb_id = $1 OR LOWER(search_title) = LOWER($2)
       ORDER BY CASE WHEN anime_tmdb_id = $1 THEN 0 ELSE 1 END, id ASC
       LIMIT 1`,
      [String(tmdbId), String(fallbackTitle || '')]
    );
    if (res.rows.length > 0 && res.rows[0].search_title) {
      const existingTitle = res.rows[0].search_title;
      await client.query(
        `UPDATE anime_episodes
         SET anime_tmdb_id = $1
         WHERE LOWER(search_title) = LOWER($2)
           AND (anime_tmdb_id IS NULL OR anime_tmdb_id = '')`,
        [String(tmdbId), existingTitle]
      ).catch(() => {});
      return existingTitle;
    }
  } catch (e) {}
  return fallbackTitle;
}

/**
 * Guarda o actualiza un servidor extraído en la tabla anime_episodes de Supabase
 */
async function saveEpisodeToDb(client, {
  searchTitle,
  epNum,
  seasonNum,
  episodeName,
  serverName,
  language,
  videoUrl,
  tmdbId
}) {
  if (!videoUrl || isForbiddenShortcodeUrl(videoUrl)) {
    console.log(`   [🚫] Bloqueado intento de guardar URL prohibida: ${videoUrl}`);
    return false;
  }

  const finalVideoUrl = normalizeDirectMp4(videoUrl);
  const cleanLang = normalizeLanguage(language);
  const tmdbStr = String(tmdbId);

  const check = await client.query(
    `SELECT id FROM anime_episodes 
     WHERE (LOWER(search_title) = LOWER($1) OR anime_tmdb_id = $6)
       AND episode_number = $2
       AND season_number = $3
       AND UPPER(server_name) = UPPER($4)
       AND LOWER(language) = LOWER($5)
     LIMIT 1`,
    [searchTitle, epNum, seasonNum, serverName, cleanLang, tmdbStr]
  );

  if (check.rows.length === 0) {
    try {
      await client.query(
        `INSERT INTO anime_episodes (search_title, episode_number, season_number, episode_name, server_name, language, video_url, anime_tmdb_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          searchTitle,
          epNum,
          seasonNum,
          episodeName,
          serverName,
          cleanLang,
          finalVideoUrl,
          tmdbStr
        ]
      );
    } catch (insertErr) {
      if (insertErr.code === '23505' && String(insertErr.message).includes('anime_episodes_pkey')) {
        await client.query(`SELECT setval(pg_get_serial_sequence('anime_episodes', 'id'), COALESCE((SELECT MAX(id) FROM anime_episodes), 1))`).catch(() => {});
        await client.query(
          `INSERT INTO anime_episodes (search_title, episode_number, season_number, episode_name, server_name, language, video_url, anime_tmdb_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            searchTitle,
            epNum,
            seasonNum,
            episodeName,
            serverName,
            cleanLang,
            finalVideoUrl,
            tmdbStr
          ]
        );
      } else {
        throw insertErr;
      }
    }
    console.log(`   [💾] ¡Guardado en Supabase! -> [${serverName}] (${cleanLang}) | T${seasonNum}E${epNum} ("${episodeName}") -> ${finalVideoUrl}`);
  } else {
    await client.query(
      `UPDATE anime_episodes
       SET video_url = $1,
           episode_name = COALESCE($2, episode_name),
           anime_tmdb_id = $3,
           language = $4
       WHERE id = $5`,
      [finalVideoUrl, episodeName, tmdbStr, cleanLang, check.rows[0].id]
    );
    console.log(`   [🔄] ¡Actualizado en Supabase! -> [${serverName}] (${cleanLang}) | T${seasonNum}E${epNum} ("${episodeName}") -> ${finalVideoUrl}`);
  }
  return true;
}

/**
 * Procesa todos los servidores disponibles de una Película o de un Episodio (T{s}E{ep})
 * y guarda en Supabase los que funcionen. Devuelve la cantidad de servidores guardados.
 */
async function processResultServers(browserRef, page, client, data, {
  contentType,
  searchTitle,
  seasonNum,
  epInSeason,
  dbEpisodeNumber,
  episodeName,
  tmdbId
}) {
  const servers = Array.isArray(data.servers) ? data.servers : [];
  if (servers.length === 0) return 0;

  // Ordenar para probar primero CineLink (mp4), luego CineLink (hls) y luego Vimeos
  const sortedServers = [...servers].sort((a, b) => {
    const rank = s => {
      const n = String(s.name || '').toLowerCase();
      if (n.includes('cinelink') && n.includes('mp4')) return 1;
      if (n.includes('cinelink') && n.includes('hls')) return 2;
      if (n.includes('vimeos')) return 3;
      return 4;
    };
    return rank(a) - rank(b);
  });

  let savedCount = 0;
  const cinebelMp4CountByLang = {};
  const multiAudioCountByLang = {};
  const savedUrls = new Set();

  for (let i = 0; i < sortedServers.length; i++) {
    const srv = sortedServers[i];
    const srvName = String(srv.name || '').trim();
    console.log(`\n   👉 Probando servidor [${i + 1}/${sortedServers.length}]: ${srvName} (${srv.lang || 'LATINO'})...`);

    const extracted = await extractFromServer(browserRef, page, srv);
    if (!extracted || !extracted.videoUrl) {
      continue;
    }

    if (savedUrls.has(extracted.videoUrl)) {
      console.log(`   [ℹ️] El enlace ya fue guardado en otro servidor de este mismo contenido. Omitiendo duplicado.`);
      continue;
    }

    const langKey = extracted.lang || 'latino';
    let finalServerName = extracted.dbServerName;
    if (finalServerName === 'CINEBEL') {
      cinebelMp4CountByLang[langKey] = (cinebelMp4CountByLang[langKey] || 0) + 1;
      if (cinebelMp4CountByLang[langKey] > 1) {
        finalServerName = `CINEBEL ${cinebelMp4CountByLang[langKey]}`;
      }
    } else if (finalServerName === 'MULTI-AUDIO Z') {
      multiAudioCountByLang[langKey] = (multiAudioCountByLang[langKey] || 0) + 1;
      if (multiAudioCountByLang[langKey] > 1) {
        // Si ya guardamos un MULTI-AUDIO Z que funciona para este idioma, no necesitamos duplicarlo
        continue;
      }
    }

    const ok = await saveEpisodeToDb(client, {
      searchTitle,
      epNum: dbEpisodeNumber,
      seasonNum,
      episodeName,
      serverName: finalServerName,
      language: extracted.lang,
      videoUrl: extracted.videoUrl,
      tmdbId
    });

    if (ok) {
      savedUrls.add(extracted.videoUrl);
      savedCount++;
    }
  }

  return savedCount;
}

/**
 * Muestra la tarjeta de verificación con toda la información de la película / serie / anime
 */
function printMetadataVerification(data, contentType, seasonNum, epInSeason, cleanEpName) {
  console.log(`\n   ┌──────────────────────────────────────────────────────────────────────`);
  console.log(`   │ 📋 VERIFICACIÓN DE INFORMACIÓN EN MOVIEDAYS`);
  console.log(`   ├──────────────────────────────────────────────────────────────────────`);
  console.log(`   │ • Título en página : ${data.title || 'N/A'}`);
  if ( data.original_title && data.original_title !== data.title ) {
    console.log(`   │ • Título original  : ${data.original_title}`);
  }
  console.log(`   │ • TMDB ID          : ${data.tmdb_id} (${(data.type || contentType).toUpperCase()})`);
  if (contentType !== 'movie') {
    console.log(`   │ • Temporada / Epis.: Temporada ${seasonNum} — Episodio ${epInSeason}`);
    console.log(`   │ • Nombre Episodio  : ${cleanEpName || 'Episodio ' + epInSeason}`);
  }
  console.log(`   │ • Año / Rating     : ${data.release_year || 'N/A'} | ★ ${data.vote_average != null ? Number(data.vote_average).toFixed(1) : 'N/A'}`);
  console.log(`   │ • Etiquetas/Géneros: ${Array.isArray(data.genres) ? data.genres.join(', ') : 'N/A'}`);
  console.log(`   │ • Imagen Poster    : ${data.poster || 'N/A'}`);
  console.log(`   │ • Servidores list. : ${Array.isArray(data.servers) ? data.servers.map(s => s.name).join(', ') : 0}`);
  console.log(`   └──────────────────────────────────────────────────────────────────────`);
}

/**
 * Parsea la selección de temporadas del usuario (ej. "" -> todas, "1" -> [1], "1-3" -> [1,2,3], "2,3" -> [2,3])
 */
function parseSeasonSelection(inputStr, defaultSeasons) {
  const s = String(inputStr || '').trim().toLowerCase();
  if (!s || s === 'todas' || s === 'all' || s === '*') {
    return defaultSeasons.length > 0 ? defaultSeasons : [1];
  }
  const result = new Set();
  const parts = s.split(/[\s,]+/).filter(Boolean);
  for (const part of parts) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(n => parseInt(n, 10));
      if (!isNaN(a) && !isNaN(b) && a >= 1 && b >= a) {
        for (let k = a; k <= b; k++) result.add(k);
      }
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1) result.add(n);
    }
  }
  const arr = Array.from(result).sort((a, b) => a - b);
  return arr.length > 0 ? arr : (defaultSeasons.length > 0 ? defaultSeasons : [1]);
}

async function runMovieDaysScraper() {
  console.log('================================================================');
  console.log('      🎬 ANIMEZONA - SCRAPER MOVIEDAYS.LAT (CINEBEL ENGINE)     ');
  console.log('================================================================\n');

  console.log(`[🦁] Buscando navegador Brave en el sistema...`);
  const bravePaths = [
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe')
  ];
  const bravePath = bravePaths.find(p => fs.existsSync(p));

  if (!bravePath) {
    console.log(`❌ No se encontró Brave Browser en el sistema.`);
    process.exit(1);
  }

  const DEBUG_PORT = 9231;
  const profileDir = path.join(__dirname, 'brave_profile_moviedays');

  let existingTargets = await getDebugTargets(DEBUG_PORT);
  if (existingTargets.length === 0) {
    console.log(`[🤖] Abriendo Brave en ${MOVIEDAYS_URL}...`);
    const braveProc = spawn(bravePath, [
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--start-maximized',
      MOVIEDAYS_URL
    ], { detached: true, stdio: 'ignore' });
    braveProc.unref();
    await delay(2500);
  }

  let browser;
  try {
    browser = await connectToBrave(DEBUG_PORT, 10);
  } catch (connErr) {
    console.log(`[🔄] Iniciando instancia directa de Brave...`);
    browser = await puppeteer.launch({
      executablePath: bravePath,
      headless: false,
      defaultViewport: null,
      args: ['--no-first-run', '--no-default-browser-check', '--start-maximized']
    });
  }
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('moviedays')) || pages[0] || await browser.newPage();
  const browserRef = { browser, page };

  attachPopupBlocker(browser);
  await setupMainPageListeners(page);

  if (!page.url().includes('moviedays.lat')) {
    await page.goto(MOVIEDAYS_URL, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {});
    await delay(1500);
  }

  const client = new Client({
    connectionString: SUPABASE_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log(`[✅] Conectado a Supabase y a MovieDays.lat en Brave.\n`);

  try {
    let keepRunning = true;

    while (keepRunning) {
      console.log(`\n================================================================`);
      console.log(` ¿Qué tipo de contenido deseas buscar y extraer?`);
      console.log(`   1) Película`);
      console.log(`   2) Serie`);
      console.log(`   3) Anime`);
      console.log(`   0) Salir`);
      console.log(`================================================================`);

      const typeAns = await askQuestion('Selecciona una opción [1/2/3/0]: ');
      if (typeAns === '0' || typeAns.toLowerCase() === 'salir') {
        break;
      }

      let contentType = 'movie';
      let typeLabel = 'Película';
      if (typeAns === '2' || typeAns.toLowerCase().startsWith('s')) {
        contentType = 'serie';
        typeLabel = 'Serie';
      } else if (typeAns === '3' || typeAns.toLowerCase().startsWith('a')) {
        contentType = 'anime';
        typeLabel = 'Anime';
      } else {
        contentType = 'movie';
        typeLabel = 'Película';
      }

      // Renovar el token de sesión de MovieDays al iniciar cada nueva búsqueda y seleccionar el tipo en Brave
      await refreshMovieDaysToken(page, true);
      await page.evaluate((t) => {
        const btn = document.querySelector(`.type-btn[data-type="${t}"]`);
        if (btn) btn.click();
      }, contentType).catch(() => {});

      console.log(`\n[📌] Modo seleccionado: ${typeLabel.toUpperCase()}`);
      const searchAns = await askQuestion(`Ingresa el Título o el ID de TMDB de la ${typeLabel} (ej. "Troya" o "652"): `);
      if (!searchAns) {
        console.log(`⚠️ No ingresaste ningún valor.`);
        continue;
      }

      let tmdbId = null;
      let selectedTitleHint = null;

      if (/^\d+$/.test(searchAns)) {
        tmdbId = parseInt(searchAns, 10);
      } else {
        console.log(`\n[🔍] Buscando "${searchAns}" (${typeLabel}) en TMDB / MovieDays...`);
        // Escribir también en la barra #searchInput de Brave para que se vea el dropdown
        await page.evaluate((q) => {
          const inp = document.querySelector('#searchInput');
          if (inp) {
            inp.value = q;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, searchAns).catch(() => {});

        const results = await searchByTitle(searchAns, contentType);
        if (results.length === 0) {
          console.log(`❌ No se encontraron coincidencias para "${searchAns}".`);
          const retryAns = await askQuestion('\n¿Deseas intentar de nuevo con otra búsqueda? (s/n) [Por defecto: s]: ');
          if (retryAns.toLowerCase() === 'n') break;
          continue;
        }

        console.log(`\nResultados encontrados:`);
        results.forEach((r, idx) => {
          const voteStr = r.vote ? `★ ${Number(r.vote).toFixed(1)}` : '';
          console.log(`  [${idx + 1}] ${r.title} (${r.year || 'S/A'}) ${voteStr} — TMDB ID: ${r.id}`);
        });

        const pickAns = await askQuestion(`\nSelecciona el número correcto [1-${results.length}] (o presiona Enter para [1], o 0 para cancelar): `);
        if (pickAns === '0') continue;

        const pickIdx = pickAns ? (parseInt(pickAns, 10) - 1) : 0;
        const chosen = results[pickIdx] || results[0];
        tmdbId = chosen.id;
        selectedTitleHint = chosen.title;
        console.log(`✅ Seleccionado: "${chosen.title}" (${chosen.year || 'S/A'}) -> TMDB ID: ${tmdbId}`);
      }

      // =======================================================================
      // FLUJO 1: PELÍCULA (movie)
      // =======================================================================
      if (contentType === 'movie') {
        console.log(`\n[🚀] Buscando Película con TMDB ID ${tmdbId} en MovieDays...`);
        const data = await performSearchOnPage(page, {
          tmdbId,
          contentType: 'movie',
          seasonNum: null,
          epInSeason: null
        });

        if (!data || !data.success) {
          console.log(`\n================================================================`);
          console.log(`❌ AVISO: NO SE PUDO EXTRAER LA PELÍCULA (TMDB ID: ${tmdbId})`);
          console.log(`   Motivo en MovieDays: ${data && data.error ? data.error : 'No se encontraron servidores'}`);
          console.log(`================================================================`);
        } else {
          const movieTitle = (data.title || selectedTitleHint || `Película ${tmdbId}`).trim();
          printMetadataVerification(data, 'movie', 1, 1, movieTitle);

          const savedCount = await processResultServers(browserRef, page, client, data, {
            contentType: 'movie',
            searchTitle: movieTitle,
            seasonNum: 1,
            epInSeason: 1,
            dbEpisodeNumber: 1,
            episodeName: movieTitle,
            tmdbId
          });

          if (savedCount === 0) {
            console.log(`\n================================================================`);
            console.log(`❌ AVISO: NO SE PUDO EXTRAER LA PELÍCULA "${movieTitle}" (TMDB: ${tmdbId})`);
            console.log(`   Todos los servidores arrojaron Error de Reproducción / Parámetro 'v' no encontrado / Error 232011.`);
            console.log(`================================================================`);
          } else {
            console.log(`\n🎉 ¡Película "${movieTitle}" (TMDB: ${tmdbId}) extraída con éxito! (${savedCount} servidor(es) guardado(s)).`);
          }
        }
      }
      // =======================================================================
      // FLUJO 2: SERIE / ANIME (serie / anime)
      // =======================================================================
      else {
        const resolved = await resolveSeriesOrAnimeTmdbId(tmdbId, contentType);
        tmdbId = resolved.tmdbId;
        if (resolved.redirectedTitle && !selectedTitleHint) {
          selectedTitleHint = resolved.redirectedTitle;
        }
        const tmdbInfo = resolved.tmdbInfo;
        const seasonEpCountMap = new Map();
        let defaultSeasonNumbers = [1];

        if (tmdbInfo && tmdbInfo.seasons.length > 0) {
          console.log(`\n📊 Información de TMDB para "${tmdbInfo.title}" (ID: ${tmdbId}):`);
          tmdbInfo.seasons.forEach(s => {
            seasonEpCountMap.set(s.seasonNumber, s.episodeCount);
            console.log(`   • Temporada ${s.seasonNumber}: ${s.episodeCount} episodios`);
          });
          defaultSeasonNumbers = tmdbInfo.seasons.map(s => s.seasonNumber);
        } else {
          console.log(`\nℹ️ No se encontró desglose previo de temporadas en TMDB para el ID ${tmdbId}.`);
        }

        const seasonsPrompt = await askQuestion(
          `\n¿Qué temporada(s) deseas extraer? [Enter = Todas (${defaultSeasonNumbers.join(', ')}), o escribe ej. "1", "2", "1-2", o "auto"]: `
        );

        const isAutoSeasons = seasonsPrompt.toLowerCase() === 'auto';
        const seasonsToScrape = isAutoSeasons
          ? Array.from({ length: 20 }, (_, i) => i + 1)
          : parseSeasonSelection(seasonsPrompt, defaultSeasonNumbers);

        // Configurar rango de episodios por cada temporada elegida
        const seasonConfigs = [];
        if (!isAutoSeasons) {
          for (const sNum of seasonsToScrape) {
            const knownMax = seasonEpCountMap.get(sNum) || null;
            const startEpAns = await askQuestion(
              `  -> Temporada ${sNum}: ¿Desde qué episodio iniciar? [Enter = 1]: `
            );
            const startEp = parseInt(startEpAns, 10) >= 1 ? parseInt(startEpAns, 10) : 1;

            const defaultEndLabel = knownMax ? `${knownMax} (según TMDB)` : `Automático hasta "No se encontraron servidores"`;
            const endEpAns = await askQuestion(
              `  -> Temporada ${sNum}: ¿Hasta qué episodio extraer? [Enter = ${defaultEndLabel}, o escribe el número límite]: `
            );
            let maxEp = null;
            if (endEpAns && /^\d+$/.test(endEpAns)) {
              maxEp = parseInt(endEpAns, 10);
            } else if (!endEpAns && knownMax) {
              maxEp = knownMax;
            }
            seasonConfigs.push({ seasonNum: sNum, startEp, maxEp });
          }
        } else {
          for (const sNum of seasonsToScrape) {
            seasonConfigs.push({
              seasonNum: sNum,
              startEp: 1,
              maxEp: seasonEpCountMap.get(sNum) || null
            });
          }
        }

        // Calcular el offset acumulado de episodios anteriores para mantener la numeración de anime_episodes
        let canonicalSeriesTitle = null;
        let totalEpisodesSavedInRun = 0;

        for (let sIdx = 0; sIdx < seasonConfigs.length; sIdx++) {
          const { seasonNum, startEp, maxEp } = seasonConfigs[sIdx];

          // Calcular cuántos episodios hubo en las temporadas anteriores (1 .. seasonNum - 1)
          let previousSeasonsEpOffset = 0;
          if (seasonNum > 1) {
            for (let prevS = 1; prevS < seasonNum; prevS++) {
              if (seasonEpCountMap.has(prevS)) {
                previousSeasonsEpOffset += seasonEpCountMap.get(prevS);
              } else {
                // Consultar en la BD cuántos episodios tiene la temporada prevS
                const dbPrev = await client.query(
                  `SELECT COUNT(DISTINCT episode_number) AS cnt FROM anime_episodes WHERE anime_tmdb_id = $1 AND season_number = $2`,
                  [String(tmdbId), prevS]
                ).catch(() => ({ rows: [] }));
                const cnt = dbPrev.rows[0] ? parseInt(dbPrev.rows[0].cnt, 10) : 0;
                previousSeasonsEpOffset += cnt;
              }
            }
          }

          console.log(`\n================================================================`);
          console.log(`📺 INICIANDO TEMPORADA ${seasonNum} (${typeLabel}) — Desde Ep. ${startEp}${maxEp ? ` hasta Ep. ${maxEp}` : ' (hasta fin de temporada)'}`);
          console.log(`================================================================`);

          let epInSeason = startEp;
          let seasonEnded = false;
          let consecutiveEmptyOrBroken = 0;

          while (!seasonEnded) {
            if (maxEp != null && epInSeason > maxEp) {
              console.log(`\n[⏹️] Límite configurado de la Temporada ${seasonNum} alcanzado (Episodio ${maxEp}).`);
              break;
            }

            console.log(`\n----------------------------------------------------------------`);
            console.log(`🔎 Buscando Temporada ${seasonNum} / Episodio ${epInSeason} (${seasonNum} / ${epInSeason})...`);
            console.log(`----------------------------------------------------------------`);

            let data = await performSearchOnPage(page, {
              tmdbId,
              contentType,
              seasonNum,
              epInSeason
            });

            // Si en el Episodio 1 no encontró servidores bajo 'anime', probar respaldo bajo 'serie' (y viceversa)
            if ((!data || !data.success) && epInSeason === 1 && (contentType === 'anime' || contentType === 'serie')) {
              const fallbackType = contentType === 'anime' ? 'serie' : 'anime';
              const fallbackData = await performSearchOnPage(page, {
                tmdbId,
                contentType: fallbackType,
                seasonNum,
                epInSeason
              });
              if (fallbackData && fallbackData.success) {
                console.log(`   [ℹ️] Encontrado bajo categoría "${fallbackType.toUpperCase()}" en MovieDays.`);
                contentType = fallbackType;
                data = fallbackData;
              }
            }

            // Si aparece "Sin resultados / No se encontraron servidores"
            if (!data || !data.success) {
              const errMsg = data && data.error ? data.error : 'No se encontraron servidores';
              console.log(`   [⏹️] MovieDays respondió: "${errMsg}" en T${seasonNum}E${epInSeason}.`);

              if (epInSeason === 1) {
                console.log(`   [🏁] La Temporada ${seasonNum} (Episodio 1) no tiene servidores. Finalizando búsqueda de más temporadas.`);
                // Si T{s}E1 no existe, ya no hay más temporadas
                sIdx = seasonConfigs.length;
                break;
              } else if (maxEp != null && epInSeason < maxEp) {
                console.log(`   [⚠️] Episodio T${seasonNum}E${epInSeason} no disponible en MovieDays. Omitiendo (quedará libre para agregar manual) y continuando con el siguiente hasta E${maxEp}...`);
                epInSeason++;
                continue;
              } else {
                console.log(`   [✅] Fin de la Temporada ${seasonNum} detectado (último episodio intentado: ${epInSeason - 1}).`);
                if (!seasonEpCountMap.has(seasonNum)) {
                  seasonEpCountMap.set(seasonNum, epInSeason - 1);
                }
                break;
              }
            }

            const parsedTitle = parseMovieDaysTitle(data.title, contentType);
            if (!canonicalSeriesTitle) {
              const baseCandidate = parsedTitle.baseTitle || (tmdbInfo && tmdbInfo.title) || selectedTitleHint || `Serie ${tmdbId}`;
              canonicalSeriesTitle = await getExistingSearchTitleInDb(client, tmdbId, baseCandidate);
            }

            let cleanEpName = parsedTitle.episodeName;
            if (!cleanEpName) {
              cleanEpName = await getTmdbEpisodeName(tmdbId, seasonNum, epInSeason);
            }

            // Protección especial para Animes/Series cuando se pasa del último capítulo real y MovieDays muestra servidores vacíos:
            // Si el título devuelto NO trae "— T{s}E{ep}:" Y TMDB tampoco tiene ese episodio, verificar con cuidado
            const isLikelyOverflowEpisode = !parsedTitle.hasEpisodeMarker && !cleanEpName;
            if (!cleanEpName) {
              cleanEpName = `Episodio ${epInSeason}`;
            }

            printMetadataVerification(data, contentType, seasonNum, epInSeason, cleanEpName);

            const dbEpisodeNumber = previousSeasonsEpOffset + epInSeason;

            const savedCount = await processResultServers(browserRef, page, client, data, {
              contentType,
              searchTitle: canonicalSeriesTitle,
              seasonNum,
              epInSeason,
              dbEpisodeNumber,
              episodeName: cleanEpName,
              tmdbId
            });

            if (savedCount === 0) {
              consecutiveEmptyOrBroken++;
              console.log(`   [⚠️] Ningún servidor funcionó para T${seasonNum}E${epInSeason} (quedará libre para agregar manual).`);
              if (isLikelyOverflowEpisode || (maxEp == null && consecutiveEmptyOrBroken >= 2)) {
                console.log(`   [⏹️] Se detectaron episodios sin contenido reproducible al final de la Temporada ${seasonNum}. Avanzando...`);
                if (!seasonEpCountMap.has(seasonNum) && epInSeason > 1) {
                  seasonEpCountMap.set(seasonNum, epInSeason - consecutiveEmptyOrBroken);
                }
                break;
              }
            } else {
              consecutiveEmptyOrBroken = 0;
              totalEpisodesSavedInRun++;
            }

            console.log(`\n   [☕] Pausa preventiva de 4 segundos antes del siguiente episodio para evitar bloqueos/captchas...`);
            await delay(4000);

            epInSeason++;
          }
        }

        console.log(`\n================================================================`);
        console.log(`🎉 Proceso finalizado para "${canonicalSeriesTitle || selectedTitleHint || tmdbId}"`);
        console.log(`   Episodios con servidores extraídos y guardados: ${totalEpisodesSavedInRun}`);
        console.log(`================================================================`);
      }

      const againAns = await askQuestion('\n🔄 ¿Deseas intentar de nuevo o scrapear otra Película, Serie o Anime? (s/n) [Por defecto: s]: ');
      if (againAns.toLowerCase() === 'n' || againAns.toLowerCase() === 'no') {
        keepRunning = false;
      }
    }
  } catch (err) {
    console.error(`❌ Error general en el scraper:`, err.message);
  } finally {
    rl.close();
    try { await client.end(); } catch (e) {}
    try { await browser.disconnect(); } catch (e) {}
    console.log(`\n👋 Scraper de MovieDays finalizado.`);
  }
}

if (require.main === module) {
  runMovieDaysScraper();
} else {
  rl.close();
  module.exports = {
    performSearchOnPage,
    extractFromServer,
    connectToBrave,
    getDebugTargets,
    refreshMovieDaysToken,
    resolveSeriesOrAnimeTmdbId,
    getTmdbSeasonsInfo
  };
}



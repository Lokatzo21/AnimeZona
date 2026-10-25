const https = require('https');
const readline = require('readline');
const path = require('path');
const vm = require('vm');
const { Client } = require('./node_modules/pg');

let puppeteer = null;
try {
  puppeteer = require(path.join(__dirname, 'node_modules', 'puppeteer-core'));
} catch (e) {
  puppeteer = null;
}

const bravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const DB_CONN = 'postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres';

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://rumble.com/',
          ...headers
        }
      }, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      });
      req.on('error', reject);
      req.end();
    } catch (e) {
      resolve({ status: 500, headers: {}, body: '', error: e.message });
    }
  });
}

function checkHead(url) {
  return new Promise(resolve => {
    try {
      const u = new URL(url);
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://rumble.com/'
        }
      }, res => {
        const len = res.headers['content-length'] ? parseInt(res.headers['content-length'], 10) : 0;
        resolve({ url, status: res.statusCode, length: len, headers: res.headers });
      });
      req.on('error', err => resolve({ url, status: 500, length: 0, error: err.message }));
      req.end();
    } catch (e) {
      resolve({ url, status: 500, length: 0, error: e.message });
    }
  });
}

function generateAaaCandidates(url) {
  const cands = new Set();
  const clean = url.replace(/\\\//g, '/').split('?')[0];

  if (clean.includes('.Faa.')) {
    cands.add(clean.replace(/\.Faa\./i, '.aaa.'));
    cands.add(clean.replace(/\.Faa\.mp4$/i, '.aaa.mp4'));
    cands.add(clean.replace(/\.Faa\.rec\.mp4$/i, '.aaa.rec.mp4'));
  }

  if (clean.includes('.aaa.')) {
    cands.add(clean);
  }

  cands.add(clean.replace(/\.[a-zA-Z0-9]+\.mp4$/i, '.aaa.mp4'));
  cands.add(clean.replace(/\.[a-zA-Z0-9]+\.rec\.mp4$/i, '.aaa.rec.mp4'));

  return Array.from(cands).filter(u => u.includes('.aaa.') && !u.includes('.Faa.'));
}

async function resolvePublicWithBrowser(targetUrl) {
  if (!puppeteer) return null;
  const browser = await puppeteer.launch({
    executablePath: bravePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    const networkUrls = [];
    page.on('response', response => {
      const u = response.url();
      if (u.includes('.mp4') || u.includes('.m3u8') || u.includes('/embed/')) {
        networkUrls.push(u);
      }
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3500));

    const domInfo = await page.evaluate(() => {
      let embed = null;
      let title = document.title ? document.title.replace(/\s*-\s*Rumble\s*$/i, '').trim() : null;

      const oembed = document.querySelector('link[type*="oembed"]');
      if (oembed && oembed.href) {
        const m = oembed.href.match(/url=([^&]+)/);
        if (m) embed = decodeURIComponent(m[1]);
      }

      if (!embed) {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const s of scripts) {
          try {
            const data = JSON.parse(s.innerText);
            if (data.embedUrl) embed = data.embedUrl;
            if (data.name && !title) title = data.name;
          } catch(e) {}
        }
      }

      if (!embed) {
        const iframe = document.querySelector('iframe[src*="rumble.com/embed/"]');
        if (iframe) embed = iframe.src;
      }

      if (!embed) {
        const m = document.documentElement.innerHTML.match(/https:\/\/rumble\.com\/embed\/[a-zA-Z0-9_\-]+/);
        if (m) embed = m[0];
      }

      return { embed, title };
    });

    return {
      embedUrl: domInfo.embed,
      title: domInfo.title,
      networkUrls
    };
  } finally {
    await browser.close();
  }
}

async function inspectRumbleUrl(inputUrl) {
  let raw = inputUrl.trim();
  let embedUrl = null;
  let pageTitle = null;
  let browserNetworkUrls = [];

  // CASO A: El usuario pegó directamente un enlace CDN de Rumble (.mp4 o .Faa.mp4 o .aaa.mp4)
  if (raw.includes('.mp4')) {
    console.log(`[🎯] Enlace directo de archivo MP4 detectado: ${raw}`);
    const candidateList = generateAaaCandidates(raw);
    if (!raw.includes('.Faa.')) {
      candidateList.unshift(raw);
    }

    const validDirects = [];
    for (const cand of [...new Set(candidateList)]) {
      const head = await checkHead(cand);
      const sizeMb = head.length ? Math.round(head.length / (1024 * 1024)) : 0;
      if (head.status === 200 && sizeMb > 30) {
        validDirects.push({
          type: 'mp4',
          format: 'MP4 Directo (.aaa.mp4)',
          quality: `1080p / Calidad Máxima (${sizeMb} MB)`,
          url: cand,
          sizeMb,
          verified: true
        });
      }
    }

    if (validDirects.length > 0) {
      validDirects.sort((a, b) => b.sizeMb - a.sizeMb);
      const best = validDirects[0];
      return {
        title: 'Video Rumble (Directo)',
        duration: 'N/A',
        resolution: '1080p Full HD',
        embedUrl: raw,
        bestStream: best,
        allStreams: validDirects
      };
    } else {
      console.log('⚠️ El enlace .aaa.mp4 no está disponible en el servidor (403 o no existe).');
    }
  }

  // CASO B: Código iframe completo <iframe src="https://rumble.com/embed/..."></iframe>
  const iframeMatch = raw.match(/src=["'](https?:\/\/rumble\.com\/embed\/[a-zA-Z0-9_\-]+)/i);
  if (iframeMatch) {
    embedUrl = iframeMatch[1] + '/';
  } else if (raw.includes('/embed/')) {
    const m = raw.match(/\/embed\/([a-zA-Z0-9_\-]+)/i);
    if (m) embedUrl = `https://rumble.com/embed/${m[1]}/`;
  } else if (/^v[a-zA-Z0-9_\-]+$/i.test(raw)) {
    embedUrl = `https://rumble.com/embed/${raw}/`;
  } else if (raw.includes('rumble.com/v')) {
    console.log(`[🔎] Analizando URL pública de Rumble con navegador: ${raw}...`);
    const resolved = await resolvePublicWithBrowser(raw);
    if (resolved) {
      embedUrl = resolved.embedUrl;
      pageTitle = resolved.title;
      browserNetworkUrls = resolved.networkUrls || [];
      console.log(`[✨] Embed extraído con éxito: ${embedUrl}`);
    }
  } else if (raw.includes('hls-vod/')) {
    const m = raw.match(/hls-vod\/([a-zA-Z0-9_\-]+)/i);
    if (m) embedUrl = `https://rumble.com/embed/${m[1]}/`;
  }

  if (!embedUrl) {
    throw new Error('No se pudo identificar el video de Rumble. Verifica la URL o pega el código embed.');
  }

  if (!embedUrl.endsWith('/')) embedUrl += '/';
  console.log(`[⚡] Consultando CDN de Rumble: ${embedUrl}`);
  const res = await httpsGet(embedUrl);
  if (res.status !== 200) {
    throw new Error(`Rumble embed devolvió HTTP ${res.status}`);
  }

  let videoData = null;
  const configMatch = res.body.match(/m\.f\["([^"]+)"\]\s*=\s*(\{[\s\S]*?\});/);
  if (configMatch) {
    try {
      const sandbox = { h: () => 1, out: null };
      vm.createContext(sandbox);
      vm.runInContext(`out = ${configMatch[2]}`, sandbox);
      videoData = sandbox.out;
    } catch (e) {
      try {
        let jsonStr = configMatch[2].replace(/loaded\s*:\s*[a-zA-Z0-9_]+\(\)/g, 'loaded:1');
        videoData = JSON.parse(jsonStr);
      } catch (e2) {}
    }
  }

  const rawMp4s = new Set();
  const rawHls = new Set();

  browserNetworkUrls.forEach(u => {
    if (u.includes('.mp4')) rawMp4s.add(u.replace(/\\\//g, '/'));
    if (u.includes('playlist.m3u8')) rawHls.add(u.replace(/\\\//g, '/'));
  });

  const htmlMp4Matches = res.body.match(/https?:\\?\/\\?[^"'<>\s]+\.mp4[^"'<>\s]*/gi) || [];
  htmlMp4Matches.forEach(u => rawMp4s.add(u.replace(/\\\//g, '/')));

  const htmlHlsMatches = res.body.match(/https?:\\?\/\\?[^"'<>\s]+playlist\.m3u8[^"'<>\s]*/gi) || [];
  htmlHlsMatches.forEach(u => rawHls.add(u.replace(/\\\//g, '/')));

  if (videoData && videoData.u) {
    if (videoData.u.timeline?.url) rawMp4s.add(videoData.u.timeline.url);
    if (videoData.u.mp4?.url) rawMp4s.add(videoData.u.mp4.url);
    if (videoData.u.hls?.url) rawHls.add(videoData.u.hls.url);
  }
  if (videoData && videoData.ua) {
    if (videoData.ua.mp4) {
      Object.values(videoData.ua.mp4).forEach(v => {
        if (v && v.url) rawMp4s.add(v.url);
      });
    }
  }

  // Si no se encontraron streams en el HTML estático, inspeccionar el embed con el navegador
  if (rawMp4s.size === 0 && rawHls.size === 0 && puppeteer) {
    console.log(`[🔎] Inspeccionando reproductor de video con navegador para capturar streams reales...`);
    const browser = await puppeteer.launch({ executablePath: bravePath, headless: 'new', args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      page.on('response', r => {
        const u = r.url();
        if (u.includes('.mp4')) rawMp4s.add(u.replace(/\\\//g, '/'));
        if (u.includes('playlist.m3u8')) rawHls.add(u.replace(/\\\//g, '/'));
      });
      await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      if (!pageTitle) {
        pageTitle = (await page.title()).replace(/\s*-\s*Rumble\s*$/i, '').trim();
      }
    } catch(e) {
      console.log(`   [⚠️] Aviso navegador embed: ${e.message}`);
    } finally {
      await browser.close();
    }
  }

  // Generar candidatos .aaa.mp4 EXCLUSIVAMENTE a partir de los archivos de este video
  const candidateAaaList = new Set();
  for (const m of rawMp4s) {
    generateAaaCandidates(m).forEach(c => candidateAaaList.add(c));
    // NO incluir .Faa.mp4 ya que es solo la miniatura de 10MB
    if (!m.includes('.Faa.')) {
      candidateAaaList.add(m);
    }
  }

  const allStreams = [];

  if (candidateAaaList.size > 0) {
    console.log(`[🔎] Verificando ${candidateAaaList.size} candidatos de MP4 directo en CDN de Rumble...`);
    const mp4Checks = await Promise.all(
      Array.from(candidateAaaList).map(async cand => {
        const head = await checkHead(cand);
        return { url: cand, head };
      })
    );

    for (const item of mp4Checks) {
      const sizeMb = item.head.length ? Math.round(item.head.length / (1024 * 1024)) : 0;
      // Exigir más de 30 MB para asegurar que sea la película y no un thumbnail
      if (item.head.status === 200 && sizeMb > 30) {
        let qualityDesc = `1080p / Calidad Máxima Directa (${sizeMb} MB)`;
        if (videoData && videoData.w && videoData.h) {
          const label = videoData.w >= 3840 ? '4K' : videoData.w >= 1920 ? '1080p' : `${videoData.h}p`;
          qualityDesc = `${label} (${videoData.w}x${videoData.h}) - ${sizeMb} MB (Directo S3/CDN)`;
        }

        allStreams.push({
          type: 'mp4',
          format: 'MP4 Directo (.aaa.mp4)',
          quality: qualityDesc,
          url: item.url,
          sizeMb,
          verified: true
        });
      }
    }
  }

  allStreams.sort((a, b) => b.sizeMb - a.sizeMb);

  for (const hlsUrl of Array.from(rawHls)) {
    const head = await checkHead(hlsUrl);
    if (head.status === 200) {
      let resDesc = 'HLS Adaptativo Multi-Calidad (1080p/720p/480p/360p)';
      if (videoData && videoData.w && videoData.h) {
        resDesc = `HLS Master Playlist (${videoData.w}x${videoData.h} - Max ${videoData.w >= 3840 ? '4K' : videoData.w >= 1920 ? '1080p' : '720p'})`;
      }
      allStreams.push({
        type: 'm3u8',
        format: 'HLS (.m3u8)',
        quality: resDesc,
        url: hlsUrl,
        sizeMb: 0,
        verified: true
      });
    }
  }

  allStreams.push({
    type: 'embed',
    format: 'Embed Iframe (Rumble Web Player)',
    quality: 'Reproductor web oficial con controles de Rumble',
    url: embedUrl,
    sizeMb: 0,
    verified: true
  });

  // Prioridad AnimeZona:
  // 1. Si existe un MP4 .aaa directo verificado (> 30MB): Usar MP4 (.aaa.mp4)
  // 2. Si Rumble NO habilitó MP4 directo para este video (403): Usar HLS (.m3u8) oficial del video
  // 3. Si no hay HLS: Usar Embed
  let best = allStreams.find(s => s.type === 'mp4' && s.verified);
  if (!best) {
    best = allStreams.find(s => s.type === 'm3u8' && s.verified);
  }
  if (!best) {
    best = allStreams.find(s => s.type === 'embed');
  }

  const finalTitle = (videoData && videoData.title) || pageTitle || 'Video de Rumble';

  return {
    title: finalTitle,
    duration: videoData?.duration ? `${Math.floor(videoData.duration / 60)}m ${videoData.duration % 60}s` : 'N/A',
    resolution: (videoData && videoData.w && videoData.h) ? `${videoData.w}x${videoData.h}` : 'N/A',
    embedUrl,
    bestStream: best,
    allStreams
  };
}

const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || '372574501f2196723577821c44adb688';

function searchTmdb(title) {
  return new Promise((resolve) => {
    try {
      const yearMatch = title.match(/\b(19\d\d|20\d\d)\b/);
      const yearParam = yearMatch ? `&year=${yearMatch[1]}` : '';
      const cleanTitle = title.replace(/\b(19\d\d|20\d\d)\b/g, '').replace(/[-_()]/g, ' ').trim();
      const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}${yearParam}&language=es-MX&include_adult=false`;

      httpsGet(url).then(res => {
        if (res.status === 200) {
          try {
            const data = JSON.parse(res.body);
            if (data.results && data.results.length > 0) {
              const best = data.results.find(r => r.media_type === 'movie' || r.media_type === 'tv') || data.results[0];
              return resolve(best);
            }
          } catch (e) {}
        }
        // Intentar búsqueda en películas directa
        const movieUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}${yearParam}&language=es-MX`;
        httpsGet(movieUrl).then(mRes => {
          if (mRes.status === 200) {
            try {
              const mData = JSON.parse(mRes.body);
              return resolve(mData.results && mData.results.length > 0 ? mData.results[0] : null);
            } catch (e) {}
          }
          resolve(null);
        }).catch(() => resolve(null));
      }).catch(() => resolve(null));
    } catch (e) {
      resolve(null);
    }
  });
}

async function insertIntoSupabase(record, tmdbInfo = null) {
  const c = new Client(DB_CONN);
  await c.connect();

  // 1. Asegurar registro en custom_animes si tenemos ID TMDB
  if (record.anime_tmdb_id) {
    try {
      const checkAnime = await c.query(
        'SELECT id FROM custom_animes WHERE id = $1 OR LOWER(title) = LOWER($2) LIMIT 1',
        [String(record.anime_tmdb_id), record.search_title]
      );

      const poster = tmdbInfo?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbInfo.poster_path}` : '';
      const overview = tmdbInfo?.overview || '';
      const genres = tmdbInfo?.genre_ids ? JSON.stringify(tmdbInfo.genre_ids) : '[]';

      if (checkAnime.rows.length === 0) {
        await c.query(
          `INSERT INTO custom_animes (id, title, image, description, total_episodes, genres, status, is_secret)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [String(record.anime_tmdb_id), record.search_title, poster, overview, record.total_episodes || 1, genres, 'Finalizado', false]
        );
      }
    } catch (e) {
      // Ignorar si custom_animes falla para no detener guardado
    }
  }

  // 2. Insertar o actualizar en anime_episodes
  const res = await c.query(`
    INSERT INTO anime_episodes (search_title, episode_number, server_name, video_url, language, season_number, episode_name, anime_tmdb_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, search_title, server_name, video_url, episode_number, season_number
  `, [
    record.search_title,
    record.episode_number,
    record.server_name,
    record.video_url,
    record.language,
    record.season_number,
    record.episode_name,
    record.anime_tmdb_id
  ]);
  await c.end();
  return res.rows[0];
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  const argUrl = process.argv[2];

  console.log('================================================================');
  console.log('       🚀 CONVERTIDOR INTELIGENTE DE ENLACES DE RUMBLE 🚀       ');
  console.log('           (Soporte MP4 aaa.mp4 1080p / 4K + HLS m3u8)          ');
  console.log('================================================================');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let nextUrl = argUrl;

  try {
    while (true) {
      let targetUrl = nextUrl;
      nextUrl = null;

      if (!targetUrl) {
        targetUrl = await ask(rl, '\n👉 Pega el enlace de Rumble (URL pública, Embed, iframe o enlace directo Faa/aaa) [o "q" para salir]: ');
      }

      if (!targetUrl || !targetUrl.trim() || targetUrl.trim().toLowerCase() === 'q' || targetUrl.trim().toLowerCase() === 'salir') {
        console.log('\n👋 ¡Listo! Cerrando convertidor...');
        break;
      }

      try {
        const report = await inspectRumbleUrl(targetUrl.trim());

        console.log('\n----------------------------------------------------------------');
        console.log(`📌 TÍTULO DETECTADO : ${report.title}`);
        console.log(`⏱️ DURACIÓN        : ${report.duration}`);
        console.log(`📐 RESOLUCIÓN NATIVA: ${report.resolution}`);
        console.log('----------------------------------------------------------------');

        console.log('\n🎯 MEJOR ENLACE SELECCIONADO (Prioridad AnimeZona):');
        console.log(`   Tipo    : [${report.bestStream.type.toUpperCase()}] ${report.bestStream.format || ''}`);
        console.log(`   Calidad : ${report.bestStream.quality}`);
        console.log(`   URL     : ${report.bestStream.url}`);

        console.log('\n📋 TODOS LOS FORMATOS DISPONIBLES EN ESTE VIDEO:');
        report.allStreams.forEach((s, idx) => {
          console.log(`\n   ${idx + 1}. [${s.format || s.type.toUpperCase()}]`);
          console.log(`      • Calidad   : ${s.quality}`);
          console.log(`      • Estado    : ${s.verified ? '✅ Verificado y Accesible (CORS Abierto)' : '❌ No disponible en CDN (' + s.status + ')'}`);
          console.log(`      • Enlace    : ${s.url}`);
        });

        let selectedStream = report.bestStream;

        if (report.allStreams.length > 1) {
          console.log('\n----------------------------------------------------------------');
          const pickIdx = await ask(rl, `¿Deseas usar un formato diferente? [1-${report.allStreams.length}, default 1]: `);
          const chosen = parseInt(pickIdx.trim(), 10);
          if (!isNaN(chosen) && chosen >= 1 && chosen <= report.allStreams.length) {
            selectedStream = report.allStreams[chosen - 1];
            console.log(`👉 Formato seleccionado: [${selectedStream.format}] (${selectedStream.quality})`);
          }
        }

        console.log('\n----------------------------------------------------------------');
        console.log('📝 CONFIGURACIÓN PARA BASE DE DATOS (Presiona Enter para default)');
        console.log('----------------------------------------------------------------');

        const defTitle = report.title;
        const sTitle = (await ask(rl, `Título / Búsqueda [${defTitle}]: `)).trim() || defTitle;

        let tmdbInfo = null;
        let detectedTmdbId = '';
        try {
          process.stdout.write('🔍 Buscando metadatos en TMDB... ');
          tmdbInfo = await searchTmdb(sTitle);
          if (tmdbInfo) {
            detectedTmdbId = String(tmdbInfo.id);
            const mTitle = tmdbInfo.title || tmdbInfo.name || sTitle;
            const mYear = (tmdbInfo.release_date || tmdbInfo.first_air_date || '').substring(0, 4);
            console.log(`✅ [${mTitle}] (${mYear}) (ID: ${detectedTmdbId})`);
            if (tmdbInfo.poster_path) {
              console.log(`   🖼️  Póster Oficial: https://image.tmdb.org/t/p/w500${tmdbInfo.poster_path}`);
            }
          } else {
            console.log('⚪ (Sin coincidencia automática)');
          }
        } catch (e) {
          console.log('⚪');
        }

        const tmdbPrompt = detectedTmdbId ? `ID TMDB [${detectedTmdbId}]: ` : 'ID TMDB: ';
        const rawTmdbId = (await ask(rl, tmdbPrompt)).trim();
        const tmdbId = rawTmdbId || detectedTmdbId;

        // Si se ingresó o cambió el TMDB ID manualmente, obtener metadatos oficiales completos de TMDB
        if (tmdbId && (!tmdbInfo || String(tmdbInfo.id) !== String(tmdbId))) {
          try {
            const mRes = await httpsGet(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX`);
            if (mRes.status === 200) {
              tmdbInfo = JSON.parse(mRes.body);
            } else {
              const tvRes = await httpsGet(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX`);
              if (tvRes.status === 200) tmdbInfo = JSON.parse(tvRes.body);
            }
          } catch (e) {}
        }

        const epNum = parseInt((await ask(rl, `Número de Episodio [1]: `)).trim() || '1', 10);
        const seasonNum = parseInt((await ask(rl, `Temporada [1]: `)).trim() || '1', 10);
        const epName = (await ask(rl, `Nombre del Episodio [${sTitle}]: `)).trim() || sTitle;
        const rawLang = (await ask(rl, `Idioma [latino]: `)).trim() || 'latino';
        const lang = rawLang.toLowerCase().includes('sub') ? 'sub' : (rawLang.toLowerCase().includes('cast') ? 'castellano' : 'latino');

        const sql = `INSERT INTO anime_episodes (search_title, episode_number, server_name, video_url, language, season_number, episode_name, anime_tmdb_id) VALUES
('${sTitle}', ${epNum}, 'RUMBLE', '${selectedStream.url}', '${lang}', ${seasonNum}, '${epName}', '${tmdbId}');`;

        console.log('\n================================================================');
        console.log('💾 SQL GENERADO (Listo para copiar):');
        console.log('================================================================');
        console.log(sql);
        console.log('================================================================');

        const doInsert = (await ask(rl, '\n¿Deseas insertar este registro DIRECTAMENTE a Supabase ahora mismo? (S/N, Enter = S): ')).trim().toLowerCase();
        if (doInsert === '' || doInsert === 's' || doInsert === 'si' || doInsert === 'y') {
          console.log('⏳ Insertando en Supabase...');
          const inserted = await insertIntoSupabase({
            search_title: sTitle,
            episode_number: epNum,
            server_name: 'RUMBLE',
            video_url: selectedStream.url,
            language: lang,
            season_number: seasonNum,
            episode_name: epName,
            anime_tmdb_id: tmdbId || null
          }, tmdbInfo);
          console.log(`✅ ¡Insertado con éxito con ID ${inserted.id}!`);
        }
      } catch (err) {
        console.error('\n❌ ERROR procesando este video:', err.message);
      }

      console.log('\n================================================================');
      const again = (await ask(rl, '🔄 ¿Deseas convertir otro enlace de Rumble? (S/N, Enter = S): ')).trim().toLowerCase();
      if (again === 'n' || again === 'no') {
        console.log('\n👋 ¡Listo! Gracias por usar el convertidor de Rumble.');
        break;
      }
      console.log('----------------------------------------------------------------');
    }
  } finally {
    rl.close();
  }
}

main().catch(console.error);

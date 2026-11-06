import https from 'https';

// Cache en memoria para no saturar ok.ru en peticiones continuas de chunks
const metaCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      },
      timeout: 10000
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function getOkruMetadata(videoId) {
  const cached = metaCache.get(videoId);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.meta;
  }

  const html = await fetchHtml(`https://ok.ru/video/${videoId}`);
  const match = html.match(/data-options=["']({[^"']+})["']/i) ||
                html.match(/data-options=["'](&quot;[\s\S]*?&quot;)["']/i) ||
                html.match(/data-module=["']OKVideo["'][^>]*data-options=["']([^"']+)["']/i);

  if (!match) {
    throw new Error('No se encontraron opciones de video en OK.ru');
  }

  const raw = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const json = JSON.parse(raw);
  if (!json.flashvars || !json.flashvars.metadata) {
    throw new Error('No se encontró metadata en el reproductor de OK.ru');
  }

  const meta = typeof json.flashvars.metadata === 'string'
    ? JSON.parse(json.flashvars.metadata)
    : json.flashvars.metadata;

  metaCache.set(videoId, { meta, timestamp: Date.now() });
  return meta;
}

const QUALITY_PROFILES = {
  ultra: { name: '4K Ultra HD (2160p)', res: '3840x2160', bandwidth: 18000000 },
  quad:  { name: '2K Quad HD (1440p)',  res: '2560x1440', bandwidth: 9000000 },
  full:  { name: '1080p Full HD',       res: '1920x1080', bandwidth: 5000000 },
  hd:    { name: '720p HD',             res: '1280x720',  bandwidth: 2500000 },
  sd:    { name: '480p SD',             res: '854x480',   bandwidth: 1200000 },
  low:   { name: '360p',                res: '640x360',   bandwidth: 800000 },
  lowest:{ name: '240p',                res: '426x240',   bandwidth: 400000 }
};

export default async function handler(req, res) {
  // Polyfill de métodos Express/Vercel si se corre en entorno Node puro / Vite
  if (!res.status) {
    res.status = function(code) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = function(data) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
  }
  if (!res.send) {
    res.send = function(data) {
      if (typeof data === 'object') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      } else {
        res.end(data);
      }
      return res;
    };
  }

  // CORS universal para Roku, Smart TV, Web y Móvil
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || {};
  let videoId = query.id || '';
  if (!videoId && query.url) {
    const m = query.url.match(/video(?:embed)?\/(\d+)/i);
    if (m) videoId = m[1];
  }

  if (!videoId) {
    return res.status(400).json({
      error: 'Parámetro "id" o "url" de OK.ru requerido. Ejemplo: ?id=15147680467694'
    });
  }

  try {
    const meta = await getOkruMetadata(videoId);
    const videos = meta.videos || [];
    const qualityParam = (query.q || query.quality || '').toLowerCase();

    // -------------------------------------------------------------------------
    // MODO 1: PROXY DE STREAM DE VIDEO (Cuando el reproductor solicita una calidad)
    // -------------------------------------------------------------------------
    if (qualityParam) {
      const QUALITY_ORDER = ['ultra', 'quad', 'full', 'hd', 'sd', 'low', 'lowest'];
      const ALIAS_MAP = {
        '4k': 'ultra',
        '2160': 'ultra',
        '2160p': 'ultra',
        '2k': 'quad',
        '1440': 'quad',
        '1440p': 'quad',
        '1080': 'full',
        '1080p': 'full',
        'fhd': 'full',
        '720': 'hd',
        '720p': 'hd',
        '480': 'sd',
        '480p': 'sd',
        '360': 'low',
        '360p': 'low',
        '240': 'lowest',
        '240p': 'lowest',
        'max': 'ultra',
        'best': 'ultra',
        'auto': 'ultra'
      };

      const normalizedQ = ALIAS_MAP[qualityParam] || qualityParam;
      let targetVideo = videos.find(v => v.name.toLowerCase() === normalizedQ);

      // Si la calidad exacta no está en el video (ej: ultra en un video que solo tiene 1080p o 720p),
      // auto-degradar a la mejor calidad disponible hacia abajo para que NUNCA arroje 404
      if (!targetVideo) {
        const startIndex = QUALITY_ORDER.indexOf(normalizedQ);
        if (startIndex >= 0) {
          for (let i = startIndex; i < QUALITY_ORDER.length; i++) {
            const fallbackName = QUALITY_ORDER[i];
            const found = videos.find(v => v.name.toLowerCase() === fallbackName);
            if (found && found.url) {
              targetVideo = found;
              break;
            }
          }
        }
        // Fallback final: primer video disponible
        if (!targetVideo && videos.length > 0) {
          targetVideo = videos[0];
        }
      }

      if (!targetVideo || !targetVideo.url) {
        return res.status(404).json({ error: `Video no disponible en OK.ru para esta resolución.` });
      }

      // Redirección HTTP 302 directa por defecto (Crucial para Vercel Serverless:
      // evita timeouts de 10s, no consume ancho de banda de Vercel y permite a Roku y Web
      // reproducir a máxima velocidad directamente desde el CDN de OK.ru con soporte HTTP 206).
      // Solo se usa proxy si se especifica explícitamente proxy=1 o proxy=true.
      if (query.proxy !== '1' && query.proxy !== 'true') {
        res.writeHead(302, {
          'Location': targetVideo.url,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600'
        });
        return res.end();
      }

      // Proxy con streaming de rangos (Range HTTP 206) - Solo para casos específicos con proxy=1
      const u = new URL(targetVideo.url);
      const upstreamHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://ok.ru/'
      };

      if (req.headers.range) {
        upstreamHeaders['Range'] = req.headers.range;
      }

      const proxyReq = https.request({
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: req.method,
        headers: upstreamHeaders
      }, proxyRes => {
        const responseHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
          'Accept-Ranges': 'bytes',
          'Content-Type': proxyRes.headers['content-type'] || 'video/mp4'
        };

        if (proxyRes.headers['content-range']) {
          responseHeaders['Content-Range'] = proxyRes.headers['content-range'];
        }
        if (proxyRes.headers['content-length']) {
          responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
        }

        res.writeHead(proxyRes.statusCode || 200, responseHeaders);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', err => {
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al conectar con CDN de OK.ru', detail: err.message });
        }
      });

      req.on('close', () => {
        proxyReq.destroy();
      });

      proxyReq.end();
      return;
    }

    // -------------------------------------------------------------------------
    // MODO 2: JSON DE INFORMACIÓN (Si se pide ?format=json)
    // -------------------------------------------------------------------------
    if (query.format === 'json') {
      const headers = req.headers || {};
      const proto = headers['x-forwarded-proto'] || 'https';
      const host = headers['x-forwarded-host'] || headers.host || 'localhost';
      const baseUrl = `${proto}://${host}/api/okru?id=${videoId}`;

      return res.status(200).json({
        id: videoId,
        title: meta.movie?.title,
        duration: meta.movie?.duration,
        m3u8_playlist: `${baseUrl}&format=m3u8`,
        qualities: videos.map(v => {
          const prof = QUALITY_PROFILES[v.name] || { name: v.name, res: 'N/A' };
          return {
            quality: v.name,
            label: prof.name,
            resolution: prof.res,
            stream_url: `${baseUrl}&q=${v.name}`
          };
        })
      });
    }

    // -------------------------------------------------------------------------
    // MODO 3: MANIFIESTO MASTER HLS .M3U8 (Por defecto para Roku, TV y reproductores)
    // -------------------------------------------------------------------------
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}/api/okru?id=${videoId}`;

    // Ordenar de mayor a menor calidad (4k -> 2k -> 1080p -> 720p -> etc)
    const priority = ['ultra', 'quad', 'full', 'hd', 'sd', 'low', 'lowest'];
    const sortedVideos = [...videos].sort((a, b) => {
      const idxA = priority.indexOf(a.name);
      const idxB = priority.indexOf(b.name);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    let m3u8 = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
    for (const v of sortedVideos) {
      const prof = QUALITY_PROFILES[v.name] || {
        name: v.name.toUpperCase(),
        res: '1920x1080',
        bandwidth: 3000000
      };
      m3u8 += `#EXT-X-STREAM-INF:BANDWIDTH=${prof.bandwidth},RESOLUTION=${prof.res},NAME="${prof.name}"\n`;
      m3u8 += `${baseUrl}&q=${v.name}&.mp4\n\n`;
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${videoId}.m3u8"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(m3u8);

  } catch (error) {
    console.error('Error en api/okru:', error);
    return res.status(500).json({
      error: 'No se pudo procesar el video de OK.ru',
      detail: error.message
    });
  }
}

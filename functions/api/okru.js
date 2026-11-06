const QUALITY_PROFILES = {
  ultra: { name: '4K Ultra HD (2160p)', res: '3840x2160', bandwidth: 18000000 },
  quad:  { name: '2K Quad HD (1440p)',  res: '2560x1440', bandwidth: 9000000 },
  full:  { name: '1080p Full HD',       res: '1920x1080', bandwidth: 5000000 },
  hd:    { name: '720p HD',             res: '1280x720',  bandwidth: 2500000 },
  sd:    { name: '480p SD',             res: '854x480',   bandwidth: 1200000 },
  low:   { name: '360p',                res: '640x360',   bandwidth: 800000 },
  lowest:{ name: '240p',                res: '426x240',   bandwidth: 400000 }
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  const urlObj = new URL(request.url);
  let videoId = urlObj.searchParams.get('id') || '';
  const urlParam = urlObj.searchParams.get('url');
  const format = urlObj.searchParams.get('format');
  const qualityParam = (urlObj.searchParams.get('q') || urlObj.searchParams.get('quality') || '').toLowerCase();

  if (!videoId && urlParam) {
    const m = urlParam.match(/video(?:embed)?\/(\d+)/i);
    if (m) videoId = m[1];
  }

  if (!videoId) {
    return new Response(JSON.stringify({
      error: 'Parámetro "id" o "url" de OK.ru requerido. Ejemplo: ?id=15147680467694'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const okRes = await fetch(`https://ok.ru/video/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });

    if (!okRes.ok) {
      return new Response(JSON.stringify({ error: `OK.ru devolvió error HTTP ${okRes.status}` }), {
        status: okRes.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const html = await okRes.text();
    const match = html.match(/data-options=["']({[^"']+})["']/i) ||
                  html.match(/data-options=["'](&quot;[\s\S]*?&quot;)["']/i) ||
                  html.match(/data-module=["']OKVideo["'][^>]*data-options=["']([^"']+)["']/i);

    if (!match) {
      return new Response(JSON.stringify({ error: 'No se encontraron opciones de video en OK.ru' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const raw = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const json = JSON.parse(raw);
    if (!json.flashvars || !json.flashvars.metadata) {
      return new Response(JSON.stringify({ error: 'No se encontró metadata en el reproductor de OK.ru' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const meta = typeof json.flashvars.metadata === 'string'
      ? JSON.parse(json.flashvars.metadata)
      : json.flashvars.metadata;

    const videos = meta.videos || [];

    // MODO 1: REDIRECCIÓN A CALIDAD ESPECÍFICA
    if (qualityParam) {
      const QUALITY_ORDER = ['ultra', 'quad', 'full', 'hd', 'sd', 'low', 'lowest'];
      const ALIAS_MAP = {
        '4k': 'ultra', '2160': 'ultra', '2160p': 'ultra',
        '2k': 'quad', '1440': 'quad', '1440p': 'quad',
        '1080': 'full', '1080p': 'full', 'fhd': 'full',
        '720': 'hd', '720p': 'hd',
        '480': 'sd', '480p': 'sd',
        '360': 'low', '360p': 'low',
        '240': 'lowest', '240p': 'lowest',
        'max': 'ultra', 'best': 'ultra', 'auto': 'ultra'
      };

      const normalizedQ = ALIAS_MAP[qualityParam] || qualityParam;
      let targetVideo = videos.find(v => v.name.toLowerCase() === normalizedQ);

      if (!targetVideo) {
        const startIndex = QUALITY_ORDER.indexOf(normalizedQ);
        if (startIndex >= 0) {
          for (let i = startIndex; i < QUALITY_ORDER.length; i++) {
            const found = videos.find(v => v.name.toLowerCase() === QUALITY_ORDER[i]);
            if (found && found.url) { targetVideo = found; break; }
          }
        }
        if (!targetVideo && videos.length > 0) targetVideo = videos[0];
      }

      if (!targetVideo || !targetVideo.url) {
        return new Response(JSON.stringify({ error: 'Video no disponible en OK.ru para esta resolución' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      return Response.redirect(targetVideo.url, 302);
    }

    const origin = urlObj.origin;
    const baseUrl = `${origin}/api/okru?id=${videoId}`;

    // MODO 2: JSON DE INFORMACIÓN
    if (format === 'json') {
      return new Response(JSON.stringify({
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
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // MODO 3: MANIFIESTO MASTER HLS .M3U8
    const priority = ['ultra', 'quad', 'full', 'hd', 'sd', 'low', 'lowest'];
    const sortedVideos = [...videos].sort((a, b) => {
      const idxA = priority.indexOf(a.name);
      const idxB = priority.indexOf(b.name);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    let m3u8 = '#EXTM3U\n#EXT-X-VERSION:3\n';
    for (const v of sortedVideos) {
      const profile = QUALITY_PROFILES[v.name] || {
        name: v.name,
        res: '1280x720',
        bandwidth: 2500000
      };
      const streamUrl = `${baseUrl}&q=${v.name}`;
      m3u8 += `#EXT-X-STREAM-INF:BANDWIDTH=${profile.bandwidth},RESOLUTION=${profile.res},NAME="${profile.name}"\n`;
      m3u8 += `${streamUrl}\n`;
    }

    return new Response(m3u8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

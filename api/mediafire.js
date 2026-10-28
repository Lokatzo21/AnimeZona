import https from 'https';

function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function httpsRequest(urlStr, options = {}, bodyData = null) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const req = https.request({
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          ...options.headers
        },
        timeout: 10000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, data }));
      });
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.on('error', reject);
      if (bodyData) req.write(bodyData);
      req.end();
    } catch (e) { reject(e); }
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function extractFromPelisSeriesHoy(ttId) {
  const playerUrl = ttId.startsWith('http') ? ttId : `https://player.pelisserieshoy.com/f/${ttId}`;
  const resPlayer = await httpsRequest(playerUrl, { headers: { 'Referer': 'https://sololatino.net/' } });
  if (resPlayer.statusCode !== 200) throw new Error(`HTTP ${resPlayer.statusCode}`);
  const tok = resPlayer.data.match(/const\s+_t\s*=\s*['"]([a-f0-9]+)['"]/)[1];
  const qk = JSON.parse(resPlayer.data.match(/var\s+_qk\s*=\s*(\[[^\]]+\]);/)[1]);
  const qc = resPlayer.data.match(/var\s+_qc\s*=\s*['"]([^'"]+)['"]/)[1];
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
    }, postBody).then(r => JSON.parse(r.data));
  }

  await callS({ a: 'click', tok, ts: '1' });
  await sleep(400);
  const scan = await callS({ a: '1', tok });
  const playerPlus = (scan.s || []).find(item => item[0].includes('Player+') || item[0].includes('Principal') || item[0].includes('4') || item[0].includes('Mediafire'));
  if (!playerPlus) throw new Error('Servidor Mediafire no disponible en scan');

  await sleep(400);
  const resA2 = await callS({ a: '2', v: playerPlus[1], tok });
  const resRedirect = await httpsRequest('https://player.pelisserieshoy.com' + resA2.u, {
    headers: { 'Referer': playerUrl }
  });
  return resRedirect.headers['location'];
}

export default async function handler(req, res) {
  // Permitir CORS total para Roku, Web y apps externas
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id, file, url, tt, pelis, direct } = req.query;

  let targetPage = url;
  if (!targetPage && id) {
    if (id.startsWith('http')) {
      targetPage = id;
    } else {
      targetPage = `https://www.mediafire.com/file/${id}/${file || ''}${file ? '/file' : ''}`;
    }
  }

  if (!targetPage && !tt && !pelis && !direct) {
    return res.status(400).json({
      error: 'Parámetros requeridos: ?url=<mediafire_page_url> o ?tt=<imdb_code> o ?id=<key>'
    });
  }

  let directUrl = null;

  if (targetPage) {
    // Normalizar: limpiar sufijos de formato y convertir enlaces directos a página permanente
    targetPage = targetPage.replace(/[?&]\.mp4$/i, '').trim();
    const mfDirect = targetPage.match(/mediafire\.com\/[^\/]+\/([a-zA-Z0-9]+)\/([^\/?#]+)/);
    if (mfDirect && !targetPage.includes('/file/')) {
      targetPage = `https://www.mediafire.com/file/${mfDirect[1]}/${mfDirect[2]}/file`;
    }

    try {
      const response = await fetch(targetPage, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (response.ok) {
        const html = await response.text();
        const match = html.match(/aria-label=["']Download file["']\s+href=["']([^"']+)["']/i) ||
                      html.match(/id=["']downloadButton["']\s+href=["']([^"']+)["']/i) ||
                      html.match(/href=["'](https?:\/\/download[^"']+)["'][^>]*id=["']downloadButton["']/i) ||
                      html.match(/https?:\/\/download\d+\.mediafire\.com\/[^\s"']+/i);

        if (match) {
          directUrl = match[1] || match[0];
        }
      }
    } catch (e) {
      // Ignorar para intentar fallbacks
    }
  }

  // Fallback 1: Si Cloudflare bloqueó Mediafire pero tenemos tt o pelis
  const identifier = tt || pelis;
  if (!directUrl && identifier) {
    try {
      directUrl = await extractFromPelisSeriesHoy(identifier);
    } catch (errPelis) {
      console.warn('Fallback pelisserieshoy failed:', errPelis.message);
    }
  }

  // Fallback 2: direct url pasado como parámetro
  if (!directUrl && direct) {
    directUrl = direct;
  }

  if (!directUrl) {
    return res.status(404).json({
      error: 'No se pudo resolver el enlace de descarga de Mediafire ni por resolver directo ni por fallback.'
    });
  }

  // Agregar sufijo .mp4 para forzar a reproductores a reconocer el stream
  const streamUrl = directUrl.includes('?') ? `${directUrl}&.mp4` : `${directUrl}?.mp4`;

  // Si se pide en formato JSON (para depuración o clientes que leen JSON)
  if (req.query.format === 'json') {
    return res.status(200).json({
      success: true,
      stream_url: streamUrl,
      direct_url: directUrl
    });
  }

  // Redirección HTTP 302 directa para Roku y reproductores de video
  res.writeHead(302, {
    'Location': streamUrl,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end();
}

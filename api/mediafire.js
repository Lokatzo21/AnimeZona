export default async function handler(req, res) {
  // Permitir CORS total para Roku, Web y apps externas
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id, file, url } = req.query;

  // Soporta:
  // 1) ?id=iw0cc3hifbu5obd&file=e8lb11r58h.bin
  // 2) ?url=https://www.mediafire.com/file/iw0cc3hifbu5obd/e8lb11r58h.bin/file
  // 3) ?id=https://www.mediafire.com/file/...
  let targetPage = url;
  if (!targetPage && id) {
    if (id.startsWith('http')) {
      targetPage = id;
    } else {
      targetPage = `https://www.mediafire.com/file/${id}/${file || ''}${file ? '/file' : ''}`;
    }
  }

  if (!targetPage) {
    return res.status(400).json({
      error: 'Parámetros requeridos: ?id=<key>&file=<nombre.bin> o ?url=<mediafire_page_url>'
    });
  }

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

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Mediafire devolvió estado HTTP ${response.status}`
      });
    }

    const html = await response.text();

    // Extraer enlace fresco del botón azul de Mediafire
    const match = html.match(/aria-label=["']Download file["']\s+href=["']([^"']+)["']/i) ||
                  html.match(/id=["']downloadButton["']\s+href=["']([^"']+)["']/i) ||
                  html.match(/href=["'](https?:\/\/download[^"']+)["'][^>]*id=["']downloadButton["']/i) ||
                  html.match(/https?:\/\/download\d+\.mediafire\.com\/[^\s"']+/i);

    const directUrl = match ? (match[1] || match[0]) : null;

    if (!directUrl) {
      return res.status(404).json({
        error: 'No se pudo encontrar el enlace de descarga en la página de Mediafire.'
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

  } catch (error) {
    return res.status(500).json({
      error: 'Error del resolver de Mediafire: ' + error.message
    });
  }
}

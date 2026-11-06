export async function onRequest(context) {
  const { request } = context;

  // Manejo de preflight CORS
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
  const targetUrl = urlObj.searchParams.get('url');
  const id = urlObj.searchParams.get('id');
  const file = urlObj.searchParams.get('file');
  const format = urlObj.searchParams.get('format');

  let pageUrl = targetUrl;
  if (!pageUrl && id) {
    pageUrl = id.startsWith('http') ? id : `https://www.mediafire.com/file/${id}/${file || ''}${file ? '/file' : ''}`;
  }

  if (!pageUrl) {
    return new Response(JSON.stringify({ error: 'Parámetro ?url= requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Normalizar URL
  pageUrl = pageUrl.replace(/[?&]\.mp4$/i, '').trim();
  const mfDirect = pageUrl.match(/mediafire\.com\/[^\/]+\/([a-zA-Z0-9]+)\/([^\/?#]+)/);
  if (mfDirect && !pageUrl.includes('/file/')) {
    pageUrl = `https://www.mediafire.com/file/${mfDirect[1]}/${mfDirect[2]}/file`;
  }

  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  };

  const keyMatch = pageUrl.match(/mediafire\.com\/(?:file|download)\/([a-zA-Z0-9]+)/);
  const qk = keyMatch ? keyMatch[1] : null;

  const candidateUrls = [pageUrl];
  if (qk) {
    candidateUrls.push(`https://www.mediafire.com/download/${qk}`);
    candidateUrls.push(`https://www.mediafire.com/file/${qk}/file`);
  }

  let directUrl = null;
  let lastStatus = 0;

  for (const candUrl of candidateUrls) {
    try {
      const res = await fetch(candUrl, {
        headers: browserHeaders,
        redirect: 'follow'
      });
      lastStatus = res.status;
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/aria-label=["']Download file["']\s+href=["']([^"']+)["']/i) ||
                      html.match(/id=["']downloadButton["']\s+href=["']([^"']+)["']/i) ||
                      html.match(/href=["'](https?:\/\/download[^"']+)["'][^>]*id=["']downloadButton["']/i) ||
                      html.match(/https?:\/\/download\d+\.mediafire\.com\/[^\s"']+/i);
        if (match) {
          directUrl = match[1] || match[0];
          break;
        }
      }
    } catch (e) {
      // Intentar siguiente candidato
    }
  }

  if (!directUrl) {
    return new Response(JSON.stringify({
      error: `No se pudo extraer stream directo de Mediafire (HTTP ${lastStatus}). Usa el botón de descarga directa.`
    }), {
      status: lastStatus || 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
    const streamUrl = directUrl.includes('?') ? `${directUrl}&.mp4` : `${directUrl}?.mp4`;

    if (format === 'json') {
      return new Response(JSON.stringify({
        success: true,
        stream_url: streamUrl,
        direct_url: directUrl
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=1800'
        }
      });
    }

    return Response.redirect(streamUrl, 302);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

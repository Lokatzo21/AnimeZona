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

  try {
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Mediafire devolvió estado ${res.status}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const html = await res.text();
    const match = html.match(/aria-label=["']Download file["']\s+href=["']([^"']+)["']/i) ||
                  html.match(/id=["']downloadButton["']\s+href=["']([^"']+)["']/i) ||
                  html.match(/href=["'](https?:\/\/download[^"']+)["'][^>]*id=["']downloadButton["']/i) ||
                  html.match(/https?:\/\/download\d+\.mediafire\.com\/[^\s"']+/i);

    if (!match) {
      return new Response(JSON.stringify({ error: 'No se pudo encontrar el enlace de descarga directa en Mediafire' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const directUrl = match[1] || match[0];
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

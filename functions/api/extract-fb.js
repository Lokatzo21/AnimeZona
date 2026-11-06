export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }

  const urlObj = new URL(request.url);
  const fbUrl = urlObj.searchParams.get('url');

  if (!fbUrl) {
    return new Response(JSON.stringify({ error: 'Falta la URL de Facebook' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const response = await fetch(fbUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'
      }
    });

    const html = await response.text();
    let videoUrl = null;

    const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/);
    if (hdMatch && hdMatch[1]) {
      videoUrl = hdMatch[1].replace(/\\\\/g, '\\').replace(/\\u0025/g, '%').replace(/\\/g, ''); 
    }

    if (!videoUrl) {
      const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/);
      if (sdMatch && sdMatch[1]) {
        videoUrl = sdMatch[1].replace(/\\\\/g, '\\').replace(/\\u0025/g, '%').replace(/\\/g, '');
      }
    }

    if (videoUrl) {
      return new Response(JSON.stringify({ success: true, mp4_url: videoUrl }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'No se pudo encontrar el enlace MP4 en Facebook' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

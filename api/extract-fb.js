export default async function handler(req, res) {
  // Configurar CORS para permitir que el frontend se comunique con esta API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Falta la URL de Facebook' });
  }

  try {
    // Simulamos un navegador real para que Facebook no nos bloquee
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'
      }
    });

    const html = await response.text();

    // Facebook guarda los videos directos (mp4) en el HTML dentro de variables como browser_native_hd_url o browser_native_sd_url.
    // Buscamos ambas calidades (HD y SD).
    
    let videoUrl = null;

    // Intento 1: browser_native_hd_url (HD)
    const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/);
    if (hdMatch && hdMatch[1]) {
      videoUrl = hdMatch[1].replace(/\\\\/g, '\\').replace(/\\u0025/g, '%').replace(/\\/g, ''); 
    }

    // Intento 2: browser_native_sd_url (SD) - si no hay HD
    if (!videoUrl) {
      const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/);
      if (sdMatch && sdMatch[1]) {
        videoUrl = sdMatch[1].replace(/\\\\/g, '\\').replace(/\\u0025/g, '%').replace(/\\/g, '');
      }
    }

    if (videoUrl) {
      return res.status(200).json({ success: true, mp4_url: videoUrl });
    } else {
      return res.status(404).json({ success: false, error: 'No se pudo encontrar el enlace MP4 en la p\u00e1gina de Facebook.' });
    }

  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error del servidor al intentar extraer el video.' });
  }
}

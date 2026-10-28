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

export default async function handler(req, res) {
  const playerUrl = 'https://player.pelisserieshoy.com/f/tt33539520-1x01';
  try {
    const resPlayer = await httpsRequest(playerUrl, { headers: { 'Referer': 'https://sololatino.net/' } });
    const tokMatch = resPlayer.data && resPlayer.data.match(/const\s+_t\s*=\s*['"]([a-f0-9]+)['"]/);
    const qkMatch = resPlayer.data && resPlayer.data.match(/var\s+_qk\s*=\s*(\[[^\]]+\]);/);
    const qcMatch = resPlayer.data && resPlayer.data.match(/var\s+_qc\s*=\s*['"]([^'"]+)['"]/);

    if (!tokMatch || !qkMatch || !qcMatch) {
      return res.status(200).json({ step: 'tokens', ok: false, status: resPlayer.statusCode, len: resPlayer.data?.length });
    }

    const tok = tokMatch[1];
    const qk = JSON.parse(qkMatch[1]);
    const qc = qcMatch[1];
    const qv = qk[1] + qk[3] + qk[0] + qk[2];
    const qt = fnv1a(qv + '|clk|' + qc);

    const postBody = new URLSearchParams({ a: 'click', tok, ts: '1', rt: qv, tk: qt }).toString();
    const resS = await httpsRequest('https://player.pelisserieshoy.com/s.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': playerUrl,
        'Origin': 'https://player.pelisserieshoy.com'
      }
    }, postBody);

    return res.status(200).json({
      step: 's.php',
      status: resS.statusCode,
      data: resS.data
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

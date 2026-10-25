export default async function handler(req, res) {
  try {
    const r = await fetch('https://player.pelisserieshoy.com/f/tt9288030-1x01', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://sololatino.net/'
      }
    });
    const text = await r.text();
    return res.status(200).json({
      status: r.status,
      length: text.length,
      hasTok: text.includes('_t')
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  try {
    const pageRes = await fetch('https://sololatino.net/serie/lucky-2026/temporada-1/episodio-7', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    const html = await pageRes.text();
    const tokenMatch = html.match(/class=["'][^"']*server-btn[^"']*["'][^>]*data-player-token=["']([^"']+)["']/i);
    return res.status(200).json({
      status: pageRes.status,
      tokenFound: Boolean(tokenMatch),
      tokenSnippet: tokenMatch ? tokenMatch[1].slice(0, 15) : null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

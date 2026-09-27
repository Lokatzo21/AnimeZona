const puppeteer = require('puppeteer');

(async () => {
    console.log('Iniciando prueba con AnimeDBS...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('Navegando a la página principal...');
    await page.goto('https://www.animedbs.online', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Get episode list
    const eps = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const verLinks = links.filter(a => a.href.includes('/episodios/') || a.href.includes('-episodio-') || a.href.includes('/ver/'));
        return verLinks.map(a => a.href).slice(0, 3);
    });

    console.log('Episodios encontrados:', eps);

    if (eps.length > 0) {
        await page.goto(eps[0], { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 2000));
        
        const content = await page.evaluate(() => {
            const list = Array.from(document.querySelectorAll('li'));
            const servers = list.map(e => e.innerText).filter(t => t && t.length < 20);
            const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerHTML).filter(s => s.includes('video') || s.includes('server') || s.includes('iframe'));
            return { servers, scripts_count: scripts.length };
        });
        console.log('Posibles servidores (etiquetas li):', content.servers);
        console.log('Scripts encontrados:', content.scripts_count);
    }

    await browser.close();
})();

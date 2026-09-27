const puppeteer = require('puppeteer-core');

(async () => {
    console.log('Iniciando prueba con AnimeDBS...');
    let browser;
    try {
        browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
        console.log('Conectado a Chrome local.');
    } catch(e) {
        console.log('Error conectando a Chrome:', e.message);
        return;
    }
    const page = await browser.newPage();
    
    console.log('Navegando a la página principal...');
    await page.goto('https://www.animedbs.online', { waitUntil: 'domcontentloaded' });
    
    // Get episode list
    const eps = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const verLinks = links.filter(a => a.href.includes('/ver/'));
        return verLinks.map(a => a.href).slice(0, 3);
    });

    console.log('Episodios encontrados:', eps);

    if (eps.length > 0) {
        await page.goto(eps[0], { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 2000));
        
        const servers = await page.evaluate(() => {
            const list = Array.from(document.querySelectorAll('li, button, .server, a'));
            return list.map(e => e.innerText).filter(t => t && t.length < 20);
        });
        console.log('Posibles servidores:', servers);
    }

    await page.close();
    browser.disconnect();
})();

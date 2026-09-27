const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    console.log('Iniciando prueba con AnimeDBS...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    console.log('Navegando a la página principal...');
    await page.goto('https://www.animedbs.online', { waitUntil: 'domcontentloaded' });
    
    const episodeLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const verLinks = links.filter(a => a.href.includes('/ver/'));
        return verLinks.length > 0 ? verLinks[0].href : null;
    });

    if (!episodeLink) {
        console.log('No se pudo encontrar un enlace a un episodio.');
        const title = await page.title();
        console.log('Titulo:', title);
        await browser.close();
        return;
    }

    console.log('Episodio:', episodeLink);
    await page.goto(episodeLink, { waitUntil: 'domcontentloaded' });
    
    // Esperar un momento
    await new Promise(r => setTimeout(r, 3000));

    const data = await page.evaluate(() => {
        const frames = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerHTML).filter(s => s.includes('video') || s.includes('server'));
        return { frames, scripts_length: scripts.length };
    });

    console.log('Frames:', data.frames);
    console.log('Scripts:', data.scripts_length);

    await browser.close();
})();

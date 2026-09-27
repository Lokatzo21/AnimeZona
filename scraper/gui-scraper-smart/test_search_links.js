const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function testSearch() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log("Navegando a ZonaAPS...");
    await page.goto('https://zonaaps.com/?s=Kimetsu+no+Yaiba', { waitUntil: 'networkidle2' });
    
    const results = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map(a => ({
            text: a.textContent.trim(),
            href: a.href
        })).filter(l => l.href.includes('/anime/') || l.href.includes('/tv/'));
    });

    console.log("Resultados en ZonaAPS:", results.slice(0, 5));

    console.log("Navegando a AnimeOnline...");
    await page.goto('https://animeonline.ninja/?s=Kimetsu+no+Yaiba', { waitUntil: 'networkidle2' });
    
    const results2 = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map(a => ({
            text: a.textContent.trim(),
            href: a.href
        })).filter(l => l.href.includes('/anime/') || l.href.includes('/tv/'));
    });

    console.log("Resultados en AnimeOnline:", results2.slice(0, 5));

    await browser.close();
}

testSearch();

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

async function debugSearch() {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    
    console.log("Buscando en ZonaAPS...");
    await page.goto('https://zonaaps.com/?s=Kimetsu+no+Yaiba', { waitUntil: 'networkidle2' });
    // Wait for cloudflare manually
    await new Promise(r => setTimeout(r, 6000));

    const html1 = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map(a => a.outerHTML).join('\n');
    });
    fs.writeFileSync('debug_zonaaps.html', html1);

    console.log("Buscando en AnimeOnline...");
    await page.goto('https://animeonline.ninja/?s=Kimetsu+no+Yaiba', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));

    const html2 = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.map(a => a.outerHTML).join('\n');
    });
    fs.writeFileSync('debug_animeonline.html', html2);

    await browser.close();
    console.log("Done");
}

debugSearch();

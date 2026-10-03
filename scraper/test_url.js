const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://dondever.net/episodes/mr-robot-1x1/', { waitUntil: 'networkidle2' });
    console.log('Initial URL:', page.url());
    
    await page.evaluate(() => {
        const btn = document.querySelector('.play-box') || document.querySelector('.nt-stage');
        if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    const hasNext = await page.evaluate(() => {
        const sig = document.querySelector('.nt-ctl--sig');
        if (sig) {
            sig.click();
            return true;
        }
        return false;
    });
    
    console.log('Clicked next?', hasNext);
    await new Promise(r => setTimeout(r, 3000));
    console.log('URL after next:', page.url());
    
    await browser.close();
})();

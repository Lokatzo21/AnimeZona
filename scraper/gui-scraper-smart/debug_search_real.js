const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');

async function debugSearch() {
    let executablePath = null;
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of chromePaths) {
        if (fs.existsSync(p)) { executablePath = p; break; }
    }
    const extensionPath = path.join(__dirname, '..', 'ublock', 'uBlock0.chromium');

    const browser = await puppeteer.launch({ 
        headless: false,
        executablePath: executablePath,
        userDataDir: path.join(__dirname, 'chrome_profile_worker'),
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--start-maximized', 
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    
    const page = await browser.newPage();
    
    console.log("Buscando en AnimeOnline...");
    await page.goto('https://animeonline.ninja/?s=Kimetsu+no+Yaiba', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: 'animeonline.png' });
    console.log("Screenshot guardada");
    await browser.close();
}

debugSearch();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Proveedores
const AnimeOnlineProvider = require('./providers/AnimeOnline');
const ZonaAPSProvider = require('./providers/ZonaAPS');

class ScraperManager {
  constructor() {
    this.browser = null;
    this.client = null;
  }

  async initDatabase() {
    if (!this.client) {
      global.logToUI('Conectando a la base de datos Supabase...', 'info');
      this.client = new Client({
        connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
      });
      await this.client.connect();
      global.logToUI('✅ Conectado a Supabase', 'success');
    }
  }

  async initBrowser() {
    if (this.browser && !this.browser.isConnected()) {
      this.browser = null; // El usuario cerró Chrome manualmente
    }

    if (!this.browser) {
      global.logToUI('Iniciando navegador (Edge/Chrome)...', 'info');
      
      let executablePath = null;
      const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
      ];
      for (const p of chromePaths) {
        if (fs.existsSync(p)) {
          executablePath = p;
          break;
        }
      }

      this.browser = await puppeteer.launch({ 
        headless: false,
        executablePath: executablePath,
        userDataDir: path.join(__dirname, '..', 'chrome_profile'),
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
          '--start-maximized', 
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars'
        ]
      });
      global.logToUI('✅ Navegador iniciado correctamente', 'success');
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  getProvider(url, providerKey) {
    if (providerKey === 'animeonline' || url.includes('animeonline.ninja')) {
      return new AnimeOnlineProvider(this.browser, this.client);
    }
    if (providerKey === 'zonaaps' || url.includes('zonaaps.com')) {
      return new ZonaAPSProvider(this.browser, this.client);
    }
    throw new Error('Proveedor no soportado o no detectado.');
  }

  async startScrape({ url, title, startEpisode, provider }) {
    await this.initDatabase();
    await this.initBrowser();

    const scraper = this.getProvider(url, provider);
    
    global.logToUI(`Usando módulo: ${scraper.name}`, 'info');
    
    try {
      await scraper.scrape(url, title, parseInt(startEpisode, 10) || 1);
    } catch (e) {
      global.logToUI(`Error en el proceso de scraping: ${e.message}`, 'error');
      throw e; // Propagar error para que el server.js lo atrape
    }
  }

  async startScrapeSingle({ url, title, episode, provider }) {
    await this.initDatabase();
    await this.initBrowser();

    const scraper = this.getProvider(url, provider);
    
    global.logToUI(`Usando módulo: ${scraper.name}`, 'info');
    
    try {
      if (!scraper.scrapeSingle) {
        throw new Error(`El proveedor ${scraper.name} no soporta scraping individual todavía.`);
      }
      await scraper.scrapeSingle(url, title, parseInt(episode, 10) || 1);
    } catch (e) {
      global.logToUI(`Error en el proceso de scraping individual: ${e.message}`, 'error');
      throw e; // Propagar error para que el server.js lo atrape
    }
  }
}

// Exportamos un singleton
module.exports = new ScraperManager();

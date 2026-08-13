class BaseProvider {
  constructor(browser, client) {
    this.browser = browser;
    this.client = client;
    this.name = 'Base Provider';
  }

  log(message, type = 'info') {
    if (global.logToUI) {
      global.logToUI(`[${this.name}] ${message}`, type);
    } else {
      console.log(`[${this.name}] ${message}`);
    }
  }

  async scrape(url, title, startEpisode) {
    throw new Error('El método scrape() debe ser implementado por el proveedor específico.');
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BaseProvider;

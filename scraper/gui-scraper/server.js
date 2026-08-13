const express = require('express');
const cors = require('cors');
const path = require('path');
const ScraperManager = require('./src/ScraperManager');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Almacenar clientes SSE conectados
let clients = [];

// Función global de logging para enviar a los clientes SSE
global.logToUI = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = { timestamp, message, type };
  
  // Imprimir en consola también
  if (type === 'error') console.error(`[${timestamp}] ${message}`);
  else console.log(`[${timestamp}] ${message}`);

  // Enviar a todos los clientes conectados
  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  });
};

// Endpoint SSE
app.get('/api/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Enviar headers inmediatamente

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
  });
});

// Endpoint para iniciar el scraping
app.post('/api/scrape', async (req, res) => {
  const { url, title, startEpisode, provider } = req.body;
  
  if (!url || !title) {
    return res.status(400).json({ error: 'Faltan campos requeridos (url, title)' });
  }

  // Responder rápido que la tarea ha comenzado
  res.json({ message: 'Scraping iniciado', status: 'running' });

  try {
    global.logToUI(`Iniciando tarea para: ${title}`, 'success');
    await ScraperManager.startScrape({ url, title, startEpisode, provider });
    global.logToUI(`🎉 Proceso completado para: ${title}`, 'success');
  } catch (error) {
    global.logToUI(`❌ Error crítico: ${error.message}`, 'error');
  }
});

// Endpoint para cerrar el navegador si es necesario
app.post('/api/stop', async (req, res) => {
  try {
    await ScraperManager.closeBrowser();
    global.logToUI(`Navegador cerrado.`, 'info');
    res.json({ message: 'Navegador cerrado' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n===========================================`);
  console.log(`🤖 Scraper GUI Server corriendo en http://localhost:${PORT}`);
  console.log(`===========================================\n`);
});

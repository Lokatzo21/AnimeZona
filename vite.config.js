import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mediafireHandler from './api/mediafire.js'
import okruHandler from './api/okru.js'

function decorateResponse(res) {
  if (!res.status) {
    res.status = function(code) {
      res.statusCode = code;
      return res;
    };
  }
  if (!res.json) {
    res.json = function(data) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
  }
  if (!res.send) {
    res.send = function(data) {
      if (typeof data === 'object') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      } else {
        res.end(data);
      }
      return res;
    };
  }
  return res;
}

function localApiPlugin() {
  return {
    name: 'local-api-handler',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlObj = new URL(req.url, 'http://localhost');
        req.query = Object.fromEntries(urlObj.searchParams.entries());
        decorateResponse(res);

        // 1. Mediafire Local Resolver (0 dependencia de Vercel)
        if (urlObj.pathname.startsWith('/api/mediafire')) {
          try {
            await mediafireHandler(req, res);
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        // 2. OKRU Local Resolver (0 dependencia de Vercel)
        if (urlObj.pathname.startsWith('/api/okru')) {
          try {
            await okruHandler(req, res);
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        // 3. Facebook Extractor Local
        if (urlObj.pathname.startsWith('/api/extract-fb')) {
          const fbUrl = urlObj.searchParams.get('url');
          if (!fbUrl) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Falta url' }));
          }
          try {
            const response = await fetch(fbUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'
              }
            });
            const html = await response.text();
            let qualities = {};
            const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/);
            if (hdMatch && hdMatch[1]) qualities['720p'] = hdMatch[1].replace(/\\\\/g, '\\').replace(/\\u0025/g, '%').replace(/\\/g, ''); 
            
            const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/);
            if (sdMatch && sdMatch[1]) qualities['360p'] = sdMatch[1].replace(/\\\\/g, '\\').replace(/\\u0025/g, '%').replace(/\\/g, '');
            
            res.setHeader('Content-Type', 'application/json');
            if (Object.keys(qualities).length > 0) {
              const defaultUrl = qualities['720p'] || qualities['360p'];
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, mp4_url: defaultUrl, qualities: qualities }));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ success: false, error: 'No video' }));
            }
          } catch(e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.toString() }));
          }
          return;
        }

        next();
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiPlugin()],
  server: {
    watch: {
      ignored: ['**/scraper/**']
    }
  },
  optimizeDeps: {
    exclude: ['scraper']
  },
  build: {
    rollupOptions: {
      external: [/\/scraper\/.*/]
    }
  }
})


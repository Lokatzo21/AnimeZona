import { onRequest as mediafireHandler } from './api/mediafire.js';
import { onRequest as okruHandler } from './api/okru.js';
import { onRequest as extractFbHandler } from './api/extract-fb.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. API Mediafire Resolver
    if (url.pathname.startsWith('/api/mediafire')) {
      return mediafireHandler({ request, env, ctx });
    }

    // 2. API OKRU Resolver & HLS Streamer
    if (url.pathname.startsWith('/api/okru')) {
      return okruHandler({ request, env, ctx });
    }

    // 3. API Facebook Extractor
    if (url.pathname.startsWith('/api/extract-fb')) {
      return extractFbHandler({ request, env, ctx });
    }

    // 4. Todo lo demás: Servir archivos estáticos del frontend (dist/) con soporte SPA
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  }
};

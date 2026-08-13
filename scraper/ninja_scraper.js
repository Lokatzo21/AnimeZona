const readline = require('readline');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { Client } = require('pg');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runScraper() {
  console.log("\n=============================================");
  console.log("   🤖 NINJA SCRAPER - MODO TEMPORADAS MASIVAS");
  console.log("=============================================\n");

  const targetUrl = await question("1. Pega la URL de la SERIE en animeonline.ninja:\n> ");
  if (!targetUrl) return rl.close();

  console.log("\n⚠️ Asegúrate de escribir el nombre EXACTAMENTE como quieres que se guarde en tu base de datos.");
  const animeTitle = await question("2. Escribe el Nombre del Anime (Ej: Tsue to Tsurugi no Wistoria):\n> ");
  if (!animeTitle) return rl.close();

  const startEpisodeStr = await question("3. ¿Con qué número de episodio quieres empezar? (Normalmente 1):\n> ");
  let currentEpisodeNumber = parseInt(startEpisodeStr, 10) || 1;

  console.log(`\n[🤖] Iniciando extracción masiva para: '${animeTitle}'...`);
  rl.close();
  
  const fs = require('fs');
  const path = require('path');
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

  // Conectar a Supabase primero para ver qué episodios ya existen
  console.log(`[🤖] Conectando a Supabase para verificar episodios existentes...`);
  const client = new Client({
    connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
  });
  await client.connect();
  
  const { rows } = await client.query(`SELECT episode_number FROM anime_episodes WHERE search_title = $1`, [animeTitle.toLowerCase()]);
  const existingEpisodes = new Set(rows.map(r => r.episode_number));
  console.log(`[✅] Se encontraron ${existingEpisodes.size} episodios de este anime en la Base de Datos.`);

  const browser = await puppeteer.launch({ 
    headless: false,
    executablePath: executablePath,
    userDataDir: path.join(__dirname, 'chrome_profile'),
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--start-maximized', 
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars'
    ]
  });
  
  let targetPage = await browser.newPage();
  
  try {
    // FASE 1: Recolectar Links de la Serie
    console.log(`\n[🤖] Navegando a la página de la serie...`);
    try {
      await targetPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (err) {
      console.log(`[⚠️] Advertencia de navegación: ${err.message}.`);
    }
    
    console.log(`[🤖] Esperando a que pases Cloudflare si es necesario...`);
    
    let isSeriesPageLoaded = false;
    for (let i = 0; i < 60; i++) {
      const pages = await browser.pages();
      for (const p of pages) {
        try {
          if (p.url().includes('animeonline.ninja/online') || p.url().includes('animeonline.ninja/tv') || p.url().includes('animeonline.ninja/')) {
            targetPage = p;
            isSeriesPageLoaded = true;
            break;
          }
        } catch (e) {}
      }
      if (isSeriesPageLoaded) break;
      await new Promise(r => setTimeout(r, 2000));
    }

    if (!isSeriesPageLoaded) {
       console.log(`[❌] No se pudo cargar la página principal de la serie. Terminando.`);
       return;
    }

    await targetPage.bringToFront();
    console.log(`[🤖] Extrayendo todos los enlaces de episodios...`);
    
    // Extraer un fragmento del nombre de la URL para filtrar otros animes (ej: tsue-to-tsurugi)
    const urlParts = targetUrl.split('/online/')[1] || targetUrl.split('/tv/')[1];
    let baseSlug = "";
    if (urlParts) {
       const fullSlug = urlParts.split('/')[0].split('?')[0]; 
       // Ignorar partes puramente numéricas como fechas (-081124)
       const slugParts = fullSlug.split('-').filter(part => isNaN(part)); 
       baseSlug = slugParts.slice(0, 2).join('-'); // Tomar hasta 2 palabras base
    }

    // Extraer todos los links que contengan '/episodio/' y pertenezcan a este anime
    let episodeLinks = await targetPage.evaluate((base) => {
       // Restringir la búsqueda al contenedor de temporadas (ignora la barra lateral de "Recientes")
       let container = document.querySelector('#seasons') || document.querySelector('.seasons') || document.querySelector('ul.episodios') || document.querySelector('.seasons-episodios');
       if (!container) container = document; // Fallback

       const anchors = Array.from(container.querySelectorAll('a'));
       let eps = anchors
          .filter(a => a.href.includes('/episodio/'))
          .map(a => {
             // Subir al elemento lista para capturar todo el texto de la fila (incluyendo '1 - 0.1 OVA')
             const row = a.closest('li') || a;
             return {
                url: a.href,
                text: row.innerText.toLowerCase()
             };
          });
       
       // Filtrar estrictamente por el nombre del anime
       if (base) {
           eps = eps.filter(ep => ep.url.includes(base));
       }
       
       // Eliminar duplicados por URL
       const uniqueEps = [];
       const seenUrls = new Set();
       for (const ep of eps) {
           if (!seenUrls.has(ep.url)) {
               seenUrls.add(ep.url);
               uniqueEps.push(ep);
           }
       }

       // ORDENAR: Poner OVAs y Especiales al final de la lista
       uniqueEps.sort((a, b) => {
           const isOvaA = a.text.includes('ova') || a.url.includes('ova') || a.text.includes('- 0.');
           const isOvaB = b.text.includes('ova') || b.url.includes('ova') || b.text.includes('- 0.');
           
           if (isOvaA && !isOvaB) return 1;  // Mover A al final
           if (!isOvaA && isOvaB) return -1; // Mover B al final
           return 0;
       });

       return uniqueEps.map(ep => ep.url);
    }, baseSlug);
    
    // Invertir el orden si es necesario, usualmente en AnimeOnline están ordenados cronológicamente
    // Si la web los pone del más nuevo al más viejo, entonces tendríamos que hacer episodeLinks.reverse();
    // Por lo que vimos en la captura, están de arriba abajo (1, 2, 3...)

    if (episodeLinks.length === 0) {
        console.log(`[❌] No se encontraron episodios en esta página.`);
        return;
    }

    console.log(`[✅] ¡Se encontraron ${episodeLinks.length} episodios en total en la página!`);

    // FASE 2: Procesar cada episodio
    for (let i = 0; i < episodeLinks.length; i++) {
        const epUrl = episodeLinks[i];
        
        // Comprobar si ya existe en la DB
        if (existingEpisodes.has(currentEpisodeNumber)) {
            console.log(`\n[⏭️] Saltando Episodio ${currentEpisodeNumber} (Ya existe en la Base de Datos).`);
            currentEpisodeNumber++;
            continue;
        }

        console.log(`\n===========================================`);
        console.log(`[▶️] PROCESANDO EPISODIO ${currentEpisodeNumber} DE ${episodeLinks.length}`);
        console.log(`[🔗] URL: ${epUrl}`);
        
        // Simular comportamiento humano: Pausa aleatoria antes de cambiar de página (2 a 4 segundos)
        const delay = Math.floor(Math.random() * 2000) + 2000;
        console.log(`[🤖] Pausa de ${delay}ms para simular un humano...`);
        await new Promise(r => setTimeout(r, delay));
        
        // Capturar la URL actual para usarla como referer
        const currentUrl = targetPage.url();
        
        try {
          // El 'referer' es VITAL. Le dice a Cloudflare que llegamos aquí dando clic desde la página anterior.
          // Si no tiene referer, Cloudflare cree que somos un bot pegando URLs directamente.
          await targetPage.goto(epUrl, { referer: currentUrl, waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch(e) {}

        // Esperar a que estemos en la página del episodio (por si salta cloudflare)
        let isOnEpPage = false;
        for (let j = 0; j < 30; j++) {
           const pages = await browser.pages();
           for (const p of pages) {
             try {
               if (p.url().includes('/episodio/')) {
                 targetPage = p;
                 isOnEpPage = true;
                 break;
               }
             } catch(e) {}
           }
           if (isOnEpPage) break;
           await new Promise(r => setTimeout(r, 2000));
        }

        if (!isOnEpPage) {
            console.log(`[⚠️] No se pudo cargar el episodio ${currentEpisodeNumber}. Saltando...`);
            currentEpisodeNumber++;
            continue;
        }
        
        await targetPage.bringToFront();
        console.log(`[🤖] Esperando 5 segundos para que cargue la interfaz visual...`);
        await new Promise(r => setTimeout(r, 5000));

        // Buscar reproductor
        let playerFrame = null;
        for (const frame of targetPage.frames()) {
          if (frame.url().includes('saidochesto.top')) {
            playerFrame = frame;
            break;
          }
        }

        if (!playerFrame) {
          playerFrame = targetPage.mainFrame(); 
        }

        // Clic Bandera (Buscar Latino, si no, Subtitulado)
        const languageResult = await playerFrame.evaluate(() => {
          const lis = Array.from(document.querySelectorAll('li'));
          
          // Buscar Latino: por onclick o por texto visible o por imagen
          const latLi = lis.find(li => {
             const onclickStr = li.getAttribute('onclick') || '';
             const textStr = li.textContent.toUpperCase();
             const htmlStr = li.innerHTML.toUpperCase();
             return onclickStr.includes('LAT') || textStr.includes('LATINO') || textStr.includes(' LAT ') || htmlStr.includes('LAT.PNG');
          });
          
          if (latLi) {
            latLi.click();
            try {
              const onclickCode = latLi.getAttribute('onclick');
              if (onclickCode) {
                 const func = new Function(onclickCode);
                 func.call(latLi);
              }
            } catch(e) {}
            return { found: true, lang: 'LAT' };
          }
          
          // Si no hay Latino, buscar Subtitulado
          const subLi = lis.find(li => {
             const onclickStr = li.getAttribute('onclick') || '';
             const textStr = li.textContent.toUpperCase();
             const htmlStr = li.innerHTML.toUpperCase();
             return onclickStr.includes('SUB') || textStr.includes('SUBTITULADO') || textStr.includes(' SUB ') || htmlStr.includes('SUB.PNG');
          });
          
          if (subLi) {
            subLi.click();
            try {
              const onclickCode = subLi.getAttribute('onclick');
              if (onclickCode) {
                 const func = new Function(onclickCode);
                 func.call(subLi);
              }
            } catch(e) {}
            return { found: true, lang: 'SUB' };
          }

          // Si no hay ni LAT ni SUB, darle clic a la primera opción que parezca de servidor/idioma
          // O simplemente retornar no encontrado
          return { found: false, lang: 'UNKNOWN' };
        });

        let serverName = "Supabase Demo (Latino)";
        if (languageResult.lang === 'SUB') {
           console.log(`[⚠️] No se encontró Latino. Usando idioma SUBTITULADO.`);
           serverName = "Supabase Demo (Subtitulado)";
        } else if (!languageResult.found) {
           console.log(`[⚠️] No se encontraron banderas de idioma LAT ni SUB. Se intentará continuar por defecto.`);
        }

        // ESPERA VITAL: Dar tiempo a que carguen los servidores del idioma seleccionado
        console.log(`[🤖] Esperando 4 segundos a que carguen los servidores del idioma...`);
        await new Promise(r => setTimeout(r, 4000));

        // Clic EARNVIDS
        const clickedEarnvids = await playerFrame.evaluate(() => {
          const lis = Array.from(document.querySelectorAll('li'));
          const earnvidsBtns = lis.filter(li => li.textContent && li.textContent.toUpperCase().includes('EARNVIDS'));
          const visibleBtn = earnvidsBtns.find(btn => btn.offsetWidth > 0 && btn.offsetHeight > 0);
          
          if (visibleBtn) {
            visibleBtn.click();
            return true;
          }
          return false;
        });
        
        if (!clickedEarnvids) console.log(`[⚠️] No se encontró el botón EARNVIDS visible.`);
        
        await new Promise(r => setTimeout(r, 5000));

        // Extraer FileLions
        let filelionsUrl = null;
        for (const frame of targetPage.frames()) {
           if (frame.url().includes('filelions.top') || frame.url().includes('filelions.live')) {
              filelionsUrl = frame.url();
              break;
           }
        }
        if (!filelionsUrl) {
          filelionsUrl = await targetPage.evaluate(() => {
            const iframes = Array.from(document.querySelectorAll('iframe'));
            const flIframe = iframes.find(f => f.src && f.src.includes('filelions'));
            if (flIframe) return flIframe.src;
            return null;
          });
        }

        if (!filelionsUrl) {
           console.log(`[❌] No se pudo extraer FileLions para el episodio ${currentEpisodeNumber}.`);
        } else {
           console.log(`[✅] Enlace extraído: ${filelionsUrl}`);
           
           await client.query(`
             DELETE FROM anime_episodes WHERE search_title = $1 AND episode_number = $2
           `, [animeTitle.toLowerCase(), currentEpisodeNumber]);

           await client.query(`
             INSERT INTO anime_episodes (search_title, episode_number, server_name, video_url)
             VALUES ($1, $2, $3, $4)
           `, [animeTitle.toLowerCase(), currentEpisodeNumber, serverName, filelionsUrl]);
           
           console.log(`[🎉] Episodio ${currentEpisodeNumber} guardado en la Base de Datos como ${languageResult.lang}.`);
        }

        currentEpisodeNumber++;
    }

    console.log(`\n===========================================`);
    console.log(`[🏁] ¡PROCESO MASIVO COMPLETADO!`);
    console.log(`===========================================`);

  } catch(e) {
    console.error(`[❌] Hubo un error crítico en el proceso masivo:`, e.message);
  } finally {
    await client.end();
    setTimeout(async () => {
      await browser.close();
    }, 2000);
  }
}

runScraper();

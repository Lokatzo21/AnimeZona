const fs = require('fs');
let txt = fs.readFileSync('scraper/dondever_scraper.js', 'utf8');

const targetStr = `seriesTitle = seriesTitle.replace(/\\d+x\\d+/i, '').replace(/[\\s:\\-]+$/, '').trim();
        console.log(\`[🤖] Título detectado: \${seriesTitle}\`);`;

const replaceStr = `seriesTitle = seriesTitle.replace(/\\d+x\\d+/i, '').replace(/[\\s:\\-]+$/, '').trim();
        
        if (seriesTitle.toLowerCase().includes('página no encontrada') || seriesTitle.toLowerCase().includes('page not found') || seriesTitle.toLowerCase().includes('desconocido')) {
            console.log(\`[❌] ERROR CRÍTICO: El enlace que pusiste no existe en DondeVer (Error 404). Verifica que copiaste bien la URL.\`);
            await client.end();
            setTimeout(async () => {
                if (browser) {
                    try { await browser.close(); } catch(e) {}
                }
                process.exit(1);
            }, 1000);
            return;
        }

        console.log(\`[🤖] Título detectado: \${seriesTitle}\`);`;

txt = txt.replace(targetStr, replaceStr);

fs.writeFileSync('scraper/dondever_scraper.js', txt, 'utf8');
console.log('Fixed 404 protection');

const fs = require('fs');
let txt = fs.readFileSync('scraper/dondever_scraper.js', 'utf8');

const startStr = '// ----- NUEVO: DETECCIÓN DE REPRODUCTOR MULTI-SERVIDOR INTERNO (finalizePlayer) -----';
const endStr = 'console.log(`[🤖] Hay ${serversToScrape.length} servidores válidos.`);';

const start = txt.indexOf(startStr);
const end = txt.indexOf(endStr);

if (start > -1 && end > -1) {
    const oldBlock = txt.substring(start, end);
    const newBlock = `// ----- NUEVO: DETECCIÓN DE REPRODUCTOR MULTI-SERVIDOR INTERNO (finalizePlayer) -----
            let multiServerFound = false;
            console.log(\`[🤖] Esperando a que el reproductor cargue (puede tardar unos segundos)...\`);
            
            let jsonDataToProcess = null;
            
            // Polling loop: intentamos hasta 35 veces (1 segundo de pausa)
            for (let attempt = 1; attempt <= 35; attempt++) {
                for (const frame of page.frames()) {
                    try {
                        const content = await frame.content();
                        const match = content.match(/finalizePlayer\\s*\\(\\s*(\\{.*?\\})\\s*\\)/);
                        if (match && match[1]) {
                            jsonDataToProcess = JSON.parse(match[1]);
                            break;
                        }
                    } catch(e) {
                        // Ignorar errores de acceso cruzado a iframes
                    }
                }
                
                if (jsonDataToProcess) {
                    console.log(\`[🤖] Reproductor interno detectado en el intento \${attempt}.\`);
                    break;
                }
                
                if (attempt === 15) {
                    console.log(\`[🤖] El reproductor parece atascado (OFFLINE). Forzando recarga del iframe...\`);
                    await page.evaluate(() => {
                        const iframe = document.querySelector('.nt-stage iframe');
                        if (iframe) iframe.src = iframe.src;
                    });
                }
                if (attempt === 25) {
                    console.log(\`[🤖] Segundo intento de recarga del iframe por precaución...\`);
                    await page.evaluate(() => {
                        const iframe = document.querySelector('.nt-stage iframe');
                        if (iframe) iframe.src = iframe.src;
                    });
                }
                
                await new Promise(r => setTimeout(r, 1000));
            }
            
            if (jsonDataToProcess) {
                const processLangServers = async (langObj, langName) => {
                    if (!langObj) return;
                    let filelionsCount = 0;
                    let streamwishCount = 0;
                    for (const [srvKey, srvUrl] of Object.entries(langObj)) {
                        const keyUpper = srvKey.toUpperCase();
                        if (keyUpper.includes('STREAMWISH') || keyUpper.includes('FILELIONS')) {
                            multiServerFound = true;
                            
                            let displayName = keyUpper.includes('STREAMWISH') ? 'STREAMWISH' : 'FILELIONS';
                            if (keyUpper.includes('FILELIONS')) {
                                filelionsCount++;
                                if (filelionsCount > 1) {
                                    displayName = \`FILELIONS \${filelionsCount}\`;
                                }
                            }
                            if (keyUpper.includes('STREAMWISH')) {
                                streamwishCount++;
                                if (streamwishCount > 1) {
                                    displayName = \`STREAMWISH \${streamwishCount}\`;
                                }
                            }
                            
                            console.log(\`[✅] Servidor interno detectado: \${displayName} -> \${srvUrl}\`);
                            
                            try {
                                const check = await client.query(
                                    \`SELECT id FROM anime_episodes WHERE search_title=$1 AND episode_number=$2 AND season_number=$3 AND server_name=$4\`,
                                    [seriesTitle.toLowerCase(), currentEpNumToSave, epData.season, displayName]
                                );
                                
                                if (check.rows.length === 0) {
                                    await client.query(\`
                                        INSERT INTO anime_episodes (search_title, episode_number, season_number, episode_name, server_name, language, video_url, anime_tmdb_id)
                                        VALUES ($1, $2, $3, $4, $5, $6, $7, null)
                                    \`, [
                                        seriesTitle.toLowerCase(), 
                                        currentEpNumToSave, 
                                        epData.season, 
                                        epData.title, 
                                        displayName, 
                                        langName, 
                                        srvUrl
                                    ]);
                                    console.log(\`[🎉] Guardado en BD con éxito (\${displayName}).\`);
                                } else {
                                    console.log(\`[⏭️] Ya existe en la base de datos, saltando (\${displayName}).\`);
                                }
                            } catch(err) {
                                console.error(\`[❌] Error SQL:\`, err.message);
                            }
                        }
                    }
                };
                
                if (jsonDataToProcess.latino) {
                    await processLangServers(jsonDataToProcess.latino, 'latino');
                } else if (jsonDataToProcess.subtitulado) {
                    await processLangServers(jsonDataToProcess.subtitulado, 'subtitulado');
                } else if (jsonDataToProcess.castellano) {
                    await processLangServers(jsonDataToProcess.castellano, 'castellano');
                }
            }
            
            if(!multiServerFound) {
                console.log(\`[🤖] No se detectó menú interno, continuando con Servidores Externos...\`);
            } else {
                console.log(\`[🤖] Extracción interna completada. Buscando servidores externos adicionales...\`);
            }

            // Leer lista de servidores
            const serversToScrape = await page.evaluate((multiFound) => {
                const btn = document.querySelector('button[data-nt-menu-btn="server"]');
                if(btn) btn.click();
                
                const srvBtns = Array.from(document.querySelectorAll('div[data-nt-menu="server"] button'));
                const results = [];
                srvBtns.forEach((b, idx) => {
                    // Si encontramos los internos, excluimos el "Servidor 1" (porque es el menú del que ya extrajimos)
                    // Si NO lo encontramos, incluimos el "Servidor 1" porque podría ser un embed directo de uqload u otro.
                    if (multiFound) {
                        if (!b.innerText.toLowerCase().includes('servidor 1')) {
                            results.push({ name: b.innerText.trim(), index: idx });
                        }
                    } else {
                        results.push({ name: b.innerText.trim(), index: idx });
                    }
                });
                return results;
            }, multiServerFound);

            `;

    txt = txt.replace(oldBlock, newBlock);
    fs.writeFileSync('scraper/dondever_scraper.js', txt, 'utf8');
    console.log("Successfully replaced block with reload iframe logic!");
} else {
    console.log("Could not find blocks.");
}

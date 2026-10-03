const fs = require('fs');
let lines = fs.readFileSync('scraper/dondever_scraper.js', 'utf8').split('\\n');

const newBlock = \`            // ----- NUEVO: DETECCIÓN DE REPRODUCTOR MULTI-SERVIDOR INTERNO (finalizePlayer) -----
            let multiServerFound = false;
            console.log(\\\`[🤖] Esperando a que el reproductor cargue (puede tardar unos segundos)...\\\`);
            
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
                        // Ignorar
                    }
                }
                
                if (jsonDataToProcess) {
                    console.log(\\\`[🤖] Reproductor interno detectado en el intento \${attempt}.\\\`);
                    break;
                }
                
                if (attempt === 15) {
                    console.log(\\\`[🤖] El reproductor parece atascado (OFFLINE). Forzando recarga del iframe...\\\`);
                    await page.evaluate(() => {
                        const iframe = document.querySelector('.nt-stage iframe');
                        if (iframe) iframe.src = iframe.src;
                    });
                }
                
                if (attempt === 20 || attempt === 30) {
                    console.log(\\\`[🤖] OFFLINE persistente. Abriendo reproductor en pestaña nueva para forzar conexión (Intento \${attempt})...\\\`);
                    const iframeUrl = await page.evaluate(() => {
                        const iframe = document.querySelector('.nt-stage iframe');
                        return iframe ? iframe.src : null;
                    });
                    
                    if (iframeUrl) {
                        let newTab;
                        try {
                            newTab = await browser.newPage();
                            await newTab.goto(iframeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                            
                            // Revisar frames dentro de la nueva pestaña por 5 segundos
                            for(let t=0; t<5; t++) {
                                await new Promise(r => setTimeout(r, 1000));
                                for (const frame of newTab.frames()) {
                                    try {
                                        const content = await frame.content();
                                        const match = content.match(/finalizePlayer\\s*\\(\\s*(\\{.*?\\})\\s*\\)/);
                                        if (match && match[1]) {
                                            jsonDataToProcess = JSON.parse(match[1]);
                                            break;
                                        }
                                    } catch(e) {}
                                }
                                if (jsonDataToProcess) break;
                            }
                            await newTab.close();
                        } catch(e) {
                            if (newTab) try { await newTab.close(); } catch(err){}
                        }
                    }
                    if (jsonDataToProcess) {
                        console.log(\\\`[🤖] ¡Éxito! Conexión lograda desde la pestaña nueva.\\\`);
                        break;
                    }
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
                                    displayName = \\\`FILELIONS \${filelionsCount}\\\`;
                                }
                            }
                            if (keyUpper.includes('STREAMWISH')) {
                                streamwishCount++;
                                if (streamwishCount > 1) {
                                    displayName = \\\`STREAMWISH \${streamwishCount}\\\`;
                                }
                            }
                            
                            console.log(\\\`[✅] Servidor interno detectado: \${displayName} -> \${srvUrl}\\\`);
                            
                            try {
                                const check = await client.query(
                                    \\\`SELECT id FROM anime_episodes WHERE search_title=$1 AND episode_number=$2 AND season_number=$3 AND server_name=$4\\\`,
                                    [seriesTitle.toLowerCase(), currentEpNumToSave, epData.season, displayName]
                                );
                                
                                if (check.rows.length === 0) {
                                    await client.query(\\\`
                                        INSERT INTO anime_episodes (search_title, episode_number, season_number, episode_name, server_name, language, video_url, anime_tmdb_id)
                                        VALUES ($1, $2, $3, $4, $5, $6, $7, null)
                                    \\\`, [
                                        seriesTitle.toLowerCase(), 
                                        currentEpNumToSave, 
                                        epData.season, 
                                        epData.title, 
                                        displayName, 
                                        langName, 
                                        srvUrl
                                    ]);
                                    console.log(\\\`[🎉] Guardado en BD con éxito (\${displayName}).\\\`);
                                } else {
                                    console.log(\\\`[⏭️] Ya existe en la base de datos, saltando (\${displayName}).\\\`);
                                }
                            } catch(err) {
                                console.error(\\\`[❌] Error SQL:\\\`, err.message);
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
                console.log(\\\`[🤖] No se detectó menú interno, continuando con Servidores Externos...\\\`);
            } else {
                console.log(\\\`[🤖] Extracción interna completada. Buscando servidores externos adicionales...\\\`);
            }

            // Leer lista de servidores
            const serversToScrape = await page.evaluate((multiFound) => {
                const btn = document.querySelector('button[data-nt-menu-btn="server"]');
                if(btn) btn.click();
                
                const srvBtns = Array.from(document.querySelectorAll('div[data-nt-menu="server"] button'));
                const results = [];
                srvBtns.forEach((b, idx) => {
                    if (multiFound) {
                        if (!b.innerText.toLowerCase().includes('servidor 1')) {
                            results.push({ name: b.innerText.trim(), index: idx });
                        }
                    } else {
                        results.push({ name: b.innerText.trim(), index: idx });
                    }
                });
                return results;
            }, multiServerFound);\`;

lines.splice(259, 191, newBlock); // 450 - 259 = 191 lines to replace
fs.writeFileSync('scraper/dondever_scraper.js', lines.join('\\n'), 'utf8');
console.log("Successfully replaced lines 259 to 449 with clean block.");

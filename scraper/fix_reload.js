const fs = require('fs');
let txt = fs.readFileSync('scraper/dondever_scraper.js', 'utf8');

// Insert seriesSlug logic
const targetSlug = `const seriesTitle = titleClean.replace('Serie ', '').replace('Online', '').trim();`;
const replaceSlug = `const seriesTitle = titleClean.replace('Serie ', '').replace('Online', '').trim();
        let seriesSlug = '';
        if (userUrl.includes('/tvshows/')) seriesSlug = userUrl.split('/tvshows/')[1].split('/')[0];
        if (userUrl.includes('/episodes/')) seriesSlug = userUrl.split('/episodes/')[1].split('-').slice(0,-1).join('-');
`;
txt = txt.replace(targetSlug, replaceSlug);

// Replace attempt 25 logic
const targetReload = `                if (attempt === 15) {
                    console.log(\`[🤖] El reproductor parece atascado (OFFLINE). Forzando recarga del iframe...\`);
                    await page.evaluate(() => {
                        const iframe = document.querySelector('.nt-stage iframe');
                        if (iframe) iframe.src = iframe.src;
                    });
                }`;
const replaceReload = `                if (attempt === 15) {
                    console.log(\`[🤖] El reproductor parece atascado (OFFLINE). Forzando recarga del iframe...\`);
                    await page.evaluate(() => {
                        const iframe = document.querySelector('.nt-stage iframe');
                        if (iframe) iframe.src = iframe.src;
                    });
                }
                
                if (attempt === 25) {
                    console.log(\`[🤖] OFFLINE severo. Recargando la página completa del episodio...\`);
                    try {
                        const episodeUrl = "https://dondever.net/episodes/" + seriesSlug + "-" + epData.season + "x" + epData.episode + "/";
                        await page.goto(episodeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                        await new Promise(r => setTimeout(r, 2000));
                        await page.evaluate(() => {
                            const btn = document.querySelector('.play-box') || document.querySelector('.nt-stage');
                            if (btn) btn.click();
                        });
                        await new Promise(r => setTimeout(r, 2000));
                        // Seleccionar latino de nuevo
                        await page.evaluate(() => {
                            const audioBtn = document.querySelector('button[data-nt-menu-btn="audio"]');
                            if(audioBtn) {
                                audioBtn.click();
                                const audios = Array.from(document.querySelectorAll('div[data-nt-menu="audio"] button'));
                                const latino = audios.find(b => b.innerText.toLowerCase().includes('latino'));
                                if(latino) latino.click();
                                else audioBtn.click();
                            }
                        });
                        await new Promise(r => setTimeout(r, 2000));
                    } catch(e) {}
                }`;
txt = txt.replace(targetReload, replaceReload);

fs.writeFileSync('scraper/dondever_scraper.js', txt, 'utf8');
console.log("Successfully injected outer page reload logic.");

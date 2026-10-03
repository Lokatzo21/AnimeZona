const fs = require('fs');
let txt = fs.readFileSync('scraper/dondever_scraper.js', 'utf8');

const targetStr = "console.log(`[🤖] Título detectado: ${seriesTitle}`);";
const replaceStr = `console.log(\`[🤖] Título detectado: \${seriesTitle}\`);

        // AUTO-CREAR SERIE EN LA WEB SI NO EXISTE
        try {
            const cleanSearchTitle = seriesTitle.toLowerCase();
            const { rows: existCustom } = await client.query('SELECT id FROM custom_animes WHERE title ILIKE $1 LIMIT 1', [\`%\${seriesTitle}%\`]);
            
            if (existCustom.length === 0) {
                console.log(\`[✨] Serie no encontrada en tu web. ¡Auto-creando ficha de "\${seriesTitle}"!\`);
                
                // Extraer metadata de la pgina
                const metaData = await page.evaluate(() => {
                    let img = 'https://via.placeholder.com/225x318?text=No+Image';
                    let desc = 'Sin sinopsis disponible.';
                    
                    // Buscar imagen en el JSON data-nt-sources
                    const jsonScript = document.querySelector('script[data-nt-sources]');
                    if (jsonScript) {
                        try {
                            const data = JSON.parse(jsonScript.innerText);
                            if (data.cast && data.cast.img) img = data.cast.img;
                        } catch(e) {}
                    }
                    
                    // Buscar descripcin
                    const descMeta = document.querySelector('meta[property="og:description"]');
                    if (descMeta) {
                        let text = descMeta.content;
                        // Limpiar texto basura
                        text = text.replace(/Ver.*?(completa|online).*?(En|en).*?(Cuevana|Cinecalidad|Dondever|Cinetux|Repelis|Seriesflix|Pelisplus|repelishd|inkapelis|Pelisplanet|Gnula).*/gi, '').trim();
                        if (text.length > 5) desc = text;
                    }
                    
                    return { img, desc };
                });
                
                const newCustomId = 'custom-' + Date.now();
                await client.query(\`
                    INSERT INTO custom_animes (id, title, image, description, total_episodes, genres, status, is_secret)
                    VALUES ($1, $2, $3, $4, 150, ARRAY['Action & Adventure', 'Drama'], 'Finalizado', false)
                \`, [newCustomId, seriesTitle, metaData.img, metaData.desc]);
                
                console.log(\`[✅] Ficha de "\${seriesTitle}" creada con xito en tu base de datos.\`);
            }
        } catch(e) {
            console.log(\`[⚠️] Advertencia: No se pudo auto-crear la serie en la web (\${e.message})\`);
        }
`;

txt = txt.replace(targetStr, replaceStr);

fs.writeFileSync('scraper/dondever_scraper.js', txt, 'utf8');
console.log('Injected auto-create feature');

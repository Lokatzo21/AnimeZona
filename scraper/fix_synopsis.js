const fs = require('fs');
let txt = fs.readFileSync('scraper/dondever_scraper.js', 'utf8');

const targetStr = `                    // Buscar descripcin
                    const descMeta = document.querySelector('meta[property="og:description"]');
                    if (descMeta) {
                        let text = descMeta.content;
                        // Limpiar texto basura
                        text = text.replace(/Ver.*?(completa|online).*?(En|en).*?(Cuevana|Cinecalidad|Dondever|Cinetux|Repelis|Seriesflix|Pelisplus|repelishd|inkapelis|Pelisplanet|Gnula).*/gi, '').trim();
                        if (text.length > 5) desc = text;
                    }`;

const replaceStr = `                    // Buscar descripcion real de la serie
                    const pDesc = document.querySelector('p.nt-hero-text');
                    if (pDesc && pDesc.innerText.trim().length > 5) {
                        desc = pDesc.innerText.trim();
                    } else {
                        // Respaldo por si no tiene la clase nt-hero-text
                        const descMeta = document.querySelector('meta[property="og:description"]');
                        if (descMeta) {
                            let text = descMeta.content;
                            text = text.replace(/Ver.*?(completa|online).*?(En|en).*?(Cuevana|Cinecalidad|Dondever|Cinetux|Repelis|Seriesflix|Pelisplus|repelishd|inkapelis|Pelisplanet|Gnula).*/gi, '').trim();
                            if (text.length > 5) desc = text;
                        }
                    }`;

txt = txt.replace(targetStr, replaceStr);
fs.writeFileSync('scraper/dondever_scraper.js', txt, 'utf8');
console.log('Fixed synopsis extractor');

const fs = require('fs');
let txt = fs.readFileSync('src/services/api.js', 'utf8');

const targetRegex = /if \(scrapedEps && scrapedEps\.length > 0\) \{[\s\S]*?const total = customData\.total_episodes/;

const replaceStr = `if (scrapedEps && scrapedEps.length > 0) {
             const uniqueEps = [];
             const seen = new Set();
             for (const ep of scrapedEps) {
                if (!seen.has(ep.episode_number)) {
                    seen.add(ep.episode_number);
                    uniqueEps.push(ep);
                }
             }
             uniqueEps.sort((a,b) => a.episode_number - b.episode_number);

             let absCount = 1;

             return uniqueEps.map((ep) => {
                 const s = ep.season_number || 1;
                 
                 // Construimos el titulo para que los componentes React (Watch.jsx / AnimeDetails.jsx) 
                 // que le añaden "T2E1 - " al inicio, terminen mostrando "T2E1 - (24) Redención"
                 const titleStr = \`(\${ep.episode_number}) \${ep.episode_name || 'Episodio ' + ep.episode_number}\`;

                 return {
                     id: ep.episode_number,
                     title: titleStr,
                     url: ep.episode_number,
                     season: s,
                     absolute_id: absCount++
                 };
             });
         }

         const total = customData.total_episodes`;

txt = txt.replace(targetRegex, replaceStr);

fs.writeFileSync('src/services/api.js', txt, 'utf8');
console.log('Fixed relative season numbering perfectly!');

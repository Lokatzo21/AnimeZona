const fs = require('fs');
let txt = fs.readFileSync('src/services/api.js', 'utf8');

const targetStr = `      if (String(id).startsWith('custom-')) {
         const { data } = await supabase.from('custom_animes').select('*').eq('id', id).single();
         if (!data) return [];
         const total = data.total_episodes || 12;
         const names = data.episode_names || {};
         return Array.from({ length: total }, (_, i) => ({
           id: i + 1,
           tmdb_episode_id: i + 1,
           title: names[i + 1] || \`T1E\${i + 1}\`,
           url: i + 1,
           season: 1
         }));
      }`;

const replaceStr = `      if (String(id).startsWith('custom-')) {
         const { data: customData } = await supabase.from('custom_animes').select('*').eq('id', id).single();
         if (!customData) return [];
         
         // Buscar episodios scrapeados en la BD para heredar nombres y temporadas
         const { data: scrapedEps } = await supabase
            .from('anime_episodes')
            .select('episode_number, season_number, episode_name')
            .ilike('search_title', customData.title)
            .order('episode_number', { ascending: true });

         if (scrapedEps && scrapedEps.length > 0) {
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
             return uniqueEps.map((ep) => ({
                 id: ep.episode_number,
                 title: \`T\${ep.season_number || 1}E\${ep.episode_number} - \${ep.episode_name || 'Episodio ' + ep.episode_number}\`,
                 url: ep.episode_number,
                 season: ep.season_number || 1,
                 absolute_id: absCount++
             }));
         }

         const total = customData.total_episodes || 12;
         const names = customData.episode_names || {};
         return Array.from({ length: total }, (_, i) => ({
           id: i + 1,
           tmdb_episode_id: i + 1,
           title: names[i + 1] || \`T1E\${i + 1}\`,
           url: i + 1,
           season: 1,
           absolute_id: i + 1
         }));
      }`;

txt = txt.replace(targetStr, replaceStr);

fs.writeFileSync('src/services/api.js', txt, 'utf8');
console.log('Fixed getAnimeEpisodes for custom animes!');

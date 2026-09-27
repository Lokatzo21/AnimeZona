import fs from 'fs';
(async () => {
    try {
        const animeText = await (await fetch('https://www.animedbs.online/anime/tomb-raider-king-latino/')).text();
        const epLinks = animeText.match(/href="([^"]+)"/g).filter(x => x.includes('episodio'));
        console.log('Episode links:', epLinks.slice(0,2));
        
        if (epLinks.length > 0) {
            const epUrl = epLinks[0].replace('href="', '').replace('"', '');
            console.log('Fetching ep:', epUrl);
            const epText = await (await fetch(epUrl)).text();
            console.log('Video sources:', epText.match(/<source[^>]*>/ig));
            console.log('Iframes:', epText.match(/<iframe[^>]*>/ig));
            const players = epText.match(/<ul[^>]*id="playeroptionsul"[^>]*>([\s\S]*?)<\/ul>/ig);
            console.log('PlayerOptions:', players ? players[0] : null);
        }
    } catch(e) { console.log(e); }
})();

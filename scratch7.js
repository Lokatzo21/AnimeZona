import fs from 'fs';
(async () => {
    try {
        const epText = await (await fetch('https://www.animedbs.online/tomb-raider-king-capitulo-7-espanol-latino/')).text();
        console.log('Video sources:', epText.match(/<source[^>]*>/ig));
        console.log('Iframes:', epText.match(/<iframe[^>]*>/ig));
        const players = epText.match(/<ul[^>]*id="playeroptionsul"[^>]*>([\s\S]*?)<\/ul>/ig);
        console.log('PlayerOptions:', players ? players[0] : null);
    } catch(e) { console.log(e); }
})();

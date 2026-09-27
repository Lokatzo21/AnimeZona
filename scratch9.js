import fs from 'fs';
(async () => {
    try {
        const epText = await (await fetch('https://www.animedbs.online/tomb-raider-king-capitulo-7-espanol-latino/')).text();
        const links = epText.match(/href="([^"]+)"/g) || [];
        const dlLinks = links.filter(l => l.toLowerCase().includes('mega') || l.toLowerCase().includes('drive') || l.toLowerCase().includes('mediafire') || l.toLowerCase().includes('download') || l.toLowerCase().includes('descarga'));
        console.log('Download links:', dlLinks);
    } catch(e) { console.log(e); }
})();

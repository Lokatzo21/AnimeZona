import fs from 'fs';
(async () => {
    try {
        const res = await fetch('https://www.animedbs.online');
        const text = await res.text();
        const eps = text.match(/href="([^"]+)"/g).filter(x => x.includes('-episodio-') || x.includes('-capitulo-')).map(h => h.split('"')[1]);
        const uniqueEps = [...new Set(eps)].slice(0, 15);
        console.log('Testing ' + uniqueEps.length + ' episodes...');
        
        for (let ep of uniqueEps) {
            const epText = await (await fetch(ep)).text();
            const sources = epText.match(/<source[^>]*>/ig);
            const iframes = epText.match(/<iframe[^>]*>/ig);
            const players = epText.match(/<ul[^>]*id="playeroptionsul"[^>]*>([\s\S]*?)<\/ul>/ig);
            const tabs = epText.match(/<ul[^>]*class="tabs"[^>]*>([\s\S]*?)<\/ul>/ig);
            
            console.log('\nEP: ' + ep);
            if (sources) console.log(' Sources: ' + sources.length);
            if (iframes) console.log(' Iframes: ' + iframes.length);
            if (players) console.log(' PlayerOptions: true');
            if (tabs) console.log(' Tabs: true');
        }
    } catch(e) { console.log(e); }
})();

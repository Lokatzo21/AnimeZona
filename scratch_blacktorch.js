import fs from 'fs';
(async () => {
    try {
        const epRes = await fetch('https://www.animedbs.online/black-torch-episodio-11/');
        const text = await epRes.text();
        const servers = text.match(/<ul[^>]*id="playeroptionsul".*?>([\s\S]*?)<\/ul>/i);
        if (servers) {
            console.log('Player Options:', servers[1].substring(0, 1000));
        } else {
            console.log('No playeroptionsul found in Black Torch either');
            const iframes = text.match(/<iframe[^>]*>/ig);
            console.log('Iframes:', iframes);
        }
    } catch(e) { console.log(e); }
})();

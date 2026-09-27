import fs from 'fs';
(async () => {
    try {
        const epRes = await fetch('https://www.animedbs.online/mushoku-tensei-temporada-3-episodio-12/');
        const text = await epRes.text();
        fs.writeFileSync('animedbs_ep.html', text);
        console.log('Saved to animedbs_ep.html');
    } catch(e) { console.log(e); }
})();

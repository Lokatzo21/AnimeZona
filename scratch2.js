import fs from 'fs';
(async () => {
    try {
        const epRes = await fetch('https://www.animedbs.online/otome-game-sekai-wa-mob-ni-kibishii-sekai-desu-temporada-2-episodio-10/');
        const text = await epRes.text();
        fs.writeFileSync('animedbs_ep2.html', text);
        console.log('Saved to animedbs_ep2.html');
    } catch(e) { console.log(e); }
})();

import fs from 'fs';
const t = fs.readFileSync('anime.html', 'utf8');
const epList = t.match(/<ul[^>]*class="eplister"[^>]*>([\s\S]*?)<\/ul>/is);
if (epList) {
    console.log(epList[1].substring(0, 1000));
} else {
    // try to find just a div with episodes
    const eps = t.match(/<div[^>]*eplister[^>]*>([\s\S]*?)<\/div>/is) || t.match(/<ul[^>]*episodios[^>]*>([\s\S]*?)<\/ul>/is);
    if(eps) console.log(eps[1].substring(0, 1000));
    else console.log('not found');
}

import fs from 'fs';
const t = fs.readFileSync('anime.html', 'utf8');
const links = t.match(/href="([^"]+)"/g);
if (links) {
    const eps = links.filter(l => l.includes('tomb-raider-king'));
    console.log(eps.slice(0, 10));
}

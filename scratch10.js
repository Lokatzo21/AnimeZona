import fs from 'fs';
const t = fs.readFileSync('anime.html', 'utf8');
const eplister = t.match(/<[^>]*class="[^"]*eplister[^"]*"[^>]*>([\s\S]*?)<\/ul>/is);
if (eplister) {
    console.log(eplister[0].substring(0, 500));
}

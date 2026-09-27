import fs from 'fs';
const text = fs.readFileSync('animedbs_ep2.html', 'utf8');
const options = text.match(/<ul[^>]*id="playeroptionsul".*?>([\s\S]*?)<\/ul>/is);
if (options) {
    console.log(options[0]);
} else {
    // Just find any ul that has elements with click handlers for the player
    const uls = text.match(/<ul[^>]*>([\s\S]*?)<\/ul>/ig);
    if(uls) {
        for(let ul of uls) {
            if (ul.includes('play') || ul.includes('server') || ul.includes('opcion')) {
                console.log(ul);
            }
        }
    }
}

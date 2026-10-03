const fs = require('fs');
let txt = fs.readFileSync('scraper/dondever_scraper.js', 'utf8');

const targetStr = `                if (iframeSrc) {`;
const replaceStr = `                if (iframeSrc) {
                    if (iframeSrc.includes('unlimplay.com') || iframeSrc.includes('player.dondever.net')) {
                        console.log(\`[❌] Ignorando iframe interno (\${iframeSrc}) porque requiere token de sesión y expirará.\`);
                        continue;
                    }`;

txt = txt.replace(targetStr, replaceStr);
fs.writeFileSync('scraper/dondever_scraper.js', txt, 'utf8');
console.log("Successfully added unlimplay ignore rule.");

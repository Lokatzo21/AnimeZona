const fs = require('fs');
let txt = fs.readFileSync('scraper/dondever_scraper.js', 'utf8');
txt = txt.replace(/seriesTitle = seriesTitle\.replace\(\/\\d\+x\\d\+\/i, ''\)\.replace\(\/\[:\\-\]\+\$\/, ''\)\.trim\(\);/g, "seriesTitle = seriesTitle.replace(/\\d+x\\d+/i, '').replace(/[\\s:\\-]+$/, '').trim();");
fs.writeFileSync('scraper/dondever_scraper.js', txt, 'utf8');
console.log('Fixed regex!');

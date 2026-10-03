const fs = require('fs');
let txt = fs.readFileSync('scraper/dondever_scraper.js', 'utf8');

const targetStr = `VALUES ($1, $2, $3, $4, 150, ARRAY['Action & Adventure', 'Drama'], 'Finalizado', false)`;
const replaceStr = `VALUES ($1, $2, $3, $4, 1, ARRAY['Action & Adventure', 'Drama'], 'Finalizado', false)`;

txt = txt.replace(targetStr, replaceStr);

fs.writeFileSync('scraper/dondever_scraper.js', txt, 'utf8');
console.log('Fixed hardcoded 150 episodes');

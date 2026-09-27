const fs = require('fs');
const html = fs.readFileSync('reel.html', 'utf8');
const urls = [...html.matchAll(/https:[^"]+fbcdn[^"]+/gi)];
console.log(urls.map(u => u[0].replace(/\\/g, '')).slice(0, 5));

const fs = require('fs');
const txt = fs.readFileSync('test.html', 'utf8');

// Use cheerio-like naive extraction to see what elements have nt-ep-play, play-box, nt-stage
const playMatches = txt.match(/<[^>]+class="[^"]*(nt-ep-play|play-box|nt-stage)[^"]*"[^>]*>/g);
console.log("Matches:", playMatches);

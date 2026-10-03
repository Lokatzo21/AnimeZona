const fs = require('fs');

let txt = fs.readFileSync('src/pages/Watch/Watch.jsx', 'utf8');

txt = txt.replace(/Â¡/g, '¡');
txt = txt.replace(/ðŸš€/g, '🚀');
txt = txt.replace(/\x8F/g, ''); // Remove trailing 8F from the emoji replacement

fs.writeFileSync('src/pages/Watch/Watch.jsx', txt, 'utf8');
console.log('Cleanup complete!');

const fs = require('fs');
let txt = fs.readFileSync('src/services/api.js', 'utf8');

// 1. Remove my temporary hack
txt = txt.replace("if (String(id) === '209867') { allEpisodes = allEpisodes.slice(0, 38); }\n", '');

// 2. Remove the big patch block
const startPatch = txt.indexOf('// Parche específico para Frieren');
if (startPatch !== -1) {
    const endPatch = txt.indexOf('finalEpisodes = newFrierenEps;\n      }', startPatch);
    if (endPatch !== -1) {
        // the block ends with "finalEpisodes = newFrierenEps;\n      }" 
        // Let's remove the whole chunk
        txt = txt.substring(0, startPatch) + txt.substring(endPatch + ('finalEpisodes = newFrierenEps;\n      }'.length));
    }
}

fs.writeFileSync('src/services/api.js', txt, 'utf8');
console.log('Frieren patch removed!');

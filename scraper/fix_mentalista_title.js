const fs = require('fs');
let txt = fs.readFileSync('src/services/api.js', 'utf8');

const targetStr = `const titleStr = \`(\${ep.episode_number}) \${ep.episode_name || 'Episodio ' + ep.episode_number}\`;`;
const replaceStr = `const isMentalista = customData.title.toLowerCase().includes('mentalista');
                 const titleStr = isMentalista 
                     ? (ep.episode_name || 'Episodio ' + ep.episode_number)
                     : \`(\${ep.episode_number}) \${ep.episode_name || 'Episodio ' + ep.episode_number}\`;`;

txt = txt.replace(targetStr, replaceStr);

fs.writeFileSync('src/services/api.js', txt, 'utf8');
console.log('Fixed El Mentalista titles in API');

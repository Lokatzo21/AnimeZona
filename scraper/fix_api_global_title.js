const fs = require('fs');
let txt = fs.readFileSync('src/services/api.js', 'utf8');

const targetStr = `                 const isMentalista = customData.title.toLowerCase().includes('mentalista');
                 const titleStr = isMentalista 
                     ? (ep.episode_name || 'Episodio ' + ep.episode_number)
                     : \`(\${ep.episode_number}) \${ep.episode_name || 'Episodio ' + ep.episode_number}\`;`;
                     
const replaceStr = `                 // Devolvemos el nombre limpio. La interfaz (Watch.jsx/AnimeDetails.jsx) le agregar Automticamente el T1E1 - 
                 const titleStr = ep.episode_name || 'Episodio ' + ep.episode_number;`;

txt = txt.replace(targetStr, replaceStr);

fs.writeFileSync('src/services/api.js', txt, 'utf8');
console.log('Fixed API title format globally for custom animes');

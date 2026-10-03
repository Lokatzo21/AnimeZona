const fs = require('fs');

let txt = fs.readFileSync('src/pages/Watch/Watch.jsx', 'utf8');

// Replace all known corrupted sequences with proper UTF-8
txt = txt.replace(/EspaÃ±ol Latino/g, 'Latino');
txt = txt.replace(/EspaÃ±ol/g, 'Español');
txt = txt.replace(/âš™ï¸/g, '⚙️');
txt = txt.replace(/preguntÃ³/g, 'preguntó');
txt = txt.replace(/mÃ¡s/g, 'más');
txt = txt.replace(/sincronizaciÃ³n/g, 'sincronización');
txt = txt.replace(/empezÃ³/g, 'empezó');
txt = txt.replace(/AsegÃºrate/g, 'Asegúrate');
txt = txt.replace(/tamaÃ±o/g, 'tamaño');
txt = txt.replace(/pequeÃ±o/g, 'pequeño');
txt = txt.replace(/automÃ¡ticamente/g, 'automáticamente');
txt = txt.replace(/segÃºn/g, 'según');
txt = txt.replace(/aquÃ­/g, 'aquí');
txt = txt.replace(/BotÃ³n/g, 'Botón');
txt = txt.replace(/vÃ¡lido/g, 'válido');
txt = txt.replace(/TÃ­tulo/g, 'Título');
txt = txt.replace(/ConfiguraciÃ³n/g, 'Configuración');
txt = txt.replace(/BÃºsqueda/g, 'Búsqueda');
// Extra
txt = txt.replace(/aquÃ/g, 'aquí');
txt = txt.replace(/TÃtulo/g, 'Título');

// Remove the BOM if it exists at the very beginning (U+FEFF)
if (txt.charCodeAt(0) === 0xFEFF) {
  txt = txt.slice(1);
}

fs.writeFileSync('src/pages/Watch/Watch.jsx', txt, 'utf8');
console.log('Fixed natively!');

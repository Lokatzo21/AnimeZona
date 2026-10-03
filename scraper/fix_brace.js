const fs = require('fs');
let txt = fs.readFileSync('src/pages/Watch/Watch.jsx', 'utf8');

txt = txt.replace(/    \}\r?\n    \}\r?\n  \};\r?\n\r?\n  \/\/ Efecto para capturar/g, '    }\n  };\n\n  // Efecto para capturar');

fs.writeFileSync('src/pages/Watch/Watch.jsx', txt, 'utf8');

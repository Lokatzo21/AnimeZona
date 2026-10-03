const fs = require('fs');

// 1. Fix Web App AuthContext
const authPath = 'C:/Users/manue/OneDrive/Documentos/Anime/src/contexts/AuthContext.jsx';
let txt = fs.readFileSync(authPath, 'utf8');

const targetStr = `window.localStorage.setItem(row.key, JSON.stringify(row.value));`;
const replacementStr = `let valToStore = row.value;
          if (typeof valToStore === 'string') {
            try {
              const parsed = JSON.parse(valToStore);
              // Avoid re-parsing regular strings if they happen to be valid JSON somehow, we just want to catch objects/arrays that were stringified
              if (parsed !== null && typeof parsed === 'object') {
                valToStore = parsed;
              }
            } catch(e) {}
          }
          const strForStorage = JSON.stringify(valToStore);
          window.localStorage.setItem(row.key, strForStorage);`;

txt = txt.replace(targetStr, replacementStr);
fs.writeFileSync(authPath, txt, 'utf8');

// 2. Fix Mobile App UserSync (so it doesn't happen again)
const mobileSyncPath = 'C:/Users/manue/OneDrive/Documentos/AnimeZonaCelular/src/services/userSync.ts';
if (fs.existsSync(mobileSyncPath)) {
    let syncTxt = fs.readFileSync(mobileSyncPath, 'utf8');
    syncTxt = syncTxt.replace(`const serialized = typeof value === 'string' ? value : JSON.stringify(value);`, `const serialized = value; // Supabase JSONB maneja objetos nativamente`);
    fs.writeFileSync(mobileSyncPath, syncTxt, 'utf8');
}

console.log("Fixed!");

const fs = require('fs');

const hookPath = 'C:/Users/manue/OneDrive/Documentos/Anime/src/hooks/useLocalStorage.js';
let txt = fs.readFileSync(hookPath, 'utf8');

const targetStr = `      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;`;
const replaceStr = `      const item = window.localStorage.getItem(key);
      if (item) {
        let parsed = JSON.parse(item);
        // FIX: Si por el bug de sincronización es un string que parece array/objeto, volver a parsear
        if (typeof parsed === 'string' && (parsed.startsWith('[') || parsed.startsWith('{'))) {
          try { parsed = JSON.parse(parsed); } catch(e){}
        }
        return parsed;
      }
      return initialValue;`;

txt = txt.replace(targetStr, replaceStr);

// Also fix the other handleStorageChange function
const targetStr2 = `        setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue);`;
const replaceStr2 = `        let newVal = e.newValue ? JSON.parse(e.newValue) : initialValue;
        if (typeof newVal === 'string' && (newVal.startsWith('[') || newVal.startsWith('{'))) {
            try { newVal = JSON.parse(newVal); } catch(err){}
        }
        setStoredValue(newVal);`;

txt = txt.replace(targetStr2, replaceStr2);

fs.writeFileSync(hookPath, txt, 'utf8');
console.log('Fixed useLocalStorage.js');

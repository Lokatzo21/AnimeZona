const readline = require('readline');
const { execSync } = require('child_process');

function ask(rl, query) {
  return new Promise(resolve => rl.question(query, ans => resolve(ans.trim())));
}

function convertMediafire(inputUrl) {
  if (!inputUrl) return null;
  let clean = decodeURIComponent(inputUrl).replace(/[?&]\.mp4$/i, '').trim();

  // Caso 1: Enlace con /file/ (como resolver o página)
  let m = clean.match(/mediafire\.com\/file\/([a-zA-Z0-9]+)(?:\/([^\/?#]+))?/i);
  if (m) {
    const key = m[1];
    const file = m[2] && m[2] !== 'file' ? m[2] : '';
    return file
      ? `https://www.mediafire.com/file/${key}/${file}/file`
      : `https://www.mediafire.com/file/${key}/file`;
  }

  // Caso 2: Enlace directo CDN (downloadXXXX.mediafire.com/<token>/<key>/<file>)
  m = clean.match(/mediafire\.com\/[^\/]+\/([a-zA-Z0-9]+)\/([^\/?#]+)/i);
  if (m) {
    const key = m[1];
    const file = m[2] && m[2] !== 'file' ? m[2] : '';
    return file
      ? `https://www.mediafire.com/file/${key}/${file}/file`
      : `https://www.mediafire.com/file/${key}/file`;
  }

  // Caso 3: Solo el QuickKey directo
  const keyOnly = clean.match(/^([a-zA-Z0-9]{15})$/);
  if (keyOnly) {
    return `https://www.mediafire.com/file/${keyOnly[1]}/file`;
  }

  return null;
}

function copyToClipboard(text) {
  try {
    execSync('powershell.exe -NoProfile -Command "Set-Clipboard -Value \'' + text.replace(/'/g, "''") + '\'"', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function openInBrowser(url) {
  try {
    execSync(`start "" "${url}"`, { shell: true, stdio: 'ignore' });
  } catch (e) {}
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.clear();
  console.log('================================================================');
  console.log('     🔄 CONVERTIDOR DE ENLACES DIRECTOS MEDIAFIRE A WEB 🌐      ');
  console.log('       (downloadXXXX... -> mediafire.com/file/.../file)         ');
  console.log('================================================================');

  while (true) {
    console.log('\n----------------------------------------------------------------');
    const input = await ask(rl, '👉 Pega el enlace de Mediafire (o "q" para salir): ');

    if (!input || input.toLowerCase() === 'q' || input.toLowerCase() === 'salir') {
      console.log('\n👋 ¡Listo! Cerrando conversor...');
      break;
    }

    const webUrl = convertMediafire(input);
    if (!webUrl) {
      console.log('❌ Error: No se pudo extraer la clave o estructura de Mediafire en ese enlace.');
      continue;
    }

    console.log('\n✅ ¡ENLACE CONVERTIDO CON ÉXITO!');
    console.log(`🔗 Enlace Web de Descarga:\n   ${webUrl}`);

    const copied = copyToClipboard(webUrl);
    if (copied) {
      console.log('📋 (¡Copiado automáticamente al portapapeles de Windows!)');
    }

    const openChoice = (await ask(rl, '\n¿Deseas abrirlo en tu navegador ahora mismo? (S/N, Enter = S): ')).toLowerCase();
    if (openChoice === '' || openChoice === 's' || openChoice === 'si' || openChoice === 'y') {
      console.log('🌐 Abriendo en navegador...');
      openInBrowser(webUrl);
    }

    const again = (await ask(rl, '\n¿Deseas convertir otro enlace? (S/N, Enter = S): ')).toLowerCase();
    if (again === 'n' || again === 'no') {
      console.log('\n👋 ¡Listo! Cerrando conversor...');
      break;
    }
  }

  rl.close();
}

main().catch(console.error);

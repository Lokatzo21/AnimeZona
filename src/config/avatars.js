// Usamos import.meta.glob de Vite para leer todos los archivos en la carpeta de forma dinámica.
const avatarModules = import.meta.glob('/public/avatars/*.{webp,png,jpg,jpeg,gif}', { eager: true });

export const AVATARS = Object.keys(avatarModules).map((filePath, index) => {
  // filePath será algo como '/public/avatars/1.webp'
  // En la web (en el navegador), la carpeta 'public' es la raíz '/', así que quitamos '/public'
  const url = filePath.replace('/public', '');
  
  // Extraer el nombre del archivo para usarlo de nombre descriptivo
  const fileName = url.split('/').pop();
  const nameWithoutExt = fileName.split('.')[0];
  
  // Si el nombre es un número (como "1"), lo llamamos "Avatar 1". 
  // Si pusieron "Otaku.png", lo llamamos "Otaku".
  const displayName = isNaN(nameWithoutExt) ? nameWithoutExt : `Avatar ${nameWithoutExt}`;

  return {
    id: String(index + 1),
    url: url,
    name: displayName
  };
});

// Ordenar numéricamente si el nombre de archivo es un número, para que "10.webp" vaya después de "9.webp"
AVATARS.sort((a, b) => {
  const numA = parseInt(a.url.split('/').pop().split('.')[0]);
  const numB = parseInt(b.url.split('/').pop().split('.')[0]);
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }
  return a.name.localeCompare(b.name);
});

export const DEFAULT_AVATAR = AVATARS.length > 0 ? AVATARS[0] : { id: '0', url: '', name: 'Default' };

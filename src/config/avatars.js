// Lista predefinida de avatares disponibles en la carpeta /public/avatars/
// Esto evita el warning de Vite "Assets in public directory cannot be imported from JavaScript"
const avatarFiles = [
  '1.webp', '2.webp', '3.webp', '4.webp', '5.webp',
  '6.webp', '7.webp', '8.webp', '9.webp', '10.webp', '11.webp'
];

export const AVATARS = avatarFiles.map((fileName, index) => {
  const nameWithoutExt = fileName.split('.')[0];
  const displayName = isNaN(nameWithoutExt) ? nameWithoutExt : `Avatar ${nameWithoutExt}`;

  return {
    id: String(index + 1),
    url: `/avatars/${fileName}`,
    name: displayName,
    _fileName: fileName
  };
});

// Ordenar numericamente
AVATARS.sort((a, b) => {
  const numA = parseInt(a._fileName.split('.')[0]);
  const numB = parseInt(b._fileName.split('.')[0]);
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }
  return a.name.localeCompare(b.name);
});

export const DEFAULT_AVATAR = AVATARS.length > 0 ? AVATARS[0] : { id: '0', url: '', name: 'Default' };

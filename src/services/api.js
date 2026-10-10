import { supabase } from './supabase';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export const TMDB_GENRES = {
  'Animación': 16,
  'Action & Adventure': 10759,
  'Sci-Fi & Fantasy': 10765,
  'Comedia': 35,
  'Drama': 18,
  'Misterio': 9648
};

const TMDB_GENRES_REVERSE = Object.entries(TMDB_GENRES).reduce((acc, [key, val]) => {
  acc[val] = key;
  return acc;
}, {});

// Validador de contenido seguro: filtra ecchi, harem explícito y contenido para adultos
export const isEcchiOrNSFW = (anime) => {
  if (!anime) return false;
  
  const blockedKeywords = [
    'ecchi', 'harem', 'harén', 'erotic', 'erótica', 'erótico', 'erotismo', 'hentai',
    'pervertid', 'fanservice', 'oppai', 'desnuda', 'desnudo', 'desnudez', 'lencería',
    'sensual', 'sexual', 'sucubo', 'súcubo', 'lascivia', 'esclava sexual', 'tentación carnal',
    'chicas voluptuosas', 'pechos', 'baño mixto', 'pantsu', 'bragas', 'gushing over'
  ];

  // Comprobar géneros
  const genres = (anime.genres || []).map(g => (typeof g === 'string' ? g.toLowerCase() : ''));
  if (genres.some(g => blockedKeywords.some(kw => g.includes(kw)))) {
    return true;
  }

  // Comprobar título
  const title = (anime.title || '').toLowerCase();
  if (blockedKeywords.some(kw => title.includes(kw))) {
    return true;
  }

  // Títulos específicos conocidos de ecchi/fanservice explícito
  const knownEcchiTitles = [
    'high school dxd', 'shinmai maou', 'to love ru', 'yosuga no sora', 'redo of healer',
    'prison school', 'shimoneta', 'valkyrie drive', 'seikon no qwaser', 'kiss x sis',
    'ishuzoku reviewers', 'interspecies reviewers', 'peter grill', 'worlds end harem',
    'gushing over magical girls', 'chained soldier', 'tales of wedding rings', 'mato seihei'
  ];
  if (knownEcchiTitles.some(t => title.includes(t))) {
    return true;
  }

  // Comprobar sinopsis
  const desc = (anime.description || anime.overview || '').toLowerCase();
  const strongDescFlags = [
    'ecchi', 'harem', 'harén', 'erótico', 'erótica', 'erotismo', 'pervertido', 'pervertida',
    'fanservice', 'lencería', 'chicas desnudas', 'tocamientos', 'poco pudor', 'desvestir',
    'lascivo', 'lasciva', 'pechos grandes', 'sucubo', 'súcubo', 'esclavas sexuales'
  ];
  if (strongDescFlags.some(flag => desc.includes(flag))) {
    return true;
  }

  return false;
};

// Map TMDB data
const mapAnimeData = (item) => {
  const hasBackdrop = Boolean(item.backdrop_path);
  const backdropUrl = hasBackdrop 
    ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` 
    : null;
  const posterUrl = item.poster_path 
    ? `https://image.tmdb.org/t/p/original${item.poster_path}` 
    : (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/225x318?text=No+Image');

  const isMovie = item.media_type === 'movie' || Boolean(item.title && !item.name);

  return {
    id: item.id,
    title: item.title || item.name || item.original_name || item.original_title,
    image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/225x318?text=No+Image',
    banner: backdropUrl || posterUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920&q=95',
    backdrop: backdropUrl,
    hasBackdrop,
    score: item.vote_average ? (item.vote_average).toFixed(1) : 'N/A',
    totalEpisodes: isMovie ? 1 : (item.number_of_episodes || null), 
    episodes: isMovie ? 1 : (item.number_of_episodes || null),
    number_of_seasons: isMovie ? 1 : (item.number_of_seasons || 1),
    type: isMovie ? 'Película' : 'TV',
    contentType: isMovie ? 'peliculas' : (item.original_language === 'ja' ? 'animes' : 'series'),
    isMovie,
    description: item.overview || 'Sin sinopsis disponible.',
    genres: item.genres 
      ? item.genres.map(g => g.name) 
      : (item.genre_ids ? item.genre_ids.map(id => TMDB_GENRES_REVERSE[id]).filter(Boolean) : []),
    status: item.status === 'Ended' ? 'Finalizado' : item.status === 'Returning Series' ? 'En emisión' : (isMovie ? 'Finalizado' : item.status),
    trailer: item.videos?.results?.length > 0 ? `https://www.youtube.com/embed/${item.videos.results[0].key}` : null,
    isCustom: false,
    isSecret: false
  };
};

const CUSTOM_MEDIA_ENRICHMENT = {
  'silo': {
    backdrop: 'https://image.tmdb.org/t/p/original/uTWhbLc7Bj4qNSdW3ZvZKL8cOHv.jpg',
    image: 'https://image.tmdb.org/t/p/w500/s4yRu8IRcMLbfoUsO4q9Yuci4F0.jpg'
  },
  'the super cube': {
    backdrop: 'https://image.tmdb.org/t/p/original/89qSKhLrJOUhp6xgbqgSTpzblbA.jpg',
    image: 'https://image.tmdb.org/t/p/w500/8nJV1CEh2eLK5fL3puEOE2tIEQI.jpg'
  },
  'super cube': {
    backdrop: 'https://image.tmdb.org/t/p/original/89qSKhLrJOUhp6xgbqgSTpzblbA.jpg',
    image: 'https://image.tmdb.org/t/p/w500/8nJV1CEh2eLK5fL3puEOE2tIEQI.jpg'
  },
  'lord of mysteries': {
    backdrop: 'https://image.tmdb.org/t/p/original/gdvUUqWutEulHSB4JBoWWnbsLo6.jpg',
    image: 'https://image.tmdb.org/t/p/w500/cR5KiAdVeZLG4nDUiCyqfvGzZ3f.jpg'
  },
  'deadpool & wolverine': {
    backdrop: 'https://image.tmdb.org/t/p/original/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg',
    image: 'https://image.tmdb.org/t/p/w500/6aY3OzCIdxoBMYdiH5s17rWFFFA.jpg'
  },
  'la oficina': {
    backdrop: 'https://image.tmdb.org/t/p/original/mLyW3UTgi2lsMdtueYODcfAB9Ku.jpg',
    image: 'https://image.tmdb.org/t/p/w500/mZMmfkTDiXgdKADBykhEFDp940V.jpg'
  },
  'boushoku no berserk': {
    backdrop: 'https://image.tmdb.org/t/p/original/w6UrhLiXEMLwI4PFv2I2JEPhLRj.jpg',
    image: 'https://image.tmdb.org/t/p/w500/p5rtHwieByHo1NdzOxB3vtVJJnA.jpg'
  },
  'spider-noir': {
    backdrop: 'https://image.tmdb.org/t/p/original/reAZlLG6YMkBuxPT1XKuCH97TM1.jpg',
    image: 'https://image.tmdb.org/t/p/w500/4Pec5a1At5UMeADkgcxwf6nLqau.jpg'
  },
  'el eternauta': {
    backdrop: 'https://image.tmdb.org/t/p/original/yMjGzK7L4gwzpQNNtFKDeG79upo.jpg',
    image: 'https://image.tmdb.org/t/p/w500/9Krv5NvKa5a3Q3b1l2B3rP9Bj8E.jpg'
  },
  'amigos y vecinos': {
    backdrop: 'https://image.tmdb.org/t/p/original/e0mloha4ZQfLVZj0nsUtU7AoRs4.jpg',
    image: 'https://image.tmdb.org/t/p/w500/ikaSVbTZyzsnjHK0ex64bJqQpgd.jpg'
  },
  'cazador de demonios': {
    backdrop: 'https://image.tmdb.org/t/p/original/vfEtEzBIn0wwWM7ppzJCGEZUSu2.jpg',
    image: 'https://image.tmdb.org/t/p/w500/6Ru3HStuwofNr6d20sKzAgmI2Yu.jpg'
  },
  'efectos colaterales': {
    backdrop: 'https://image.tmdb.org/t/p/original/4drV6iluttgjZmU1Q0xDqjrBQ1.jpg',
    image: 'https://image.tmdb.org/t/p/w500/rYsLEca2TwkABX5c04LuKZdjSTG.jpg'
  },
  'the pitt': {
    backdrop: 'https://image.tmdb.org/t/p/original/z3BkMbCy5ajZPMyKEUwsPHuz2cV.jpg',
    image: 'https://image.tmdb.org/t/p/w500/kvFSpESyBZMjaeOJDx7RS3P1jey.jpg'
  },
  'el nivel secreto': {
    backdrop: 'https://image.tmdb.org/t/p/original/5AvZxT1BtPyP9ua1SjcUyWUMIiz.jpg',
    image: 'https://image.tmdb.org/t/p/w500/y5jxT1jnydJL6sB3QkzCLu8e3HS.jpg'
  },
  'kaiju no. 8': {
    backdrop: 'https://image.tmdb.org/t/p/original/htGeuCcNhlBe8GTx3izKOsd8frw.jpg',
    image: 'https://image.tmdb.org/t/p/w500/A6JOsCdFFTxtbDnKAfE0iY6jOiE.jpg'
  },
  'el chacal': {
    backdrop: 'https://image.tmdb.org/t/p/original/enVrO8TRkdT8dmYXTfI4sEjR5Kp.jpg',
    image: 'https://image.tmdb.org/t/p/w500/faqXSU7eXffSxtyIX4EGyCITQpQ.jpg'
  },
  'piratas del caribe': {
    backdrop: 'https://image.tmdb.org/t/p/original/uRNgkJSkNBFbbn9fPsEjDIy8Sh3.jpg',
    image: 'https://image.tmdb.org/t/p/w500/8zHnkTGyAImBcI49a1xFJHUjbaK.jpg'
  },
  'arma mortal': {
    backdrop: 'https://image.tmdb.org/t/p/original/yqZ5ACKeNJ30mylUEzvtWZu4pGU.jpg',
    image: 'https://image.tmdb.org/t/p/w500/wP5ujjLHBWJFkwcExjwtGmhPagU.jpg'
  },
  'animales fantásticos': {
    backdrop: 'https://image.tmdb.org/t/p/original/8Qsr8pvDL3s1jNZQ4HK1d1Xlvnh.jpg',
    image: 'https://image.tmdb.org/t/p/w500/wduJFXlHQTIw1TBf6kTO3bHf2VN.jpg'
  },
  'así aprenderás': {
    backdrop: 'https://image.tmdb.org/t/p/original/vyG93jhmPL7tBIhRtCLa5mdBKob.jpg',
    image: 'https://image.tmdb.org/t/p/w500/lG83nWVT7cHl3nSxonaYhOjqyWH.jpg'
  },
  'el mentalista': {
    backdrop: 'https://image.tmdb.org/t/p/original/rJFqKcmMSttdNP58l0dVzY2NcTA.jpg',
    image: 'https://image.tmdb.org/t/p/w500/f3F6NA7A8TY8EjdIiGyYqoo38ug.jpg'
  },
  'harry potter colección': {
    backdrop: 'https://image.tmdb.org/t/p/original/8r4r9Qzp393epFaEv0FiB8ENen3.jpg',
    image: 'https://image.tmdb.org/t/p/original/pNeqCBGdEOhdaMTPlwdy1oJLG75.jpg'
  }
};

// Map Custom Anime data
const mapCustomAnime = (item) => {
  const isSingleMovie = Number(item.total_episodes) === 1;
  const isSagaCollection = /colecci[oó]n|saga/i.test(item.title);
  const isMovieOrSaga = isSingleMovie || isSagaCollection || 
    /pel[ií]cula|harry potter|piratas del caribe|arma mortal|animales fant[aá]sticos|deadpool/i.test(item.title);
  const isAnime = /berserk|mysteries|cube|anime/i.test(item.title) || 
    (Array.isArray(item.genres) && item.genres.includes('Animación') && !isMovieOrSaga);
  const isSeries = !isMovieOrSaga && !isAnime;

  const titleKey = (item.title || '').trim().toLowerCase();
  const enrichment = CUSTOM_MEDIA_ENRICHMENT[titleKey] || 
    Object.entries(CUSTOM_MEDIA_ENRICHMENT).find(([k]) => titleKey.includes(k))?.[1] || {};

  const posterImage = (item.image && item.image.includes('image.tmdb.org')) 
    ? item.image 
    : (enrichment.image || item.image || 'https://via.placeholder.com/225x318?text=No+Image');

  const backdropUrl = item.banner || enrichment.backdrop || null;
  const hasBackdrop = Boolean(backdropUrl);

  return {
    id: item.id,
    title: item.title,
    image: posterImage,
    banner: backdropUrl || posterImage || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920&q=95',
    backdrop: backdropUrl,
    hasBackdrop,
    score: item.score || 'N/A',
    totalEpisodes: isSingleMovie ? 1 : (item.total_episodes || null),
    episodes: isSingleMovie ? 1 : (item.total_episodes || null),
    type: isMovieOrSaga ? 'Película' : (isSeries ? 'Serie' : 'Anime'),
    contentType: isMovieOrSaga ? 'peliculas' : (isSeries ? 'series' : 'animes'),
    isMovie: isSingleMovie,
    isCollection: isSagaCollection,
    description: item.description || 'Sin sinopsis disponible.',
    genres: item.genres || [],
    status: item.status || 'En emisión',
    trailer: null,
    isCustom: true,
    is_secret: item.is_secret || false,
    episode_names: item.episode_names || {}
  };
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let lastRequestTime = 0;

const fetchWithDelay = async (url) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < 100) { 
    await delay(100 - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error en la petición: ${response.status}`);
  }
  return response.json();
};

const DB_CATALOG_ITEMS = {
  // === 13 Películas en anime_episodes ===
  '1242898': {
    id: 1242898,
    title: 'Depredador: Tierras salvajes',
    image: 'https://image.tmdb.org/t/p/w500/r7TEWHLr1lsIsTkiEFwtM3hAWma.jpg',
    banner: 'https://image.tmdb.org/t/p/original/82lM4GJ9uuNvNDOEpxFy77uv4Ak.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/82lM4GJ9uuNvNDOEpxFy77uv4Ak.jpg',
    hasBackdrop: true,
    score: '7.8',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'En el futuro, en un planeta remoto, un joven Depredador, marginado de su clan, encuentra un aliado inesperado en Thia y se embarca en un peligroso viaje en busca del adversario definitivo.',
    genres: ['Action & Adventure', 'Sci-Fi & Fantasy'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '1007734': {
    id: 1007734,
    title: 'Nadie 2',
    image: 'https://image.tmdb.org/t/p/w500/21agmmYf9mJo8QuphtkZA3R4gsG.jpg',
    banner: 'https://image.tmdb.org/t/p/original/82C04rTiXYZ7c8XZv91Nu53w82Y.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/82C04rTiXYZ7c8XZv91Nu53w82Y.jpg',
    hasBackdrop: true,
    score: '6.9',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'El ex asesino Hutch Mansell lleva a su familia a unas nostálgicas vacaciones a un parque temático de una pequeña ciudad, solo para volver a verse arrastrado a la violencia cuando se enfrentan a un operador corrupto, un sheriff corrupto y un despiadado jefe criminal.',
    genres: ['Action & Adventure', 'Drama'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '614933': {
    id: 614933,
    title: 'Atlas',
    image: 'https://image.tmdb.org/t/p/w500/wSnBSv7oHgm1kZmiM8IqithlTmJ.jpg',
    banner: 'https://image.tmdb.org/t/p/original/3TNSoa0UHGEzEz5ndXGjJVKo8RJ.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/3TNSoa0UHGEzEz5ndXGjJVKo8RJ.jpg',
    hasBackdrop: true,
    score: '6.6',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'Una analista antiterrorista que no confía en la inteligencia artificial descubre que esta puede ser su única esperanza cuando una misión para capturar a un robot rebelde sale mal.',
    genres: ['Sci-Fi & Fantasy', 'Action & Adventure'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '9313': {
    id: 9313,
    title: 'El hombre de la máscara de hierro',
    image: 'https://image.tmdb.org/t/p/w500/50Ug4tJ66gJ9ZgivMGzZnGkdw1p.jpg',
    banner: 'https://image.tmdb.org/t/p/original/uhhtglfXNaTavkKtjer38qHLfVi.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/uhhtglfXNaTavkKtjer38qHLfVi.jpg',
    hasBackdrop: true,
    score: '6.7',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'Francia se muere de hambre, mientras el Rey Luis XIV mantiene un reinado de terror. Sólo "los tres mosqueteros" podrán salir al rescate. Su misión: liberar a un misterioso prisionero en La Bastilla, en cuya identidad radica el secreto que podrá salvar a la nación...',
    genres: ['Action & Adventure', 'Drama'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '718930': {
    id: 718930,
    title: 'Tren bala',
    image: 'https://image.tmdb.org/t/p/w500/kM6iLHkDfyoMsTIm567mUFzFO9e.jpg',
    banner: 'https://image.tmdb.org/t/p/original/y2Ca1neKke2mGPMaHzlCNDVZqsK.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/y2Ca1neKke2mGPMaHzlCNDVZqsK.jpg',
    hasBackdrop: true,
    score: '7.4',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'El desafortunado asesino "Catarina" está decidido a hacer su trabajo pacíficamente después de que demasiados encargos se descarrilaron, pero el destino lo pone en curso de colisión con adversarios letales de todo el mundo en el tren más rápido del planeta.',
    genres: ['Action & Adventure', 'Comedia'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '1265609': {
    id: 1265609,
    title: 'Máquina de guerra',
    image: 'https://image.tmdb.org/t/p/w500/aq2vbzxcG5K3SSLReMqO5TettmE.jpg',
    banner: 'https://image.tmdb.org/t/p/original/6yeVcxFR0j08vlv2OlL6zbewm4D.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/6yeVcxFR0j08vlv2OlL6zbewm4D.jpg',
    hasBackdrop: true,
    score: '7.5',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'En su última misión de entrenamiento, un ingeniero de combate debe liderar a su unidad en una lucha por sobrevivir ante una amenaza inimaginable.',
    genres: ['Action & Adventure', 'Sci-Fi & Fantasy'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '550': {
    id: 550,
    title: 'El Club de la Pelea',
    image: 'https://image.tmdb.org/t/p/w500/bI0BhpswEApC0B17RhLZtRVPZiQ.jpg',
    banner: 'https://image.tmdb.org/t/p/original/c6OLXfKAk5BKeR6broC8pYiCquX.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/c6OLXfKAk5BKeR6broC8pYiCquX.jpg',
    hasBackdrop: true,
    score: '8.4',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'Un hombre consumido por el insomnio y una vida sin sentido conoce a Tyler Durden, un carismático anarquista que lo arrastra a un club secreto donde el dolor despierta algo dormido.',
    genres: ['Drama'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '283995': {
    id: 283995,
    title: 'Guardianes de la Galaxia volumen 2',
    image: 'https://image.tmdb.org/t/p/w500/kdg6Y06jfq9FV7qknWNcKLYtBJn.jpg',
    banner: 'https://image.tmdb.org/t/p/original/aJn9XeesqsrSLKcHfHP4u5985hn.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/aJn9XeesqsrSLKcHfHP4u5985hn.jpg',
    hasBackdrop: true,
    score: '7.6',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'Continúan las aventuras del equipo en su travesía por los confines del cosmos. Los Guardianes deberán luchar para mantener unida a su nueva familia mientras intentan resolver el misterio de los verdaderos orígenes de Peter Quill.',
    genres: ['Sci-Fi & Fantasy', 'Action & Adventure', 'Comedia'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '107846': {
    id: 107846,
    title: 'Plan de escape',
    image: 'https://image.tmdb.org/t/p/w500/8YpUgKQE7osYU7L49VE34PxVrKA.jpg',
    banner: 'https://image.tmdb.org/t/p/original/ix9WYBqQ2xSZCgyeQ1vVdrbaFa4.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/ix9WYBqQ2xSZCgyeQ1vVdrbaFa4.jpg',
    hasBackdrop: true,
    score: '6.7',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'Ray Breslin, un experto en seguridad carcelaria, se enfrenta a su mayor reto: escapar de la prisión que él mismo ha diseñado.',
    genres: ['Action & Adventure', 'Misterio'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '440471': {
    id: 440471,
    title: 'Plan de Escape 2',
    image: 'https://image.tmdb.org/t/p/w500/vyhtl0GJvGQqNNs3CzOrFtGCGYU.jpg',
    banner: 'https://image.tmdb.org/t/p/original/xIAaN3AQqaJiN5RJ0WsmBady8Hq.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/xIAaN3AQqaJiN5RJ0WsmBady8Hq.jpg',
    hasBackdrop: true,
    score: '5.2',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'El experto en seguridad Ray Breslin y su equipo élite regresan para rescatar a Shu Ren, un agente de confianza que ha sido secuestrado y confinado en Hades, la prisión de máxima seguridad más impenetrable del planeta.',
    genres: ['Action & Adventure', 'Sci-Fi & Fantasy', 'Misterio'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '480042': {
    id: 480042,
    title: 'Plan de Escape 3: El Rescate',
    image: 'https://image.tmdb.org/t/p/w500/AyLUHyEce0RNRwcjQQY2frhS7P.jpg',
    banner: 'https://image.tmdb.org/t/p/original/yxmfjj4YiFcJipn9nYVBRxeCvo9.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/yxmfjj4YiFcJipn9nYVBRxeCvo9.jpg',
    hasBackdrop: true,
    score: '5.4',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'El experto en seguridad Ray Breslin es contratado para rescatar a la hija de un magnate de la tecnología de Hong Kong que ha sido secuestrada en una prisión de Letonia.',
    genres: ['Action & Adventure', 'Drama'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '1062722': {
    id: 1062722,
    title: 'Frankenstein',
    image: 'https://image.tmdb.org/t/p/w500/hTj8x0ElKldJyAjTYvaqxkQNxxN.jpg',
    banner: 'https://image.tmdb.org/t/p/original/hpXBJxLD2SEf8l2CspmSeiHrBKX.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/hpXBJxLD2SEf8l2CspmSeiHrBKX.jpg',
    hasBackdrop: true,
    score: '7.6',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'El Dr. Victor Frankenstein, un científico brillante pero egoísta, da vida a una criatura en un monstruoso experimento que finalmente conduce a la ruina tanto del creador como de su trágica creación.',
    genres: ['Drama', 'Sci-Fi & Fantasy'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '533533': {
    id: 533533,
    title: 'TRON: Ares',
    image: 'https://image.tmdb.org/t/p/w500/dz1PbMrkpVhURKtvv7w2Ib1iZDK.jpg',
    banner: 'https://image.tmdb.org/t/p/original/pUNfHmVqfwRdILhCkU8TdysVOXo.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/pUNfHmVqfwRdILhCkU8TdysVOXo.jpg',
    hasBackdrop: true,
    score: '6.5',
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: 'Un programa altamente sofisticado llamado Ares es enviado del mundo digital al mundo real en una misión peligrosa, marcando el primer encuentro de la humanidad con seres de IA.',
    genres: ['Sci-Fi & Fantasy', 'Action & Adventure'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },

  // === 7 Series con TMDB ID en anime_episodes ===
  '202411': {
    id: 202411,
    title: 'Monarch: Legado de monstruos',
    image: 'https://image.tmdb.org/t/p/w500/66Ofbs8H1ZiYVjxaG6OWIev4xrR.jpg',
    banner: 'https://image.tmdb.org/t/p/original/n5FGEUmId87nZAdFiOFmCKXynmT.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/n5FGEUmId87nZAdFiOFmCKXynmT.jpg',
    hasBackdrop: true,
    score: '7.7',
    totalEpisodes: 20,
    episodes: 20,
    number_of_seasons: 2,
    type: 'Serie',
    contentType: 'series',
    isMovie: false,
    description: 'Después de haber sobrevivido al ataque de Godzilla en San Francisco, Cate se embarca en una aventura por todo el mundo para saber la verdad sobre su familia y la misteriosa organización conocida como Monarch.',
    genres: ['Sci-Fi & Fantasy', 'Drama', 'Action & Adventure'],
    status: 'En emisión',
    isCustom: false,
    isSecret: false
  },
  '228878': {
    id: 228878,
    title: 'Efectos colaterales',
    image: 'https://image.tmdb.org/t/p/w500/rYsLEca2TwkABX5c04LuKZdjSTG.jpg',
    banner: 'https://image.tmdb.org/t/p/original/4drV6iluttgjZmU1Q0xDqjrBQ1.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/4drV6iluttgjZmU1Q0xDqjrBQ1.jpg',
    hasBackdrop: true,
    score: '8.5',
    totalEpisodes: 10,
    episodes: 10,
    number_of_seasons: 1,
    type: 'Serie',
    contentType: 'series',
    isMovie: false,
    description: 'Marshall y Frances, dos excompañeros que comparten un secreto: descubrieron la mejor medicina del mundo, un hongo que puede curar casi cualquier cosa.',
    genres: ['Animación', 'Drama', 'Comedia', 'Sci-Fi & Fantasy'],
    status: 'En emisión',
    isCustom: false,
    isSecret: false
  },
  '95350': {
    id: 95350,
    title: 'Linternas',
    image: 'https://image.tmdb.org/t/p/w500/t6Ub9GTbw6uwphRZQQiQlKim0vO.jpg',
    banner: 'https://image.tmdb.org/t/p/original/wJjnJbVUwPz0GADAgpFt9nWtzUu.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/wJjnJbVUwPz0GADAgpFt9nWtzUu.jpg',
    hasBackdrop: true,
    score: '8.3',
    totalEpisodes: 8,
    episodes: 8,
    number_of_seasons: 1,
    type: 'Serie',
    contentType: 'series',
    isMovie: false,
    description: 'El nuevo recluta John Stewart y la leyenda Hal Jordan, dos policías intergalácticos, se ven envueltos en un oscuro misterio terrestre mientras investigan un asesinato en el corazón de Estados Unidos.',
    genres: ['Drama', 'Misterio', 'Sci-Fi & Fantasy'],
    status: 'En emisión',
    isCustom: false,
    isSecret: false
  },
  '291339': {
    id: 291339,
    title: 'Memoria de un Asesino',
    image: 'https://image.tmdb.org/t/p/w500/79EO16C4zs8fwxKEjRENVvIQHIB.jpg',
    banner: 'https://image.tmdb.org/t/p/original/llrSuUkFiR6EjDnh79dq8HEeziF.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/llrSuUkFiR6EjDnh79dq8HEeziF.jpg',
    hasBackdrop: true,
    score: '7.8',
    totalEpisodes: 10,
    episodes: 10,
    number_of_seasons: 1,
    type: 'Serie',
    contentType: 'series',
    isMovie: false,
    description: 'Angelo lleva una doble vida, como asesino y como padre de familia, y todo funcionaba bien hasta que le sobrevino un principio de Alzheimer. Ahora sus mundos chocan, poniendo a su familia en peligro.',
    genres: ['Drama', 'Misterio'],
    status: 'En emisión',
    isCustom: false,
    isSecret: false
  },
  '226362': {
    id: 226362,
    title: 'El Eternauta',
    image: 'https://image.tmdb.org/t/p/w500/9Krv5NvKa5a3Q3b1l2B3rP9Bj8E.jpg',
    banner: 'https://image.tmdb.org/t/p/original/yMjGzK7L4gwzpQNNtFKDeG79upo.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/yMjGzK7L4gwzpQNNtFKDeG79upo.jpg',
    hasBackdrop: true,
    score: '7.4',
    totalEpisodes: 6,
    episodes: 6,
    number_of_seasons: 1,
    type: 'Serie',
    contentType: 'series',
    isMovie: false,
    description: 'Después de una nevada mortal que acaba con gran parte de la población, Juan Salvo y un grupo de sobrevivientes en Buenos Aires deben resistir a una amenaza de otro planeta.',
    genres: ['Drama', 'Action & Adventure', 'Sci-Fi & Fantasy'],
    status: 'En emisión',
    isCustom: false,
    isSecret: false
  },
  '127529': {
    id: 127529,
    title: 'Sabuesos',
    image: 'https://image.tmdb.org/t/p/w500/pWzp4HpDifuyNF8zkPIy8MKCg2d.jpg',
    banner: 'https://image.tmdb.org/t/p/original/zhsEnDNCQX5dlI2wbKzV90pV0B9.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/zhsEnDNCQX5dlI2wbKzV90pV0B9.jpg',
    hasBackdrop: true,
    score: '8.5',
    totalEpisodes: 15,
    episodes: 15,
    number_of_seasons: 2,
    type: 'Serie',
    contentType: 'series',
    isMovie: false,
    description: 'Dos jóvenes boxeadores unen fuerzas con un benévolo prestamista para destruir a un despiadado usurero que se aprovecha de los más vulnerables.',
    genres: ['Drama', 'Action & Adventure'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  '278624': {
    id: 278624,
    title: 'Lucky',
    image: 'https://image.tmdb.org/t/p/w500/vZ3GfOoeha2xVCPec0jv2jf3yfC.jpg',
    banner: 'https://image.tmdb.org/t/p/original/mKrhRPB7rMvy0bIU1l1NYhgh1eI.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/mKrhRPB7rMvy0bIU1l1NYhgh1eI.jpg',
    hasBackdrop: true,
    score: '7.3',
    totalEpisodes: 7,
    episodes: 7,
    number_of_seasons: 1,
    type: 'Serie',
    contentType: 'series',
    isMovie: false,
    description: 'Cuando un robo multimillonario sale mal, la estafadora Lucky se ve obligada a escapar. Perseguida por el FBI y un despiadado jefe militar, Lucky debe pelear por su vida y por una salida.',
    genres: ['Drama', 'Action & Adventure'],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  }
};

const DB_CATALOG_LIST = [
  DB_CATALOG_ITEMS['1242898'],
  DB_CATALOG_ITEMS['1007734'],
  DB_CATALOG_ITEMS['614933'],
  DB_CATALOG_ITEMS['9313'],
  DB_CATALOG_ITEMS['718930'],
  DB_CATALOG_ITEMS['1265609'],
  DB_CATALOG_ITEMS['550'],
  DB_CATALOG_ITEMS['283995'],
  DB_CATALOG_ITEMS['107846'],
  DB_CATALOG_ITEMS['440471'],
  DB_CATALOG_ITEMS['480042'],
  DB_CATALOG_ITEMS['1062722'],
  DB_CATALOG_ITEMS['533533'],
  DB_CATALOG_ITEMS['202411'],
  DB_CATALOG_ITEMS['228878'],
  DB_CATALOG_ITEMS['95350'],
  DB_CATALOG_ITEMS['291339'],
  DB_CATALOG_ITEMS['226362'],
  DB_CATALOG_ITEMS['127529'],
  DB_CATALOG_ITEMS['278624']
];

const dedupeCatalogList = (items) => {
  const seenIds = new Set();
  const seenTitles = new Set();
  const result = [];
  for (const item of items) {
    if (!item || !item.id) continue;
    const idStr = String(item.id).trim();
    const titleNorm = (item.title || '').trim().toLowerCase();
    if (seenIds.has(idStr) || (titleNorm && seenTitles.has(titleNorm))) continue;
    seenIds.add(idStr);
    if (titleNorm) seenTitles.add(titleNorm);
    result.push(item);
  }
  return result;
};

export const api = {
  // ADMIN & CUSTOM API
  getUsers: async () => {
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  getAdmins: async () => {
    const { data } = await supabase.from('admins').select('*');
    return data || [];
  },
  isAdmin: async (email) => {
    if (!email) return false;
    const { data } = await supabase.from('admins').select('*').eq('email', email);
    return data && data.length > 0;
  },
  toggleAdmin: async (email, makeAdmin) => {
    if (makeAdmin) {
      await supabase.from('admins').insert([{ email }]);
    } else {
      await supabase.from('admins').delete().eq('email', email);
    }
  },
  addCustomAnime: async (animeData) => {
    try {
      const id = `custom-${Date.now()}`;
      const payload = { ...animeData, id };
      const { data, error } = await supabase.from('custom_animes').insert([payload]).select();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding custom anime:', error);
      throw error;
    }
  },

  updateCustomAnime: async (id, animeData) => {
    try {
      const { data, error } = await supabase.from('custom_animes').update(animeData).eq('id', id).select();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating custom anime:', error);
      throw error;
    }
  },

  deleteCustomAnime: async (id) => {
     await supabase.from('custom_animes').delete().eq('id', id);
  },
  getCustomAnimes: async (includeSecret = false) => {
     let query = supabase.from('custom_animes').select('*').order('created_at', { ascending: false });
     if (!includeSecret) {
        query = query.eq('is_secret', false);
     }
     const { data } = await query;
     return data ? data.map(mapCustomAnime) : [];
  },
  getCatalogAnimes: async (includeSecret = false) => {
     const customAnimes = await api.getCustomAnimes(includeSecret);
     return dedupeCatalogList([...DB_CATALOG_LIST, ...customAnimes]);
  },

  // Inicio - Populares (Trending)
  getTrendingAnime: async () => {
    try {
      const catalogAnimes = await api.getCatalogAnimes(false);
      const url1 = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=popularity.desc&page=1&include_adult=false`;
      const url2 = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=popularity.desc&page=2&include_adult=false`;
      const [res1, res2] = await Promise.all([ fetchWithDelay(url1), fetchWithDelay(url2) ]);
      const combined = [...(res1?.results || []), ...(res2?.results || [])].map(mapAnimeData);
      return dedupeCatalogList([...catalogAnimes, ...combined]);
    } catch (error) {
      console.error('Error fetching trending anime:', error);
      return [];
    }
  },

  // Inicio - Top Anime
  getTopAnime: async () => {
    try {
      const catalogAnimes = await api.getCatalogAnimes(false);
      const url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=500&page=1&include_adult=false`;
      const data = await fetchWithDelay(url);
      return dedupeCatalogList([...catalogAnimes.slice(0, 8), ...data.results.map(mapAnimeData)]);
    } catch (error) {
      console.error('Error fetching top anime:', error);
      return [];
    }
  },

  // Inicio - Recientes
  getRecentAnime: async () => {
    try {
      const catalogAnimes = await api.getCatalogAnimes(false);
      const url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=first_air_date.desc&page=1&include_adult=false`;
      const data = await fetchWithDelay(url);
      return dedupeCatalogList([...catalogAnimes, ...data.results.map(mapAnimeData)]);
    } catch (error) {
      console.error('Error fetching recent anime:', error);
      return [];
    }
  },

  // Descubrir (Para el Catálogo)
  getDiscoverAnime: async (page = 1, genreName = 'Todos', typeFilter = 'todos') => {
    try {
      let customAnimes = [];
      if (page === 1) {
        customAnimes = await api.getCatalogAnimes(false);
        
        // Filtrar por tipo si no es 'todos'
        if (typeFilter && typeFilter !== 'todos') {
          customAnimes = customAnimes.filter(ca => ca.contentType === typeFilter);
        }

        // Filtrar por género si no es 'Todos'
        if (genreName !== 'Todos') {
          customAnimes = customAnimes.filter(ca => ca.genres && ca.genres.includes(genreName));
        }
      }

      let url = '';
      if (typeFilter === 'peliculas') {
        const movieGenreId = {
          'Animación': 16,
          'Action & Adventure': 28,
          'Sci-Fi & Fantasy': 878,
          'Comedia': 35,
          'Drama': 18,
          'Misterio': 9648
        }[genreName];
        
        url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-MX&sort_by=popularity.desc&page=${page}&include_adult=false`;
        if (genreName !== 'Todos' && movieGenreId) {
          url += `&with_genres=${movieGenreId}`;
        }
      } else if (typeFilter === 'series') {
        url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&without_original_language=ja&sort_by=popularity.desc&page=${page}&include_adult=false`;
        if (genreName !== 'Todos' && TMDB_GENRES[genreName]) {
          url += `&with_genres=${TMDB_GENRES[genreName]}`;
        }
      } else if (typeFilter === 'animes') {
        url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=popularity.desc&page=${page}&include_adult=false`;
        if (genreName !== 'Todos' && TMDB_GENRES[genreName]) {
          url += `&with_genres=${TMDB_GENRES[genreName]}`;
        }
      } else {
        // 'todos': anime japonés + nuestro catálogo de películas y series
        url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=popularity.desc&page=${page}&include_adult=false`;
        if (genreName !== 'Todos' && TMDB_GENRES[genreName]) {
          url += `&with_genres=${TMDB_GENRES[genreName]}`;
        }
      }

      const data = await fetchWithDelay(url);
      const mapped = (data.results || []).map(mapAnimeData);
      return dedupeCatalogList([...customAnimes, ...mapped]);
    } catch (error) {
      console.error('Error fetching discover anime:', error);
      return [];
    }
  },

  // Detalles del Anime o Película
  getAnimeInfo: async (id, preferredType = null) => {
    try {
      if (!id) return null;
      const strId = String(id).trim();

      if (strId.startsWith('custom-')) {
         const { data } = await supabase.from('custom_animes').select('*').eq('id', strId).single();
         return data ? mapCustomAnime(data) : null;
      }

      if (DB_CATALOG_ITEMS[strId]) {
         return { ...DB_CATALOG_ITEMS[strId] };
      }

      // 1. Verificar si este TMDB ID está registrado en anime_episodes de Supabase (por ejemplo: Lucky ID 278624, Harry Potter 1 ID 671, etc.)
      try {
        const { data: dbRows } = await supabase
          .from('anime_episodes')
          .select('anime_tmdb_id, search_title, episode_name, episode_number')
          .eq('anime_tmdb_id', strId)
          .limit(1);

        if (dbRows && dbRows.length > 0) {
          const row = dbRows[0];
          const searchClean = (row.search_title || '').trim().toLowerCase();
          const epNameClean = (row.episode_name || '').trim().toLowerCase();

          const [tvData, movieData] = await Promise.all([
            fetchWithDelay(`${BASE_URL}/tv/${strId}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=videos`).catch(() => null),
            fetchWithDelay(`${BASE_URL}/movie/${strId}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=videos`).catch(() => null)
          ]);

          const tvTitle = (tvData?.name || tvData?.original_name || '').trim().toLowerCase();
          const movieTitle = (movieData?.title || movieData?.original_title || '').trim().toLowerCase();

          const tvMatchesSearch = tvTitle && (searchClean.includes(tvTitle) || tvTitle.includes(searchClean));
          const movieMatchesSearch = movieTitle && (searchClean.includes(movieTitle) || movieTitle.includes(searchClean) || epNameClean.includes(movieTitle) || movieTitle.includes(epNameClean));

          // Si coincide la serie de TV (ej. Lucky), devolver TV
          if (tvData && tvData.id && tvMatchesSearch && !movieMatchesSearch) {
            return mapAnimeData(tvData);
          }

          // Si coincide la Película (ej. saga Harry Potter), devolver Película enriquecida
          if (movieData && movieData.id && movieMatchesSearch && !tvMatchesSearch) {
            const mapped = mapAnimeData({ ...movieData, media_type: 'movie' });
            mapped.saga_collection_title = row.search_title;
            mapped.saga_episode_name = row.episode_name;
            mapped.saga_episode_number = row.episode_number;
            return mapped;
          }

          // Si ambos o ninguno coinciden por nombre, comparar por votos/popularidad
          if (tvData && tvData.id && movieData && movieData.id) {
            const tvVotes = Number(tvData.vote_count || 0);
            const movieVotes = Number(movieData.vote_count || 0);
            if (movieVotes > tvVotes * 3) {
              const mapped = mapAnimeData({ ...movieData, media_type: 'movie' });
              mapped.saga_collection_title = row.search_title;
              mapped.saga_episode_name = row.episode_name;
              mapped.saga_episode_number = row.episode_number;
              return mapped;
            }
            return mapAnimeData(tvData);
          }

          if (tvData && tvData.id) return mapAnimeData(tvData);
          if (movieData && movieData.id) {
            const mapped = mapAnimeData({ ...movieData, media_type: 'movie' });
            mapped.saga_collection_title = row.search_title;
            mapped.saga_episode_name = row.episode_name;
            mapped.saga_episode_number = row.episode_number;
            return mapped;
          }
        }
      } catch (err) {}

      // 2. Si se solicitó explícitamente tipo película
      const wantsMovie = preferredType === 'movie' || preferredType === 'Película' || preferredType === 'peliculas';
      if (wantsMovie) {
        try {
          const movieUrl = `${BASE_URL}/movie/${strId}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=videos`;
          const movieData = await fetchWithDelay(movieUrl);
          if (movieData && (movieData.title || movieData.original_title)) {
            return mapAnimeData({ ...movieData, media_type: 'movie' });
          }
        } catch {}
      }

      // 3. Desambiguación inteligente entre TV y Película en TMDB
      let tvData = null;
      let movieData = null;

      try {
        const tvUrl = `${BASE_URL}/tv/${strId}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=videos`;
        tvData = await fetchWithDelay(tvUrl);
      } catch {}

      try {
        const movieUrl = `${BASE_URL}/movie/${strId}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=videos`;
        movieData = await fetchWithDelay(movieUrl);
      } catch {}

      if (tvData && movieData) {
        // Comparar votos y relevancia: por ejemplo Harry Potter (27k votos) vs Moolah Beach (1 voto)
        const movieVotes = Number(movieData.vote_count || 0);
        const tvVotes = Number(tvData.vote_count || 0);
        if (movieVotes > tvVotes * 5) {
          return mapAnimeData({ ...movieData, media_type: 'movie' });
        }
        return mapAnimeData(tvData);
      }

      if (tvData) return mapAnimeData(tvData);
      if (movieData) return mapAnimeData({ ...movieData, media_type: 'movie' });

      return null;
    } catch (error) {
      console.error('Error fetching anime info:', error);
      return null;
    }
  },

  // Búsqueda General (Navbar)
  searchAnime: async (query) => {
    try {
      if (!query) return [];
      const customAnimes = await api.getCatalogAnimes(true);
      const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 0);
      
      const matchedCustom = customAnimes.filter(ca => {
        if (ca.isSecret) return false;
        const titleLower = ca.title.toLowerCase();
        return queryWords.every(word => titleLower.includes(word));
      });

      const url = `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(query)}&include_adult=false`;
      const data = await fetchWithDelay(url);
      const animes = data.results.filter(item => item.original_language === 'ja');
      return dedupeCatalogList([...matchedCustom, ...animes.map(mapAnimeData)]);
    } catch (error) {
      console.error('Error searching anime:', error);
      return [];
    }
  },

  // Búsqueda Dedicada para el Catálogo (Soporta Películas, Sagas, Series y Anime)
  searchCatalog: async (query, typeFilter = 'todos', genreName = 'Todos') => {
    try {
      if (!query || !query.trim()) return [];
      const cleanQ = query.trim().toLowerCase();
      const queryWords = cleanQ.split(/\s+/).filter(Boolean);

      // 1. Buscar en catálogo de Supabase (DB_CATALOG_ITEMS + custom_animes)
      const customAnimes = await api.getCatalogAnimes(false);
      let matchedCustom = customAnimes.filter(ca => {
        const titleLower = (ca.title || '').toLowerCase();
        const descLower = (ca.description || '').toLowerCase();
        return queryWords.every(w => titleLower.includes(w) || descLower.includes(w));
      });

      if (typeFilter && typeFilter !== 'todos') {
        matchedCustom = matchedCustom.filter(ca => ca.contentType === typeFilter);
      }
      if (genreName && genreName !== 'Todos') {
        matchedCustom = matchedCustom.filter(ca => ca.genres && ca.genres.includes(genreName));
      }

      // 2. Buscar en TMDB según el tipo
      let tmdbResults = [];

      if (typeFilter === 'peliculas') {
        const movieUrl = `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(cleanQ)}&include_adult=false`;
        const data = await fetchWithDelay(movieUrl);
        tmdbResults = (data.results || []).map(item => mapAnimeData({ ...item, media_type: 'movie' }));
      } else if (typeFilter === 'series') {
        const tvUrl = `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(cleanQ)}&include_adult=false`;
        const data = await fetchWithDelay(tvUrl);
        tmdbResults = (data.results || [])
          .filter(item => item.original_language !== 'ja')
          .map(mapAnimeData);
      } else if (typeFilter === 'animes') {
        const tvUrl = `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(cleanQ)}&include_adult=false`;
        const data = await fetchWithDelay(tvUrl);
        tmdbResults = (data.results || [])
          .filter(item => item.original_language === 'ja')
          .map(mapAnimeData);
      } else {
        // 'todos': Buscar en paralelo tanto películas como series/anime
        const movieUrl = `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(cleanQ)}&include_adult=false`;
        const tvUrl = `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(cleanQ)}&include_adult=false`;
        const [movieRes, tvRes] = await Promise.all([
          fetchWithDelay(movieUrl).catch(() => ({ results: [] })),
          fetchWithDelay(tvUrl).catch(() => ({ results: [] }))
        ]);
        const mappedMovies = (movieRes?.results || []).map(item => mapAnimeData({ ...item, media_type: 'movie' }));
        const mappedTv = (tvRes?.results || []).map(mapAnimeData);
        tmdbResults = [...mappedMovies, ...mappedTv];
      }

      if (genreName && genreName !== 'Todos') {
        tmdbResults = tmdbResults.filter(item => item.genres && item.genres.includes(genreName));
      }

      return dedupeCatalogList([...matchedCustom, ...tmdbResults]);
    } catch (error) {
      console.error('Error searching catalog:', error);
      return [];
    }
  },

  // Episodios
  getAnimeEpisodes: async (id, totalEpisodesHint = null) => {
    try {
      if (String(id).startsWith('custom-')) {
         const { data: customData } = await supabase.from('custom_animes').select('*').eq('id', id).single();
         if (!customData) return [];
         
         const isSingleCustomMovie = Number(customData.total_episodes) === 1;

         // Buscar episodios scrapeados en la BD para heredar nombres y temporadas
         const { data: scrapedEps } = await supabase
            .from('anime_episodes')
            .select('episode_number, season_number, episode_name')
            .ilike('search_title', customData.title)
            .order('episode_number', { ascending: true });

         if (scrapedEps && scrapedEps.length > 0) {
             const uniqueEps = [];
             const seen = new Set();
             for (const ep of scrapedEps) {
                if (!seen.has(ep.episode_number)) {
                    seen.add(ep.episode_number);
                    uniqueEps.push(ep);
                }
             }
             uniqueEps.sort((a,b) => a.episode_number - b.episode_number);

             let absCount = 1;

             return uniqueEps.map((ep) => {
                 const s = ep.season_number || 1;
                 
                 let customName = null;
                 const customEp = customData.episode_names?.[ep.episode_number] || customData.episode_names?.[String(ep.episode_number)];
                 if (customEp && typeof customEp === 'object') {
                    customName = customEp.name || customEp.title;
                 } else if (typeof customEp === 'string' && customEp.trim()) {
                    customName = customEp.replace(/^T\d+E\d+\s*[-:]*\s*/i, '');
                 }

                 let finalName = ep.episode_name;
                 if (!finalName || finalName.match(/^Episodio\s+\d+$/i)) {
                    finalName = customName || finalName || ('Episodio ' + ep.episode_number);
                 }

                 return {
                     id: ep.episode_number,
                     title: finalName,
                     url: ep.episode_number,
                     season: s,
                     absolute_id: absCount++
                 };
             });
         }

         const names = customData.episode_names || {};
         const total = isSingleCustomMovie ? 1 : (customData.total_episodes || Math.max(Object.keys(names).length, 1));
         return Array.from({ length: total }, (_, i) => {
           const epNum = i + 1;
           const epVal = names[epNum] || names[String(epNum)];
           let epSeason = 1;
           let epTitle = isSingleCustomMovie ? (customData.title || 'Película Completa') : `T1E${epNum}`;

           if (epVal && typeof epVal === 'object') {
             epSeason = Number(epVal.season) || 1;
             epTitle = epVal.name || epVal.title || `T${epSeason}E${epVal.episode || epNum}`;
           } else if (typeof epVal === 'string' && epVal.trim()) {
             epTitle = epVal;
             const match = epVal.match(/^T(\d+)E/i) || epVal.match(/^Temporada\s*(\d+)/i);
             if (match) {
               epSeason = parseInt(match[1], 10);
             }
           }

           return {
             id: epNum,
             tmdb_episode_id: epNum,
             title: epTitle,
             url: epNum,
             season: epSeason,
             absolute_id: epNum
           };
         });
      }

      const info = await api.getAnimeInfo(id);
      if (!info) return [];
      
      // Si es una película (TMDB movie, totalEpisodes=1, o tipo Película), SIEMPRE 1 solo episodio
      if (info.type === 'Película' || info.contentType === 'peliculas' || info.isMovie || Number(info.totalEpisodes) === 1 || Number(totalEpisodesHint) === 1) {
        return [{
          id: 1,
          tmdb_episode_id: 1,
          title: info.title || 'Película Completa',
          url: 1,
          season: 1,
          isMovie: true
        }];
      }

      let dbMaxEpisode = 0;
      let dbEps = [];
      try {
        const { data } = await supabase
          .from('anime_episodes')
          .select('episode_number, season_number, episode_name')
          .eq('anime_tmdb_id', String(info.id))
          .order('episode_number', { ascending: false });
          
        if (data && data.length > 0) {
           dbEps = data;
           dbMaxEpisode = data[0].episode_number;
        }
      } catch (e) { console.error("Error al consultar Supabase episodios", e); }

      // Si es una serie de nuestro catálogo verificado (DB_CATALOG_ITEMS) y ya tiene episodios en Supabase, construir directamente desde dbEps deduplicados
      if (DB_CATALOG_ITEMS[String(info.id)] && dbEps.length > 0) {
        const byEpNum = new Map();
        for (const ep of dbEps) {
          const epNum = Number(ep.episode_number);
          const existing = byEpNum.get(epNum);
          if (!existing || (!existing.episode_name && ep.episode_name) || (/^Episodio\s+\d+$/i.test(existing.episode_name || '') && ep.episode_name && !/^Episodio\s+\d+$/i.test(ep.episode_name))) {
            byEpNum.set(epNum, ep);
          }
        }
        const sortedUnique = Array.from(byEpNum.values()).sort((a, b) => a.episode_number - b.episode_number);
        return sortedUnique.map((ep, idx) => ({
          id: ep.episode_number,
          tmdb_episode_id: ep.episode_number,
          title: ep.episode_name || `Episodio ${ep.episode_number}`,
          url: ep.episode_number,
          season: ep.season_number || 1,
          absolute_id: idx + 1
        }));
      }

      const numSeasons = info.number_of_seasons || 1; 
      let allEpisodes = [];
      let absoluteEpCount = 1;

      for (let s = 1; s <= numSeasons; s++) {
        const seasonUrl = `${BASE_URL}/tv/${id}/season/${s}?api_key=${TMDB_API_KEY}&language=es-MX`;
        try {
          const seasonData = await fetchWithDelay(seasonUrl);
          if (seasonData.episodes && seasonData.episodes.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const seasonEps = seasonData.episodes
              .filter(ep => !ep.air_date || ep.air_date <= today)
              .map(ep => ({
                id: ep.episode_number,
                title: `T${s}E${ep.episode_number} - ${ep.name}`,
                url: ep.episode_number,
                season: s,
                absolute_id: absoluteEpCount++ 
              }));
            allEpisodes = [...allEpisodes, ...seasonEps];
          }
        } catch (e) {
          console.error(`Error fetching season ${s}`, e);
        }
      }

      const findBestDbEp = (epNum) => {
        if (!dbEps || dbEps.length === 0) return {};
        return (
          dbEps.find(e => e.episode_number === epNum && e.episode_name && !/^Episodio\s+\d+$/i.test(e.episode_name)) ||
          dbEps.find(e => e.episode_number === epNum && e.episode_name) ||
          dbEps.find(e => e.episode_number === epNum) ||
          {}
        );
      };

      let finalEpisodes = allEpisodes;
      if (allEpisodes.length > 0) {
        finalEpisodes = allEpisodes.map((ep, index) => {
          const dbEpInfo = findBestDbEp(index + 1);
          
          return {
            ...ep,
            title: dbEpInfo.episode_name || ep.title || `Episodio ${index + 1}`,
            season: dbEpInfo.season_number || ep.season || 1,
            tmdb_episode_id: ep.id,
            id: ep.absolute_id 
          };
        });
      }

      if (finalEpisodes.length < dbMaxEpisode) {
          const startingId = finalEpisodes.length + 1;
          for (let i = startingId; i <= dbMaxEpisode; i++) {
              const dbEpInfo = findBestDbEp(i);
              finalEpisodes.push({
                  id: i,
                  tmdb_episode_id: i,
                  title: dbEpInfo.episode_name || `Episodio ${i} (Extra)`,
                  url: i,
                  season: dbEpInfo.season_number || 1
              });
          }
      }

      if (finalEpisodes.length > 0) return finalEpisodes;
      
      const total = info.number_of_episodes || (info.type === 'Película' ? 1 : 12);
      return Array.from({ length: total }, (_, i) => ({
        id: i + 1,
        tmdb_episode_id: i + 1,
        title: `Episodio ${i + 1}`,
        url: i + 1,
        season: 1
      }));
    } catch (error) {
      console.error('Error fetching anime episodes:', error);
      return [];
    }
  },

  // Obtener servidores vinculados (Soporta anime_tmdb_id, episode_name, search_title y colecciones)
  getEpisodeServers: async (animeTitle, episodeId, language = 'sub', animeId = null, seasonNumber = 1) => {
    const cleanTitle = (animeTitle || '').trim();
    const shortTitle = cleanTitle.split(/[:\-\(]/)[0].trim();
    let serversData = [];

    try {
      // 1. Prioridad: Buscar por anime_tmdb_id si está provisto (ej. '671', '941', 'custom-...')
      if (animeId) {
        const idStr = String(animeId).trim();
        let q = supabase.from('anime_episodes').select('*').eq('anime_tmdb_id', idStr);
        // Si no es un ID custom y episodeId > 1, podemos verificar episode_number
        if (!idStr.startsWith('custom-')) {
          q = q.eq('episode_number', episodeId);
        }
        const { data: byIdData } = await q.order('created_at', { ascending: false });
        if (byIdData && byIdData.length > 0) {
          serversData = byIdData;
        } else if (!idStr.startsWith('custom-')) {
          // Si no encontró con episode_number específico para película, probar sin filtro de episode_number
          const { data: anyById } = await supabase.from('anime_episodes').select('*').eq('anime_tmdb_id', idStr);
          if (anyById && anyById.length > 0) {
            serversData = anyById;
          }
        }
      }

      // 2. Prioridad: Buscar por search_title clásico con episode_number (la serie o anime real)
      if (serversData.length === 0 && cleanTitle) {
        const { data: bySearchTitle } = await supabase
          .from('anime_episodes')
          .select('*')
          .ilike('search_title', cleanTitle)
          .eq('episode_number', episodeId)
          .order('created_at', { ascending: false });

        if (bySearchTitle && bySearchTitle.length > 0) {
          serversData = bySearchTitle;
        } else if (shortTitle && shortTitle !== cleanTitle) {
          const { data: byShortSearch } = await supabase
            .from('anime_episodes')
            .select('*')
            .ilike('search_title', shortTitle)
            .eq('episode_number', episodeId)
            .order('created_at', { ascending: false });
          if (byShortSearch && byShortSearch.length > 0) {
            serversData = byShortSearch;
          }
        }
      }

      // 3. Prioridad: Buscar por episode_name (para películas individuales registradas en sagas/colecciones, ej. Harry Potter)
      if (serversData.length === 0 && cleanTitle) {
        const { data: byEpName } = await supabase
          .from('anime_episodes')
          .select('*')
          .ilike('episode_name', `%${cleanTitle}%`)
          .order('created_at', { ascending: false });

        if (byEpName && byEpName.length > 0) {
          serversData = byEpName;
        } else if (shortTitle && shortTitle !== cleanTitle) {
          const { data: byShortName } = await supabase
            .from('anime_episodes')
            .select('*')
            .ilike('episode_name', `%${shortTitle}%`)
            .order('created_at', { ascending: false });
          if (byShortName && byShortName.length > 0) {
            serversData = byShortName;
          }
        }
      }

      // 4. Si aún no encuentra, buscar en search_title genérico
      if (serversData.length === 0 && cleanTitle) {
        const { data: broadData } = await supabase
          .from('anime_episodes')
          .select('*')
          .ilike('search_title', `%${cleanTitle}%`)
          .order('created_at', { ascending: false });
        if (broadData && broadData.length > 0) {
          const matched = broadData.filter(d => Number(d.episode_number) === Number(episodeId));
          if (matched.length > 0) serversData = matched;
          else serversData = broadData.slice(0, 5);
        }
      }

      if (serversData.length > 0) {
        let servers = serversData.map(lat => ({
          name: lat.server_name,
          description: `Servidor Oficial (${(lat.language || 'SUB').toUpperCase()})`,
          url: lat.video_url,
          color: lat.server_name.includes('FILEMOON') ? '#3b82f6' : 
                 lat.server_name.includes('EARNVIDS') ? '#10b981' : 
                 lat.server_name.includes('STREAMWISH') ? '#8b5cf6' : 
                 lat.server_name.includes('ZOPLAYER') ? '#f59e0b' : '#64748b',
          icon: 'S',
          lang: lat.language || 'sub',
          skip_start: lat.skip_start || null,
          skip_end: lat.skip_end || null,
          outro_start: lat.outro_start || null
        }));

        return servers.filter((server, index, self) =>
          index === self.findIndex((t) => t.url === server.url)
        );
      }
    } catch (e) {
      console.error("No se pudo obtener el servidor de Supabase", e);
    }

    return [{
      name: 'No Disponible',
      description: 'Este episodio aún no se ha agregado al catálogo.',
      url: '',
      color: '#4b5563',
      icon: 'X',
      lang: 'none'
    }];
  },

  // Obtener Información de Saga o Colección Vinculada (Harry Potter, Arma Mortal, etc.)
  getSagaInfo: async (animeId, animeTitle) => {
    try {
      const cleanTitle = (animeTitle || '').trim().toLowerCase();
      const strId = String(animeId || '').trim();

      // Buscar si este anime tiene filas en anime_episodes
      let { data: collEps } = await supabase
        .from('anime_episodes')
        .select('anime_tmdb_id, search_title, episode_name, episode_number, season_number')
        .or(`search_title.ilike.%${cleanTitle}%,anime_tmdb_id.eq.${strId}`)
        .order('episode_number', { ascending: true });

      // Si no encuentra por búsqueda directa, verificar si strId es un anime_tmdb_id de una película dentro de una saga
      if (!collEps || collEps.length === 0) {
        const { data: movieRow } = await supabase
          .from('anime_episodes')
          .select('search_title, episode_name, episode_number')
          .eq('anime_tmdb_id', strId)
          .limit(1);

        if (movieRow && movieRow.length > 0) {
          const parentTitle = movieRow[0].search_title;
          const { data: parentEps } = await supabase
            .from('anime_episodes')
            .select('anime_tmdb_id, search_title, episode_name, episode_number, season_number')
            .ilike('search_title', parentTitle)
            .order('episode_number', { ascending: true });
          collEps = parentEps;
        }
      }

      if (!collEps || collEps.length === 0) return null;

      // Una saga o colección está destinada exclusivamente a franquicias de películas (Harry Potter, Piratas del Caribe, etc.)
      const isExplicitCollection = /colecci[oó]n|saga|trilog[ií]a|tetralog[ií]a|antolog[ií]a/i.test(collEps[0]?.search_title || '') ||
                                  /colecci[oó]n|saga|trilog[ií]a|tetralog[ií]a|antolog[ií]a/i.test(cleanTitle);

      const hasMultipleSeasons = collEps.some(ep => Number(ep.season_number) > 1);
      // Si tiene múltiples temporadas y NO se llama explícitamente "Colección/Saga", es una serie normal, NO una saga
      if (hasMultipleSeasons && !isExplicitCollection) return null;

      const distinctTmdbIds = new Set(collEps.map(e => e.anime_tmdb_id).filter(Boolean));
      // Si no es un nombre de colección explícito y no tiene diferentes IDs de películas vinculadas, tampoco es una saga
      if (!isExplicitCollection && distinctTmdbIds.size <= 1) return null;

      // Extraer lista única de entregas en la saga
      const uniqueMoviesMap = new Map();
      const sagaTitle = collEps[0].search_title || 'Colección';

      collEps.forEach(ep => {
        if (!uniqueMoviesMap.has(ep.episode_number)) {
          uniqueMoviesMap.set(ep.episode_number, {
            episode_number: ep.episode_number,
            title: ep.episode_name || `Película ${ep.episode_number}`,
            tmdb_id: ep.anime_tmdb_id,
            season: ep.season_number || 1
          });
        }
      });

      const moviesList = Array.from(uniqueMoviesMap.values()).sort((a, b) => a.episode_number - b.episode_number);
      if (moviesList.length <= 1) return null;

      // Buscar item de la Colección en custom_animes si existe
      const { data: customColl } = await supabase
        .from('custom_animes')
        .select('*')
        .ilike('title', sagaTitle)
        .limit(1);

      const collectionItem = customColl && customColl.length > 0 ? customColl[0] : null;

      return {
        sagaTitle,
        collectionId: collectionItem ? collectionItem.id : null,
        collectionImage: collectionItem ? collectionItem.image : null,
        totalMovies: moviesList.length,
        movies: moviesList,
        isParentCollection: isExplicitCollection && cleanTitle === sagaTitle.toLowerCase()
      };
    } catch (err) {
      console.error('Error fetching saga info:', err);
      return null;
    }
  },

  getScrapingStatus: async (tmdbId) => {
    try {
      const { data } = await supabase
        .from('scraping_queue')
        .select('*')
        .eq('anime_tmdb_id', String(tmdbId))
        .order('created_at', { ascending: false })
        .limit(1);
      return data && data.length > 0 ? data[0] : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  requestScraping: async (tmdbId, title) => {
    try {
      const { data, error } = await supabase
        .from('scraping_queue')
        .insert([{
          anime_tmdb_id: String(tmdbId),
          title: title,
          status: 'pending'
        }]);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  updateEpisodeTimes: async (tmdbId, episodeNumber, times) => {
    try {
      const { data, error } = await supabase
        .from('anime_episodes')
        .update(times)
        .eq('anime_tmdb_id', String(tmdbId))
        .eq('episode_number', parseInt(episodeNumber, 10));
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Error actualizando tiempos:", e);
      return false;
    }
  }
};

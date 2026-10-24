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
    image: 'https://m.media-amazon.com/images/I/81D2e1rqCyL.jpg'
  },
  'arma mortal': {
    backdrop: 'https://image.tmdb.org/t/p/original/yqZ5ACKeNJ30mylUEzvtWZu4pGU.jpg',
    image: 'https://image.tmdb.org/t/p/w500/oXSF4oiHwCEegf9A3gfNsNhRCCd.jpg'
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

  // La imagen y banner guardados en la BD siempre tienen prioridad absoluta sobre los fallbacks
  const posterImage = (item.image && typeof item.image === 'string' && item.image.trim().length > 0 && !item.image.includes('placeholder.com')) 
    ? item.image.trim() 
    : (enrichment.image || item.image || 'https://via.placeholder.com/225x318?text=No+Image');

  const backdropUrl = (item.banner && typeof item.banner === 'string' && item.banner.trim().length > 0)
    ? item.banner.trim()
    : (enrichment.backdrop || null);
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
    total_episodes: isSingleMovie ? 1 : (item.total_episodes || 12),
    episodes: isSingleMovie ? 1 : (item.total_episodes || null),
    type: isMovieOrSaga ? 'Película' : (isSeries ? 'Serie' : 'Anime'),
    contentType: isMovieOrSaga ? 'peliculas' : (isSeries ? 'series' : 'animes'),
    isMovie: isSingleMovie,
    isCollection: isSagaCollection,
    description: item.description || 'Sin sinopsis disponible.',
    genres: item.genres || [],
    status: item.status || 'En emisión',
    trailer: null,
    isCustom: !String(item.id || '').trim() || String(item.id || '').startsWith('custom-'),
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
  // === Películas en anime_episodes ===
  "310": {
    id: 310,
    title: "Todopoderoso",
    image: "https://image.tmdb.org/t/p/w500/7GfL6SYdRwJpoDZAsHDG0bOptPV.jpg",
    banner: "https://image.tmdb.org/t/p/original/m0eJc9CwCy5nowYQdNEaxkHHmj4.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/m0eJc9CwCy5nowYQdNEaxkHHmj4.jpg",
    hasBackdrop: true,
    score: "6.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Tras pasar el peor día de su vida, el reportero de televisión Bruce Nolan desafía a Dios reprochándole lo mal que está administrando el mundo. Dios acepta el reto, le otorga todos sus poderes y lo conmina a hacerlo mejor que Él.",
    genres: ["Sci-Fi & Fantasy","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "329": {
    id: 329,
    title: "Parque Jurásico",
    image: "https://image.tmdb.org/t/p/w500/h831eszSFmEyr94WKcgscqPIRbh.jpg",
    banner: "https://image.tmdb.org/t/p/original/4SyDTF02R5BepqSdQmOaNCHObzF.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/4SyDTF02R5BepqSdQmOaNCHObzF.jpg",
    hasBackdrop: true,
    score: "8.0",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "El multimillonario John Hammond tiene una idea para un espectacular parque temático: una isla retirada donde los visitantes puedan observar dinosaurios reales. Con la última tecnología en el desarrollo de DNA, los científicos pueden clonar braquiosaurios, triceratops, velociraptors y un tiranosaurio rex, utilizando para ello la sangre fosilizada en ámbar contenida en insectos que los mordieron hace millones de años. Los paleontólogos Alan Grant, Ellie Sattler y Ian Malcolm visitan el parque y quedan muy sorprendidos con los resultados obtenidos. Pero cuando un problemático empleado manipula el sofisticado sistema de seguridad los dinosaurios escapan, obligando a los visitantes a luchar por su supervivencia.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "330": {
    id: 330,
    title: "El mundo perdido: Jurassic Park",
    image: "https://image.tmdb.org/t/p/w500/2RvlEfcA1Kygqz3TtQSFmDCBFZt.jpg",
    banner: "https://image.tmdb.org/t/p/original/A4rYaPdzgocCjQ0n9LUSYUxyvpS.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/A4rYaPdzgocCjQ0n9LUSYUxyvpS.jpg",
    hasBackdrop: true,
    score: "6.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Han pasado cuatro años desde la devastación del Parque Jurásico, y el Dr Malcom está a punto de descubrir que algo ha sobrevivido. En una isla de Costa Rica perteneciente a la Costa de las Cinco Muertes, los dinosaurios viven y se reproducen en libertad. Se trata de la llamada zona B: el lugar que servía como laboratorio genético. Después de que John Hammond llevara a la empresa a la bancarrota, su sobrino Peter ha tomado las riendas y está dispuesto a levantar la compañía explotando la peligrosa zona.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "331": {
    id: 331,
    title: "Parque Jurásico III",
    image: "https://image.tmdb.org/t/p/w500/5GM4Nqc79PFE3IOqNKwmOxAWkX1.jpg",
    banner: "https://image.tmdb.org/t/p/original/8v8x4vVbRgrsdU3M4drnD7HQbfe.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/8v8x4vVbRgrsdU3M4drnD7HQbfe.jpg",
    hasBackdrop: true,
    score: "6.2",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "El doctor Alan Grant, ansioso por conseguir fondos que financien su estudio sobre la inteligencia del velociraptor, acepta la oferta de pareja de millonarios, Paul y Amanda Kirby, para sobrevolar la Isla Sorna, en Puerto Rico, poblada por dinosaurios creados genéticamente para un parque recreativo. Tras producirse un aterrizaje forzoso en la isla, Alan descubre que los Kirby estaban buscando a su hijo adolescente, perdido en la isla tras un accidente de parapente.",
    genres: ["Action & Adventure","Misterio","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "425": {
    id: 425,
    title: "La era de hielo",
    image: "https://image.tmdb.org/t/p/w500/j52ufQ4Y5QIESpCdgSN3MVNvZOK.jpg",
    banner: "https://image.tmdb.org/t/p/original/8pwIhymsxfAVjrAE7syDjQULn37.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/8pwIhymsxfAVjrAE7syDjQULn37.jpg",
    hasBackdrop: true,
    score: "7.4",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "La historia gira en torno a unos héroes bajo cero: un mamut lanudo, un tigre de dientes de sable, un perezoso y una combinación prehistórica de ardilla y rata, conocida como Scrat.",
    genres: ["Animación","Comedia","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "550": {
    id: 550,
    title: "El Club de la Pelea",
    image: "https://image.tmdb.org/t/p/w500/bI0BhpswEApC0B17RhLZtRVPZiQ.jpg",
    banner: "https://image.tmdb.org/t/p/original/c6OLXfKAk5BKeR6broC8pYiCquX.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/c6OLXfKAk5BKeR6broC8pYiCquX.jpg",
    hasBackdrop: true,
    score: "8.4",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Un hombre consumido por el insomnio y una vida sin sentido conoce a Tyler Durden, un carismático anarquista que lo arrastra a un club secreto donde el dolor despierta algo dormido. Lo que comienza como liberación pronto se convierte en una guerra contra el sistema…",
    genres: ["Drama","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "561": {
    id: 561,
    title: "Constantine",
    image: "https://image.tmdb.org/t/p/w500/AiE8oPiXtxnhHRtAdWriqNuBiKY.jpg",
    banner: "https://image.tmdb.org/t/p/original/x3YFn10ehQKMRIJwIfiDAX8S9Xt.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/x3YFn10ehQKMRIJwIfiDAX8S9Xt.jpg",
    hasBackdrop: true,
    score: "7.2",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Cuando John Constantine se une a una policía para resolver el misterioso suicidio de su hermana gemela, su investigación los lleva a través del mundo de demonios y ángeles que existe debajo del paisaje de Los Ángeles contemporáneo.",
    genres: ["Sci-Fi & Fantasy","Action & Adventure","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "564": {
    id: 564,
    title: "La Momia",
    image: "https://image.tmdb.org/t/p/w500/uxNulNBj05yTLxRhR5L4Iaaon8M.jpg",
    banner: "https://image.tmdb.org/t/p/original/8zLS8p1tRyWFLRFfmgQq0j5WE6z.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/8zLS8p1tRyWFLRFfmgQq0j5WE6z.jpg",
    hasBackdrop: true,
    score: "7.0",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Un aventurero imprudente y un grupo de exploradores desentierran accidentalmente una antigua maldición egipcia. Ahora, deben luchar contra la resucitada momia del sacerdote Imhotep, que busca recuperar su poder y venganza sobre el mundo moderno.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "597": {
    id: 597,
    title: "Titanic",
    image: "https://image.tmdb.org/t/p/w500/2tltWMvvTqscFtdujTXDsRFTqKQ.jpg",
    banner: "https://image.tmdb.org/t/p/original/xXCuto8YVp5RFqBJ7yKmVmLOWpF.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/xXCuto8YVp5RFqBJ7yKmVmLOWpF.jpg",
    hasBackdrop: true,
    score: "7.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "El romance florece entre Jack Dawson y Rose DeWitt Bukater en el esplendoroso transatlántico RMS Titanic. Su amor, como el barco, desafía las olas del destino. Pero cuando el Titanic choca con el iceberg, su historia se convierte en una épica de sacrificio y supervivencia, en la que el amor perdurará más allá de las profundidades del mar.",
    genres: ["Drama"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "671": {
    id: 671,
    title: "Harry Potter y la piedra filosofal",
    image: "https://image.tmdb.org/t/p/w500/kNNtiEp5qktfRjiwjkRq8WLmF40.jpg",
    banner: "https://image.tmdb.org/t/p/original/hziiv14OpD73u9gAak4XDDfBKa2.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/hziiv14OpD73u9gAak4XDDfBKa2.jpg",
    hasBackdrop: true,
    score: "7.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Al cumplir los once años, Harry Potter descubre que es un mago y que es hijo de dos destacados hechiceros. Mientras estudia en la escuela Hogwarts de Magia y Hechicería, poco a poco descubre más la verdad sobre la muerte de sus padres hechiceros.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "672": {
    id: 672,
    title: "Harry Potter y la cámara secreta",
    image: "https://image.tmdb.org/t/p/w500/d7lK3K1QWmcgjHyRMBV3rT2yzTM.jpg",
    banner: "https://image.tmdb.org/t/p/original/bvRnPaai6JL7XHF4K6414DdSHro.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/bvRnPaai6JL7XHF4K6414DdSHro.jpg",
    hasBackdrop: true,
    score: "7.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Harry Potter se prepara para ir a Hogwarts cuando recibe a un elfo doméstico llamado Dobby, quién le advierte que corre en un gran peligro. Llegando a la escuela, sucesos inquietantes motiva a Harry y sus amigos, Ron y Hermione, a investigar lo que está sucediendo en Hogwarts.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "673": {
    id: 673,
    title: "Harry Potter y el prisionero de Azkaban",
    image: "https://image.tmdb.org/t/p/w500/xBph7rrwtxUuDxyZVDQtbP2H0sM.jpg",
    banner: "https://image.tmdb.org/t/p/original/vbk5CfaAHOjQPSAcYm6AoRRz2Af.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/vbk5CfaAHOjQPSAcYm6AoRRz2Af.jpg",
    hasBackdrop: true,
    score: "8.0",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Durante sus días en la escuela Hogwarts, nuevos peligros se le presentan a Harry y sus amigos. La llegada de los Dementores, seres que absorben el alma, un peligroso aliado acecha dentro de los muros del castillo y el temible mago Sirius Black escapa Azkaban.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "674": {
    id: 674,
    title: "Harry Potter y el cáliz de fuego",
    image: "https://image.tmdb.org/t/p/w500/gNWbmxWljihbirfdrVM71lLJLNN.jpg",
    banner: "https://image.tmdb.org/t/p/original/cClWTo3ftVXvV1sF8vlLuWfnlph.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/cClWTo3ftVXvV1sF8vlLuWfnlph.jpg",
    hasBackdrop: true,
    score: "7.8",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "El Torneo de los Tres Magos llega a la escuela Hogwarts. Sin embargo, Harry Potter se convierte en un competidor, pero nunca presentó su nombre. A medida que avanza los juegos, poco a poco Harry descubre las intenciones detras de este torneo.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "675": {
    id: 675,
    title: "Harry Potter y la orden del Fénix",
    image: "https://image.tmdb.org/t/p/w500/5M1Lz8YFKaF9IsMeZtRrsg6R6fZ.jpg",
    banner: "https://image.tmdb.org/t/p/original/9svsJni0pNROt53QBEj9JqZMuEK.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/9svsJni0pNROt53QBEj9JqZMuEK.jpg",
    hasBackdrop: true,
    score: "7.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Inquietó por el regreso de Lord Voldemort, las palabras Harry Potter son ignoradas. Mientras la escuela Hogwarts sufre grandes cambios, Harry y sus amigos reúnen a un pequeño grupo de estudiantes para defenderse de las artes oscuras.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "941": {
    id: 941,
    title: "Arma Mortal",
    image: "https://image.tmdb.org/t/p/w500/6gt44oqb4nE8vflPElffeGwsHVl.jpg",
    banner: "https://image.tmdb.org/t/p/original/xinJKZQiqkdJhoYc2SXuEnhehXz.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/xinJKZQiqkdJhoYc2SXuEnhehXz.jpg",
    hasBackdrop: true,
    score: "7.3",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Martin Riggs es un policía de Los Ángeles con tendencias suicidas. Su compañero Roger Murtaugh es un veterano y responsable policía y padre de familia. Juntos intentan frustrar una operación de contrabando de droga. Al mismo tiempo, a pesar de sus diferentes caracteres, se harán buenos amigos",
    genres: ["Action & Adventure","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "942": {
    id: 942,
    title: "Arma Mortal 2",
    image: "https://image.tmdb.org/t/p/w500/oyEcR3MhEJVCMwxAd9Jyb4gQfv3.jpg",
    banner: "https://image.tmdb.org/t/p/original/uY8i4RABFyBpH2cmFWMVLEswopD.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/uY8i4RABFyBpH2cmFWMVLEswopD.jpg",
    hasBackdrop: true,
    score: "7.1",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "La pareja de policías formada por Martin Riggs y su compañero Roger Murtaugh se enfrenta ahora a una poderosa organización sudafricana de traficantes de droga que opera en Estados Unidos. Su misión principal es la de proteger al testigo Leo Getz, un alocado contable que ha blanqueado dinero para la banda y que en unos días va a testificar contra ellos.",
    genres: ["Action & Adventure","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "943": {
    id: 943,
    title: "Arma Mortal 3",
    image: "https://image.tmdb.org/t/p/w500/3JInVf7jLXIt9OTbdLv88CP2eE6.jpg",
    banner: "https://image.tmdb.org/t/p/original/kmt9XmhmX36sJduuDVFlTgEWh9U.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/kmt9XmhmX36sJduuDVFlTgEWh9U.jpg",
    hasBackdrop: true,
    score: "6.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Martin Riggs y Roger Murtaugh, la inigualable pareja de policías de Los Ángeles, se enfrentan a un difícil caso: armas confiscadas y a punto de ser destruidas han desaparecido de las dependencias policiales y están llegando a manos de los delincuentes más peligrosos de la ciudad.",
    genres: ["Action & Adventure","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "944": {
    id: 944,
    title: "Arma Mortal 4",
    image: "https://image.tmdb.org/t/p/w500/jGpqtRWA4RSol1bPvHiCpWg1CDI.jpg",
    banner: "https://image.tmdb.org/t/p/original/u4d4vymNPo1UuJ6ihtyy9OQgco2.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/u4d4vymNPo1UuJ6ihtyy9OQgco2.jpg",
    hasBackdrop: true,
    score: "6.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "La pareja de policías formada por Martin Riggs y Roger Murtaugh vuelve a la carga para enfrentarse a un capo de la mafia asiática que ha extendido sus actividades a Los Ángeles. En la investigación les ayudará un joven policía responsable de los quebraderos de cabeza familiares de Murtaugh, ya que ha dejado embarazada a su hija. En casa de Riggs, las cosas también se complican cuando su compañera se queda embarazada y amenaza con hacerlo pasar por el altar.",
    genres: ["Action & Adventure","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "950": {
    id: 950,
    title: "La era de hielo 2",
    image: "https://image.tmdb.org/t/p/w500/gs84R3mH9dUz56jvE6KcosRSNub.jpg",
    banner: "https://image.tmdb.org/t/p/original/o1jr0UqVjxIZ1JnFzuVLN4ulWey.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/o1jr0UqVjxIZ1JnFzuVLN4ulWey.jpg",
    hasBackdrop: true,
    score: "6.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Manny, Sid y Diego descubren que la Edad de Hielo está llegando a su fin y se unen al resto del grupo para emprender un viaje hacia tierras más altas. Durante el trayecto, descubren que Manny no es, en realidad, el último de los mamuts lanudos.",
    genres: ["Animación","Comedia","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1734": {
    id: 1734,
    title: "La Momia Regresa",
    image: "https://image.tmdb.org/t/p/w500/x5CeEQ2iq9A20LbU0K4Q1TMxFDs.jpg",
    banner: "https://image.tmdb.org/t/p/original/7s7WkAFPBsMTprYMbqbgKoppQsR.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/7s7WkAFPBsMTprYMbqbgKoppQsR.jpg",
    hasBackdrop: true,
    score: "6.4",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Rick O'Connell está ahora casado con Evelyn, y se han establecido en Londres, donde crían a su hijo Alex de 8 años. Cuando una cadena de eventos propicia la resurrección de Imhotep, la Momia camina de nuevo sobre la Tierra, determinada a conquistar su búsqueda por la inmortalidad.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1735": {
    id: 1735,
    title: "La Momia: La tumba del emperador dragón",
    image: "https://image.tmdb.org/t/p/w500/wktniKrRfM6yXI2zEsLz9M3gNWP.jpg",
    banner: "https://image.tmdb.org/t/p/original/W034dd7w2malON26KWyZm4y37W.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/W034dd7w2malON26KWyZm4y37W.jpg",
    hasBackdrop: true,
    score: "5.5",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "El aventurero Rick O'Connell y su familia desafían las antiguas maldiciones y se aventuran en China para enfrentarse al cruel emperador dragón, que ha sido despertado de su sueño milenario. En esta trepidante aventura, lucharán contra fuerzas oscuras y criaturas sobrenaturales en una carrera contra el tiempo para salvar al mundo de una nueva amenaza.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "2698": {
    id: 2698,
    title: "Regreso del Todopoderoso",
    image: "https://image.tmdb.org/t/p/w500/gINnHEGQpBHdbmdyVl18PmR7kEe.jpg",
    banner: "https://image.tmdb.org/t/p/original/yVwCXQzSZvg9H0YBXvzPfSs6Vqx.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/yVwCXQzSZvg9H0YBXvzPfSs6Vqx.jpg",
    hasBackdrop: true,
    score: "5.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "En esta secuela del éxito de 2003 \"Todopoderoso\" (Bruce Almighty), el presentador de TV Evan Baxter (Steve Carell) se convierte en congresista de los EE.UU., y se muda desde Buffalo a Washington con su mujer (Lauren Graham) y sus 3 hijos. El primer día en su nueva casa reza pidiendo ayuda para poder cumplir su promesa política de \"cambiar el mundo\", y entonces es cuando el mismísimo Dios (Morgan Freeman) le pide que construya un arca, ante el supuestamente inminente diluvio universal que se avecina.",
    genres: ["Sci-Fi & Fantasy","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "6589": {
    id: 6589,
    title: "Supercan",
    image: "https://image.tmdb.org/t/p/w500/kHlXtndIRk8k1pEmE6cQyRGvoU1.jpg",
    banner: "https://image.tmdb.org/t/p/original/1BEuoA7UpCF51WpiIZ7rypAhxfs.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/1BEuoA7UpCF51WpiIZ7rypAhxfs.jpg",
    hasBackdrop: true,
    score: "5.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Basada en la serie clásica de dibujos animados “Underdog”. Tras un accidente en el misterioso laboratorio del científico chiflado, el Dr. Simon Barsinister (Peter Dinklage), un perro de raza beagle descubre de repente que tiene unos poderes inimaginables además de la capacidad de hablar. Ataviado con un traje de superhéroe, Superdog (voz original de Jason Lee) jura proteger a los atormentados ciudadanos de Capitol City y, en especial, a una bonita spaniel llamada Polly Purebread (voz de Amy Adams). Cuando un siniestro plan de Barsinister y su secuaz Cad (Patrick Warburton) amenaza con destruir Capitol City, sólo Superdog puede arreglar las cosas...",
    genres: ["Comedia","Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "8355": {
    id: 8355,
    title: "La era de hielo 3",
    image: "https://image.tmdb.org/t/p/w500/pKQAvnsf6eIL9EGEI2lAgvI94zQ.jpg",
    banner: "https://image.tmdb.org/t/p/original/6Ybbh8TrO8bkEfQXDedekLwVDfA.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/6Ybbh8TrO8bkEfQXDedekLwVDfA.jpg",
    hasBackdrop: true,
    score: "6.8",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Cuando Sid intenta adoptar tres huevos de dinosaurio y la verdadera madre de estos lo secuestra y lo lleva a un mundo perdido bajo tierra, sus amigos intentan rescatarlo.",
    genres: ["Animación","Comedia","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "9313": {
    id: 9313,
    title: "El hombre de la máscara de hierro",
    image: "https://image.tmdb.org/t/p/w500/50Ug4tJ66gJ9ZgivMGzZnGkdw1p.jpg",
    banner: "https://image.tmdb.org/t/p/original/uhhtglfXNaTavkKtjer38qHLfVi.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/uhhtglfXNaTavkKtjer38qHLfVi.jpg",
    hasBackdrop: true,
    score: "6.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Francia se muere de hambre, mientras el Rey Luis XIV mantiene un reinado de terror. Sólo \"los tres mosqueteros\" podrán salir al rescate. Su misión: liberar a un misterioso prisionero en La Bastilla, en cuya identidad radica el secreto que podrá salvar a la nación...",
    genres: ["Action & Adventure","Drama"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "9502": {
    id: 9502,
    title: "Kung Fu Panda",
    image: "https://image.tmdb.org/t/p/w500/zcORJ8s9zsBjvKxP0k4FASQSjpf.jpg",
    banner: "https://image.tmdb.org/t/p/original/qdthf9WrRDSaIkGVQGhhJ9pz1hn.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/qdthf9WrRDSaIkGVQGhhJ9pz1hn.jpg",
    hasBackdrop: true,
    score: "7.3",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Cuando el Valle de la Paz se ve amenazado, el perezoso Po el panda descubre su destino como el “elegido” y se entrena para convertirse en un héroe de kung fu, pero no será fácil transformar al vago desaliñado en un valiente guerrero. Depende del Maestro Shifu y los Cinco Furiosos: Tigresa, Grulla, Mantis, Víbora y Mono: intentarlo.",
    genres: ["Action & Adventure","Animación","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "10052": {
    id: 10052,
    title: "El misterio de la libélula",
    image: "https://image.tmdb.org/t/p/w500/4GBLqv64Y5AnijB2taekuYEJ5X.jpg",
    banner: "https://image.tmdb.org/t/p/original/kM9D0sVUiaOclaw1dLNm6a2jEG7.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/kM9D0sVUiaOclaw1dLNm6a2jEG7.jpg",
    hasBackdrop: true,
    score: "6.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "El doctor Joe Darrow (Costner), jefe de urgencias del Chicago Memorial Hospital, es un prestigioso traumatólogo que pierde a su mujer (Susanna Thompson) en un trágico accidente de autobús en una carretera de montaña de Venezuela. Seis meses después, el cuerpo de Emily sigue sin aparecer, y Joe no consigue superar el dolor por su pérdida. Entonces empieza a percibir señales que parecen indicar que ella quiere comunicarse con él.",
    genres: ["Misterio","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "10191": {
    id: 10191,
    title: "Cómo entrenar a tu dragón",
    image: "https://image.tmdb.org/t/p/w500/vUF9bN3pT99IgdRMSInG0YSqPCN.jpg",
    banner: "https://image.tmdb.org/t/p/original/59vDC1BuEQvti24OMr0ZvtAK6R1.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/59vDC1BuEQvti24OMr0ZvtAK6R1.jpg",
    hasBackdrop: true,
    score: "7.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Un desventurado joven vikingo que aspira a cazar dragones se convierte en el improbable amigo de un joven dragón, y aprende que puede haber más en las criaturas de lo que suponía.",
    genres: ["Sci-Fi & Fantasy","Action & Adventure","Animación","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "10603": {
    id: 10603,
    title: "George de la Selva",
    image: "https://image.tmdb.org/t/p/w500/9oBSAKp65I9Xjmk7jZqJ2HmllTj.jpg",
    banner: "https://image.tmdb.org/t/p/original/gR9ztrutzPPqgK2V2djS0fg2twW.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/gR9ztrutzPPqgK2V2djS0fg2twW.jpg",
    hasBackdrop: true,
    score: "5.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "En lo más profundo de la jungla africana los gorilas han criado a un bebé, George. Crecerá para ser el más valiente rey de la jungla. George va de un árbol a otro llevándose por delante todo lo que está en su camino. Pero cuando una bella mujer llamada Úrsula, procedente de la civilización, irrumpe en el mundo de George, éste perderá definitivamente el control. Dejando atrás la jungla y todos sus salvajes amigos, incluidos Mono, un gorila que habla, y Shep, un elefante que aspira a ser un perro, George aterrizará en la ciudad de San Francisco.",
    genres: ["Action & Adventure","Comedia","Drama"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "10661": {
    id: 10661,
    title: "No te metas con Zohan",
    image: "https://image.tmdb.org/t/p/w500/k0j1jky1bEVBktISUmG6g4Lx64H.jpg",
    banner: "https://image.tmdb.org/t/p/original/tfUotS2rLaIu7ieJPDonyDn5EqQ.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/tfUotS2rLaIu7ieJPDonyDn5EqQ.jpg",
    hasBackdrop: true,
    score: "5.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Un soldado de las fuerzas especiales israelíes finge su muerte para poder resurgir en Nueva York como estilista.",
    genres: ["Comedia","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "10771": {
    id: 10771,
    title: "El smoking",
    image: "https://image.tmdb.org/t/p/w500/llxvvAnudmk8sGJDyYxF9sp1zAL.jpg",
    banner: "https://image.tmdb.org/t/p/original/m5odOM6r6VKkOJ4TWgqYo9umSaI.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/m5odOM6r6VKkOJ4TWgqYo9umSaI.jpg",
    hasBackdrop: true,
    score: "5.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Jimmy Tong aprende que solamente existe una regla cuando se trabaja para el playboy millonario Clark Devlin: Nunca tocar SU preciado smoking de Devlin. Pero cuando Devlin es puesto temporalmente fuera de la comisión por un accidente explosivo, Jimmy se viste con el smoking y pronto descubre que este juego extraordinario puede ser mas que una correa negra, un lazo negro. Repentinamente es empujado hacia el peligroso mundo del espionaje, junto con una novata, experimentada incluso menos que él, Jimmy se convierte en un agente secreto impecablemente vestido.",
    genres: ["Misterio","Action & Adventure","Comedia","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "12444": {
    id: 12444,
    title: "Harry Potter y las reliquias de la muerte (1ª parte)",
    image: "https://image.tmdb.org/t/p/w500/bZYziROYpqXI1DeW4Xz3egMOqej.jpg",
    banner: "https://image.tmdb.org/t/p/original/5i2QAYnbN5vOZUUolLPYHTb9spe.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/5i2QAYnbN5vOZUUolLPYHTb9spe.jpg",
    hasBackdrop: true,
    score: "7.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Harry, Ron y Hermione abandonan su último año en Hogwarts para encontrar y destruir los Horrocruxes restantes, poniendo fin a la búsqueda de la inmortalidad de Voldemort.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "12445": {
    id: 12445,
    title: "Harry Potter y las reliquias de la muerte: Parte 2",
    image: "https://image.tmdb.org/t/p/w500/psbqSsfqcNE1YxHeyhZyRxPvASb.jpg",
    banner: "https://image.tmdb.org/t/p/original/cbcpDn6XJaIGoOil1bKuskU8ds4.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/cbcpDn6XJaIGoOil1bKuskU8ds4.jpg",
    hasBackdrop: true,
    score: "8.1",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Harry, Ron y Hermione continúan su búsqueda para derrotar al malvado Voldemort de una vez por todas. Sin embargo, Harry descubre tres objetos mágicos que le otorgan poderes que rivalizan con las formidables habilidades de Voldemort.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "14161": {
    id: 14161,
    title: "2012",
    image: "https://image.tmdb.org/t/p/w500/gWE2GIrIqqf1OLV2Talxph11MC.jpg",
    banner: "https://image.tmdb.org/t/p/original/4P71rDf6roxVskbvdcbNayVMpXd.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/4P71rDf6roxVskbvdcbNayVMpXd.jpg",
    hasBackdrop: true,
    score: "5.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "El geólogo Adrian Helmsley, descubre de que el núcleo de la Tierra se está calentando. Teme que la corteza se vuelva inestable, coincidiendo con las predicciones mayas del fin del mundo. Entre tanto, los líderes del mundo \"venden\" plazas para escapar del cataclismo. El escritor Curtis Jackson tropieza con esa información... y luchará por salvar a su familia mientras el suelo se hunde bajo sus pies; y los terremotos y las erupciones volcánicas destruyen el mundo tal y como lo conocemos.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "26264": {
    id: 26264,
    title: "George de la Selva 2",
    image: "https://image.tmdb.org/t/p/w500/q3sQsDxU2QmZsbSziRipkh4kWK8.jpg",
    banner: "https://image.tmdb.org/t/p/original/8FwLEl7WNO2vTn6ZVukKFgpwJlz.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/8FwLEl7WNO2vTn6ZVukKFgpwJlz.jpg",
    hasBackdrop: true,
    score: "4.5",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "La malvada suegra de George no puede permitir que su hija y su nieto pasen toda la vida en la jungla con un salvaje que no soporta, por lo que idea un plan con la ayuda del ex novio de Ursula, Lyle, para hipnotizarla, hacer que abandone a George y destruir su querida Jungla. George, Ape, Shep y Tookie van a Las Vegas a rescatar a Ursula pero tienen que volver corriendo a la selva para detener a Lyle y sus malvados matones.",
    genres: ["Action & Adventure","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "27022": {
    id: 27022,
    title: "El Aprendiz de Brujo",
    image: "https://image.tmdb.org/t/p/w500/uLUv1ZQxECr1tcyGqjirTc4nZtM.jpg",
    banner: "https://image.tmdb.org/t/p/original/mtrfLUfUoQunolDhmQy0GfbRclC.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/mtrfLUfUoQunolDhmQy0GfbRclC.jpg",
    hasBackdrop: true,
    score: "6.1",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Dave Stutler es un joven normal, hasta que el experimentado mago Balthazar Blake ve en él un talento oculto para la hechicería. Dave se convierte en el protegido renuente de Balthazar y recibe un curso intenso en el arte de la magia; pero mientras él se prepara para ayudar a su maestro a defender Manhattan de un poderoso adversario, Dave se pregunta si sobrevivirá a su entrenamiento, salvará la ciudad y encontrará a su amor verdadero.",
    genres: ["Sci-Fi & Fantasy","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "38365": {
    id: 38365,
    title: "Son Como Niños",
    image: "https://image.tmdb.org/t/p/w500/poUK5Gg7IkPokaBTjadzjPfJgKw.jpg",
    banner: "https://image.tmdb.org/t/p/original/kARonxQpuSZdFraTKlCThWOBCtu.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/kARonxQpuSZdFraTKlCThWOBCtu.jpg",
    hasBackdrop: true,
    score: "6.4",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Después de muchos años, su antiguo entrenador de basquet muere y cinco amigos deciden pasar un fin de semana, ahora con sus respectivas familias, en la casa de  antaño donde celebraron, el campeonato.",
    genres: ["Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "38575": {
    id: 38575,
    title: "Karate Kid",
    image: "https://image.tmdb.org/t/p/w500/tHoASPhXRGJM6XFvDooJHIFcP3r.jpg",
    banner: "https://image.tmdb.org/t/p/original/v8DepuF6gizphLzIyNZeQiB0hij.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/v8DepuF6gizphLzIyNZeQiB0hij.jpg",
    hasBackdrop: true,
    score: "6.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Dre Parker podría haber sido el más popular en Detroit, pero la carrera profesional de su madre los lleva a ambos a China. Allí logra hacer conexión con su compañera de clase Mei Ying y el sentimiento es mutuo, hasta que las diferencias culturales hacen que su amistad sea imposible. Para que la situación empeore, Dre se consigue un enemigo, el peleonero de la clase, Cheng. Dre no tiene amigos a quién acudir, excepto el encargado de mantenimiento, el Sr. Han.",
    genres: ["Action & Adventure","Drama","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "43947": {
    id: 43947,
    title: "Dulce venganza",
    image: "https://image.tmdb.org/t/p/w500/mEwGkfn0dlWrVjmGJ6YMOuZWqKL.jpg",
    banner: "https://image.tmdb.org/t/p/original/f4QIQvecRkKD5t7aPclyIr3SEP.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/f4QIQvecRkKD5t7aPclyIr3SEP.jpg",
    hasBackdrop: true,
    score: "6.5",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Una joven escritora viaja al campo en busca de un poco de soledad y tranquilidad para trabajar en su nuevo libro. Pero en su lugar encuentra una horrible pesadilla. Tras ser agredida por cuatro degenerados, Jennifer logra sobrevivir y mientras intenta sobreponerse, en su mente, ahora dañada y psicótica sólo existe una idea: la venganza sobre esos cuatro hombres que la violaron.",
    genres: ["Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "44833": {
    id: 44833,
    title: "Battleship: Batalla Naval",
    image: "https://image.tmdb.org/t/p/w500/ddQI1uU1A7dm50J49tCTPGF179z.jpg",
    banner: "https://image.tmdb.org/t/p/original/85PMh0cKywekAJYDnRXfezYAmEc.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/85PMh0cKywekAJYDnRXfezYAmEc.jpg",
    hasBackdrop: true,
    score: "5.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "“Battleship” la batalla será entre la U.S. Navy y… ¡una flota alienígena! La historia nos propone una épica aventura de acción que transcurre en el mar, el cielo y la tierra, y en la que nuestro planeta lucha por sobrevivir contra una fuerza muy superior. Un oficial de la Marina destinado al John Paul Jones; Sam Shane, una fisioterapeuta de la Marina y novia de Hopper; Stone el hermano mayor de Hopper y comandante del Samson; la suboficial Raikes, especialista en armas del John Paul Jones; y el almirante Shane, el oficial superior de Hopper y Stone (y padre de Sam).",
    genres: ["Misterio","Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "46195": {
    id: 46195,
    title: "Río",
    image: "https://image.tmdb.org/t/p/w500/scjaS4XzbGicYLYAVbhmffwZtqq.jpg",
    banner: "https://image.tmdb.org/t/p/original/3vxlXdwBKztOJdgiZ2Qwasl9FY4.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/3vxlXdwBKztOJdgiZ2Qwasl9FY4.jpg",
    hasBackdrop: true,
    score: "6.8",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Capturado por contrabandistas cuando era apenas una cría, un guacamayo llamado Blu nunca aprendió a volar y vive una vida feliz domesticado en Minnesota con su amiga humana, Linda. Blu se piensa que es el último de su especie, pero cuando escuchan que Jewel, una solitaria hembra, vive en Río de Janeiro, Blu y Linda emprenderán un viaje a su encuentro.",
    genres: ["Animación","Action & Adventure","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "49444": {
    id: 49444,
    title: "Kung Fu Panda 2",
    image: "https://image.tmdb.org/t/p/w500/aNji9U9SPTecmoqGippQUBEyouy.jpg",
    banner: "https://image.tmdb.org/t/p/original/iBUIS2duNa9aDfLgRr8thsUPRs0.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/iBUIS2duNa9aDfLgRr8thsUPRs0.jpg",
    hasBackdrop: true,
    score: "7.1",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Po está ahora viviendo su sueño como el Guerrero del Dragón, protegiendo el Valle de la Paz junto a sus amigos y sus compañeros maestros del kung fu. Los Cinco Furiosos. Pero su nueva e impresionante vida se encuentra amenazada por la aparición de un villano formidable, que planea usar un arma secreta imparable para conquistar China y destruir el kung fu. Po debe volver la vista a su pasado para descubrir los secretos de su misterioso origen; solo entonces podrá adquirir la fuerza que necesita para vencer.",
    genres: ["Animación","Comedia","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "49529": {
    id: 49529,
    title: "John Carter: Entre dos mundos",
    image: "https://image.tmdb.org/t/p/w500/lRvQP1wLqyPJEgBjjn35bInO7it.jpg",
    banner: "https://image.tmdb.org/t/p/original/hj5RynBrJB1Wlz84t3lJj9DuTJh.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/hj5RynBrJB1Wlz84t3lJj9DuTJh.jpg",
    hasBackdrop: true,
    score: "6.4",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Es una aventura épica que se desarrolla en el devastado planeta Marte, un mundo habitado por tribus guerreras y seres salvajes. John Carter es un veterano de la Guerra Civil norteamericana (1861-1865) que se halla en el planeta Marte, se ve inmerso en una nueva y misteriosa guerra con un extraño ejército de marcianos, entre los que se encuentran Tars Tarkas y la princesa Dejah Thoris.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "50546": {
    id: 50546,
    title: "Una esposa de mentira",
    image: "https://image.tmdb.org/t/p/w500/85f1LUrau7eAz3jiK9rI0OkrwhW.jpg",
    banner: "https://image.tmdb.org/t/p/original/xoYEe7RvAHWC59Jbo1tdktB4v2a.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/xoYEe7RvAHWC59Jbo1tdktB4v2a.jpg",
    hasBackdrop: true,
    score: "6.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "En un viaje de fin de semana a Hawai, un cirujano plástico convence a su leal ayudante para que se haga pasar por su próxima esposa divorciada, con el fin de encubrir una mentira descuidada que le dijo a su novia, que es muy joven.",
    genres: ["Comedia","Drama"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "57800": {
    id: 57800,
    title: "La era de hielo 4",
    image: "https://image.tmdb.org/t/p/w500/anoTw49j2tZrZYPUyZRaV6s8fKd.jpg",
    banner: "https://image.tmdb.org/t/p/original/scLQDnf1m2AqEEQSjAEdMRD6K9I.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/scLQDnf1m2AqEEQSjAEdMRD6K9I.jpg",
    hasBackdrop: true,
    score: "6.4",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "La loca persecución de Scrat por su escurridiza bellota desde el principio de los tiempos, tiene consecuencias que cambiarán el mundo: un cataclismo continental que desencadenará la mayor de las aventuras para Manny, Diego y Sid. En medio de estas agitaciones, Sid se reencuentra con su Abuelita Gruñona y la manada tropieza con una extraña cuadrilla de piratas de altamar decididos a impedirles su regreso a casa.",
    genres: ["Animación","Comedia","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "64688": {
    id: 64688,
    title: "Comando Especial",
    image: "https://image.tmdb.org/t/p/w500/qnaQVp7OGaOtLbxJdvF50gWh1aa.jpg",
    banner: "https://image.tmdb.org/t/p/original/rXrpYOveFl76ivMmyb2612T7Q8w.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/rXrpYOveFl76ivMmyb2612T7Q8w.jpg",
    hasBackdrop: true,
    score: "6.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Dos policías novatos que eran enemigos en la preparatoria tienen una racha de mala suerte...hasta que les ordenan hacerse pasar por alumnos para atrapar a una red de narcotráfico dentro de su antigua escuela. Volviendo a su vida como adolescentes, pronto recaen en los hábitos de su juventud, poniendo en peligro el caso (y su amistad), con resultados desastrosos y muy graciosos.",
    genres: ["Action & Adventure","Comedia","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "72545": {
    id: 72545,
    title: "Viaje 2: La Isla Misteriosa",
    image: "https://image.tmdb.org/t/p/w500/wEwXmWDujxN8c17GhVqi2Ho1PxB.jpg",
    banner: "https://image.tmdb.org/t/p/original/fZvAroq9Vb5hhyKT6TxsjxJW7nm.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/fZvAroq9Vb5hhyKT6TxsjxJW7nm.jpg",
    hasBackdrop: true,
    score: "6.2",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Sean recibe una llamada de socorro desde una misteriosa isla, que no aparece en los mapas. Se trata de un lugar con extrañas formas de vida. Sean emprenderá la búsqueda acompañado de su padrastro, de un piloto de helicóptero y su hermosa y temperamental hija. Secuela de \"Viaje al centro de la tierra",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "76492": {
    id: 76492,
    title: "Hotel Transylvania",
    image: "https://image.tmdb.org/t/p/w500/zvWlwBGQWuJ0wog65q1uS37BApC.jpg",
    banner: "https://image.tmdb.org/t/p/original/5rARlA8beRAVXPYzSaF2NoS8Ry5.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/5rARlA8beRAVXPYzSaF2NoS8Ry5.jpg",
    hasBackdrop: true,
    score: "7.0",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Cuando Mavis está a punto de cumplir 118 años, su padre, el conde Drácula, le prepara una fiesta a la que acuden los mejores amigos de la familia, Frankenstein, Hombre Invisible y la Momia; pero cuando un humano llamado Johnny, un tipo común y corriente, aparece en el hotel de monstruos... lo cambia todo.",
    genres: ["Animación","Comedia","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "80274": {
    id: 80274,
    title: "El juego de Ender",
    image: "https://image.tmdb.org/t/p/w500/7jHrYKpG3gHRFtTvLcDp75OSrZo.jpg",
    banner: "https://image.tmdb.org/t/p/original/zWvOs6lepfOI0dPa1ANVcdbkBuY.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/zWvOs6lepfOI0dPa1ANVcdbkBuY.jpg",
    hasBackdrop: true,
    score: "6.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Un joven talentoso exhibe un talento inusual que provoca sea elegido para un entrenamiento militar avanzado para encabezar a las fuerzas de la Tierra en una guerra intensa contra los Formics, unos invasores extraterrestres.",
    genres: ["Sci-Fi & Fantasy","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "82702": {
    id: 82702,
    title: "Cómo entrenar a tu dragón 2",
    image: "https://image.tmdb.org/t/p/w500/bXcRw7FL8QzUZOvY2fZdwDv5ymQ.jpg",
    banner: "https://image.tmdb.org/t/p/original/8AAuJtCzaibYkbE0QVHc8EBsELB.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/8AAuJtCzaibYkbE0QVHc8EBsELB.jpg",
    hasBackdrop: true,
    score: "7.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Han pasado cinco años desde que Hipo empezó a entrenar a su dragón, rompiendo la tradición vikinga de cazarlos. Astrid y el resto de la pandilla han conseguido difundir en la isla un nuevo deporte: las carreras de dragones. Mientras realizan una carrera, atraviesan los cielos llegando a territorios inhóspitos, donde nadie antes ha estado. Durante un viaje descubren una cueva cubierta de hielo que resulta ser el refugio de cientos de dragones salvajes, a los que cuida un misterioso guardián. Hipo y los suyos se unen al guardián para proteger a los dragones de las fuerzas malignas que quieren acabar con ellos.",
    genres: ["Sci-Fi & Fantasy","Action & Adventure","Animación","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "88751": {
    id: 88751,
    title: "Viaje al centro de la Tierra",
    image: "https://image.tmdb.org/t/p/w500/pfZQzTXaHQ6m517Q4la8p7D1AJn.jpg",
    banner: "https://image.tmdb.org/t/p/original/Adlc8JMVEXOelFO6hYpIYcGBx2T.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/Adlc8JMVEXOelFO6hYpIYcGBx2T.jpg",
    hasBackdrop: true,
    score: "6.1",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Durante una expedición científica en Islandia, el científico y visionario Trevor Anderson, su sobrino Sean y la bella guía local, Hannah, quedan inesperadamente atrapados en una cueva y la única forma de escape posible les lleva a adentrarse cada vez más en las entrañas de la tierra.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "107846": {
    id: 107846,
    title: "Plan de escape",
    image: "https://image.tmdb.org/t/p/w500/8YpUgKQE7osYU7L49VE34PxVrKA.jpg",
    banner: "https://image.tmdb.org/t/p/original/ix9WYBqQ2xSZCgyeQ1vVdrbaFa4.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/ix9WYBqQ2xSZCgyeQ1vVdrbaFa4.jpg",
    hasBackdrop: true,
    score: "6.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Ray Breslin, un experto en seguridad carcelaria, se enfrenta a su mayor reto: escapar de la prisión que él mismo ha diseñado. En la cárcel conoce al enigmático Church, un tipo que se ha ganado el respeto de todos los presos por ser capaz de mantenerlos cuerdos en las horas más oscuras.",
    genres: ["Action & Adventure","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "109418": {
    id: 109418,
    title: "Son Como Niños 2",
    image: "https://image.tmdb.org/t/p/w500/bGvxZQOyvvjJMJENo9OnBzXOQzQ.jpg",
    banner: "https://image.tmdb.org/t/p/original/7JhsJxNmdW0y4IyNrHy10cECrAz.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/7JhsJxNmdW0y4IyNrHy10cECrAz.jpg",
    hasBackdrop: true,
    score: "6.2",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Lenny se ha trasladado con su familia a la pequeña ciudad donde tanto él como sus amigos se criaron. En esta ocasión, los adultos serán quienes reciban toda una lección de sus propios hijos. Secuela de \"Son como niños\".",
    genres: ["Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "135397": {
    id: 135397,
    title: "Jurassic World",
    image: "https://image.tmdb.org/t/p/w500/sOgfattHPWE5sWdVCGHQ08GEbaP.jpg",
    banner: "https://image.tmdb.org/t/p/original/dF6FjTZzRTENfB4R17HDN20jLT2.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/dF6FjTZzRTENfB4R17HDN20jLT2.jpg",
    hasBackdrop: true,
    score: "6.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Veintidós años después de lo ocurrido en Jurassic Park, la isla Nublar ha sido transformada en un enorme parque temático, Jurassic Wold, con versiones «domesticadas» de algunos de los dinosaurios más conocidos. Cuando todo parece ir sobre ruedas y ser el negocio del siglo, un nuevo dinosaurio de especie desconocida, pues ha sido creado manipulando genéticamente su ADN, y que resulta ser mucho más inteligente de lo que se pensaba, se escapa de su recinto y comienza a causar estragos entre los visitantes del Parque",
    genres: ["Action & Adventure","Sci-Fi & Fantasy","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "138843": {
    id: 138843,
    title: "El conjuro 1",
    image: "https://image.tmdb.org/t/p/w500/10ir0eISr3p1MF1mjZwGTx7u4vv.jpg",
    banner: "https://image.tmdb.org/t/p/original/ecKQlAEG95k62SMGhvX83oEqANK.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/ecKQlAEG95k62SMGhvX83oEqANK.jpg",
    hasBackdrop: true,
    score: "7.5",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Una familia aterrorizada pide ayuda a los investigadores paranormales Ed y Lorraine Warren a investigar una presencia oscura en su granja. Al ser obligados a enfrentarse a una entidad poderosa, los Warren se ven atrapados en el caso más aterrador de sus vidas.",
    genres: ["Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "140300": {
    id: 140300,
    title: "Kung Fu Panda 3",
    image: "https://image.tmdb.org/t/p/w500/t11f8palNbICK9Ip5QLrUfhLJYq.jpg",
    banner: "https://image.tmdb.org/t/p/original/s3FiHTdpQVpqIqdBxLLiy40wGut.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/s3FiHTdpQVpqIqdBxLLiy40wGut.jpg",
    hasBackdrop: true,
    score: "6.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Mientras visita una aldea secreta de pandas con su padre, Po se ve obligado a improvisar un peculiar ejército para detener a un espíritu malvado que amenaza a toda China.",
    genres: ["Animación","Action & Adventure","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "158852": {
    id: 158852,
    title: "Tomorrowland",
    image: "https://image.tmdb.org/t/p/w500/nr9yNQuJOPHO2qpESyMlGndN2Ue.jpg",
    banner: "https://image.tmdb.org/t/p/original/udYOmbW1JEZjVd726PWHlmptxPi.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/udYOmbW1JEZjVd726PWHlmptxPi.jpg",
    hasBackdrop: true,
    score: "6.3",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Atado por un destino compartido, un adolescente brillante y optimista lleno de curiosidad científica y un ex inventor genio de niño, hastiado de la desilusión, embarcarse en una misión llena de peligros para descubrir los secretos de un lugar enigmático en algún lugar del tiempo y espacio que existe en su comunidad la memoria como \"Tomorrowland\".",
    genres: ["Action & Adventure","Comedia","Misterio","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "159824": {
    id: 159824,
    title: "Hotel Transylvania 2",
    image: "https://image.tmdb.org/t/p/w500/ndYVcm1k3h81MRDhzZCI4SxDzGp.jpg",
    banner: "https://image.tmdb.org/t/p/original/mfnkxXWuh2Br097Qteq8ieqKfev.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/mfnkxXWuh2Br097Qteq8ieqKfev.jpg",
    hasBackdrop: true,
    score: "6.8",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Una vez que Mavis y Johnny están fuera del hotel, Drácula y sus amigos tratan de sacar al monstruo interior en su nieto Dennis, mitad humano, mitad vampiro.",
    genres: ["Animación","Comedia","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "166428": {
    id: 166428,
    title: "Cómo entrenar A Tu Dragón 3",
    image: "https://image.tmdb.org/t/p/w500/rhnoAReqO3Xoe6GbJhT3409lnq8.jpg",
    banner: "https://image.tmdb.org/t/p/original/h3KN24PrOheHVYs9ypuOIdFBEpX.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/h3KN24PrOheHVYs9ypuOIdFBEpX.jpg",
    hasBackdrop: true,
    score: "7.8",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Lo que comenzó con una insólita amistad entre un adolescente vikingo y un temible dragón Furia Nocturna, se ha convertido en una trilogía legendaria que abarca sus vidas. En este capítulo, Hipo y Chimuelo finalmente descubrirán sus verdaderos destinos: ser el jefe del pueblo y gobernante de Berk a lado de Astrid y ser el dragón líder de su propia especie. Como ambos ascienden, la amenaza más oscura que han enfrentado, así como la aparición de una furia luminosa, pondrá a prueba los lazos de su relación como nunca antes.",
    genres: ["Animación","Comedia","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "172385": {
    id: 172385,
    title: "Río 2",
    image: "https://image.tmdb.org/t/p/w500/xx1k3kCfIs95eAMa1pglXv74cRp.jpg",
    banner: "https://image.tmdb.org/t/p/original/eg2jxQ1FFi6ENDfyMIMC5odpcU0.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/eg2jxQ1FFi6ENDfyMIMC5odpcU0.jpg",
    hasBackdrop: true,
    score: "6.5",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Es una jungla para Blu, Jewel y sus tres hijos después de que se precipitaron de Río de Janeiro a las selvas del Amazonas. Mientras Blu trata de encajar, se va de punta a punta con el vengativo Nigel, y se encuentra con el más temible adversario de todos: su suegro.",
    genres: ["Animación","Action & Adventure","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "187017": {
    id: 187017,
    title: "Comando Especial 2",
    image: "https://image.tmdb.org/t/p/w500/oQ4zCfYuXa5HAkC0wL0gjTveUlh.jpg",
    banner: "https://image.tmdb.org/t/p/original/kdyYOwpKvvD2fSbwfnMM2YPAzfq.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/kdyYOwpKvvD2fSbwfnMM2YPAzfq.jpg",
    hasBackdrop: true,
    score: "6.8",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Después de pasar por la escuela secundaria (dos veces), se esperan grandes cambios para los oficiales Schmidt y Jenko cuando se infiltran en una universidad local. Pero cuando Jenko se encuentra con un espíritu afín en el equipo de fútbol, ​​y Schmidt se infiltra en la escena bohemia del arte, comienzan a cuestionar su asociación.  Ahora no solo tienen que resolver el caso, tienen que averiguar si pueden tener una relación madura. Si estos dos adolescentes crecidos pueden convertirse de estudiantes de primer año en hombres de verdad, la universidad podría ser lo mejor que les haya pasado.",
    genres: ["Misterio","Comedia","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "207768": {
    id: 207768,
    title: "Dulce venganza 2",
    image: "https://image.tmdb.org/t/p/w500/g1WEqWtielGmcWj0hleLhDriB7w.jpg",
    banner: "https://image.tmdb.org/t/p/original/rmYAHOJoA55EKP2t4WQAntPTjMY.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/rmYAHOJoA55EKP2t4WQAntPTjMY.jpg",
    hasBackdrop: true,
    score: "6.3",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Jessica acaba de instalarse en Nueva York, donde, al igual que muchas otras jóvenes trata de hacer carrera como modelo. Pero en su primera sesión de fotos en la gran ciudad termina siendo brutalmente violada y torturada. Creyéndola muerta, Jessica es enterrada viva, pero contra todo pronóstico, se las arregla para escapar con vida de su tumba. Ahora exigirá su venganza…",
    genres: ["Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "240832": {
    id: 240832,
    title: "Lucy",
    image: "https://image.tmdb.org/t/p/w500/uy2TvHFwgKk6UzxxKnPsLkbQwTt.jpg",
    banner: "https://image.tmdb.org/t/p/original/1hzH1Wu2xhXBNOWzw3RMwNTJX5q.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/1hzH1Wu2xhXBNOWzw3RMwNTJX5q.jpg",
    hasBackdrop: true,
    score: "6.5",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Thriller de acción que sigue los pasos de una mujer envuelta involuntariamente en un asunto muy oscuro del que sabrá salir utilizando a sus captores, y que acabará transformándose en una guerrera despiadada cuya evolución supera la lógica humana.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "254128": {
    id: 254128,
    title: "Terremoto: La Falla De San Andrés",
    image: "https://image.tmdb.org/t/p/w500/sgj6jxw1lcGm8E76IMr32im3qQP.jpg",
    banner: "https://image.tmdb.org/t/p/original/zcySy6dnSmyqiichtDgO7AEeZoq.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/zcySy6dnSmyqiichtDgO7AEeZoq.jpg",
    hasBackdrop: true,
    score: "6.3",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "La falla de San Andrés acaba cediendo ante las temibles fuerzas telúricas y desencadena un terremoto de magnitud 9 en California. Ante tal catástrofe, el piloto de helicóptero de búsqueda y rescate Ray y su ex esposa Emma viajan juntos desde Los Ángeles hasta San Francisco para salvar a su única hija, Blake. Pero su tortuoso viaje hacia el norte solamente es el comienzo del desomoronamiento de todo lo que creían firme en su vida.",
    genres: ["Action & Adventure","Drama","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "259693": {
    id: 259693,
    title: "El Conjuro 2",
    image: "https://image.tmdb.org/t/p/w500/x4jUJ0fF60SSOeUUTkaRtmnDvwG.jpg",
    banner: "https://image.tmdb.org/t/p/original/hD9zZYKYb1xBgcm8XIfyvclSkjs.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/hD9zZYKYb1xBgcm8XIfyvclSkjs.jpg",
    hasBackdrop: true,
    score: "7.3",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "En está ocasión, Lorraine y Ed Warren viajan al norte de Londres para ayudar a una madre soltera que cría a cuatro hijos sola en una casa plagada de espíritus malignos.",
    genres: ["Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "273477": {
    id: 273477,
    title: "A La Mierda Con Los Zombis",
    image: "https://image.tmdb.org/t/p/w500/22GlDlg23WOSSpo96PhJW8fHoZp.jpg",
    banner: "https://image.tmdb.org/t/p/original/ks2C2Ap2W79L5QiVQ7jVp5mmIna.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/ks2C2Ap2W79L5QiVQ7jVp5mmIna.jpg",
    hasBackdrop: true,
    score: "6.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Tres exploradores, amigos de toda la vida, unen sus fuerzas con la agresiva camarera de un bar para formar el equipo de héroes menos probable del mundo. Cuando su pacífico pueblo es asolado por una invasión de zombies, lucharán por la insignia de sus vidas y pondrán a prueba sus habilidades como exploradores para salvar a la humanidad del ataque de los no muertos.",
    genres: ["Comedia","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "274870": {
    id: 274870,
    title: "Pasajeros",
    image: "https://image.tmdb.org/t/p/w500/aaVsxL9i4Z3wrP0qfzvjad4fEFq.jpg",
    banner: "https://image.tmdb.org/t/p/original/gHz4ZQytRs8YGrqFMwB3Vrr8pig.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/gHz4ZQytRs8YGrqFMwB3Vrr8pig.jpg",
    hasBackdrop: true,
    score: "7.0",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Una nave espacial que viaja a un planeta colonia distante y transporta a miles de personas tiene un mal funcionamiento en sus cámaras de sueño. Como resultado, dos pasajeros son despertados 90 años antes.",
    genres: ["Drama","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "278154": {
    id: 278154,
    title: "La era de hielo: Choque de mundos",
    image: "https://image.tmdb.org/t/p/w500/vYwnsTkM0aIrig7QnQlm6061xie.jpg",
    banner: "https://image.tmdb.org/t/p/original/wQoe0j7ZDk7LWexC0XhwkK4brIb.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/wQoe0j7ZDk7LWexC0XhwkK4brIb.jpg",
    hasBackdrop: true,
    score: "6.1",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Scrat y su mítica bellota estan en el espacio, donde accidentalmente desencadenará una serie de acontecimientos que amenazarán la Edad de Hielo. Para salvarse, Sid, Manny, Diego y el resto de la manada deberán salir de su hogar y embarcarse en una nueva aventura.",
    genres: ["Action & Adventure","Animación","Comedia","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "283995": {
    id: 283995,
    title: "Guardianes de la Galaxia volumen 2",
    image: "https://image.tmdb.org/t/p/w500/kdg6Y06jfq9FV7qknWNcKLYtBJn.jpg",
    banner: "https://image.tmdb.org/t/p/original/aJn9XeesqsrSLKcHfHP4u5985hn.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/aJn9XeesqsrSLKcHfHP4u5985hn.jpg",
    hasBackdrop: true,
    score: "7.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Continúan las aventuras del equipo en su travesía por los confines del cosmos. Los Guardianes deberán luchar para mantener unida a su nueva familia mientras intentan resolver el misterio de los verdaderos orígenes de Peter Quill. Viejos rivales se convertirán en nuevos aliados, y queridos personajes de los cómics clásicos acudirán en ayuda de nuestros héroes a medida que el Universo Cinematográfico de Marvel continúa expandiéndose.",
    genres: ["Sci-Fi & Fantasy","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "297802": {
    id: 297802,
    title: "Aquaman",
    image: "https://image.tmdb.org/t/p/w500/yTzr6Nc4RcTXVw9SsWQNJdcjTz5.jpg",
    banner: "https://image.tmdb.org/t/p/original/9QusGjxcYvfPD1THg6oW3RLeNn7.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/9QusGjxcYvfPD1THg6oW3RLeNn7.jpg",
    hasBackdrop: true,
    score: "6.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Cuando Arthur Curry (Jason Momoa) descubre que es mitad humano y mitad atlante, emprenderá el viaje de su vida en esta aventura que no sólo le obligará a enfrentarse a quién es en realidad, sino también a descubrir si es digno de cumplir con su destino: ser rey, y convertirse en Aquaman.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "311324": {
    id: 311324,
    title: "La Gran Muralla",
    image: "https://image.tmdb.org/t/p/w500/8VenQvaBTOM2By4rsJbCZhl6hFU.jpg",
    banner: "https://image.tmdb.org/t/p/original/th26RNksfM9nn7DPH06OqiV6BA2.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/th26RNksfM9nn7DPH06OqiV6BA2.jpg",
    hasBackdrop: true,
    score: "6.0",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "China, siglo XV. Un mercenario inglés y otro español son testigos del misterio que rodea a la construcción de la Gran Muralla China; ambos descubrirán que no se construyó para mantener alejados a los mongoles, sino para algo más peligroso: la mítica muralla ha sido edificada para detener la llegada de monstruos devoradores de carne humana.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "324786": {
    id: 324786,
    title: "Hasta el Último Hombre",
    image: "https://image.tmdb.org/t/p/w500/dFMXilx9gYUtZ6GkbuxKErc6Iv3.jpg",
    banner: "https://image.tmdb.org/t/p/original/vDKRMZGFTKP9nQolzeSB1rB1w6p.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/vDKRMZGFTKP9nQolzeSB1rB1w6p.jpg",
    hasBackdrop: true,
    score: "8.2",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "La historia de Desmond T. Doss, quien, debido a que se lo prohibía su fe, combatió en la Segunda Guerra Mundial sin portar un arma. No disparó ni una bala, pero salvó a 75 personas de la muerte en la batalla de la isla de Okinawa.",
    genres: ["Drama","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "333339": {
    id: 333339,
    title: "Ready Player One: Comienza el juego",
    image: "https://image.tmdb.org/t/p/w500/fdfE1EtrGgfjxOMaPZ2FBrgMIgG.jpg",
    banner: "https://image.tmdb.org/t/p/original/5a7lMDn3nAj2ByO0X1fg6BhUphR.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/5a7lMDn3nAj2ByO0X1fg6BhUphR.jpg",
    hasBackdrop: true,
    score: "7.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "La historia sucede en 2045, con el mundo al borde del caos y el colapso. Pero la gente encuentra la salvación en OASIS, universo expansivo de realidad virtual creado por el brillante y excéntrico James Halliday. Halliday muere y su inmensa fortuna será heredada por la primera persona que encuentre un huevo de Pascua digital que él escondió en algún lugar de OASIS... y así se detona una competencia que engancha al mundo entero. Cuando Wade Watts un joven e improbable héroe decide unirse a la competencia, se ve arrastrado dentro de una vertiginosa cacería de tesoros que distrosiona la realidad a través de un universo fantástico de misterio, exploración y peligro.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "345940": {
    id: 345940,
    title: "Megalodón",
    image: "https://image.tmdb.org/t/p/w500/kBl4wXkKVZep4AVVxju67uh6uVV.jpg",
    banner: "https://image.tmdb.org/t/p/original/ibKeXahq4JD63z6uWQphqoJLvNw.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/ibKeXahq4JD63z6uWQphqoJLvNw.jpg",
    hasBackdrop: true,
    score: "6.3",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Un submarino de aguas profundas, que forma parte de un programa internacional, es atacado por una enorme criatura y queda averiado en el fondo de la fosa oceánica más profunda del Pacífico, con su tripulación atrapada en el interior. El tiempo se acaba y un oceanógrafo chino, el Dr. Chang, recluta a Jonas Taylor, un especialista en rescate en aguas profundas, en contra de los deseos de su hija Suyin, que cree que puede rescatar a la tripulación por sus propios medios. Pero ambos deberán unir sus fuerzas para salvar a la tripulación y también al océano de una amenaza imparable: un tiburón prehistórico de 23 metros conocido con el nombre de Megalodón.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "351286": {
    id: 351286,
    title: "Jurassic World 2: El Reino Caído",
    image: "https://image.tmdb.org/t/p/w500/wIY4bdVbXMUtfiYqWe5Uhf6JXIK.jpg",
    banner: "https://image.tmdb.org/t/p/original/gBmrsugfWpiXRh13Vo3j0WW55qD.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/gBmrsugfWpiXRh13Vo3j0WW55qD.jpg",
    hasBackdrop: true,
    score: "6.5",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Una erupción volcánica amenaza a los dinosaurios restantes en la Isla Nublar, donde las criaturas han vagado libremente durante años tras de la desaparición del parque temático \"Jurassic World\". Claire Dearing, ex gerente del parque, ahora fundó el Grupo de Protección de Dinosaurios, una organización dedicada a intentar preservarlos. Cuando a Claire le ofrecen la oportunidad de rescatar algunos ejemplares de la isla, acude a Owen Grady, el ex entrenador de dinosaurios que trabajó en el parque, para que la ayude a evitar la extinción de los dinosaurios... Secuela de \"Jurassic World\".",
    genres: ["Action & Adventure","Sci-Fi & Fantasy","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "353486": {
    id: 353486,
    title: "Jumanji: En la selva",
    image: "https://image.tmdb.org/t/p/w500/eUk8eiZguVtSVZ6cjneGYlbENve.jpg",
    banner: "https://image.tmdb.org/t/p/original/zZKmEmRDc7ZjFucPm2UGNgDRlDc.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/zZKmEmRDc7ZjFucPm2UGNgDRlDc.jpg",
    hasBackdrop: true,
    score: "6.8",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Un videojuego absorbe a cuatro estudiantes. Una vez en la selva, deben embarcarse en una búsqueda en sus avatares, que no coinciden para nada con la realidad.",
    genres: ["Action & Adventure","Comedia","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "357096": {
    id: 357096,
    title: "Dulce venganza 3: La venganza es mía",
    image: "https://image.tmdb.org/t/p/w500/mYWk0btcYNlxcSy0q29JGhj3eDa.jpg",
    banner: "https://image.tmdb.org/t/p/original/ts2CQBbdPYRoq7yTovmDoRw7sTX.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/ts2CQBbdPYRoq7yTovmDoRw7sTX.jpg",
    hasBackdrop: true,
    score: "5.8",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Jennifer Hills sigue siendo atormentada por el brutal asalto sexual que sufrió hace años. Ella ha cambiado identidades y ciudades, a regañadientes unirse a un grupo de apoyo donde comienza a reconstruir una nueva vida. Pero cuando el asesino de su nueva amiga se libere y los relatos de violadores en serie la persigan, Jennifer buscará a los hombres responsables y hará lo que el sistema no hará - hacerlos pagar por sus crímenes de la manera más horrible imaginable. Sólo que esta vez, ningún jurado podrá salvarla.",
    genres: ["Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "400155": {
    id: 400155,
    title: "Hotel Transylvania 3: Monstruos de vacaciones",
    image: "https://image.tmdb.org/t/p/w500/ak1pkaurFMgLlwdD3eCYc6ThM97.jpg",
    banner: "https://image.tmdb.org/t/p/original/gvUYIHWzq7r3KuzAaKvly2h0SjM.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/gvUYIHWzq7r3KuzAaKvly2h0SjM.jpg",
    hasBackdrop: true,
    score: "6.8",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Mavis y Johnny planean ir con Drácula y sus amigos a unas vacaciones en un crucero de monstruos de lujo, donde Drácula se enamora de la capitana del barco, Ericka, sin que sepan que ella es descendiente de Abraham Van Helsing, el famoso cazador de monstruos.",
    genres: ["Animación","Comedia","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "423108": {
    id: 423108,
    title: "El Conjuro 3: El diablo me obligó a hacerlo",
    image: "https://image.tmdb.org/t/p/w500/k8HN29t4VxiOagq9jaVVwZJ6wIB.jpg",
    banner: "https://image.tmdb.org/t/p/original/p26c040MErns7DJYhisa1CpVB5i.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/p26c040MErns7DJYhisa1CpVB5i.jpg",
    hasBackdrop: true,
    score: "7.3",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Los investigadores de fenómenos paranormales Ed y Lorraine Warren se enfrentan a un nuevo caso: el de un hombre acusado de un terrible asesinato, que asegura haber sido poseído por un demonio.",
    genres: ["Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "440471": {
    id: 440471,
    title: "Plan de Escape 2",
    image: "https://image.tmdb.org/t/p/w500/vyhtl0GJvGQqNNs3CzOrFtGCGYU.jpg",
    banner: "https://image.tmdb.org/t/p/original/xIAaN3AQqaJiN5RJ0WsmBady8Hq.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/xIAaN3AQqaJiN5RJ0WsmBady8Hq.jpg",
    hasBackdrop: true,
    score: "5.2",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "El experto en seguridad Ray Breslin Sylvester Stallone y su equipo élite entrenados para rescatar personas de las prisiones más impenetrables del mundo, regresan esta vez para rescatar a Shu Ren (Huang Xiaoming), un agente de confianza de Ray, quien ha sido secuestrado y confinado en Hades, la prisión de máxima seguridad más impenetrable del planeta.",
    genres: ["Action & Adventure","Misterio","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "454626": {
    id: 454626,
    title: "Sonic: La película",
    image: "https://image.tmdb.org/t/p/w500/rK25c71fYVi0Bv7RrTChK7NAQjC.jpg",
    banner: "https://image.tmdb.org/t/p/original/stmYfCUGd8Iy6kAMBr6AmWqx8Bq.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/stmYfCUGd8Iy6kAMBr6AmWqx8Bq.jpg",
    hasBackdrop: true,
    score: "7.3",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Tom Wachowski, el sheriff de la ciudad de Green Hills, viajará a San Francisco para ayudar a Sonic, un erizo azul antropomórfico que corre a velocidades supersónicas, en su batalla contra el maligno Dr. Robotnik y sus aliados.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "480042": {
    id: 480042,
    title: "Plan de Escape 3: El Rescate",
    image: "https://image.tmdb.org/t/p/w500/AyLUHyEce0RNRwcjQQY2frhS7P.jpg",
    banner: "https://image.tmdb.org/t/p/original/yxmfjj4YiFcJipn9nYVBRxeCvo9.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/yxmfjj4YiFcJipn9nYVBRxeCvo9.jpg",
    hasBackdrop: true,
    score: "5.4",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "El experto en seguridad Ray Breslin es contratado para rescatar a la hija de un magnate de la tecnología de Hong Kong que ha sido secuestrada y puesta bajo custodia en una prisión de Letonia. Por si esto fuera poco, su novia también es capturada. Ahora, él y su equipo deberán realizar una misión de rescate que les llevará a enfrentarse a su peor enemigo mientras tratan de poner a salvo a los rehenes.",
    genres: ["Action & Adventure","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "507086": {
    id: 507086,
    title: "Jurassic World Dominio",
    image: "https://image.tmdb.org/t/p/w500/sXeWfpT1EhG7f4uBouqraOhmouH.jpg",
    banner: "https://image.tmdb.org/t/p/original/9hk5iiycq7ukRAAXQiJT9HZX3SX.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/9hk5iiycq7ukRAAXQiJT9HZX3SX.jpg",
    hasBackdrop: true,
    score: "6.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Cuatro años después de la destrucción de Isla Nublar, los dinosaurios ahora viven y cazan junto a los humanos en todo el mundo. Este frágil equilibrio cambiará el futuro y determinará, de una vez por todas, si los seres humanos deben seguir siendo los depredadores máximos en un planeta que ahora comparten con las criaturas más temibles de la historia.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "512200": {
    id: 512200,
    title: "Jumanji: El siguiente nivel",
    image: "https://image.tmdb.org/t/p/w500/gvR0l5NQ62DJe0Ppxb2sroHlwaa.jpg",
    banner: "https://image.tmdb.org/t/p/original/qgch2rFskIxDMgwrD5lWTaB4nBl.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/qgch2rFskIxDMgwrD5lWTaB4nBl.jpg",
    hasBackdrop: true,
    score: "6.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Las aventuras continúan en el fantástico mundo del video juego Jumanji, donde nada es lo que parece. En esta ocasión, los jugadores vuelven al juego, pero sus personajes se han intercambiado entre sí, lo que ofrece un curioso plantel: los mismos héroes con distinta apariencia y habilidades. Pero, ¿dónde está el resto de la gente?",
    genres: ["Action & Adventure","Comedia","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "533533": {
    id: 533533,
    title: "TRON: Ares",
    image: "https://image.tmdb.org/t/p/w500/dz1PbMrkpVhURKtvv7w2Ib1iZDK.jpg",
    banner: "https://image.tmdb.org/t/p/original/pUNfHmVqfwRdILhCkU8TdysVOXo.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/pUNfHmVqfwRdILhCkU8TdysVOXo.jpg",
    hasBackdrop: true,
    score: "6.5",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Un programa altamente sofisticado llamado Ares es enviado del mundo digital al mundo real en una misión peligrosa, marcando el primer encuentro de la humanidad con seres de IA.",
    genres: ["Sci-Fi & Fantasy","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "572802": {
    id: 572802,
    title: "Aquaman y el reino perdido",
    image: "https://image.tmdb.org/t/p/w500/3OdMJBOGkp62e0DfY4ZykL9RuCP.jpg",
    banner: "https://image.tmdb.org/t/p/original/bckxSN9ueOgm0gJpVJmPQrecWul.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/bckxSN9ueOgm0gJpVJmPQrecWul.jpg",
    hasBackdrop: true,
    score: "6.5",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Black Manta, todavía impulsado por la necesidad de vengar la muerte de su padre y ejerciendo el poder del mítico Tridente Negro, no se detendrá ante nada para acabar con Aquaman de una vez por todas. Para derrotarlo, Aquaman debe recurrir a su hermano encarcelado Orm, el ex rey de la Atlántida, para forjar una alianza improbable con el fin de salvar al mundo de una destrucción irreversible.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "585083": {
    id: 585083,
    title: "Hotel Transylvania 4: Transformanía",
    image: "https://image.tmdb.org/t/p/w500/xNF8AxJc966FWk4SYqXxGHaZLHZ.jpg",
    banner: "https://image.tmdb.org/t/p/original/7QabKu8tizoqy8qCZJXljdSpP4A.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/7QabKu8tizoqy8qCZJXljdSpP4A.jpg",
    hasBackdrop: true,
    score: "7.0",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Al sentirse que no pertenece en el hotel lleno de monstruos, Johnny se cruza con Van Helsing y su nuevo invento, el \"Rayo Monstruificante\", permitiendo que Johnny se convierta en un monstruo, pero con la consecuencia de que Drácula y sus amigos monstruosos se transforman en humanos.",
    genres: ["Animación","Comedia","Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "588228": {
    id: 588228,
    title: "La Guerra Del Mañana",
    image: "https://image.tmdb.org/t/p/w500/tzp6VzED2TBc02bkYoYnQa6r2OK.jpg",
    banner: "https://image.tmdb.org/t/p/original/yizL4cEKsVvl17Wc1mGEIrQtM2F.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/yizL4cEKsVvl17Wc1mGEIrQtM2F.jpg",
    hasBackdrop: true,
    score: "7.5",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Unos viajeros llegan desde el año 2051 para dar un mensaje: 30 años en el futuro, la humanidad estará perdiendo la guerra contra unos alienígenas. La única esperanza para sobrevivir es que los soldados y civiles vayan al futuro y se sumen a la batalla. Decidido a salvar el mundo por su hija, Dan Forester se une a una científica brillante y su distante padre para reescribir el destino del planeta.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "614933": {
    id: 614933,
    title: "Atlas",
    image: "https://image.tmdb.org/t/p/w500/wSnBSv7oHgm1kZmiM8IqithlTmJ.jpg",
    banner: "https://image.tmdb.org/t/p/original/3TNSoa0UHGEzEz5ndXGjJVKo8RJ.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/3TNSoa0UHGEzEz5ndXGjJVKo8RJ.jpg",
    hasBackdrop: true,
    score: "6.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Una analista antiterrorista que no confía en la inteligencia artificial descubre que esta puede ser su única esperanza cuando una misión para capturar a un robot rebelde sale mal.",
    genres: ["Sci-Fi & Fantasy","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "615656": {
    id: 615656,
    title: "Megalodón 2: El gran abismo",
    image: "https://image.tmdb.org/t/p/w500/30MUcuI6p4toyfCV349wZleqG5d.jpg",
    banner: "https://image.tmdb.org/t/p/original/5mzr6JZbrqnqD8rCEvPhuCE5Fw2.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/5mzr6JZbrqnqD8rCEvPhuCE5Fw2.jpg",
    hasBackdrop: true,
    score: "6.3",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Un equipo de investigación inicia una misión que va a explorar las profundidades más abismales del mar. Pero su viaje se convierte en caos cuando un malévolo operativo minero amenaza su misión y los obliga a librar una batalla de alto riesgo por la supervivencia. Enfrentados a colosales Megalodones y a implacables saqueadores medioambientales, nuestros héroes deben correr más rápido, ser más astutos y nadar a mayor velocidad que sus despiadados depredadores en una trepidante carrera contra el tiempo.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "638507": {
    id: 638507,
    title: "Cómo Entrenar a tu Dragón: Regreso a Casa",
    image: "https://image.tmdb.org/t/p/w500/n12wESAYZNqa88h4EzdD25bJRYR.jpg",
    banner: "https://image.tmdb.org/t/p/original/lI2AHx0QQrNnEkUqUG01QHUdLDW.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/lI2AHx0QQrNnEkUqUG01QHUdLDW.jpg",
    hasBackdrop: true,
    score: "8.0",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Hipo y Chimuelo se reúnen para recordarles a ambos el vínculo inseparable entre vikingos y dragones.",
    genres: ["Animación","Sci-Fi & Fantasy","Action & Adventure","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "675353": {
    id: 675353,
    title: "Sonic 2: La película",
    image: "https://image.tmdb.org/t/p/w500/sJiHVM0A3OXDVxl4Z6a7ihMPHfm.jpg",
    banner: "https://image.tmdb.org/t/p/original/xuLA0pii2IMJW2puT7EvJtgpg0H.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/xuLA0pii2IMJW2puT7EvJtgpg0H.jpg",
    hasBackdrop: true,
    score: "7.4",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Cuando el Dr. Robotnik regresa, esta vez con un nuevo compañero, Knuckles, en busca de una esmeralda que tiene el poder de destruir civilizaciones. Sonic se une a su propio compañero, Tails, y juntos se embarcan en un viaje por el mundo para encontrar la esmeralda antes de que caiga en las manos equivocadas.",
    genres: ["Action & Adventure","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "718789": {
    id: 718789,
    title: "Lightyear",
    image: "https://image.tmdb.org/t/p/w500/bPIm1SXYp5RQ3c4wP91JQRewIb8.jpg",
    banner: "https://image.tmdb.org/t/p/original/hwUxHPkuUleJeoick4uZsrKDXxF.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/hwUxHPkuUleJeoick4uZsrKDXxF.jpg",
    hasBackdrop: true,
    score: "6.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Luego de un incidente en el que queda abandonado en un planeta hostil a 4.2 millones de años luz de la Tierra junto a su comandante y tripulación, Buzz intenta encontrar el camino de regreso a casa a través del espacio y el tiempo. Pero la misión se ve amenazada con la llegada de Zurg y su ejército de robots despiadados.",
    genres: ["Animación","Sci-Fi & Fantasy","Comedia","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "718930": {
    id: 718930,
    title: "Tren bala",
    image: "https://image.tmdb.org/t/p/w500/kM6iLHkDfyoMsTIm567mUFzFO9e.jpg",
    banner: "https://image.tmdb.org/t/p/original/y2Ca1neKke2mGPMaHzlCNDVZqsK.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/y2Ca1neKke2mGPMaHzlCNDVZqsK.jpg",
    hasBackdrop: true,
    score: "7.4",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "El desafortunado asesino \"Catarina\" está decidido a hacer su trabajo pacíficamente después de que demasiados conciertos se descarrilaron. El destino, sin embargo, puede tener otros planes, ya que la última misión de Catarina lo pone en curso de colisión con adversarios letales de todo el mundo, todos con objetivos conectados, pero conflictivos, en el tren más rápido del mundo.",
    genres: ["Action & Adventure","Comedia","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "939243": {
    id: 939243,
    title: "Sonic 3: La película",
    image: "https://image.tmdb.org/t/p/w500/nRJH3KgLc3dMLaDJgLQ9u7CxsJg.jpg",
    banner: "https://image.tmdb.org/t/p/original/zOpe0eHsq0A2NvNyBbtT6sj53qV.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/zOpe0eHsq0A2NvNyBbtT6sj53qV.jpg",
    hasBackdrop: true,
    score: "7.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Sonic, Knuckles y Tails se reúnen para enfrentarse a un nuevo y poderoso adversario, Shadow, un misterioso villano con poderes nunca antes vistos. Con sus habilidades superadas en todos los sentidos, el Equipo Sonic debe buscar una alianza improbable con la esperanza de detener a Shadow y proteger el planeta.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy","Comedia"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "950387": {
    id: 950387,
    title: "Una película de Minecraft",
    image: "https://image.tmdb.org/t/p/w500/rZYYmjgyF5UP1AVsvhzzDOFLCwG.jpg",
    banner: "https://image.tmdb.org/t/p/original/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg",
    hasBackdrop: true,
    score: "6.2",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Henry, Natalie, Dawn y Garrett, cuatro inadaptados, son arrastrados a un misterioso portal hacia el extraño y cúbico mundo principal. Para volver a casa, tendrán que dominar este mundo con la ayuda de un artesano inesperado y experto llamado, Steve, mientras se embarcan en una búsqueda mágica.",
    genres: ["Comedia","Sci-Fi & Fantasy","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "950396": {
    id: 950396,
    title: "El abismo secreto",
    image: "https://image.tmdb.org/t/p/w500/3s0jkMh0YUhIeIeioH3kt2X4st4.jpg",
    banner: "https://image.tmdb.org/t/p/original/9nhjGaFLKtddDPtPaX5EmKqsWdH.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/9nhjGaFLKtddDPtPaX5EmKqsWdH.jpg",
    hasBackdrop: true,
    score: "7.7",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Dos agentes altamente entrenados se unen a la distancia tras ser enviados a proteger bordes opuestos de un abismo misterioso. Cuando la maldad emerge de él, tienen que trabajar juntos para sobrevivir a lo que yace dentro del abismo.",
    genres: ["Drama","Sci-Fi & Fantasy","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "969681": {
    id: 969681,
    title: "Spider-Man: Un nuevo día",
    image: "https://image.tmdb.org/t/p/w500/fBFjaDWfNslvrs6bJjknmG27wOS.jpg",
    banner: "https://image.tmdb.org/t/p/original/4tjxYg2AbOzzG9G1YuiT2NzYhlH.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/4tjxYg2AbOzzG9G1YuiT2NzYhlH.jpg",
    hasBackdrop: true,
    score: "8.4",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "A medida qué Spider-Man está en la cima de su carrera protegiendo la ciudad de Nueva York, una serie de crímenes inusuales lo arrastran a una red de misterios más grande de lo que jamás haya enfrentado.",
    genres: ["Sci-Fi & Fantasy","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1007734": {
    id: 1007734,
    title: "Nadie 2",
    image: "https://image.tmdb.org/t/p/w500/21agmmYf9mJo8QuphtkZA3R4gsG.jpg",
    banner: "https://image.tmdb.org/t/p/original/82C04rTiXYZ7c8XZv91Nu53w82Y.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/82C04rTiXYZ7c8XZv91Nu53w82Y.jpg",
    hasBackdrop: true,
    score: "6.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "El ex asesino Hutch Mansell lleva a su familia a unas nostálgicas vacaciones a un parque temático de una pequeña ciudad, solo para volver a verse arrastrado a la violencia cuando se enfrentan a un operador corrupto, un sheriff corrupto y un despiadado jefe criminal.",
    genres: ["Action & Adventure","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1011477": {
    id: 1011477,
    title: "Karate Kid: Leyendas",
    image: "https://image.tmdb.org/t/p/w500/bwNAjGUsHt35eqT0Aj8NHU02WPl.jpg",
    banner: "https://image.tmdb.org/t/p/original/7Q2CmqIVJuDAESPPp76rWIiA0AD.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/7Q2CmqIVJuDAESPPp76rWIiA0AD.jpg",
    hasBackdrop: true,
    score: "7.0",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Tras una tragedia familiar, el prodigio del kung fu Li Fong se ve obligado a abandonar su hogar en Pekín y trasladarse a Nueva York con su madre. Li lucha por dejar atrás su pasado mientras intenta encajar con sus nuevos compañeros de clase y, aunque no quiere pelear, los problemas parecen encontrarle en todas partes. Cuando un nuevo amigo necesita su ayuda, Li se presenta a una competición de kárate, pero sus habilidades no son suficientes. El profesor de kung fu de Li, el Sr. Han, pide ayuda al Karate Kid original, Daniel LaRusso, y Li aprende una nueva forma de luchar, fusionando sus dos estilos en uno solo para el enfrentamiento definitivo de artes marciales.",
    genres: ["Action & Adventure","Drama"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1011985": {
    id: 1011985,
    title: "Kung Fu Panda 4",
    image: "https://image.tmdb.org/t/p/w500/7JspmokDnpm8SEg28wtstfGps0K.jpg",
    banner: "https://image.tmdb.org/t/p/original/3ffPx9jqg0yj9y1KWeagT7D20CB.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/3ffPx9jqg0yj9y1KWeagT7D20CB.jpg",
    hasBackdrop: true,
    score: "7.0",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Po se está preparando para convertirse en el líder espiritual de su Valle de la Paz, pero también necesita a alguien que ocupe su lugar como Guerrero Dragón. Como tal, entrenará a un nuevo practicante de kung fu para el lugar y se encontrará con un villano llamado Camaleón que evoca villanos del pasado.",
    genres: ["Animación","Comedia","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1038392": {
    id: 1038392,
    title: "El Conjuro 4: Últimos ritos",
    image: "https://image.tmdb.org/t/p/w500/mCzTN28knc7dNFFwBPyQ3MVXzU8.jpg",
    banner: "https://image.tmdb.org/t/p/original/i8MupUe4xgmYXoRNAQMYvuoexSU.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/i8MupUe4xgmYXoRNAQMYvuoexSU.jpg",
    hasBackdrop: true,
    score: "6.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "En 1986, los investigadores paranormales, Ed y Lorraine Warren, salen de su retiro para investigar, junto con su hija adulta Judy y su compañero Tony, el caso Smurl, una entidad demoníaca más oscura.",
    genres: ["Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1040330": {
    id: 1040330,
    title: "Black Adam: ¿Héroe o Villano?",
    image: "https://image.tmdb.org/t/p/w500/7MwrqCY0AZw3ZWp1F8BWsYLRWUu.jpg",
    banner: "https://image.tmdb.org/t/p/original/jVsbzy5gj3McD8V6dDr7EMrLSqT.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/jVsbzy5gj3McD8V6dDr7EMrLSqT.jpg",
    hasBackdrop: true,
    score: "7.2",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Los protagonistas y el director de Black Adam intentan responder esta pregunta y dan sus opiniones sobre el antihéroe de DC mientras la película se encuentra disponible sólo en cines.",
    genres: ["Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1062722": {
    id: 1062722,
    title: "Frankenstein",
    image: "https://image.tmdb.org/t/p/w500/hTj8x0ElKldJyAjTYvaqxkQNxxN.jpg",
    banner: "https://image.tmdb.org/t/p/original/hpXBJxLD2SEf8l2CspmSeiHrBKX.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/hpXBJxLD2SEf8l2CspmSeiHrBKX.jpg",
    hasBackdrop: true,
    score: "7.6",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "El Dr. Victor Frankenstein, un científico brillante pero egoísta, da vida a una criatura en un monstruoso experimento que finalmente conduce a la ruina tanto del creador como de su trágica creación.",
    genres: ["Drama","Sci-Fi & Fantasy","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1087192": {
    id: 1087192,
    title: "Cómo entrenar a tu dragón (2025)",
    image: "https://image.tmdb.org/t/p/w500/9Zr7ZyiMpgMhhxJQi1tQJp9LGho.jpg",
    banner: "https://image.tmdb.org/t/p/original/8J6UlIFcU7eZfq9iCLbgc8Auklg.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/8J6UlIFcU7eZfq9iCLbgc8Auklg.jpg",
    hasBackdrop: true,
    score: "7.9",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "En la agreste isla de Berk, donde vikingos y dragones han sido enemigos acérrimos durante generaciones, Hipo se distingue, desafiando siglos de tradición al entablar amistad con Desdentao, un temido dragón Furia Nocturna. Su improbable vínculo revela la verdadera naturaleza de los dragones, desafiando los cimientos de la sociedad vikinga.",
    genres: ["Sci-Fi & Fantasy","Comedia","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1234821": {
    id: 1234821,
    title: "Jurassic World: Renace",
    image: "https://image.tmdb.org/t/p/w500/v49ceVcpW4Vj0tveTWlzrRdsFf4.jpg",
    banner: "https://image.tmdb.org/t/p/original/zNriRTr0kWwyaXPzdg1EIxf0BWk.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/zNriRTr0kWwyaXPzdg1EIxf0BWk.jpg",
    hasBackdrop: true,
    score: "6.3",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Cinco años después de los acontecimientos de Jurassic World Dominion, Zora Bennett, una experta en operaciones encubiertas, es contratada para dirigir a un equipo de especialistas cuya misión es conseguir fabricar un medicamento hecho de ADN de tres criaturas más grandes para la raza humana.",
    genres: ["Sci-Fi & Fantasy","Action & Adventure"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1242898": {
    id: 1242898,
    title: "Depredador: Tierras salvajes",
    image: "https://image.tmdb.org/t/p/w500/r7TEWHLr1lsIsTkiEFwtM3hAWma.jpg",
    banner: "https://image.tmdb.org/t/p/original/82lM4GJ9uuNvNDOEpxFy77uv4Ak.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/82lM4GJ9uuNvNDOEpxFy77uv4Ak.jpg",
    hasBackdrop: true,
    score: "7.8",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "En el futuro, en un planeta remoto, un joven Depredador, marginado de su clan, encuentra un aliado inesperado en Thia y se embarca en un peligroso viaje en busca del adversario definitivo.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1265609": {
    id: 1265609,
    title: "Máquina de guerra",
    image: "https://image.tmdb.org/t/p/w500/aq2vbzxcG5K3SSLReMqO5TettmE.jpg",
    banner: "https://image.tmdb.org/t/p/original/6yeVcxFR0j08vlv2OlL6zbewm4D.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/6yeVcxFR0j08vlv2OlL6zbewm4D.jpg",
    hasBackdrop: true,
    score: "7.5",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "En su última misión de entrenamiento, un ingeniero de combate debe liderar a su unidad en una lucha por sobrevivir ante una amenaza inimaginable.",
    genres: ["Action & Adventure","Sci-Fi & Fantasy","Misterio"],
    status: 'Finalizado',
    isCustom: false,
    isSecret: false
  },
  "1425045": {
    id: 1425045,
    title: "El muro negro",
    image: "https://image.tmdb.org/t/p/w500/ubKnIdUWNfpKUgkfdOPJvcGXO2G.jpg",
    banner: "https://image.tmdb.org/t/p/original/apNfldKI3RiaukNwJzr8EjRG7Wc.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/apNfldKI3RiaukNwJzr8EjRG7Wc.jpg",
    hasBackdrop: true,
    score: "5.8",
    totalEpisodes: 1,
    episodes: 1,
    number_of_seasons: 1,
    type: 'Película',
    contentType: 'peliculas',
    isMovie: true,
    description: "Cuando un misterioso muro rodea su edificio de la noche a la mañana, Tim y Olivia deben unirse a sus vecinos... para escapar con vida.",
    genres: ["Misterio","Sci-Fi & Fantasy"],
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
  },
  "2432": {
      "id": 2432,
      "title": "Abducidos",
      "image": "https://image.tmdb.org/t/p/w500/cq8jk653PR7YOef3thry2rkfps7.jpg",
      "banner": "https://image.tmdb.org/t/p/original/85VdFnoD33M9H2QW43QVOnpnKxU.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/85VdFnoD33M9H2QW43QVOnpnKxU.jpg",
      "hasBackdrop": true,
      "score": "7.5",
      "totalEpisodes": 10,
      "episodes": 10,
      "number_of_seasons": 1,
      "type": "Serie",
      "contentType": "series",
      "isMovie": false,
      "description": "Miniserie de TV de 10 episodios que narra las extraordinarias historias de abducción vividas por tres familias a lo largo de cuatro generaciones. Desde la Alemania de la Segunda Guerra Mundial (1939-1945), pasando por la Guerra de Vietnam, y llegando hasta nuestros días, este drama explora lo que sabemos acerca de encuentros con extraterrestres durante un periodo de cincuenta años.",
      "genres": [
          "Sci-Fi & Fantasy",
          "Misterio"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "84958": {
      "id": 84958,
      "title": "Loki",
      "image": "https://image.tmdb.org/t/p/w500/vCk6wy6WQHwARR4jewbxhhmESs7.jpg",
      "banner": "https://image.tmdb.org/t/p/original/q3jHCb4dMfYF6ojikKuHd6LscxC.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/q3jHCb4dMfYF6ojikKuHd6LscxC.jpg",
      "hasBackdrop": true,
      "score": "8.2",
      "totalEpisodes": 12,
      "episodes": 12,
      "number_of_seasons": 2,
      "type": "Serie",
      "contentType": "series",
      "isMovie": false,
      "description": "Loki es llevado ante la misteriosa organización llamada AVT (Autoridad de Variación Temporal) después de los acontecimientos ocurridos en \"Avengers: Endgame (2019)\" y se le da a elegir enfrentarse a ser borrado de la existencia debido a que es una \"variante de tiempo\" o ayudar a arreglar la línea de tiempo y detener una amenaza mayor.",
      "genres": [
          "Drama",
          "Sci-Fi & Fantasy"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "85271": {
      "id": 85271,
      "title": "WandaVision",
      "image": "https://image.tmdb.org/t/p/w500/cYEPx04WxSSbBA2kdUT6XluYgIw.jpg",
      "banner": "https://image.tmdb.org/t/p/original/cq62fLH3vwOmiaLKMqkDI86tPtH.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/cq62fLH3vwOmiaLKMqkDI86tPtH.jpg",
      "hasBackdrop": true,
      "score": "8.2",
      "totalEpisodes": 9,
      "episodes": 9,
      "number_of_seasons": 1,
      "type": "Serie",
      "contentType": "series",
      "isMovie": false,
      "description": "Wanda Maximoff y Vision, dos seres superpoderosos que viven vidas suburbanas idealizadas, comienzan a sospechar que nada es lo que parece.",
      "genres": [
          "Sci-Fi & Fantasy",
          "Misterio",
          "Drama"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false,
      "searchTitle": "Bruja Escarlata y Visión"
  },
  "86031": {
      "id": 86031,
      "title": "Dr. Stone",
      "image": "https://image.tmdb.org/t/p/w500/dLlnzbDCblBXcJqFLXyvN43NIwp.jpg",
      "banner": "https://image.tmdb.org/t/p/original/lN13BPAEnc5iXmoxxBQHOZ1ScfZ.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/lN13BPAEnc5iXmoxxBQHOZ1ScfZ.jpg",
      "hasBackdrop": true,
      "score": "8.5",
      "totalEpisodes": 75,
      "episodes": 75,
      "number_of_seasons": 4,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "Senku es un joven extremadamente inteligente con un gran don para la ciencia y una ácida personalidad, y su mejor amigo es Taiju, que es muy buena persona pero más apto para usar los músculos que para pensar. Cuando tras cierto incidente toda la humanidad acaba convertida en piedra, ellos logran despertarse en un mundo miles de años después, con la civilización humana completamente desaparecida y con toda la humanidad congelada en piedra como ellos estuvieron. Ahora es su obligación rescatar a la gente y crear un nuevo mundo.",
      "genres": [
          "Animación",
          "Action & Adventure",
          "Comedia",
          "Sci-Fi & Fantasy"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "87739": {
      "id": 87739,
      "title": "Gambito de dama",
      "image": "https://image.tmdb.org/t/p/w500/3Skm8boxLsoQZK9xq2chf0rQHfF.jpg",
      "banner": "https://image.tmdb.org/t/p/original/ktZaQ4FEmKpRgetiBooZETYQbmQ.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/ktZaQ4FEmKpRgetiBooZETYQbmQ.jpg",
      "hasBackdrop": true,
      "score": "8.4",
      "totalEpisodes": 7,
      "episodes": 7,
      "number_of_seasons": 1,
      "type": "Serie",
      "contentType": "series",
      "isMovie": false,
      "description": "En los cincuenta, una joven de un orfanato descubre que tiene un increíble don para el ajedrez y recorre el arduo camino a la fama mientras lucha contra las adicciones.",
      "genres": [
          "Drama"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "88396": {
      "id": 88396,
      "title": "Falcon Y El Soldado Del Invierno",
      "image": "https://image.tmdb.org/t/p/w500/kW3vNNeeIDkZ2xoRyWmNkeOK6f1.jpg",
      "banner": "https://image.tmdb.org/t/p/original/aTjbqMONy77fHJrIYu14g1F0d5h.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/aTjbqMONy77fHJrIYu14g1F0d5h.jpg",
      "hasBackdrop": true,
      "score": "7.6",
      "totalEpisodes": 6,
      "episodes": 6,
      "number_of_seasons": 1,
      "type": "Serie",
      "contentType": "series",
      "isMovie": false,
      "description": "Estelarizada por Anthony Mackie como Sam Wilson, también conocido como Falcon, y Sebastian Stan como Bucky Barnes, también conocido como el soldado del invierno. El dúo, que se unió en los últimos momentos de \"Avengers: Endgame\", hace equipo en una aventura alrededor del mundo que pone a prueba sus habilidades… y su paciencia.",
      "genres": [
          "Action & Adventure",
          "Sci-Fi & Fantasy"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "92749": {
      "id": 92749,
      "title": "Moon Knight",
      "image": "https://image.tmdb.org/t/p/w500/5AHnvXfW0mtsm047OP54n4pnV0R.jpg",
      "banner": "https://image.tmdb.org/t/p/original/1uegR4uAxRxiMyX4nQnpzbXhrTw.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/1uegR4uAxRxiMyX4nQnpzbXhrTw.jpg",
      "hasBackdrop": true,
      "score": "7.6",
      "totalEpisodes": 6,
      "episodes": 6,
      "number_of_seasons": 1,
      "type": "Serie",
      "contentType": "series",
      "isMovie": false,
      "description": "Steven Grant parecía llevar una vida sin sobresaltos hasta que la realidad empezó a desmoronarse a sus pies, rodeado de pesadillas de otra vida: la del mercenario Marc Spector. Además de múltiples personalidades, ahora tiene enemigos brutales que lo persiguen, y un misterio mortal que resolver con los dioses del antiguo Egipto.",
      "genres": [
          "Sci-Fi & Fantasy",
          "Misterio",
          "Action & Adventure"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false,
      "searchTitle": "Caballero Luna"
  },
  "95557": {
      "id": 95557,
      "title": "INVENCIBLE",
      "image": "https://image.tmdb.org/t/p/w500/AdcfiT5FsjUooyP7CrKzEGmP9K1.jpg",
      "banner": "https://image.tmdb.org/t/p/original/9qrroces8C6R9aKr08hACNPVXdZ.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/9qrroces8C6R9aKr08hACNPVXdZ.jpg",
      "hasBackdrop": true,
      "score": "8.6",
      "totalEpisodes": 32,
      "episodes": 32,
      "number_of_seasons": 4,
      "type": "Serie",
      "contentType": "series",
      "isMovie": false,
      "description": "Mark Grayson hereda superpoderes a los diecisiete años y se une a su padre como uno de los mayores héroes de la Tierra. Todos sus sueños se hacen realidad, hasta que un evento impactante lo cambia todo.",
      "genres": [
          "Animación",
          "Drama",
          "Sci-Fi & Fantasy",
          "Action & Adventure"
      ],
      "status": "En emisión",
      "isCustom": false,
      "isSecret": false
  },
  "100088": {
      "id": 100088,
      "title": "The Last of Us",
      "image": "https://image.tmdb.org/t/p/w500/tNQWO6cNzQYCyvw36mUcAQQyf5F.jpg",
      "banner": "https://image.tmdb.org/t/p/original/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg",
      "hasBackdrop": true,
      "score": "8.4",
      "totalEpisodes": 16,
      "episodes": 16,
      "number_of_seasons": 2,
      "type": "Serie",
      "contentType": "series",
      "isMovie": false,
      "description": "Veinte años después de la destrucción de la civilización moderna, Joel, un aguerrido superviviente, es contratado para sacar a Ellie, una joven de 14 años, de una opresiva zona de cuarentena. Lo que empieza como un trabajo sencillo pronto se convierte en un viaje brutal y desgarrador, ya que ambos deben atravesar Estados Unidos y depender el uno del otro para sobrevivir.",
      "genres": [
          "Drama"
      ],
      "status": "En emisión",
      "isCustom": false,
      "isSecret": false
  },
  "106379": {
      "id": 106379,
      "title": "Fallout",
      "image": "https://image.tmdb.org/t/p/w500/bseAODUUu5ZpX5W0Nip3yGsN143.jpg",
      "banner": "https://image.tmdb.org/t/p/original/coaPCIqQBPUZsOnJcWZxhaORcDT.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/coaPCIqQBPUZsOnJcWZxhaORcDT.jpg",
      "hasBackdrop": true,
      "score": "8.1",
      "totalEpisodes": 16,
      "episodes": 16,
      "number_of_seasons": 2,
      "type": "Serie",
      "contentType": "series",
      "isMovie": false,
      "description": "Basado en una de las mejores series de videojuegos de todos los tiempos, Fallout es la historia de los que tienen y los que no tienen en un mundo en el que ya casi no queda nada que tener. 200 años después del apocalipsis, los amables habitantes de los lujosos refugios nucleares se ven obligados a regresar al infierno irradiado que sus antepasados dejaron atrás y se sorprenden al descubrir un universo increíblemente complejo, alegremente extraño y altamente violento esperándolos.",
      "genres": [
          "Action & Adventure",
          "Sci-Fi & Fantasy",
          "Drama"
      ],
      "status": "En emisión",
      "isCustom": false,
      "isSecret": false
  },
  "110070": {
      "id": 110070,
      "title": "Horimiya",
      "image": "https://image.tmdb.org/t/p/w500/2ZOfEetRHnqCBzvubdYU3ytwcq.jpg",
      "banner": "https://image.tmdb.org/t/p/original/ldUbhEbyI28M6PiAkL0hZ2o8bOT.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/ldUbhEbyI28M6PiAkL0hZ2o8bOT.jpg",
      "hasBackdrop": true,
      "score": "8.5",
      "totalEpisodes": 19,
      "episodes": 19,
      "number_of_seasons": 1,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "A primera vista, la ultra popular Hori-san parece una chica frívola de secundaria, pero en realidad es sencilla, pragmática y orientada a la familia. Por otro lado, el Miyamura-kun con gafas parece un fanático promedio y sombrío de la escuela secundaria, pero en realidad es un joven atractivo que tiene una racha de chico malo y está cubierto de piercings y tatuajes. Cuando estos dos compañeros de clase inesperadamente similares tienen un encuentro al azar fuera del aula, ¡comienza una dulce y burbujeante historia de la vida escolar!",
      "genres": [
          "Animación",
          "Comedia",
          "Drama"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "118340": {
      "id": 118340,
      "title": "Guardianes de la galaxia",
      "image": "https://image.tmdb.org/t/p/w500/zqZNnuMtrmK99Xux91KiCdnZxgb.jpg",
      "banner": "https://image.tmdb.org/t/p/original/uLtVbjvS1O7gXL8lUOwsFOH4man.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/uLtVbjvS1O7gXL8lUOwsFOH4man.jpg",
      "hasBackdrop": true,
      "score": "7.9",
      "totalEpisodes": 1,
      "episodes": 1,
      "number_of_seasons": 1,
      "type": "Película",
      "contentType": "peliculas",
      "isMovie": true,
      "description": "Peter Quill, debe mantener una incomoda alianza con Gamora, Drax, Rocket y Groot para asegurar un artefacto que pone en peligro a toda la galaxia no caiga en las manos del temible Ronan el Acusador.",
      "genres": [
          "Action & Adventure",
          "Sci-Fi & Fantasy"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "127532": {
      "id": 127532,
      "title": "Solo Leveling",
      "image": "https://image.tmdb.org/t/p/w500/eCD7WS9h4lCT8N4Xavc9u8R1IGk.jpg",
      "banner": "https://image.tmdb.org/t/p/original/xMNH87maNLt9n2bMDYeI6db5VFm.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/xMNH87maNLt9n2bMDYeI6db5VFm.jpg",
      "hasBackdrop": true,
      "score": "8.7",
      "totalEpisodes": 25,
      "episodes": 25,
      "number_of_seasons": 2,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "Lo que no te mata te hace más fuerte, pero en el caso de Sung Jinwoo, lo que lo mató lo hizo más fuerte. Después de ser brutalmente asesinado por monstruos en una mazmorra de alto rango, Jinwoo regresó con el Sistema, un programa que solo él puede ver y que eleva su nivel en todos los sentidos. Ahora, está decidido a descubrir los secretos detrás de sus poderes y la mazmorra que los engendró.",
      "genres": [
          "Animación",
          "Action & Adventure",
          "Sci-Fi & Fantasy"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "157239": {
      "id": 157239,
      "title": "Alien: Planeta Tierra",
      "image": "https://image.tmdb.org/t/p/w500/8IIPZe4V2xNYFWY7lBY6GpN2L8O.jpg",
      "banner": "https://image.tmdb.org/t/p/original/sVxit4vKQZnrHejeQupBYadP22g.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/sVxit4vKQZnrHejeQupBYadP22g.jpg",
      "hasBackdrop": true,
      "score": "7.3",
      "totalEpisodes": 8,
      "episodes": 8,
      "number_of_seasons": 1,
      "type": "Serie",
      "contentType": "series",
      "isMovie": false,
      "description": "Cuando una misteriosa nave espacial se estrella en la Tierra, una joven y un grupo heterogéneo de soldados tácticos hacen un descubrimiento fatídico que los pone cara a cara con la mayor amenaza del planeta.",
      "genres": [
          "Sci-Fi & Fantasy",
          "Drama"
      ],
      "status": "En emisión",
      "isCustom": false,
      "isSecret": false,
      "searchTitle": "Alien: Earth"
  },
  "196950": {
      "id": 196950,
      "title": "Witch Hat Atelier",
      "image": "https://image.tmdb.org/t/p/w500/1qGSBnrANHLX8C7KqGuPDCylns2.jpg",
      "banner": "https://image.tmdb.org/t/p/original/5NmmaK9dt38UXOwzPC2t9yR3HTv.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/5NmmaK9dt38UXOwzPC2t9yR3HTv.jpg",
      "hasBackdrop": true,
      "score": "8.7",
      "totalEpisodes": 13,
      "episodes": 13,
      "number_of_seasons": 1,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "Koko es una niña que vive en un pequeño pueblo y que siempre ha soñado con convertirse en maga. Pero haber nacido sin aptitud mágica significaba que nunca podría convertirse en maga y nunca podría presenciar la chispa de la magia. Renunció a su sueño. Pero un día, un mago viajero llamado Kiefley llegó a su pueblo, y ella tuvo la oportunidad de verlo realizar magia.",
      "genres": [
          "Animación",
          "Drama",
          "Sci-Fi & Fantasy"
      ],
      "status": "En emisión",
      "isCustom": false,
      "isSecret": false
  },
  "205050": {
      "id": 205050,
      "title": "Shangri-La Frontier",
      "image": "https://image.tmdb.org/t/p/w500/xPxirRd6oTzGGCREKNm1UvW3Y9k.jpg",
      "banner": "https://image.tmdb.org/t/p/original/xcgdODcDuzngTXRtV7AtnAFpWzu.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/xcgdODcDuzngTXRtV7AtnAFpWzu.jpg",
      "hasBackdrop": true,
      "score": "8.2",
      "totalEpisodes": 50,
      "episodes": 50,
      "number_of_seasons": 2,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "\"¿Cuándo fue la última vez que jugué un juego que no fuera una basura?\" Este es un mundo en el futuro cercano donde los juegos que usan pantallas se consideran retro, y muchos juegos de realidad virtual no llegan a un mínimo de calidad: son los llamados \"juegos basura\". A aquellos que dedican sus vidas a completar estos juegos se les llama \"cazadores de juegos basura\", y Rakuro Hizutome es uno de ellos. El juego que ha elegido abordar a continuación es Shangri-La Frontier, un juego que goza de una gran crítica y más de 30 millones de jugadores. ¡La mejor historia de aventuras escrita por el jugador más fuerte de \"juegos basura\" está a punto de comenzar!",
      "genres": [
          "Sci-Fi & Fantasy",
          "Action & Adventure",
          "Comedia",
          "Animación"
      ],
      "status": "En emisión",
      "isCustom": false,
      "isSecret": false
  },
  "207332": {
      "id": 207332,
      "title": "Sakamoto Days",
      "image": "https://image.tmdb.org/t/p/w500/qTNIxDIzKjLLuS17fxdXjcKAlW7.jpg",
      "banner": "https://image.tmdb.org/t/p/original/blSthAPRbEOJBowdxppeQqNPRh9.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/blSthAPRbEOJBowdxppeQqNPRh9.jpg",
      "hasBackdrop": true,
      "score": "8.1",
      "totalEpisodes": 22,
      "episodes": 22,
      "number_of_seasons": 1,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "Taro Sakamoto, célebre asesino a sueldo, decidió retirarse de la acción cuando se enamoró. Pero el pasado vuelve por él y ahora debe dar pelea para proteger a su familia.",
      "genres": [
          "Animación",
          "Comedia",
          "Action & Adventure"
      ],
      "status": "En emisión",
      "isCustom": false,
      "isSecret": false
  },
  "209867": {
      "id": 209867,
      "title": "Frieren: Más allá del final del viaje",
      "image": "https://image.tmdb.org/t/p/w500/6A8IHWrtMLtadNXnMTjggvVY8cs.jpg",
      "banner": "https://image.tmdb.org/t/p/original/rBOnrVlck7BIlGeWVlzYiZeg4l2.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/rBOnrVlck7BIlGeWVlzYiZeg4l2.jpg",
      "hasBackdrop": true,
      "score": "8.8",
      "totalEpisodes": 38,
      "episodes": 38,
      "number_of_seasons": 2,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "Décadas después de que su grupo derrotara al Rey Demonio, el funeral de un viejo amigo lleva a la hechicera elfa Frieren a embarcarse en un viaje de autodescubrimiento.",
      "genres": [
          "Animación",
          "Action & Adventure",
          "Drama",
          "Sci-Fi & Fantasy"
      ],
      "status": "En emisión",
      "isCustom": false,
      "isSecret": false
  },
  "214310": {
      "id": 214310,
      "title": "The Weakest Tamer Began a Journey to Pick Up Trash",
      "image": "https://image.tmdb.org/t/p/w500/atZr94foNXzb7wLxMkpX5wvwar.jpg",
      "banner": "https://image.tmdb.org/t/p/original/gSzBVbqxa6RQ95wHUKlpN7anmgL.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/gSzBVbqxa6RQ95wHUKlpN7anmgL.jpg",
      "hasBackdrop": true,
      "score": "7.8",
      "totalEpisodes": 12,
      "episodes": 12,
      "number_of_seasons": 1,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "En este mundo las estrellas que tienen las habilidades lo son todo. Cuando la protagonista descubrió que su habilidad, Domador, no poseía estrellas algunas, no tardó en ver cómo la gente de su pueblo la despreciaba, ¡pues eso era señal de que atraería la desgracia! Exiliada, ahora viaja en solitario rebuscando entre la basura para sobrevivir. O así era hasta que conoció a Sora en el bosque, un pequeño y débil slime. Juntos prosiguen su viaje por la supervivencia e Ivy descubre que puede hacer mucho que ser una simple sinestrellas.",
      "genres": [
          "Animación",
          "Action & Adventure",
          "Sci-Fi & Fantasy"
      ],
      "status": "En emisión",
      "isCustom": false,
      "isSecret": false
  },
  "217407": {
      "id": 217407,
      "title": "Can a Boy-Girl Friendship Survive?",
      "image": "https://image.tmdb.org/t/p/w500/74Oi8x6kwqgeDgfIgNVQwl9b0FT.jpg",
      "banner": "https://image.tmdb.org/t/p/original/taa2aoX0ZBZiydrmc4p3IBtmJz0.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/taa2aoX0ZBZiydrmc4p3IBtmJz0.jpg",
      "hasBackdrop": true,
      "score": "6.9",
      "totalEpisodes": 12,
      "episodes": 12,
      "number_of_seasons": 1,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "La amistad de la infancia entre Himari y Yu se tambalea cuando Yu se reencuentra en preparatoria con su primer amor. Himari, que nunca experimentó la emoción del amor, ahora debe enfrentar sus propios sentimientos. Sus sueños compartidos y los tranquilos días en su club de jardinería se ponen a prueba en esta historia con amor, flores y los altibajos que supone madurar.",
      "genres": [
          "Animación",
          "Comedia"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "224372": {
      "id": 224372,
      "title": "El caballero de los Siete Reinos",
      "image": "https://image.tmdb.org/t/p/w500/vd1Qw2E8fgRVzeoCkeZBGUCHOyS.jpg",
      "banner": "https://image.tmdb.org/t/p/original/7mkUu1F2hVUNgz24xO8HPx0D6mK.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/7mkUu1F2hVUNgz24xO8HPx0D6mK.jpg",
      "hasBackdrop": true,
      "score": "8.4",
      "totalEpisodes": 6,
      "episodes": 6,
      "number_of_seasons": 1,
      "type": "Serie",
      "contentType": "series",
      "isMovie": false,
      "description": "Ambientada en una época en la que el linaje Targaryen todavía ostenta el Trono de Hierro y el recuerdo del último dragón aún no ha desaparecido de la memoria viva, grandes destinos, enemigos poderosos y hazañas peligrosas esperan a estos improbables e incomparables amigos.",
      "genres": [
          "Drama",
          "Sci-Fi & Fantasy",
          "Action & Adventure"
      ],
      "status": "En emisión",
      "isCustom": false,
      "isSecret": false
  },
  "235758": {
      "id": 235758,
      "title": "Alya Sometimes Hides Her Feelings in Russian",
      "image": "https://image.tmdb.org/t/p/w500/mvphQkTzkMyeJ1E7YmLDc8nc7SS.jpg",
      "banner": "https://image.tmdb.org/t/p/original/3197ZU1CWDjdFsmqvWPZGXAYaoi.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/3197ZU1CWDjdFsmqvWPZGXAYaoi.jpg",
      "hasBackdrop": true,
      "score": "8.1",
      "totalEpisodes": 12,
      "episodes": 12,
      "number_of_seasons": 1,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "Alya es una estudiante recién transferida que disfruta de tener buenas calificaciones y mucha popularidad en su nueva preparatoria, aunque lo habitual es que luzca muy fría. No suele hablar nunca con un compañero de clase muy estudioso llamado Kuza Masachika, y cuando lo hace, es para decirle algún halago en ruso. Lo que ella no sabe es que Kuze entiende el ruso, aunque hace ver que no. ¡Comprobemos hasta dónde llega esta curiosa historia de amor!",
      "genres": [
          "Animación",
          "Comedia"
      ],
      "status": "En emisión",
      "isCustom": false,
      "isSecret": false
  },
  "241842": {
      "id": 241842,
      "title": "Zombies Nazis 2",
      "image": "https://image.tmdb.org/t/p/w500/abGLZqFseZas5xamXylxg3eBKvP.jpg",
      "banner": "https://image.tmdb.org/t/p/original/ydLUMIrtvNbkGVOgZmzCh2gWuAQ.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/ydLUMIrtvNbkGVOgZmzCh2gWuAQ.jpg",
      "hasBackdrop": true,
      "score": "6.6",
      "totalEpisodes": 1,
      "episodes": 1,
      "number_of_seasons": 1,
      "type": "Película",
      "contentType": "peliculas",
      "isMovie": true,
      "description": "El pútrido coronel Herzog vuelve a la carga, dispuesto a dar caza a Martin, el único superviviente de Dead Snow. La amenaza de los zombis nazis es todavía mayor, pero en esta ocasión las fuerzas aliadas contarán con la ayuda de un comando norteamericano especializado en exterminar muertos vivientes.",
      "genres": [
          "Action & Adventure",
          "Comedia"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "249907": {
      "id": 249907,
      "title": "Sentenced to Be a Hero",
      "image": "https://image.tmdb.org/t/p/w500/juGNOhRx7MXg3i2NuZ9lR6arVQw.jpg",
      "banner": "https://image.tmdb.org/t/p/original/k8uBEraJWZf9o7oJbaVHrECwvjC.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/k8uBEraJWZf9o7oJbaVHrECwvjC.jpg",
      "hasBackdrop": true,
      "score": "8.2",
      "totalEpisodes": 12,
      "episodes": 12,
      "number_of_seasons": 1,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "En un mundo donde el heroísmo es un castigo, Xylo Forbartz, un asesino de diosas condenado, lucha contra hordas interminables de abominaciones monstruosas como parte de la Unidad de Héroes Penales 9004. La muerte no es una escapatoria, solo un ciclo de resurrección y combate implacable. Pero cuando Xylo se encuentra con una nueva y misteriosa diosa, su improbable alianza desencadena una rebelión.",
      "genres": [
          "Animación",
          "Sci-Fi & Fantasy",
          "Action & Adventure"
      ],
      "status": "En emisión",
      "isCustom": false,
      "isSecret": false
  },
  "258901": {
      "id": 258901,
      "title": "SANDA",
      "image": "https://image.tmdb.org/t/p/w500/mIA684Vy3CpNXpQihHYYWP1lzAM.jpg",
      "banner": "https://image.tmdb.org/t/p/original/ybdN4cyWBlfgamgYca2XwYL2Kqn.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/ybdN4cyWBlfgamgYca2XwYL2Kqn.jpg",
      "hasBackdrop": true,
      "score": "7.5",
      "totalEpisodes": 12,
      "episodes": 12,
      "number_of_seasons": 1,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "Japón, un futuro cercano. Con una natalidad muy baja, los niños son atesorados, pero vigilados. Santa está prohibido por considerarse peligroso. En Navidad, Kazushige Sanda, estudiante y descendiente de Santa, es atacado por su compañera Fuyumura, quien quiere que encuentre a su amiga desaparecida, Ono. “Santa, encuéntrala”. Para protegerlos, Sanda se convierte en Santa y enfrenta a los adultos.",
      "genres": [
          "Animación",
          "Action & Adventure",
          "Misterio"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "271607": {
      "id": 271607,
      "title": "La nobleza de las flores (Kaoru Hana wa Rin to Saku)",
      "image": "https://image.tmdb.org/t/p/w500/e2zegxrA6tyT1nobxXoMTWlQjJf.jpg",
      "banner": "https://image.tmdb.org/t/p/original/dl3pdT1NZiqRM4aDBwsD2TtO8x9.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/dl3pdT1NZiqRM4aDBwsD2TtO8x9.jpg",
      "hasBackdrop": true,
      "score": "8.7",
      "totalEpisodes": 13,
      "episodes": 13,
      "number_of_seasons": 1,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "Cuando el intimidante Rintarō conoce a la tierna Kaoruko, nace una inesperada relación cercana. Solo hay un pequeño problema: las escuelas a las que van son archienemigas.",
      "genres": [
          "Animación",
          "Drama"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false,
      "searchTitle": "la nobleza de las flores"
  },
  "277881": {
      "id": 277881,
      "title": "The Unaware Atelier Meister",
      "image": "https://image.tmdb.org/t/p/w500/6DXiVYwgJeV3P1tvXEoOA5RSaOo.jpg",
      "banner": "https://image.tmdb.org/t/p/original/pLWdn8zZcljxHaVGiACNFVrYPMv.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/pLWdn8zZcljxHaVGiACNFVrYPMv.jpg",
      "hasBackdrop": true,
      "score": "7.2",
      "totalEpisodes": 12,
      "episodes": 12,
      "number_of_seasons": 1,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "Un día, Kurt, un chico de buen corazón, es expulsado repentinamente de la Fiesta de los Héroes por ser «inútil». Descubre que su aptitud para las armas, la magia y todas las demás habilidades relacionadas con el combate es el rango más bajo, por lo que acepta trabajos ocasionales reparando las paredes del castillo y excavando en busca de minerales, donde sus habilidades excepcionales se revelan de inmediato. Demuestra ser hábil en la cocina, la construcción, la minería, la fabricación de herramientas mágicas, de hecho, ¡su aptitud para todas las habilidades no relacionadas con el combate tenía un rango SSS! Kurt, sin embargo, parece completamente inconsciente de su talento y termina salvando a la gente, a la ciudad e incluso al país a través de sus acciones inconscientes.",
      "genres": [
          "Animación",
          "Action & Adventure",
          "Sci-Fi & Fantasy"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "278043": {
      "id": 278043,
      "title": "You and I Are Polar Opposites",
      "image": "https://image.tmdb.org/t/p/w500/lLjcMT7fwuO5fgswb2drlbFwoTJ.jpg",
      "banner": "https://image.tmdb.org/t/p/original/5p423VlhPXf7681XyZCL4khIJLl.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/5p423VlhPXf7681XyZCL4khIJLl.jpg",
      "hasBackdrop": true,
      "score": "8.6",
      "totalEpisodes": 18,
      "episodes": 18,
      "number_of_seasons": 1,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "Suzuki es una estudiante de preparatoria enamorada, ¡pero el chico del que se ha enamorado no se parece en nada a ella! Mientras que ella es alegre, extrovertida y siempre intenta encajar, su compañero de clase Yusuke Tani es estoico, tranquilo y parece no importarle lo que piensen de él. ¿Podrá Suzuki superar sus ansiedades y pedirle salir, o descubrirá que los polos opuestos no se atraen?",
      "genres": [
          "Animación",
          "Comedia"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "279471": {
      "id": 279471,
      "title": "Malcolm in the Middle: La vida sigue siendo injusta",
      "image": "https://image.tmdb.org/t/p/w500/65VaeGPDrKYU8TIyMjnDmeFUqY0.jpg",
      "banner": "https://image.tmdb.org/t/p/original/uekZzyLReK777QKO9xKwiPOelCQ.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/uekZzyLReK777QKO9xKwiPOelCQ.jpg",
      "hasBackdrop": true,
      "score": "8.0",
      "totalEpisodes": 4,
      "episodes": 4,
      "number_of_seasons": 1,
      "type": "Serie",
      "contentType": "series",
      "isMovie": false,
      "description": "Han pasado veinte años, y Malcolm y su familia siguen sin aprender nada.",
      "genres": [
          "Comedia",
          "Drama"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false,
      "searchTitle": "Malcolm: De mal en peor"
  },
  "281615": {
      "id": 281615,
      "title": "The Water Magician",
      "image": "https://image.tmdb.org/t/p/w500/qYK9kCN23Lrg9jcPh1QDBL0PeWw.jpg",
      "banner": "https://image.tmdb.org/t/p/original/s7LgF8NmL0Qi9fWAeZvOBx9s2jy.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/s7LgF8NmL0Qi9fWAeZvOBx9s2jy.jpg",
      "hasBackdrop": true,
      "score": "7.0",
      "totalEpisodes": 12,
      "episodes": 12,
      "number_of_seasons": 1,
      "type": "TV",
      "contentType": "animes",
      "isMovie": false,
      "description": "La reencarnación hacía soñar a Ryo con la paz, pero en su lugar se encuentra en un desierto infestado de monstruos. Gracias a la magia del agua y a su eterna juventud, sobrevive durante 20 años a innumerables maleficios y se convierte en uno de los magos más poderosos de la historia. El destino de Ryo cambia cuando conoce a Abel, un caballero excepcional, que lo coloca en el punto de mira de la sociedad mágica. Así comienza la trepidante aventura del Mago del Agua.",
      "genres": [
          "Animación",
          "Action & Adventure",
          "Sci-Fi & Fantasy"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "447365": {
      "id": 447365,
      "title": "Guardianes de la Galaxia volumen 3",
      "image": "https://image.tmdb.org/t/p/w500/6GkKzdNosVAL7UGgwTtCHSxLQ67.jpg",
      "banner": "https://image.tmdb.org/t/p/original/5YZbUmjbMa3ClvSW1Wj3D6XGolb.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/5YZbUmjbMa3ClvSW1Wj3D6XGolb.jpg",
      "hasBackdrop": true,
      "score": "7.9",
      "totalEpisodes": 1,
      "episodes": 1,
      "number_of_seasons": 1,
      "type": "Película",
      "contentType": "peliculas",
      "isMovie": true,
      "description": "Peter Quill, aún conmocionado por la pérdida de Gamora, debe reunir a su equipo en torno a él para defender el universo junto con la protección de uno de los suyos. Una misión que, si no se lleva a cabo con éxito, podría suponer el fin de los Guardianes tal y como los conocemos.",
      "genres": [
          "Sci-Fi & Fantasy",
          "Action & Adventure"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "1311031": {
      "id": 1311031,
      "title": "Demon Slayer: Kimetsu no Yaiba Castillo infinito",
      "image": "https://image.tmdb.org/t/p/w500/6N21gcFbhT4ocdTU4MGREAaM5Vz.jpg",
      "banner": "https://image.tmdb.org/t/p/original/1RgPyOhN4DRs225BGTlHJqCudII.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/1RgPyOhN4DRs225BGTlHJqCudII.jpg",
      "hasBackdrop": true,
      "score": "8.8",
      "totalEpisodes": 1,
      "episodes": 1,
      "number_of_seasons": 1,
      "type": "Película",
      "contentType": "peliculas",
      "isMovie": true,
      "description": "Tanjirō Kamado es un chico que se unió a una organización dedicada a cazar demonios después de que su hermana menor, Nezuko, fuera convertida. Mientras los miembros de la organización y los Pilares participaban en un programa de entrenamiento grupal, como preparación para la inminente batalla contra los demonios, Muzan Kibutsuji aparece en la Mansión Ubuyashiki. Con el jefe de la organización en peligro, Tanjirō y los Pilares corren hacia la mansión, pero son arrastrados a un espacio misterioso por obra de Kibutsuji. El lugar al que han caído Tanjirō y los cazadores es el bastión de los demonios: el Castillo Infinito. Así, el campo de batalla queda establecido para dar fin a la guerra entre humanos y demonios.",
      "genres": [
          "Animación",
          "Action & Adventure",
          "Sci-Fi & Fantasy"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "279182": {
      "id": 279182,
      "title": "Super Cubo",
      "image": "https://image.tmdb.org/t/p/w500/8nJV1CEh2eLK5fL3puEOE2tIEQI.jpg",
      "banner": "https://image.tmdb.org/t/p/original/89qSKhLrJOUhp6xgbqgSTpzblbA.jpg",
      "backdrop": "https://image.tmdb.org/t/p/original/89qSKhLrJOUhp6xgbqgSTpzblbA.jpg",
      "hasBackdrop": true,
      "score": "8.4",
      "totalEpisodes": 12,
      "episodes": 12,
      "number_of_seasons": 1,
      "type": "Anime",
      "contentType": "animes",
      "isMovie": false,
      "description": "Un estudiante ordinario obtiene accidentalmente un cubo del espacio exterior con superpoderes y se ve envuelto en épicas batallas.",
      "genres": [
          "Animación",
          "Action & Adventure",
          "Sci-Fi & Fantasy"
      ],
      "status": "Finalizado",
      "isCustom": false,
      "isSecret": false
  },
  "120": {
    "id": 120,
    "title": "El señor de los anillos: La comunidad del anillo",
    "image": "https://image.tmdb.org/t/p/w500/9xtH1RmAzQ0rrMBNUMXstb2s3er.jpg",
    "banner": "https://image.tmdb.org/t/p/original/oiwc338EoBgS4sEI2ixAny4KQKg.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/oiwc338EoBgS4sEI2ixAny4KQKg.jpg",
    "hasBackdrop": true,
    "score": "8.4",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "En la Tierra Media, el Señor Oscuro Saurón creó los Grandes Anillos de Poder, forjados por los herreros Elfos. Tres para los reyes Elfos, siete para los Señores Enanos, y nueve para los Hombres Mortales. Secretamente, Saurón también forjó un anillo maestro, el Anillo Único, que contiene en sí el poder para esclavizar a toda la Tierra Media. Con la ayuda de un grupo de amigos y de valientes aliados, Frodo emprende un peligroso viaje con la misión de destruir el Anillo Único. Pero el Señor Oscuro Sauron, quien creara el Anillo, envía a sus servidores para perseguir al grupo. Si Sauron lograra recuperar el Anillo, sería el final de la Tierra Media. EXTENDIDA",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "121": {
    "id": 121,
    "title": "El señor de los anillos: Las dos torres",
    "image": "https://image.tmdb.org/t/p/w500/up6gIHZlfEQZkHIfQwcOOaGOzOt.jpg",
    "banner": "https://image.tmdb.org/t/p/original/6G73mNyooWAEQTpckPSnFxFoNmc.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/6G73mNyooWAEQTpckPSnFxFoNmc.jpg",
    "hasBackdrop": true,
    "score": "8.4",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "La Compañía del Anillo se ha disuelto. El portador del anillo Frodo y su fiel amigo Sam se dirigen hacia Mordor para destruir el Anillo Único y acabar con el poder de Sauron. Mientras, y tras la dura batalla contra los orcos donde cayó Boromir, el hombre Aragorn, el elfo Legolas y el enano Gimli intentan rescatar a los medianos Merry y Pipin, secuestrados por los ogros de Mordor. Por su parte, Saurón y el traidor Sarumán continúan con sus planes en Mordor, en espera de la guerra contra las razas libres de la Tierra Media.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "218": {
    "id": 218,
    "title": "Terminator: El exterminador",
    "image": "https://image.tmdb.org/t/p/w500/y4jSWrykjrtfrxuvImpu857Qrxr.jpg",
    "banner": "https://image.tmdb.org/t/p/original/ffdqHMWkh1h9MABwIfbfRJhgFW6.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/ffdqHMWkh1h9MABwIfbfRJhgFW6.jpg",
    "hasBackdrop": true,
    "score": "7.7",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Los Ángeles, año 2029. Las máquinas dominan el mundo. Los rebeldes que luchan contra ellas tienen como líder a John Connor, un hombre que nació en los años ochenta. Para acabar con la rebelión, las máquinas deciden enviar al pasado a un robot -Terminator- cuya misión será eliminar a Sarah Connor, la madre de John, e impedir así su nacimiento.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "296": {
    "id": 296,
    "title": "Terminator 3: La rebelión de las máquinas",
    "image": "https://image.tmdb.org/t/p/w500/t4HqQbleOzwNlQ4zMZ90Bl2CcM0.jpg",
    "banner": "https://image.tmdb.org/t/p/original/voVkSwgFYv9GOpRNfUAwj6qYRTL.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/voVkSwgFYv9GOpRNfUAwj6qYRTL.jpg",
    "hasBackdrop": true,
    "score": "6.2",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Ha pasado una década desde que John Connor -Nick Stahl- salvara a la humanidad de la destrucción. En la actualidad John tiene 25 años y vive en la clandestinidad: no hay ninguna prueba documental de su existencia. Así evita ser rastreado por Skynet -la sofisticada corporación de máquinas que una vez intentó acabar con su vida-. Pero, ahora, desde el futuro, ha sido enviado el T-X (Kristanna Loken), la máquina destructora cyborg más desarrollada de Skynet. Su misión es completar el trabajo que no pudo terminar su predecesor, el T-1000. El T-X es una máquina tan implacable como bello su aspecto humano. Ahora la única esperanza de sobrevivir para Connnor es Terminator.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "602": {
    "id": 602,
    "title": "El Día de la Independencia",
    "image": "https://image.tmdb.org/t/p/w500/6WJVfMFeLQJ8LuoduATLiM57v1d.jpg",
    "banner": "https://image.tmdb.org/t/p/original/kFI1oF6KVnLEbUT7yLIbKXeyvu.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/kFI1oF6KVnLEbUT7yLIbKXeyvu.jpg",
    "hasBackdrop": true,
    "score": "6.9",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "El 2 de julio, mothership extranjero gigantesco entra en la órbita alrededor de la Tierra y despliega varias docenas de naves espaciales del 'destructor' en forma de platillo que rápidamente ponen la basura a ciudades principales alrededor del planeta. El 3 de julio, los Estados Unidos conducen un contraataque coordinado que falla. El 4 de julio, un plan se idea para ganar el acceso al interior de mothership extranjero en el espacio, a fin de plantar un misil nuclear.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "1399": {
    "id": 1399,
    "title": "Juego De Tronos",
    "image": "https://image.tmdb.org/t/p/w500/6eEYfJtcJQ6e6J2lzkgzUDShR6V.jpg",
    "banner": "https://image.tmdb.org/t/p/original/zZqpAXxVSBtxV9qPBcscfXBcL2w.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/zZqpAXxVSBtxV9qPBcscfXBcL2w.jpg",
    "hasBackdrop": true,
    "score": "8.5",
    "totalEpisodes": 73,
    "episodes": 73,
    "number_of_seasons": 8,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "En un mundo fantástico y en un contexto medieval varias familias, relativas a la nobleza, se disputan el poder para dominar el territorio ficticio de Poniente (Westeros) y tomar el control de los Siete Reinos desde el Trono de Hierro, lugar donde el rey ejerce el poder.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Drama",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "1402": {
    "id": 1402,
    "title": "The Walking Dead",
    "image": "https://image.tmdb.org/t/p/w500/kuPOrTbvqJisGskhYIZyUOHrS3J.jpg",
    "banner": "https://image.tmdb.org/t/p/original/rAOjnEFTuNysY7bot8zonhImGMh.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/rAOjnEFTuNysY7bot8zonhImGMh.jpg",
    "hasBackdrop": true,
    "score": "8.1",
    "totalEpisodes": 177,
    "episodes": 177,
    "number_of_seasons": 11,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "El oficial Rick Grimes se despierta del coma para descubrir que el mundo está en ruinas y debe guiar a un grupo de sobrevivientes para permanecer con vida.",
    "genres": [
      "Action & Adventure",
      "Drama",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "1427": {
    "id": 1427,
    "title": "El Perfume: Historia de un asesino",
    "image": "https://image.tmdb.org/t/p/w500/dAR6MYoz8VrUhGsT0F8ZsqONtdp.jpg",
    "banner": "https://image.tmdb.org/t/p/original/kgHYRHQ5BZM1mxsy1MSZepNjMiR.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/kgHYRHQ5BZM1mxsy1MSZepNjMiR.jpg",
    "hasBackdrop": true,
    "score": "7.4",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Jean-Baptiste Grenouille, nacido con un sentido olfativo superior, crea el mejor perfume del mundo. Su trabajo, sin embargo, toma un giro oscuro mientras busca el aroma definitivo.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "8292": {
    "id": 8292,
    "title": "Cuatro hermanos",
    "image": "https://image.tmdb.org/t/p/w500/1HtCW7TO9HvsEyK7Nm1bQYwcgxD.jpg",
    "banner": "https://image.tmdb.org/t/p/original/2pITFeesu6aikrEknoH6bNXOdhk.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/2pITFeesu6aikrEknoH6bNXOdhk.jpg",
    "hasBackdrop": true,
    "score": "6.8",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Después del asesinato de su madre adoptiva en un atraco, los hermanos Mercer -el impulsivo Bobby , el seductor Angel , el padre de familia y hombre de negocios Jeremiah  y el roquero duro Jack - se reúnen de nuevo para aclarar su muerte. Ya en la pista del asesino, no tardan en darse cuenta de que su habitual comportamiento tiene nuevas consecuencias. En este drama de acción basado en la fuerza de los personajes dirigido por John Singleton , cuatro hermanos descubren que les une algo mucho más poderoso que la sangre.",
    "genres": [
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "8358": {
    "id": 8358,
    "title": "Náufrago",
    "image": "https://image.tmdb.org/t/p/w500/BlxcYMoHMXsgf3sXcHAjLOuQ1y.jpg",
    "banner": "https://image.tmdb.org/t/p/original/oCFVYPXI4IfhtF3GapU2jkDicDI.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/oCFVYPXI4IfhtF3GapU2jkDicDI.jpg",
    "hasBackdrop": true,
    "score": "7.7",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Chuck Noland, un ejecutivo de la empresa multinacional de mensajería FedEx, se ve apartado de su cómoda vida y de su prometida a causa de un accidente de avión por el que queda aislado de la civilización en una remota isla tropical. Único superviviente y solo en la isla, tras cuatro años de subsistencia Chuck aprende todas las técnicas de supervivencia mientras sufre la tortura de la soledad. La solución: arriesgar la vida adentrándose mar adentro.",
    "genres": [
      "Action & Adventure",
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "9619": {
    "id": 9619,
    "title": "El pico de Dante",
    "image": "https://image.tmdb.org/t/p/w500/aHRHfuVXEivk6abXySYCbmanUEL.jpg",
    "banner": "https://image.tmdb.org/t/p/original/u7UiqwVv1xI92Sg40yhNcz5K32k.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/u7UiqwVv1xI92Sg40yhNcz5K32k.jpg",
    "hasBackdrop": true,
    "score": "6.3",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Harry Dalton (Pierce Brosnan), un prestigioso vulcanólogo (todavía afectado por la muerte de su esposa en la erupción del monte Pinatubo), detecta una peligrosa actividad sísmica y avisa de una posible erupción en las cercanías de Dante’s Peak, un tranquilo pueblecito del Noroeste coronado por un inmenso volcán apagado. Pero nadie da crédito a sus avisos hasta que ya es demasiado tarde. El volcán entra en erupción y la población, dominada por el pánico intenta huir. Harry intentará escapar con la alcaldesa (Linda Hamilton) y sus hijos.",
    "genres": [
      "Action & Adventure",
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "13836": {
    "id": 13836,
    "title": "La Montaña Embrujada",
    "image": "https://image.tmdb.org/t/p/w500/fta3pl47CEZ5mqXClD3XwX3fQhC.jpg",
    "banner": "https://image.tmdb.org/t/p/original/rlEQAN7vPn0mUUaHFjfgtUOQRtB.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/rlEQAN7vPn0mUUaHFjfgtUOQRtB.jpg",
    "hasBackdrop": true,
    "score": "5.8",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Durante años han circulado extrañas historias sobre Witch Mountain, un lugar situado en el desierto de Nevada, donde se han producido fenomenos inexplicables. Un taxista de Las Vegas, que debe llevar a este lugar a dos jóvenes con poderes sobrenaturales, se verá envuelto en una misteriosa aventura.\r En el asunto se verán involucrados el Gobierno, la mafia y diversos seres extraterrestres.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "17578": {
    "id": 17578,
    "title": "Las Aventuras de Tintín",
    "image": "https://image.tmdb.org/t/p/w500/5d68HDBs2QtKlAuhrF5oVQ6s90h.jpg",
    "banner": "https://image.tmdb.org/t/p/original/6mqgl2szMLRYj4lhlXOjju5Tpeo.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/6mqgl2szMLRYj4lhlXOjju5Tpeo.jpg",
    "hasBackdrop": true,
    "score": "6.9",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Tintín, un joven periodista dotado de una curiosidad insaciable, y su leal perro Milú descubren que la maqueta de un barco contiene un enigmático y secular secreto que deben investigar. A partir de ese momento, Tintín se verá acosado por Ivan Ivanovitch Sakharine, un diabólico villano que cree que el joven ha robado un valioso tesoro vinculado a un cruel pirata llamado Rackham el Rojo. Pero, con la ayuda de Milú, del cascarrabias capitán Haddock y de los torpes detectives Hernández y Fernández, viajará por medio mundo, sirviéndose de su proverbial astucia para burlar a sus perseguidores y encontrar antes que ellos El Unicornio, un navío hundido que puede proporcionar la clave de una fabulosa fortuna y de una antigua maldición.",
    "genres": [
      "Action & Adventure",
      "Animación",
      "Misterio"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "18905": {
    "id": 18905,
    "title": "Cavernícola",
    "image": "https://image.tmdb.org/t/p/w500/vQXrIvUtog7R32HFeTW6R3tYGIQ.jpg",
    "banner": "https://image.tmdb.org/t/p/original/3jQFPMk9DanjVy3s930aWuOFN2j.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/3jQFPMk9DanjVy3s930aWuOFN2j.jpg",
    "hasBackdrop": true,
    "score": "6.7",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "La vida en la edad de piedra es dura para el pobre Atouk porque, aunque está muy enamorado, como es el más pequeño y el más debilucho de los cavernícolas de su tribu, el objeto de sus deseos, la hermosa Lana no le hace ni caso. Además el compañero de Lana, Tonda, un fortachon que es además el jefe de la tribu, lo ha echado de la caverna. Atouk se ve obligado a vagar por ahí, donde acaba formando extrañas alianzas con personajes que, al conocer su historia, se deciden a ayudarle para que vuelva con su clan.",
    "genres": [
      "Comedia",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "20526": {
    "id": 20526,
    "title": "Tron: El Legado",
    "image": "https://image.tmdb.org/t/p/w500/oImEJEbwvhf00tY8SXapLr9vPnP.jpg",
    "banner": "https://image.tmdb.org/t/p/original/uUa6jgSr5BQpcBhhaz1PV1JhSa4.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/uUa6jgSr5BQpcBhhaz1PV1JhSa4.jpg",
    "hasBackdrop": true,
    "score": "6.5",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "En un intento de descubrir la desaparición de su padre, el audaz Sam Flynn logra ingresar a un mundo digital. Acompañado de Quorra, Sam emprende una misión para impedir los planes del malvado dictador Clu.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "39254": {
    "id": 39254,
    "title": "Gigantes de Acero",
    "image": "https://image.tmdb.org/t/p/w500/2iYS1XVm8vh5vokZhO3N4dtgODn.jpg",
    "banner": "https://image.tmdb.org/t/p/original/pjlxrd646cBYznHoPBWTzz6FujX.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/pjlxrd646cBYznHoPBWTzz6FujX.jpg",
    "hasBackdrop": true,
    "score": "7.2",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "En un futuro no muy lejano el boxeo es robótico: en los combates ya no se enfrentan seres humanos, sino robots humanoides, sofisticadas máquinas diseñadas para luchar. Charlie Kenton, un antiguo boxeador que casi llegó a alcanzar la gloria, está pasando una mala racha como promotor de combates. Un día, encuentra un viejo robot desechado y, al comprobar que es un gran boxeador, decide entrenarlo.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy",
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "39513": {
    "id": 39513,
    "title": "Paul",
    "image": "https://image.tmdb.org/t/p/w500/e57pNjhWbRos9BTvgeUYUzB8VfO.jpg",
    "banner": "https://image.tmdb.org/t/p/original/kl3rMfydlxyLDsZidSUCEWm8K0M.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/kl3rMfydlxyLDsZidSUCEWm8K0M.jpg",
    "hasBackdrop": true,
    "score": "6.8",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Un viajero espacial muy listillo llamado Paul (SETH ROGEN, The Green Hornet, Lío embarazoso) lleva sesenta años encerrado en una base militar ultrasecreta, aconsejando a los líderes mundiales acerca de otros alienígenas. Cuando empieza a darse cuenta de que ya no es tan útil y de que la mesa de disección se acerca peligrosamente, Paul decide escapar en la primera autocaravana que se detiene cerca de la base militar en el Área 51. Por suerte para él, en dicha autocaravana van dos terrícolas perfectamente dispuestos a rescatar y albergar a un alienígena con problemas.",
    "genres": [
      "Action & Adventure",
      "Comedia",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "47933": {
    "id": 47933,
    "title": "El Día de la Independencia 2: Contraataque",
    "image": "https://image.tmdb.org/t/p/w500/gzmi2lx6pQZRjoE47HCUCnuBOFd.jpg",
    "banner": "https://image.tmdb.org/t/p/original/auT0H5fFUnPKjHNj0OkQMkxdbl2.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/auT0H5fFUnPKjHNj0OkQMkxdbl2.jpg",
    "hasBackdrop": true,
    "score": "5.4",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Utilizando tecnología obtenida de los extraterrestres, las naciones de la Tierra, previendo el regreso de los invasores, han colaborado en un gigantesco programa de defensa para proteger el planeta. Pero nada puede prepararnos para hacer frente a la avanzada e inaudita fuerza de los atacantes. Sólo la inventiva de unos pocos hombres y mujeres valientes puede rescatar a nuestro mundo del borde de la extinción…",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "48866": {
    "id": 48866,
    "title": "Los 100",
    "image": "https://image.tmdb.org/t/p/w500/7zzHG46UG43IkfdEVKuCo2L84eM.jpg",
    "banner": "https://image.tmdb.org/t/p/original/8ZerYKvIaNUJZvAHXYTQu4qTwFw.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/8ZerYKvIaNUJZvAHXYTQu4qTwFw.jpg",
    "hasBackdrop": true,
    "score": "7.9",
    "totalEpisodes": 100,
    "episodes": 100,
    "number_of_seasons": 7,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "'Los 100' es un drama post apocalíptico escrito por Jason Rothenberg (Body Politic), basado en los libros de Kass Morgan. La historia está centrada en lo que ocurre con la civilización casi cien años después de que una guerra nuclear la haya devastado",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure",
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "49849": {
    "id": 49849,
    "title": "Cowboys & Aliens",
    "image": "https://image.tmdb.org/t/p/w500/2hEmG3aAodAFsMDySSWia53HneG.jpg",
    "banner": "https://image.tmdb.org/t/p/original/sGXCYMzr1sCnGNVuRpB2TOWPWDA.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/sGXCYMzr1sCnGNVuRpB2TOWPWDA.jpg",
    "hasBackdrop": true,
    "score": "5.7",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Una nave espacial llega a Arizona, 1873, para apoderarse de la Tierra, empezando por la región del Salvaje Oeste. Una pandilla de vaqueros y nativos es todo lo que se interpone en su camino.",
    "genres": [
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "60304": {
    "id": 60304,
    "title": "Hansel y Gretel: Cazadores de brujas",
    "image": "https://image.tmdb.org/t/p/w500/cSoRQKVITESDpSCOdzgAyCy6xeE.jpg",
    "banner": "https://image.tmdb.org/t/p/original/mJSe5dxKu8Sq0GfdjdWVqdGvzfV.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/mJSe5dxKu8Sq0GfdjdWVqdGvzfV.jpg",
    "hasBackdrop": true,
    "score": "6.1",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Han pasado quince años desde que Hansely Gretel vivieron la aventura que los hizo famosos. Tras probar el sabor de la sangre siendo unos niños, ambos se han convertido en unos auténticos justicieros, dispuestos a todo para vengarse. Pero ahora, sin que ellos lo sepan, también se han convertido en la presa, y tienen que enfrentarse a algo mucho más siniestro que las brujas: su pasado.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "61459": {
    "id": 61459,
    "title": "Parasyte: The Maxim",
    "image": "https://image.tmdb.org/t/p/w500/dC1rIfKScgrHjmZYdTpUgWpZF4h.jpg",
    "banner": "https://image.tmdb.org/t/p/original/zfk6siC4KRXurG4jJzSXHy9szGQ.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/zfk6siC4KRXurG4jJzSXHy9szGQ.jpg",
    "hasBackdrop": true,
    "score": "8.3",
    "totalEpisodes": 24,
    "episodes": 24,
    "number_of_seasons": 1,
    "type": "TV",
    "contentType": "animes",
    "isMovie": false,
    "description": "Un día, pequeños gusanos alienígenas llamados «parásitos» invaden la Tierra para apoderarse del cerebro de los humanos y tomar control total de sus cuerpos. Shinichi Izumi, un estudiante de secundaria común, es atacado por uno de estos seres, pero logra bloquearlo a tiempo para evitar que llegue a su cabeza. Como resultado, el parásito queda atrapado dentro de su mano derecha, desarrollándose como una entidad independiente llamada Migi.\n\nAl ser incapaces de devorar el cerebro del otro, Shinichi y Migi no tienen más opción que coexistir en una extraña simbiosis. Sin embargo, para sobrevivir en un mundo donde otros parásitos ven a la humanidad únicamente como alimento, ambos deberán unir fuerzas y luchar contra violentas amenazas que ponen en riesgo su vida y el destino de la especie humana.",
    "genres": [
      "Animación",
      "Drama",
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "68726": {
    "id": 68726,
    "title": "Titanes Del Pacífico",
    "image": "https://image.tmdb.org/t/p/w500/qGu6CHagpxv1XW6Bn3sUJ9SFaH0.jpg",
    "banner": "https://image.tmdb.org/t/p/original/9X7Im1YuBhyHYVD8r7CAONPJR5k.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/9X7Im1YuBhyHYVD8r7CAONPJR5k.jpg",
    "hasBackdrop": true,
    "score": "6.9",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Cuando legiones de monstruosas criaturas, denominadas Kaiju, comienzan a salir del mar, se inicia una guerra que acabará con millones de vidas y que consumirá los recursos de la humanidad durante interminables años. Para combatir a los Kaiju gigantes diseñan un tipo especial de arma: enormes robots, llamados Jaegers, que son controlados simultáneamente por dos pilotos cuyas mentes están bloqueadas en un puente neural. Pero incluso los Jaegers proporcionan poca defensa ante los incansables Kaiju. A punto de la derrota, las fuerzas que defienden a la humanidad no tienen otra elección que recurrir a dos insólitos héroes: un ex piloto acabado y un aprendiz que todavía no se ha puesto a prueba. Ambos se unen para traer a un legendario pero al parecer obsoleto Jaeger del pasado. Juntos, son la última esperanza de la humanidad frente al Apocalipsis que se avecina",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "72190": {
    "id": 72190,
    "title": "Guerra mundial Z",
    "image": "https://image.tmdb.org/t/p/w500/a8ogjWFd0QS6BzBkzfDMWukc26i.jpg",
    "banner": "https://image.tmdb.org/t/p/original/kg2FOT2Oe5PSCgs3L4vLel6B7ck.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/kg2FOT2Oe5PSCgs3L4vLel6B7ck.jpg",
    "hasBackdrop": true,
    "score": "6.9",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Gerry Lane, antiguo empleado de las Naciones Unidas, recorre el mundo en una carrera contrarreloj para detener una pandemia zombi que está derribando ejércitos y gobiernos y amenaza con destruir a la propia humanidad.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "87101": {
    "id": 87101,
    "title": "Terminator: Génesis",
    "image": "https://image.tmdb.org/t/p/w500/5N5PnUoywvOduFb4Qw6HD2LkMtu.jpg",
    "banner": "https://image.tmdb.org/t/p/original/wvlIoof1FnKPLv9jAYanuP31V0C.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/wvlIoof1FnKPLv9jAYanuP31V0C.jpg",
    "hasBackdrop": true,
    "score": "6.0",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Año 2032. La guerra del futuro se está librando y un grupo de rebeldes humanos tiene el sistema de inteligencia artificial Skynet contra las cuerdas. John Connor es el líder de la resistencia, y Kyle Reese es su fiel soldado, criado en las ruinas de una postapocalíptica California. Para salvaguardar el futuro, Connor envía a Reese a 1984 para salvar a su madre, Sarah de un Terminator programado para matarla con el fin de que no llegue a dar a luz a John. Pero lo que Reese encuentra en el otro lado no es como él esperaba.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "87421": {
    "id": 87421,
    "title": "Riddick: El amo de la oscuridad",
    "image": "https://image.tmdb.org/t/p/w500/iHCXnbzvVCsPD1hcSi5iH6iEYSz.jpg",
    "banner": "https://image.tmdb.org/t/p/original/naGU49u4BXynQ1o5L755pfs8dom.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/naGU49u4BXynQ1o5L755pfs8dom.jpg",
    "hasBackdrop": true,
    "score": "6.3",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Traicionado por su propia especie y dado por muerto en un lejano y desolado planeta, aparentemente sin vida, el duro Riddick tendrá que luchar por la supervivencia contra depredadores alienígenas y cazarrecompensas, cnvirtiéndose en un ser más poderoso y peligroso que nunca… Tercera entrega de la saga iniciada en «Pitch Black» y continuada en «Las crónicas de Riddick",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "94997": {
    "id": 94997,
    "title": "La casa del dragón",
    "image": "https://image.tmdb.org/t/p/w500/szyVpg9K3LL5s8VFAGkXzlxgZUk.jpg",
    "banner": "https://image.tmdb.org/t/p/original/577eXC8wFQT0eUrJcgznSiFPRmk.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/577eXC8wFQT0eUrJcgznSiFPRmk.jpg",
    "hasBackdrop": true,
    "score": "8.4",
    "totalEpisodes": 26,
    "episodes": 26,
    "number_of_seasons": 3,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Basada en el libro 'Fuego y Sangre' de George R.R. Martin. La serie se centra en la casa Targaryen, trescientos años antes de los eventos vistos en 'Juego de Tronos'.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Drama",
      "Action & Adventure"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "108978": {
    "id": 108978,
    "title": "Reacher",
    "image": "https://image.tmdb.org/t/p/w500/puKRIbG2asaTFHIjJS5sydIW1zB.jpg",
    "banner": "https://image.tmdb.org/t/p/original/pF0qkRsrHkdYadPWY9AMeFZfcwk.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/pF0qkRsrHkdYadPWY9AMeFZfcwk.jpg",
    "hasBackdrop": true,
    "score": "8.1",
    "totalEpisodes": 32,
    "episodes": 32,
    "number_of_seasons": 4,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Cuando lo arrestan por un asesinato que no cometió, el oficial retirado de la policía militar Jack Reacher se ve envuelto en una conspiración letal de policías corruptos, empresarios turbios y políticos intrigantes. Solo con su ingenio, debe descubrir qué está sucediendo en Margrave, Georgia. La primera temporada de \"Reacher\" se basa en la exitosa novela \"Zona peligrosa\" de Lee Child.",
    "genres": [
      "Action & Adventure"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "178809": {
    "id": 178809,
    "title": "La colonia",
    "image": "https://image.tmdb.org/t/p/w500/2VezrcRVvZxPjpCgSqiXB7tF5Gd.jpg",
    "banner": "https://image.tmdb.org/t/p/original/uFjqB95kxb3iAK1cohxNx8MbPzZ.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/uFjqB95kxb3iAK1cohxNx8MbPzZ.jpg",
    "hasBackdrop": true,
    "score": "5.5",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Bajo la superficie helada, los sobrevivientes de la Colonia Siete luchan mientras los suministros de alimento disminuyen los y las temperaturas continúan bajando. Acosado por la enfermedad y los conflictos internos, los colonos sospechan lo peor cuando misteriosamente pierden el contacto con la colonia Cinco - el único otro establecimiento conocido. Sam (Zegers), un mecánico de carácter fuerte, con un pasado trágico, se une a un equipo encabezado por Briggs (Fishburne) en una peligrosa expedición para averiguar lo que pasó. Después de un viaje infernal, descubren una amenaza mucho peor de lo imaginado, y ahora la Colonia Siete debe ganar una batalla feroz para preservar el pasado de la humanidad.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "213331": {
    "id": 213331,
    "title": "Boushoku no Berserk",
    "image": "https://image.tmdb.org/t/p/w500/p5rtHwieByHo1NdzOxB3vtVJJnA.jpg",
    "banner": "https://image.tmdb.org/t/p/original/w6UrhLiXEMLwI4PFv2I2JEPhLRj.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/w6UrhLiXEMLwI4PFv2I2JEPhLRj.jpg",
    "hasBackdrop": true,
    "score": "7.1",
    "totalEpisodes": 12,
    "episodes": 12,
    "number_of_seasons": 1,
    "type": "TV",
    "contentType": "animes",
    "isMovie": false,
    "description": "Fate es un guardia del castillo en un mundo en que las habilidades lo son todo, pero él recibió una llamada Gula cuya única utilidad es darle hambre, con lo que el joven lleva una vida miserable. Un día unos bandidos se infiltran en el castillo y el mundo de Fate cambiará de golpe. Esta es la historia de cómo un joven al que ridiculizaban por no tener talento empieza a ascender en la vida.",
    "genres": [
      "Animación",
      "Sci-Fi & Fantasy"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "220102": {
    "id": 220102,
    "title": "Spider-Noir",
    "image": "https://image.tmdb.org/t/p/w500/oD8WSVqz84ZRfelkr7JPeJwR9Iv.jpg",
    "banner": "https://image.tmdb.org/t/p/original/reAZlLG6YMkBuxPT1XKuCH97TM1.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/reAZlLG6YMkBuxPT1XKuCH97TM1.jpg",
    "hasBackdrop": true,
    "score": "8.3",
    "totalEpisodes": 8,
    "episodes": 8,
    "number_of_seasons": 1,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Al detective privado Ben Reilly lo contratan para un par de casos sencillos... hasta que unos mafiosos, unos monstruos y una femme fatale misteriosa tejen una red que lo obliga a encarar su antigua vida como el único superhéroe de Nueva York: La Araña.",
    "genres": [
      "Drama",
      "Misterio"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "227719": {
    "id": 227719,
    "title": "Proyecto Almanac",
    "image": "https://image.tmdb.org/t/p/w500/7ZocuSaZSSQtP1ittRlAwHo4PlG.jpg",
    "banner": "https://image.tmdb.org/t/p/original/eyJk5LTMLIeAN2kVsP0yXrPZJfl.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/eyJk5LTMLIeAN2kVsP0yXrPZJfl.jpg",
    "hasBackdrop": true,
    "score": "6.8",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Un grupo de jóvenes se embarca en una aventura cuando descubren planes secretos para construir una máquina del tiempo, que utilizarán para arreglar sus problemas y obtener beneficios personales.",
    "genres": [
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "229711": {
    "id": 229711,
    "title": "Cazador de Demonios",
    "image": "https://image.tmdb.org/t/p/w500/6Ru3HStuwofNr6d20sKzAgmI2Yu.jpg",
    "banner": "https://image.tmdb.org/t/p/original/vfEtEzBIn0wwWM7ppzJCGEZUSu2.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/vfEtEzBIn0wwWM7ppzJCGEZUSu2.jpg",
    "hasBackdrop": true,
    "score": "7.2",
    "totalEpisodes": 8,
    "episodes": 8,
    "number_of_seasons": 1,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Hub Halloran, un cazarrecompensas asesinado es resucitado por el Diablo para cazar demonios que escaparon de la prisión del Infierno. Mientras persigue a estos demonios con la ayuda y obstáculos de su distanciada familia, Hub descubre como sus propios pecados condenaron su alma y busca una segunda oportunidad en la vida, el amor y la música country.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy",
      "Comedia",
      "Misterio"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "241609": {
    "id": 241609,
    "title": "Amigos y vecinos",
    "image": "https://image.tmdb.org/t/p/w500/ikaSVbTZyzsnjHK0ex64bJqQpgd.jpg",
    "banner": "https://image.tmdb.org/t/p/original/e0mloha4ZQfLVZj0nsUtU7AoRs4.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/e0mloha4ZQfLVZj0nsUtU7AoRs4.jpg",
    "hasBackdrop": true,
    "score": "7.8",
    "totalEpisodes": 19,
    "episodes": 19,
    "number_of_seasons": 2,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Cuando un titán de las inversiones se queda sin trabajo y se divorcia comienza a robar las riquezas de sus vecinos para sobrevivir. Robar dentro de su círculo social lo emociona de forma extraña, pero poco a poco se adentra en una red mortal.",
    "genres": [
      "Drama"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "245891": {
    "id": 245891,
    "title": "Otro día para matar",
    "image": "https://image.tmdb.org/t/p/w500/mHJX5D5FKKoC0GWUAWFq2qJZrPv.jpg",
    "banner": "https://image.tmdb.org/t/p/original/ff2ti5DkA9UYLzyqhQfI2kZqEuh.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/ff2ti5DkA9UYLzyqhQfI2kZqEuh.jpg",
    "hasBackdrop": true,
    "score": "7.5",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "La ciudad de Nueva York se convierte en el patio acribillado a balazos de un ex-asesino mientras él elimina a los gánsteres que destruyeron todo lo que él quería.",
    "genres": [
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "247518": {
    "id": 247518,
    "title": "Grotesquerie",
    "image": "https://image.tmdb.org/t/p/w500/oskgLp7inXPU9NgfL2NWRW0KK2e.jpg",
    "banner": "https://image.tmdb.org/t/p/original/tUdqnpN03fQFWAe5O7d61O2lNkr.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/tUdqnpN03fQFWAe5O7d61O2lNkr.jpg",
    "hasBackdrop": true,
    "score": "7.3",
    "totalEpisodes": 10,
    "episodes": 10,
    "number_of_seasons": 1,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Una serie de crímenes atroces desestabilizan una pequeña comunidad, y la detective Lois Tryon siente que son inquietantemente personales, como si alguien (o algo) se burlara de ella.",
    "genres": [
      "Drama",
      "Misterio"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "257344": {
    "id": 257344,
    "title": "Pixeles",
    "image": "https://image.tmdb.org/t/p/w500/z3AGDMXtXfWextrNR9l6ajJxM4w.jpg",
    "banner": "https://image.tmdb.org/t/p/original/6UFnKzVzFqKDjs4iCVLJdneK3ch.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/6UFnKzVzFqKDjs4iCVLJdneK3ch.jpg",
    "hasBackdrop": true,
    "score": "5.8",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Unos extraterrestres malinterpretan las imágenes de las máquinas recreativas como una declaración de guerra y deciden atacar la Tierra, empleando dichos juegos como modelos para el asalto. El presidente de Estados Unidos, Will Cooper, recurre entonces a su gran amigo de la infancia y campeón de las maquinitas de los años 80, Sam Brenner, quien actualmente trabaja como instalador de sistemas de home cinema, para encabezar un equipo de expertos jugadores de su época (Dinklage y Gad). Su misión será derrotar a los alienígenas y salvar al planeta.",
    "genres": [
      "Action & Adventure",
      "Comedia",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "261579": {
    "id": 261579,
    "title": "El nivel secreto",
    "image": "https://image.tmdb.org/t/p/w500/y5jxT1jnydJL6sB3QkzCLu8e3HS.jpg",
    "banner": "https://image.tmdb.org/t/p/original/ig8RyPKbHsueuFDIFVXIlqNCcCq.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/ig8RyPKbHsueuFDIFVXIlqNCcCq.jpg",
    "hasBackdrop": true,
    "score": "7.4",
    "totalEpisodes": 15,
    "episodes": 15,
    "number_of_seasons": 1,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Serie animada para adultos que presenta una antología de historias cortas originales ambientadas en los mundos de los videojuegos más queridos creados con el equipo detrás de la serie \"Love Death & Robots\".",
    "genres": [
      "Animación",
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "267860": {
    "id": 267860,
    "title": "Londres bajo fuego",
    "image": "https://image.tmdb.org/t/p/w500/vGiJRfqZ6E7zq3TJFrMn2tgr5A1.jpg",
    "banner": "https://image.tmdb.org/t/p/original/ndi0PlHzSbV2pV2wUZFtS58Wk54.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/ndi0PlHzSbV2pV2wUZFtS58Wk54.jpg",
    "hasBackdrop": true,
    "score": "6.2",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "En un mundo gobernado por la injusticia y el caos, aparece la figura del Presidente de los Estados Unidos que junto a su portavoz Trumbull, liderarán una lucha interna por las libertades de todos los americanos. Sin embargo, se producirá un intento de derrocamiento por parte de fuerzas espías para acabar con el Primer Ministro inglés. Esto podría significar el fin de la paz mundial. Para ello el Presidente contará con la inestimable ayuda de su guardaespaldas. Mike Benning, agente secreto del MI6, liderará una operación para intentar acabar con esta revolución. Benning no estará sólo, ya que volverá a encontrar apoyo de Trumbull, especializado en técnicas paramilitares.",
    "genres": [
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "268896": {
    "id": 268896,
    "title": "Titanes del Pacífico: La insurrección",
    "image": "https://image.tmdb.org/t/p/w500/cxSBAjrOa2nluuPGUUIWLM5ycLn.jpg",
    "banner": "https://image.tmdb.org/t/p/original/oMaj75G2WFw66xI1TREg1hrToSg.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/oMaj75G2WFw66xI1TREg1hrToSg.jpg",
    "hasBackdrop": true,
    "score": "6.1",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Un futuro cercano. Han pasado 10 años tras la primera invasión que sufrió la humanidad, pero la lucha aún no ha terminado. El planeta vuelve a ser asediado por los Kaiju, una raza de alienígenas colosales, que emergen desde un portal interdimensional con el objetivo de destruir a la raza humana. Ante esta nueva amenaza, los Jaegers, robots gigantes de guerra pilotados por dos personas para sobrellevar la inmensa carga neuronal que conlleva manipularlos, ya no están a la altura de lo que se les viene encima. Será entonces cuando los supervivientes de la primera invasión, además de nuevos personajes como el hijo de Pentecost, tendrán que idear la manera de sorprender al enorme enemigo, apostando por nuevas estrategias defensivas y de ataque. Con la Tierra en ruinas e intentando reconstruirse, esta nueva batalla puede ser decisiva para el futuro...",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "276161": {
    "id": 276161,
    "title": "Así aprenderás",
    "image": "https://image.tmdb.org/t/p/w500/lG83nWVT7cHl3nSxonaYhOjqyWH.jpg",
    "banner": "https://image.tmdb.org/t/p/original/vyG93jhmPL7tBIhRtCLa5mdBKob.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/vyG93jhmPL7tBIhRtCLa5mdBKob.jpg",
    "hasBackdrop": true,
    "score": "9.4",
    "totalEpisodes": 10,
    "episodes": 10,
    "number_of_seasons": 1,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Cuando ya nadie respeta nada en las escuelas, un equipo de inspectores llega para poner las cosas en orden con enseñanzas estrictas y efectivas que no aparecen en los libros.",
    "genres": [
      "Action & Adventure",
      "Drama",
      "Comedia"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "290859": {
    "id": 290859,
    "title": "Terminator: Destino oculto",
    "image": "https://image.tmdb.org/t/p/w500/pGMWHlw0CaH94i3u66ejcMd8sR3.jpg",
    "banner": "https://image.tmdb.org/t/p/original/a6cDxdwaQIFjSkXf7uskg78ZyTq.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/a6cDxdwaQIFjSkXf7uskg78ZyTq.jpg",
    "hasBackdrop": true,
    "score": "6.4",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Sarah Connor y el Terminator T-800 regresan con sus icónicas interpretaciones en Terminator: Destino Oculto, La película sirve como una secuela a Terminator 2, dejando de lado todo lo sucedido de la tercera a la quinta parte. De ser el caso, Terminator 6: Destino ocuto iniciaría tomando en cuenta los siguientes hechos: el T-1000 ha sido destruido, también el T-800 que se sacrificó por la humanidad. Sarah Connor y su hijo John están vivos y el Día del Juicio, quizás, pueda ser evitado. Se cree que a partir de un pedazo del T-800 el Terminator será “resucitado” por Sarah para ayudarles a sobrevivir de una nueva amenaza",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "296206": {
    "id": 296206,
    "title": "Agente Kim reactivado",
    "image": "https://image.tmdb.org/t/p/w500/eKJNWq4akdrviR9qEF6xPhzKQU.jpg",
    "banner": "https://image.tmdb.org/t/p/original/g1LJLlmWP74zv9yXKEXm7g9p10O.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/g1LJLlmWP74zv9yXKEXm7g9p10O.jpg",
    "hasBackdrop": true,
    "score": "8.5",
    "totalEpisodes": 10,
    "episodes": 10,
    "number_of_seasons": 1,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Cuando la hija de un modesto padre desaparece, él desempolva sus antiguas habilidades como agente especial para encontrarla… y atrae la atención equivocada.",
    "genres": [
      "Action & Adventure",
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "324552": {
    "id": 324552,
    "title": "John Wick 2: Un Nuevo Día para Matar",
    "image": "https://image.tmdb.org/t/p/w500/tAAikrL3kH3TopsDC2Bgo4ARUiP.jpg",
    "banner": "https://image.tmdb.org/t/p/original/Aa9Lx6gotP0szl9tlt5SPCN08oF.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/Aa9Lx6gotP0szl9tlt5SPCN08oF.jpg",
    "hasBackdrop": true,
    "score": "7.3",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "En esta secuela del éxito de 2014, el legendario asesino John Wick (Keanu Reeves) se ve obligado a salir del retiro por un ex-asociado que planea obtener el control de un misterioso grupo internacional de asesinos. Obligado a ayudarlo por un juramento de sangre, John emprende un viaje a Roma lleno de adrenalina estremecedora para pelear contra los asesinos más peligrosos del mundo.",
    "genres": [
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "335977": {
    "id": 335977,
    "title": "Indiana Jones y el dial del destino",
    "image": "https://image.tmdb.org/t/p/w500/3Sj5ubQ0BLXd6JuECq52Ira8Oor.jpg",
    "banner": "https://image.tmdb.org/t/p/original/57JocxmicOoAMhkUSmdKBlpZWMT.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/57JocxmicOoAMhkUSmdKBlpZWMT.jpg",
    "hasBackdrop": true,
    "score": "6.5",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "El arqueólogo Indiana Jones deberá emprender otra aventura contra el tiempo para intentar recuperar un dial legendario que puede cambiar el curso de la historia. Acompañado por su ahijada, Jones pronto se encuentra enfrentándose a Jürgen Voller, un ex nazi que trabaja para la NASA.",
    "genres": [
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "363676": {
    "id": 363676,
    "title": "Sully: Hazaña en el Hudson",
    "image": "https://image.tmdb.org/t/p/w500/n6vCZhzy8yVKCMCRBrYAaUMLiBB.jpg",
    "banner": "https://image.tmdb.org/t/p/original/oQ024BtJgArg8WI4zfuc2vkCJno.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/oQ024BtJgArg8WI4zfuc2vkCJno.jpg",
    "hasBackdrop": true,
    "score": "7.2",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Chesley “Sully” Sullenberger es un piloto aéreo que en 2009 se convirtió en un héroe cuando, al poco de despegar, su avión se averió y logró realizar un aterrizaje forzoso del aparato en pleno río Hudson, en Nueva York, con 155 pasajeros a bordo.",
    "genres": [
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "397243": {
    "id": 397243,
    "title": "La morgue",
    "image": "https://image.tmdb.org/t/p/w500/zziZJOyTpW1UOBulXufRrQPr1Xj.jpg",
    "banner": "https://image.tmdb.org/t/p/original/2pOd80PQSJ9cUbli7PDeX59q3vQ.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/2pOd80PQSJ9cUbli7PDeX59q3vQ.jpg",
    "hasBackdrop": true,
    "score": "6.8",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "El dueño de una funeraria de una pequeña localidad y su hijo, que trabaja con él, reciben un día el cadáver de la víctima de un misterioso crimen: una bella joven que no tiene ninguna causa aparente de muerte. Ambos intentarán desvelar los intrigantes motivos del fallecimiento de la joven.",
    "genres": [
      "Misterio"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "417261": {
    "id": 417261,
    "title": "Hasta que te encontré",
    "image": "https://image.tmdb.org/t/p/w500/kFhnAQv0ntMlVE4EtYeBzOGWO1w.jpg",
    "banner": "https://image.tmdb.org/t/p/original/gEsBPNcGAuNBU5MGaOAlnm6uDe7.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/gEsBPNcGAuNBU5MGaOAlnm6uDe7.jpg",
    "hasBackdrop": true,
    "score": "7.6",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Liam Page (Alex Roe), una estrella de música country, dejó a su prometida en el altar para centrarse en su carrera profesional, la fama y el éxito. Después de ocho años, regresa a su ciudad natal para asistir al funeral de su mejor amigo. Al volver al lugar donde creció y vivió los mejores momentos de su vida, se da cuenta de todo lo que dejó atrás al olvidar sus raíces. Poco a poco sentirá que no ha podido olvidar al amor de su vida, Josie (Jessica Rothe) e intentará hacer todo lo posible para recuperar a su ex prometida.",
    "genres": [
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "438799": {
    "id": 438799,
    "title": "Operación Overlord",
    "image": "https://image.tmdb.org/t/p/w500/yqNyR7GRO02KWpvPP4NGy58uiBM.jpg",
    "banner": "https://image.tmdb.org/t/p/original/10wHo9VmDvBW9wtSZ26bgjm9GKY.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/10wHo9VmDvBW9wtSZ26bgjm9GKY.jpg",
    "hasBackdrop": true,
    "score": "6.7",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "La víspera del Día-D, un grupo de soldados aliados son enviados a la Francia ocupada por los nazis para completar una misión esencial para la victoria en la guerra. Sobre el terreno, descubren un laboratorio nazi en el que se llevan a cabo grotescos y descabellados experimentos con los habitantes de la localidad.  La formación básica que han recibido no les ha preparado para lo que tendrán que afrontar -habrán de salvar al mundo de una despiadada amenaza, librando una desigual batalla con una tropa de super soldados manipulados genéticamente...",
    "genres": [
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "458156": {
    "id": 458156,
    "title": "John Wick 3: Parabellum",
    "image": "https://image.tmdb.org/t/p/w500/aKw7oqYdfn4pkKYvp18Gd1YhK6m.jpg",
    "banner": "https://image.tmdb.org/t/p/original/vVpEOvdxVBP2aV166j5Xlvb5Cdc.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/vVpEOvdxVBP2aV166j5Xlvb5Cdc.jpg",
    "hasBackdrop": true,
    "score": "7.4",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Después de matar a un miembro del misterioso gremio internacional de asesinos, la Mesa Alta, John Wick está excomulgado, pero los hombres y mujeres más despiadados del mundo esperan cada  uno su turno.",
    "genres": [
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "479455": {
    "id": 479455,
    "title": "Hombres de negro: Internacional",
    "image": "https://image.tmdb.org/t/p/w500/ewPz4CtrgyQZaCRpubtG5IedIkp.jpg",
    "banner": "https://image.tmdb.org/t/p/original/2FYzxgLNuNVwncilzUeCGbOQzP7.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/2FYzxgLNuNVwncilzUeCGbOQzP7.jpg",
    "hasBackdrop": true,
    "score": "5.9",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Cuando alienígenas que cambian de forma amenazan la Tierra, una nueva recluta y un agente veterano emprenden una misión para salvar a su propia organización… y al mundo.",
    "genres": [
      "Comedia",
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "514847": {
    "id": 514847,
    "title": "La Cacería",
    "image": "https://image.tmdb.org/t/p/w500/5WCuPRfa0h8jMT4Iu2jIIQXqllM.jpg",
    "banner": "https://image.tmdb.org/t/p/original/evo3crueRIK9Eutb3lnDLVbD2xD.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/evo3crueRIK9Eutb3lnDLVbD2xD.jpg",
    "hasBackdrop": true,
    "score": "6.7",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Doce desconocidos despiertan en el claro de un bosque. No se conocen, pero tienen algo en común: un grupo de millonarios los ha elegido para divertirse cazándolos como si fueran animales salvajes. No obstante, algunos venderán cara su piel.",
    "genres": [
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "603692": {
    "id": 603692,
    "title": "John Wick 4",
    "image": "https://image.tmdb.org/t/p/w500/5f10VmKDT6Zd02KF2BGidsnPFO4.jpg",
    "banner": "https://image.tmdb.org/t/p/original/7I6VUdPj6tQECNHdviJkUHD2u89.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/7I6VUdPj6tQECNHdviJkUHD2u89.jpg",
    "hasBackdrop": true,
    "score": "7.7",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "John Wick descubre un camino para derrotar a La Mesa. Pero antes de poder ganar su libertad, Wick deberá enfrentarse a un nuevo enemigo con poderosas alianzas en todo el mundo; y contra las fuerzas que convierten a viejos amigos en enemigos.",
    "genres": [
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "606856": {
    "id": 606856,
    "title": "Togo: La verdadera historia",
    "image": "https://image.tmdb.org/t/p/w500/4UUU7fVkbkBO4CnOM585tCJhFDV.jpg",
    "banner": "https://image.tmdb.org/t/p/original/2Jr2OBzoLLOYqQWnyN4eicZv0sL.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/2Jr2OBzoLLOYqQWnyN4eicZv0sL.jpg",
    "hasBackdrop": true,
    "score": "8.1",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Togo es una película estadounidense perteneciente al género dramático que se estrenó en Disney+.  La película se centra en dos figuras clave en la carrera del suero a Nome en 1925, también conocida como \"Gran Carrera de la Misericordia\", en la que los equipos de trineos jalados por perros sirvieron para transportar el suero de antitoxina diftérica a través de condiciones difíciles durante casi 700 millas para salvar a Nome de una epidemia.",
    "genres": [
      "Action & Adventure",
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "617126": {
    "id": 617126,
    "title": "Los 4 Fantásticos: Primeros pasos",
    "image": "https://image.tmdb.org/t/p/w500/lESwYExnRVCDscOmdvklWxZgWUp.jpg",
    "banner": "https://image.tmdb.org/t/p/original/s94NjfKkcSczZ1FembwmQZwsuwY.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/s94NjfKkcSczZ1FembwmQZwsuwY.jpg",
    "hasBackdrop": true,
    "score": "6.9",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Con un estruendoso trasfondo en un mundo retrofuturista inspirado en los años 60, la Primera Familia de Marvel enfrenta su desafío más intimidante hasta ahora. Obligados a equilibrar sus roles como héroes con la fuerza de su vínculo familiar, deben defender la Tierra de un voraz dios espacial llamado Galactus y su enigmático heraldo, Silver Surfer.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "798645": {
    "id": 798645,
    "title": "El sobreviviente",
    "image": "https://image.tmdb.org/t/p/w500/qlDwhPwaCGXAPCtT2gDgON7AZBr.jpg",
    "banner": "https://image.tmdb.org/t/p/original/aHj7d7wSLqrg5cjAcgHhiGr97Ih.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/aHj7d7wSLqrg5cjAcgHhiGr97Ih.jpg",
    "hasBackdrop": true,
    "score": "6.7",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Un hombre se une a un programa de juegos en el que los concursantes, a los que se les permite ir a cualquier parte del mundo, son perseguidos por cazadores empleados para matarlos.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "866398": {
    "id": 866398,
    "title": "Beekeeper: Sentencia de muerte",
    "image": "https://image.tmdb.org/t/p/w500/9X8EhbSpYrf6pGFGttWtVDAs9Hr.jpg",
    "banner": "https://image.tmdb.org/t/p/original/f0ACHVpV707zqu4etZrXnWNdSgL.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/f0ACHVpV707zqu4etZrXnWNdSgL.jpg",
    "hasBackdrop": true,
    "score": "7.3",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "La brutal campaña de venganza de un hombre adquiere dimensiones nacionales cuando se descubre que es un antiguo agente de una poderosa organización clandestina conocida como \"Los apicultores\".",
    "genres": [
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "882569": {
    "id": 882569,
    "title": "El Pacto",
    "image": "https://image.tmdb.org/t/p/w500/nq7NbZtNfIHyL1NXPV1EiG4XQ7u.jpg",
    "banner": "https://image.tmdb.org/t/p/original/eTvN54pd83TrSEOz6wbsXEJktCV.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/eTvN54pd83TrSEOz6wbsXEJktCV.jpg",
    "hasBackdrop": true,
    "score": "7.7",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "En su último período de servicio en Afganistán, el sargento John Kinley se une al intérprete local Ahmed para inspeccionar la región. Cuando su unidad sufre una emboscada, Kinley y Ahmed son los únicos supervivientes. Con los combatientes enemigos persiguiéndoles, Ahmed arriesga su propia vida para llevar a Kinley herido a través de kilómetros de terreno agotador a un lugar seguro. De vuelta en suelo estadounidense, Kinley se entera de que Ahmed y su familia no recibieron el pasaje a Estados Unidos como se prometió. Decidido a proteger a su amigo y pagar su deuda, Kinley regresa a la zona de guerra para recuperar a Ahmed y su familia antes de que las milicias locales les capturen.‎",
    "genres": [
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "1137844": {
    "id": 1137844,
    "title": "Mayday",
    "image": "https://image.tmdb.org/t/p/w500/i3bkXZa5Ut1uuhKa0f0GmtXdLD3.jpg",
    "banner": "https://image.tmdb.org/t/p/original/g7Ccid5kuD7A8hXWlsQiNfwOxaD.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/g7Ccid5kuD7A8hXWlsQiNfwOxaD.jpg",
    "hasBackdrop": true,
    "score": "7.9",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Cuando un piloto naval estadounidense queda atrapado tras líneas enemigas en una misión secreta durante la Guerra Fría, su única oportunidad de sobrevivir es formar una alianza con un excéntrico exagente de la KGB.",
    "genres": [
      "Action & Adventure",
      "Comedia"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "1327819": {
    "id": 1327819,
    "title": "Hoppers: Operación castor",
    "image": "https://image.tmdb.org/t/p/w500/yONVGkDGZ07WGAR5Fq0GErzHUZ9.jpg",
    "banner": "https://image.tmdb.org/t/p/original/u53UYu5XG2hNgWGvs3xGhAVzypl.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/u53UYu5XG2hNgWGvs3xGhAVzypl.jpg",
    "hasBackdrop": true,
    "score": "8.1",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Mabel, una amante de los animales, utiliza una nueva e inteligente tecnología diseñada para \"transmitir\" la conciencia humana a animales robóticos realistas en un intento de comunicarse con los castores, descubriendo misterios dentro del mundo animal más allá de lo que pudiera haber imaginado.",
    "genres": [
      "Animación",
      "Action & Adventure",
      "Comedia",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "1375646": {
    "id": 1375646,
    "title": "Zona cero",
    "image": "https://image.tmdb.org/t/p/w500/pQIpfeenClb2ws9G0kMg3HREjoA.jpg",
    "banner": "https://image.tmdb.org/t/p/original/iGViga8sDCET1S6GfwOlAbuhSGQ.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/iGViga8sDCET1S6GfwOlAbuhSGQ.jpg",
    "hasBackdrop": true,
    "score": "8.1",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "En una conferencia de biotecnología, un virus de mutación rápida se desata y el recinto queda sellado. Con el contagio en expansión y los infectados evolucionando en formas impredecibles, un grupo de sobrevivientes deberá abrirse paso en un encierro donde cada minuto cambia las reglas.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "18": {
    "id": 18,
    "title": "El Quinto Elemento",
    "image": "https://image.tmdb.org/t/p/w500/4IgMSK6ehZcfniZoWFRLSxEPcHS.jpg",
    "banner": "https://image.tmdb.org/t/p/original/jW21PoKwqs79wk6bfiYezox63mK.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/jW21PoKwqs79wk6bfiYezox63mK.jpg",
    "hasBackdrop": true,
    "score": "7.6",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Cada 5.000 años se abre una puerta entre las dimensiones. En una dimensión existe el Universo y la vida. En la otra dimensión existe un elemento que no está hecho ni de tierra, ni de fuego, ni de aire, ni de agua, sino que es una anti-energía, la anti-vida: es el quinto elemento.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "22": {
    "id": 22,
    "title": "Piratas del Caribe: La Maldición del Perla Negra",
    "image": "https://image.tmdb.org/t/p/w500/8zHnkTGyAImBcI49a1xFJHUjbaK.jpg",
    "banner": "https://image.tmdb.org/t/p/original/uRNgkJSkNBFbbn9fPsEjDIy8Sh3.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/uRNgkJSkNBFbbn9fPsEjDIy8Sh3.jpg",
    "hasBackdrop": true,
    "score": "7.8",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Cuando el astuto pirata Capitán Barbossa se apodera del amado barco de Jack Sparrow, la Perla Negra, y secuestra a la hija del gobernador, Elizabeth Swann, el herrero Will Turner se une a regañadientes al impredecible pirata Jack para rescatarla, solo para descubrir una aterradora maldición que convierte a la tripulación de Barbossa en muertos vivientes.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "38": {
    "id": 38,
    "title": "Eterno resplandor de una mente sin recuerdos",
    "image": "https://image.tmdb.org/t/p/w500/pQXtf7v3j7TQMIVTf4SqrWXPE1n.jpg",
    "banner": "https://image.tmdb.org/t/p/original/95qi5TJMIBI5VzWHia88Pbrye7Z.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/95qi5TJMIBI5VzWHia88Pbrye7Z.jpg",
    "hasBackdrop": true,
    "score": "8.1",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Cuando descubre que su novia, Clementine, ha hecho que borren de su memoria todos los recuerdos de su tormentosa relación, Joel Barish se pone en contacto con el creador del proceso para que borre a Clementine de su memoria.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "58": {
    "id": 58,
    "title": "Piratas del Caribe 2: El Cofre de la Muerte",
    "image": "https://image.tmdb.org/t/p/w500/33csnYX0xLObW0AsAqjMdhomCLe.jpg",
    "banner": "https://image.tmdb.org/t/p/original/vr6n6ZFUZvedvIlhfYcbCWcaKyW.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/vr6n6ZFUZvedvIlhfYcbCWcaKyW.jpg",
    "hasBackdrop": true,
    "score": "7.4",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "El capitán Jack Sparrow tiene una deuda de sangre que saldar: le debe su alma al legendario Davy Jones, el temible gobernante de las profundidades oceánicas. Para escapar de la servidumbre eterna a bordo del Holandés Errante, el astuto Jack debe encontrar el corazón aún palpitante de Jones. Pero no lo hará solo: Will Turner y Elizabeth Swann se ven envueltos de nuevo en otra de sus peligrosas misiones, siempre y cuando logren evitar la ejecución por ayudar a un pirata.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "65": {
    "id": 65,
    "title": "8 Mile: Calle de ilusiones",
    "image": "https://image.tmdb.org/t/p/w500/l9x4o8qcKYxyC15GTzRUcGCxGCE.jpg",
    "banner": "https://image.tmdb.org/t/p/original/jNG7pl0DkN1nzxnbZj4MCGf2VEG.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/jNG7pl0DkN1nzxnbZj4MCGf2VEG.jpg",
    "hasBackdrop": true,
    "score": "7.1",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "La gente de Detroit conoce al limite de la Ciudad como 8 Mile. Pero este límite no solamente es físico sino que es una barrera psicologica que separa a Jimmy Smith de lo que el quiere llegar a ser. 8 Mile Calle de las Ilusiones es una provocativa refleión de lo que implica una semana para la vida de Jimmy. Esta película es estelarizada por el multi-premiado artista EMINEM en su primer papel protagónico jacompañado por Kim Basinger como su madre.",
    "genres": [
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "74": {
    "id": 74,
    "title": "La Guerra de los Mundos",
    "image": "https://image.tmdb.org/t/p/w500/exy74uTi0aap1VjGaTxuKqBHuyt.jpg",
    "banner": "https://image.tmdb.org/t/p/original/bInicBgSHfQiWLbnRT5jxw9Grvm.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/bInicBgSHfQiWLbnRT5jxw9Grvm.jpg",
    "hasBackdrop": true,
    "score": "6.6",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Mientras la Tierra es invadida por máquinas alienígenas de combate, una familia lucha por la supervivencia.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "95": {
    "id": 95,
    "title": "Armageddon",
    "image": "https://image.tmdb.org/t/p/w500/yYtlk1E28L1kQG6VcazkHhv29Ur.jpg",
    "banner": "https://image.tmdb.org/t/p/original/1cO6OQJxz7YhTZ4V1OlkYfebeJa.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/1cO6OQJxz7YhTZ4V1OlkYfebeJa.jpg",
    "hasBackdrop": true,
    "score": "6.8",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Un asteroide del tamaño del estado de Texas apunta directamente hacia la Tierra. Los expertos de la NASA tan sólo encuentran posible una solución: Enviar a un equipo de astronautas al espacio para que destruya el meteorito antes de que colisione con nuestro planeta. Para ello recurren a Harry Stamper, el mayor experto en perforaciones petrolíferas, y a su cualificado equipo de perforadores, para que aterricen en la superficie del asteroide, lo perforen e introduzcan un dispositivo nuclear que al estallar consiga desviar su trayectoria y poder salvar el planeta, evitando así el Armageddon.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "98": {
    "id": 98,
    "title": "Gladiador",
    "image": "https://image.tmdb.org/t/p/w500/p08mUnCktZ2opGihZTAn7OqzOoi.jpg",
    "banner": "https://image.tmdb.org/t/p/original/Ar7QuJ7sJEiC0oP3I8fKBKIQD9u.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/Ar7QuJ7sJEiC0oP3I8fKBKIQD9u.jpg",
    "hasBackdrop": true,
    "score": "8.2",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "En el año 180, el Imperio Romano domina todo el mundo conocido. Tras una gran victoria sobre los bárbaros del norte, el anciano emperador Marco Aurelio decide transferir el poder a Máximo, bravo general de sus ejércitos y hombre de inquebrantable lealtad al imperio. Pero su hijo Cómodo, que aspiraba al trono, no lo acepta y trata de asesinar a Máximo.",
    "genres": [
      "Action & Adventure",
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "118": {
    "id": 118,
    "title": "Charlie y La Fábrica de Chocolate",
    "image": "https://image.tmdb.org/t/p/w500/voJEk0WNtrcawz2hN9AwdNbvhrp.jpg",
    "banner": "https://image.tmdb.org/t/p/original/atoIgfAk2Ig2HFJLD0VUnjiPWEz.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/atoIgfAk2Ig2HFJLD0VUnjiPWEz.jpg",
    "hasBackdrop": true,
    "score": "7.0",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Charlie Bucket un niño muy bueno de una familia muy pobre, gana un concurso, junto a otros cuatro niños de diferentes partes del mundo, para disfrutar de una visita durante todo un día a la gigantesca fábrica de chocolate dirigida por el excéntrico Willy Wonka (Johnny Depp) y su equipo de Oompa-Loompas. La fábrica se parece a un mundo fantástico y mágico lleno de diferentes sabores, todos muy dulces.",
    "genres": [
      "Action & Adventure",
      "Comedia",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "122": {
    "id": 122,
    "title": "El señor de los anillos: El retorno del rey",
    "image": "https://image.tmdb.org/t/p/w500/vvxufoFLVxdA8JoCqjUGjHlTs5V.jpg",
    "banner": "https://image.tmdb.org/t/p/original/ctiw6FZK4N36LmkjSklWEbuvlq9.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/ctiw6FZK4N36LmkjSklWEbuvlq9.jpg",
    "hasBackdrop": true,
    "score": "8.5",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Las fuerzas de Saruman han sido destruidas, y su fortaleza sitiada. Ha llegado el momento de que se decida el destino de la Tierra Media, y por primera vez en mucho tiempo, parece que hay una pequeña esperanza. La atención del señor oscuro Sauron se centra ahora en Gondor, el último reducto de los hombres, y del cual Aragorn tendrá que reclamar el trono para ocupar su puesto de rey. Pero las fuerzas de Sauron ya se preparan para lanzar el último y definitivo ataque contra el reino de Gondor, la batalla que decidirá el destino de todos. Mientras tanto, Frodo y Sam continuan su camino hacia Mordor, a la espera de que Sauron no repare en que dos pequeños Hobbits se acercan cada día más al final de su camino, el Monte del Destino.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "207": {
    "id": 207,
    "title": "La Sociedad de los Poetas Muertos",
    "image": "https://image.tmdb.org/t/p/w500/1ZxpicszG54X05A1BccRo51Wgg4.jpg",
    "banner": "https://image.tmdb.org/t/p/original/lFIXZpwwlF9hg8NM3RazaIJDuaj.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/lFIXZpwwlF9hg8NM3RazaIJDuaj.jpg",
    "hasBackdrop": true,
    "score": "8.3",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "En un elitista y estricto colegio privado de Nueva Inglaterra, un grupo de alumnos descubrirá la poesía, el significado del \"carpe diem\" -aprovechar el día- y la importancia vital de luchar por alcanzar los sueños, gracias al Sr. Keating, un excéntrico profesor que despierta sus mentes por medio de métodos poco convencionales.",
    "genres": [
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "280": {
    "id": 280,
    "title": "Terminator 2: El juicio final",
    "image": "https://image.tmdb.org/t/p/w500/bfdPTjdP2JGRAajIoi25Gh2Elmz.jpg",
    "banner": "https://image.tmdb.org/t/p/original/izkMjmhauFx9DjoBQqM5sM5WAwE.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/izkMjmhauFx9DjoBQqM5sM5WAwE.jpg",
    "hasBackdrop": true,
    "score": "8.2",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Sarah Connor, la madre soltera del rebelde John Connor, está ingresada en un psiquiátrico. Algunos años antes, un viajero del tiempo le había revelado que su hijo sería el salvador de la humanidad en un futuro dominado por las máquinas. Se convirtió entonces en una especie de guerrera y educó a su hijo John en tácticas de supervivencia. Esta es la razón por la que está recluida en un manicomio. Cuando un nuevo androide mejorado, un T-1000, llega del futuro para asesinar a John, un viejo modelo T-800 será enviado para protegerle.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "285": {
    "id": 285,
    "title": "Piratas del Caribe 3: En el Fin del Mundo",
    "image": "https://image.tmdb.org/t/p/w500/zMXZQPJ3VnPR6IrD62OY9xqRK0n.jpg",
    "banner": "https://image.tmdb.org/t/p/original/1jHxkVXMI5s3vRiyiZooUy1shB5.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/1jHxkVXMI5s3vRiyiZooUy1shB5.jpg",
    "hasBackdrop": true,
    "score": "7.3",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Tras la muerte del capitán Jack Sparrow en el fondo del mar a manos de Davy Jones, Will Turner, Elizabeth Swann y el capitán Barbossa emprenden un viaje a los confines de la tierra para rescatarlo. Mientras la Compañía Británica de las Indias Orientales afianza su dominio sobre los mares bajo el mando de Lord Cutler Beckett —ahora al mando de Davy Jones—, el destino de la piratería pende de un hilo. Ahora, deben unir a los señores piratas para una última batalla. Pero a medida que las lealtades se ponen a prueba y las alianzas cambian, cada uno deberá decidir su posición en la lucha por la libertad en alta mar.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "435": {
    "id": 435,
    "title": "El día después de mañana",
    "image": "https://image.tmdb.org/t/p/w500/rT70FZPn3DEFB5UdMHlkwaYQWNV.jpg",
    "banner": "https://image.tmdb.org/t/p/original/smqQ71MIn1DSdSiQzCzCOV6rgRq.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/smqQ71MIn1DSdSiQzCzCOV6rgRq.jpg",
    "hasBackdrop": true,
    "score": "6.6",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Las investigaciones del climatólogo Jack Hall indican que el calentamiento global podría desencadenar un repentino y catastrófico cambio climático de la Tierra. Hall advierte a los dirigentes políticos de la necesidad de adoptar inmediatamente medidas para evitarlo, pero sus advertencias llegan demasiado tarde: una serie de anómalos fenómenos climáticos empiezan a producirse en distintas partes del globo. El calentamiento global ha puesto el planeta al borde de una nueva era glacial. Mientras Jack advierte a la Casa Blanca del inminente cambio climático, su hijo Sam y sus amigos se encuentran atrapados en Nueva York, a donde han ido para participar en un concurso académico entre institutos.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "534": {
    "id": 534,
    "title": "Terminator: Salvación",
    "image": "https://image.tmdb.org/t/p/w500/hHB39SHhpwc88UxgyObi2XgM5ZR.jpg",
    "banner": "https://image.tmdb.org/t/p/original/uifaXfJxjTMeNttw5u04nHx1G5w.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/uifaXfJxjTMeNttw5u04nHx1G5w.jpg",
    "hasBackdrop": true,
    "score": "6.1",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "En 2018, una misteriosa nueva arma en la guerra contra las máquinas, mitad humana y mitad máquina, llega a John Connor en la víspera de un ataque de la resistencia a Skynet. ¿Pero de qué lado está, y se puede confiar en él?",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "609": {
    "id": 609,
    "title": "Juegos diabólicos",
    "image": "https://image.tmdb.org/t/p/w500/pEE7370Pfqa2GuF57SC6vceYp4v.jpg",
    "banner": "https://image.tmdb.org/t/p/original/bvkPno6U02lLyvPWCnmibq4eIaN.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/bvkPno6U02lLyvPWCnmibq4eIaN.jpg",
    "hasBackdrop": true,
    "score": "7.2",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Una familia americana de clase media se traslada a vivir a un vecindario idílico, pero dentro de la casa empiezan a suceder cosas extrañas, fenómenos paranormales para los que no hay explicación posible.",
    "genres": [
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "664": {
    "id": 664,
    "title": "Tornado",
    "image": "https://image.tmdb.org/t/p/w500/3F4CEvcdTlEtjtaCGjpxlwMuBD5.jpg",
    "banner": "https://image.tmdb.org/t/p/original/5oCAo7LFj2x0yByfi5JYirGnK8I.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/5oCAo7LFj2x0yByfi5JYirGnK8I.jpg",
    "hasBackdrop": true,
    "score": "6.6",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "El meteorólogo de televisión Bill Harding está tratando de conseguir que su esposa, la cazadora de tormentas, Jo, firme documentos de divorcio para poder casarse con su novia Melissa. Pero la Madre Naturaleza, en forma de una serie de intensas tormentas que recorren Oklahoma, tiene otros planes. Pronto, los tres se unieron al equipo de stormchasers mientras intentaban insertar un revolucionario dispositivo de medición en el corazón de varios tornados extremadamente violentos.",
    "genres": [
      "Action & Adventure",
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "767": {
    "id": 767,
    "title": "Harry Potter y el misterio del príncipe",
    "image": "https://image.tmdb.org/t/p/w500/iXjoivmpOGD0kaYLYHdTIltieL5.jpg",
    "banner": "https://image.tmdb.org/t/p/original/mITJS77BV4TSqdFB5FPGBc7JKXj.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/mITJS77BV4TSqdFB5FPGBc7JKXj.jpg",
    "hasBackdrop": true,
    "score": "7.7",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "A pesar de la oscuridad que Lord Voldemort entrelaza el mundo muggle y el mágico, Hogwarts continúa adelante. Mientras está en una misión por orden de el director Dumbledore, Harry obtiene un viejo libro de posiciones de el \"Príncipe Mestizo\".",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "1396": {
    "id": 1396,
    "title": "Breaking Bad",
    "image": "https://image.tmdb.org/t/p/w500/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg",
    "banner": "https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    "hasBackdrop": true,
    "score": "9.0",
    "totalEpisodes": 62,
    "episodes": 62,
    "number_of_seasons": 5,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Un profesor de Química de secundaria con cáncer terminal se asocia a un exestudiante para asegurar el futuro de su familia al fabricar y vender metanfetamina.",
    "genres": [
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "1865": {
    "id": 1865,
    "title": "Piratas del Caribe 4: Navegando Aguas Misteriosas",
    "image": "https://image.tmdb.org/t/p/w500/elZ79uhtQ43xUvcCmdDXI3cN5AU.jpg",
    "banner": "https://image.tmdb.org/t/p/original/uzIGtyS6bbnJzGsPL93WCF1FWm8.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/uzIGtyS6bbnJzGsPL93WCF1FWm8.jpg",
    "hasBackdrop": true,
    "score": "6.6",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Cuando Jack se cruza con una mujer de su pasado, no está seguro de si es amor... o si se trata de una estafadora despiadada que lo está utilizando para encontrar la legendaria Fuente de la Juventud.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "5920": {
    "id": 5920,
    "title": "El Mentalista",
    "image": "https://image.tmdb.org/t/p/w500/zZEndCRk5mWKw7LB9kAAO4LcgRh.jpg",
    "banner": "https://image.tmdb.org/t/p/original/rJFqKcmMSttdNP58l0dVzY2NcTA.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/rJFqKcmMSttdNP58l0dVzY2NcTA.jpg",
    "hasBackdrop": true,
    "score": "8.4",
    "totalEpisodes": 150,
    "episodes": 150,
    "number_of_seasons": 7,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Patrick Jane es un hombre que trabaja como médium televisivo hasta que sufre un duro golpe cuando su mujer e hija son asesinadas. A partir de entonces, decide usar sus habilidades para ayudar a resolver casos de asesinato, trabajando como detective en el Departamento de Investigación de Crímenes de California. El agente Jane será capaz de ver aquello que los demás no pueden y sus poderes de observación y deducción le darán excelentes resultados.",
    "genres": [
      "Drama",
      "Misterio"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "40075": {
    "id": 40075,
    "title": "Gravity Falls",
    "image": "https://image.tmdb.org/t/p/w500/gX9NP6pWG47oAkq723TfxtkG4Pr.jpg",
    "banner": "https://image.tmdb.org/t/p/original/lhg7eA6CTOCL10QNVdKiyxkgPsL.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/lhg7eA6CTOCL10QNVdKiyxkgPsL.jpg",
    "hasBackdrop": true,
    "score": "8.6",
    "totalEpisodes": 40,
    "episodes": 40,
    "number_of_seasons": 2,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Los hermanos mellizos Dipper y Mabel Pines tienen una aventura inesperada cuando pasan el verano ayudando a su tío abuelo Stan a atravesar una trampa turística en la misteriosa ciudad de Gravity Falls, Oregon.",
    "genres": [
      "Action & Adventure",
      "Animación",
      "Comedia",
      "Misterio",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "52814": {
    "id": 52814,
    "title": "Halo",
    "image": "https://image.tmdb.org/t/p/w500/m8tW2ssuqib10BUlUZfbYlfqEfd.jpg",
    "banner": "https://image.tmdb.org/t/p/original/zW0v2YT74C6tRafzqqBkfSqLAN0.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/zW0v2YT74C6tRafzqqBkfSqLAN0.jpg",
    "hasBackdrop": true,
    "score": "8.2",
    "totalEpisodes": 17,
    "episodes": 17,
    "number_of_seasons": 2,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Representando un conflicto épico del siglo 26 entre la humanidad y una amenaza alienígena conocida como el Pacto, la serie teje historias personales profundamente dibujadas con acción, aventura y una visión ricamente imaginada del futuro.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "60059": {
    "id": 60059,
    "title": "Better Call Saul",
    "image": "https://image.tmdb.org/t/p/w500/fC2HDm5t0kHl7mTm7jxMR31b7by.jpg",
    "banner": "https://image.tmdb.org/t/p/original/rfxryDIv8huejujg4JueDJx8zCz.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/rfxryDIv8huejujg4JueDJx8zCz.jpg",
    "hasBackdrop": true,
    "score": "8.7",
    "totalEpisodes": 63,
    "episodes": 63,
    "number_of_seasons": 6,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "La acción se ubica en el año 2002 en torno al abogado James Morgan \"Jimmy\" McGill, seis años antes de su aparición en Breaking Bad como Saul Goodman. A pesar de ser una precuela también se muestra brevemente cual fue el destino de Saul tras los hechos de la serie original.",
    "genres": [
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "70523": {
    "id": 70523,
    "title": "Dark",
    "image": "https://image.tmdb.org/t/p/w500/gw8ZlIXEg6SIx3FgMEQqmBkPYKV.jpg",
    "banner": "https://image.tmdb.org/t/p/original/3jDXL4Xvj3AzDOF6UH1xeyHW8MH.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/3jDXL4Xvj3AzDOF6UH1xeyHW8MH.jpg",
    "hasBackdrop": true,
    "score": "8.4",
    "totalEpisodes": 26,
    "episodes": 26,
    "number_of_seasons": 3,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "La desaparición de un niño lleva a cuatro familias a una frenética búsqueda, mientras descubren un misterio que abarca tres generaciones.",
    "genres": [
      "Drama",
      "Sci-Fi & Fantasy",
      "Misterio"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "76479": {
    "id": 76479,
    "title": "The Boys",
    "image": "https://image.tmdb.org/t/p/w500/lTb6v3ZRanWLWoOpofXrBHNo9s1.jpg",
    "banner": "https://image.tmdb.org/t/p/original/bq28ajZaoMyzEIm6REelqyqtEDZ.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/bq28ajZaoMyzEIm6REelqyqtEDZ.jpg",
    "hasBackdrop": true,
    "score": "8.4",
    "totalEpisodes": 40,
    "episodes": 40,
    "number_of_seasons": 5,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "La serie tiene lugar en un mundo en el que los superhéroes representan el lado oscuro de la celebridad y la fama. Un grupo de vigilantes que se hacen llamar \"The Boys\" decide hacer todo lo posible por frenar a los superhéroes que están perjudicando a la sociedad, independientemente de los riesgos que ello conlleva.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "80752": {
    "id": 80752,
    "title": "See",
    "image": "https://image.tmdb.org/t/p/w500/lKDIhc9FQibDiBQ57n3ELfZCyZg.jpg",
    "banner": "https://image.tmdb.org/t/p/original/u5N8tXgGDY6jS7R8Xn42LDeL0Dk.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/u5N8tXgGDY6jS7R8Xn42LDeL0Dk.jpg",
    "hasBackdrop": true,
    "score": "8.1",
    "totalEpisodes": 24,
    "episodes": 24,
    "number_of_seasons": 3,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "En el futuro, la raza humana ha perdido la capacidad de ver, y la sociedad ha encontrado nuevas formas de interactuar entre sí, de construir, de cazar y, sobre todo, de sobrevivir. Sin embargo, todo cambia tras el nacimiento de una pareja de gemelos que recobra la vista.",
    "genres": [
      "Drama",
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "87108": {
    "id": 87108,
    "title": "Chernobyl",
    "image": "https://image.tmdb.org/t/p/w500/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
    "banner": "https://image.tmdb.org/t/p/original/900tHlUYUkp7Ol04XFSoAaEIXcT.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/900tHlUYUkp7Ol04XFSoAaEIXcT.jpg",
    "hasBackdrop": true,
    "score": "8.7",
    "totalEpisodes": 5,
    "episodes": 5,
    "number_of_seasons": 1,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Sigue \"la verdadera historia\" de una de las peores catástrofes provocadas por el hombre y habla de los valientes hombres y mujeres que se sacrificaron para salvar a Europa de un desastre inimaginable. La miniserie se centra en el desgarrador alcance del desastre de la planta nuclear que ocurrió en Ucrania en abril de 1986, revelando cómo y por qué ocurrió, además contando las sorprendentes y notables historias de los héroes que lucharon y cayeron.",
    "genres": [
      "Drama"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "88329": {
    "id": 88329,
    "title": "Hawkeye",
    "image": "https://image.tmdb.org/t/p/w500/3ZcJetFxd8fwJ1I5xsLHCMTAKQo.jpg",
    "banner": "https://image.tmdb.org/t/p/original/uHESULlKh7VSc0MRcqfyIf9Alk4.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/uHESULlKh7VSc0MRcqfyIf9Alk4.jpg",
    "hasBackdrop": true,
    "score": "7.8",
    "totalEpisodes": 6,
    "episodes": 6,
    "number_of_seasons": 1,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "\"Ojo De Halcón\", de Marvel Studios, es una nueva serie original que transcurre en una Ciudad de Nueva York post-Blip, donde el antes vengador Clint Barton, alias Hawkeye, tiene una misión que parece simple: regresar con su familia para Navidad. Pero cuando surge una amenaza de su pasado, Hawkeye renuentemente hace equipo con Kate Bishop, una hábil arquera de 22 años y su fan número uno, para desentrañar una conspiración criminal.",
    "genres": [
      "Drama",
      "Comedia",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "91557": {
    "id": 91557,
    "title": "Ragnarok",
    "image": "https://image.tmdb.org/t/p/w500/1LRLLWGvs5sZdTzuMqLEahb88Pc.jpg",
    "banner": "https://image.tmdb.org/t/p/original/wu444tM9YBllq9UcBv5TeidO3j3.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/wu444tM9YBllq9UcBv5TeidO3j3.jpg",
    "hasBackdrop": true,
    "score": "7.7",
    "totalEpisodes": 18,
    "episodes": 18,
    "number_of_seasons": 3,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Una serie de extraños sucesos comienzan a suceder en la pequeña localidad noruega de Edda, donde todos sus habitantes no son lo que parecen ser.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Drama",
      "Misterio"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "125988": {
    "id": 125988,
    "title": "Silo",
    "image": "https://image.tmdb.org/t/p/w500/s4yRu8IRcMLbfoUsO4q9Yuci4F0.jpg",
    "banner": "https://image.tmdb.org/t/p/original/4XccmjsOmQZw8S2iW1wvlvmb5v1.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/4XccmjsOmQZw8S2iW1wvlvmb5v1.jpg",
    "hasBackdrop": true,
    "score": "8.2",
    "totalEpisodes": 30,
    "episodes": 30,
    "number_of_seasons": 3,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "En un futuro arruinado y tóxico, existe una comunidad en un enorme silo subterráneo cientos de pisos bajo tierra. Ahí, hombres y mujeres viven en una sociedad llena de reglas que creen que están hechas para protegerlos.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Drama"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "166426": {
    "id": 166426,
    "title": "Piratas del Caribe 5: La Venganza de Salazar",
    "image": "https://image.tmdb.org/t/p/w500/net3hZOe33XbieLzVkfJsQEdig2.jpg",
    "banner": "https://image.tmdb.org/t/p/original/7C921eWK06n12c1miRXnYoEu5Yv.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/7C921eWK06n12c1miRXnYoEu5Yv.jpg",
    "hasBackdrop": true,
    "score": "6.7",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Inmerso en una nueva aventura, el desafortunado Capitán Jack Sparrow siente que la mala suerte se cierne sobre él con más fuerza cuando unos letales marineros fantasma, liderados por su antiguo némesis, el malvado Capitán Salazar, escapan del Triángulo de las Bermudas. La única esperanza de supervivencia de Jack reside en encontrar el legendario Tridente de Poseidón, pero para hallarlo, deberá forjar una alianza incómoda con una brillante y hermosa astrónoma y un joven testarudo de la marina británica.",
    "genres": [
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "200875": {
    "id": 200875,
    "title": "IT: Bienvenidos a Derry",
    "image": "https://image.tmdb.org/t/p/w500/vC6LSYC8uhZPkPM01L6HKrr1lMD.jpg",
    "banner": "https://image.tmdb.org/t/p/original/2fOKVDoc2O3eZmBZesWPuE5kgPN.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/2fOKVDoc2O3eZmBZesWPuE5kgPN.jpg",
    "hasBackdrop": true,
    "score": "8.2",
    "totalEpisodes": 8,
    "episodes": 8,
    "number_of_seasons": 1,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "En 1958, un grupo de siete amigos están empezando a ver cosas extrañas en el tranquilo pueblito Derry. Con el tiempo, descubren que todos estaban viendo lo mismo: un ser sobrenatural y malvado que puede adoptar muchas formas.",
    "genres": [
      "Drama",
      "Misterio"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "207468": {
    "id": 207468,
    "title": "Kaiju No. 8",
    "image": "https://image.tmdb.org/t/p/w500/A6JOsCdFFTxtbDnKAfE0iY6jOiE.jpg",
    "banner": "https://image.tmdb.org/t/p/original/htGeuCcNhlBe8GTx3izKOsd8frw.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/htGeuCcNhlBe8GTx3izKOsd8frw.jpg",
    "hasBackdrop": true,
    "score": "8.4",
    "totalEpisodes": 22,
    "episodes": 22,
    "number_of_seasons": 2,
    "type": "TV",
    "contentType": "animes",
    "isMovie": false,
    "description": "La historia la protagoniza Kafka Hibino, un hombre de 32 años que quiere unirse a la Fuerza de Defensa y cumplir la promesa que le hizo a una amiga de la infancia, Mina Ashiro. En su trabajo como limpiador de restos de Kaiju forja amistad con un nuevo compañero, Reno Ichikawa, cuya determinación de unirse a la Fuerza de Defensa inspira a Kafka a cumplir su promesa de la infancia de unirse a Mina para proteger a la humanidad. Cuando un pequeño Kaiju se introduce en el interior de Kafka, éste adquiere una fuerza sobrehumana y poderes que le permiten luchar contra los Kaiju. Ahora se esfuerza por ganarse la confianza de sus compañeros humanos, derrotar a unos Kaiju cada vez más poderosos y proteger el mundo.",
    "genres": [
      "Animación",
      "Action & Adventure",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "222766": {
    "id": 222766,
    "title": "El Chacal",
    "image": "https://image.tmdb.org/t/p/w500/faqXSU7eXffSxtyIX4EGyCITQpQ.jpg",
    "banner": "https://image.tmdb.org/t/p/original/enVrO8TRkdT8dmYXTfI4sEjR5Kp.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/enVrO8TRkdT8dmYXTfI4sEjR5Kp.jpg",
    "hasBackdrop": true,
    "score": "8.2",
    "totalEpisodes": 10,
    "episodes": 10,
    "number_of_seasons": 1,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "El Chacal, un escurridizo y solitario asesino sin rival, se gana la vida trabajando para el mejor postor. Sin embargo, tras su último asesinato, su camino se cruza con el de una tenaz agente de inteligencia británica que empieza a seguirle la pista en una emocionante persecución a través de Europa, dejando un rastro de destrucción a su paso.",
    "genres": [
      "Drama",
      "Action & Adventure",
      "Misterio"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "232230": {
    "id": 232230,
    "title": "Lord of Mysteries",
    "image": "https://image.tmdb.org/t/p/w500/cR5KiAdVeZLG4nDUiCyqfvGzZ3f.jpg",
    "banner": "https://image.tmdb.org/t/p/original/gdvUUqWutEulHSB4JBoWWnbsLo6.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/gdvUUqWutEulHSB4JBoWWnbsLo6.jpg",
    "hasBackdrop": true,
    "score": "8.6",
    "totalEpisodes": 16,
    "episodes": 16,
    "number_of_seasons": 1,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "En un mundo victoriano de vapor, barcos de guerra y horrores ocultos, Zhou Mingrui despierta como Klein Moretti. Transita entre la luz y la oscuridad, enzarzado con Iglesias en guerra. Esta es la leyenda de un potencial ilimitado... y de un peligro indescriptible.",
    "genres": [
      "Animación",
      "Misterio",
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "250307": {
    "id": 250307,
    "title": "The Pitt",
    "image": "https://image.tmdb.org/t/p/w500/kvFSpESyBZMjaeOJDx7RS3P1jey.jpg",
    "banner": "https://image.tmdb.org/t/p/original/z3BkMbCy5ajZPMyKEUwsPHuz2cV.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/z3BkMbCy5ajZPMyKEUwsPHuz2cV.jpg",
    "hasBackdrop": true,
    "score": "8.7",
    "totalEpisodes": 29,
    "episodes": 29,
    "number_of_seasons": 2,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "El personal del Centro Médico de Traumatismo de Pittsburgh trabaja para salvar vidas en un servicio de urgencias saturado y sin fondos suficientes.",
    "genres": [
      "Drama"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "259316": {
    "id": 259316,
    "title": "Animales fantásticos: Y dónde encontrarlos",
    "image": "https://image.tmdb.org/t/p/w500/wduJFXlHQTIw1TBf6kTO3bHf2VN.jpg",
    "banner": "https://image.tmdb.org/t/p/original/8Qsr8pvDL3s1jNZQ4HK1d1Xlvnh.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/8Qsr8pvDL3s1jNZQ4HK1d1Xlvnh.jpg",
    "hasBackdrop": true,
    "score": "7.3",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "“Animales fantásticos y dónde encontrarlos” comienza en 1926 a medida que Newt Scamander acaba de terminar una excursión por todo el mundo para encontrar y documentar una extraordinaria variedad de creaturas mágicas. Al llegar a Nueva York para una breve escala, quizás pudo haber llegado y partido sin incidente... si no fuera por un No-Maj (término estadounidense para Muggle) llamado Jacob, un caso mágico perdido y la escapada de algunas de las bestias fantásticas de Newt, lo que podría significar problemas para los mundos tanto de los magos como de los No-Maj.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "275202": {
    "id": 275202,
    "title": "La oficina",
    "image": "https://image.tmdb.org/t/p/w500/uUEPJHIGiNeV69RIco01j5Yqu1F.jpg",
    "banner": "https://image.tmdb.org/t/p/original/w6518nngLn8awWDRnqZGLvIpcSS.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/w6518nngLn8awWDRnqZGLvIpcSS.jpg",
    "hasBackdrop": true,
    "score": "9.3",
    "totalEpisodes": 8,
    "episodes": 8,
    "number_of_seasons": 1,
    "type": "Serie",
    "contentType": "series",
    "isMovie": false,
    "description": "Jerónimo Ponce III, jefe regional de Jabones Olimpo Aguascalientes, una filial de la empresa familiar, es una pesadilla para sus empleados, un grupo de oficinistas pintorescos que diariamente tienen que sobrevivir a sus desplantes políticamente incorrectos y técnicas organizacionales autodestructivas para llegar ilesos al final del día.",
    "genres": [
      "Comedia"
    ],
    "status": "En emisión",
    "isCustom": false,
    "isSecret": false
  },
  "338952": {
    "id": 338952,
    "title": "Animales fantásticos 2: Los crímenes de Grindelwald",
    "image": "https://image.tmdb.org/t/p/w500/p4BabO5lvfXnIsVIBLDpN2wLORz.jpg",
    "banner": "https://image.tmdb.org/t/p/original/i3rRY0EKYhSpyOLRAQ7iB05zhAp.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/i3rRY0EKYhSpyOLRAQ7iB05zhAp.jpg",
    "hasBackdrop": true,
    "score": "6.8",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Gellert Grindelwald ha escapado de la prisión y ha comenzado a reunir seguidores para su causa, elevando a los magos por encima de todos los seres no mágicos. El único capaz de detenerlo es el mago que una vez llamó su amigo más cercano, Albus Dumbledore.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "338953": {
    "id": 338953,
    "title": "Animales fantásticos 3: Los secretos de Dumbledore",
    "image": "https://image.tmdb.org/t/p/w500/yOeuJdwag4bAlnvgrdweRoiuXGC.jpg",
    "banner": "https://image.tmdb.org/t/p/original/zGLHX92Gk96O1DJvLil7ObJTbaL.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/zGLHX92Gk96O1DJvLil7ObJTbaL.jpg",
    "hasBackdrop": true,
    "score": "6.6",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "El profesor Albus Dumbledore sabe que el poderoso mago oscuro Gellert Grindelward se está moviendo para ganar control del mundo mágico. Incapaz de detenerlo por sí solo, le confía al magizoologista Newt Scamander que lidere un intrépido grupo de magos, brujas y un valiente panadero muggle en una aventura peligrosa donde se encontrarán con nuevas y viejas bestias mientras chocan con los seguidores de Grindelwald.",
    "genres": [
      "Sci-Fi & Fantasy",
      "Action & Adventure"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  },
  "533535": {
    "id": 533535,
    "title": "Deadpool & Wolverine",
    "image": "https://image.tmdb.org/t/p/w500/6aY3OzCIdxoBMYdiH5s17rWFFFA.jpg",
    "banner": "https://image.tmdb.org/t/p/original/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg",
    "hasBackdrop": true,
    "score": "7.6",
    "totalEpisodes": 1,
    "episodes": 1,
    "number_of_seasons": 1,
    "type": "Película",
    "contentType": "peliculas",
    "isMovie": true,
    "description": "Un Wade Wilson apático se esfuerza en la vida civil. Sus días como el mercenario moralmente flexible Deadpool quedaron atrás. Cuando su mundo natal se enfrenta a una amenaza existencial, Wade debe, a regañadientes, volver a la acción junto a un reacio Wolverine.",
    "genres": [
      "Action & Adventure",
      "Comedia",
      "Sci-Fi & Fantasy"
    ],
    "status": "Finalizado",
    "isCustom": false,
    "isSecret": false
  }
};

const RECENT_CATALOG_IDS = ["606856","1375646","664","87421","609","20526","178809","363676","514847","279471","120","121","218","296","602","1399","1402","1427","8292","8358","9619","13836","17578","18905","39254","39513","47933","48866","49849","60304","61459","68726","72190","87101","94997","108978","213331","220102","227719","229711","241609","245891","247518","257344","261579","267860","268896","276161","290859","296206","324552","335977","397243","417261","438799","458156","479455","603692","617126","798645","866398","882569","1137844","1327819","1311031","2432","447365","283995","118340","241842","157239","232230","95557","106379","224372","92749","100088","84958","969681","944","943","942","941","49529","10661","333339","274870","1040330","939243","675353","454626","597","718789","26264","10603","950396","80274","72545","88751","109418","38365","50546","172385","46195","1735","1734","564","27022","324786","588228","158852","561","950387","1011985","140300","49444","9502","10052","1087192","638507","166428","82702","10191","357096","207768","43947","1011477","38575","1425045","254128","240832","10771","2698","310","512200","353486","1234821","507086","351286","135397","331","330","329","6589","273477","44833","1038392","423108","259693","138843","311324","14161","278154","57800","8355","950","425","585083","400155","159824","76492","12445","12444","675","674","673","672","671","572802","297802","187017","64688","615656","345940","226362","291339","95350","228878","202411","533533","1062722","480042","440471","107846","550","1265609","718930","9313","614933","1007734","1242898","278624","127529","76479","80752","85271","88396","88329","87739","87108","91557","60059","1396","70523","40075","52814","200875","1084242","18","207468","222766","272472","250307","243503","223365","254793","275202","533535","212996","285889","125988","166426","5920","209867","205050","1865","285","58","22","338953","338952","259316","767","110070","127532","86031","279182","249907","235758","281615","277881","258901","196950","278043","214310","271607","207332","217407","38","65","74","95","98","118","122","207","280","435","534"];;
const buildOrderedCatalogList = () => {
  const ordered = [];
  const seen = new Set();
  for (const id of RECENT_CATALOG_IDS) {
    const k = String(id);
    if (DB_CATALOG_ITEMS[k] && !seen.has(k)) {
      ordered.push(DB_CATALOG_ITEMS[k]);
      seen.add(k);
    }
  }
  for (const [k, item] of Object.entries(DB_CATALOG_ITEMS)) {
    if (!seen.has(k)) {
      ordered.push(item);
      seen.add(k);
    }
  }
  return ordered;
};
let DB_CATALOG_LIST = buildOrderedCatalogList();

const dedupeCatalogList = (items) => {
  const seenIds = new Set();
  const titleToCustomIndex = new Map();
  const seenTitles = new Set();
  const result = [];

  for (const item of items) {
    if (!item || !item.id) continue;
    const idStr = String(item.id).trim();
    if (seenIds.has(idStr)) continue;

    const isNumericId = /^\d+$/.test(idStr);
    const titleNorm = (item.title || '').trim().toLowerCase();
    const altNorm = (item.searchTitle || '').trim().toLowerCase();
    const isMulti = Number(item.totalEpisodes || item.total_episodes || 1) > 1;
    const suffix = isMulti ? 'multi' : 'single';
    const titleKey = titleNorm ? `${titleNorm}__${suffix}` : '';
    const altKey = altNorm ? `${altNorm}__${suffix}` : '';

    if (!isNumericId) {
      // Es un custom (custom-...)
      // Si ya vimos un item oficial con este título, ignorar este custom
      if ((titleKey && seenTitles.has(titleKey)) || (altKey && seenTitles.has(altKey))) {
        continue;
      }
      if (titleKey) titleToCustomIndex.set(titleKey, result.length);
      if (altKey) titleToCustomIndex.set(altKey, result.length);
      seenIds.add(idStr);
      result.push(item);
    } else {
      // Es un ID oficial de TMDB (numérico)
      // Si antes se había agregado un custom con este mismo título, reemplazarlo por el oficial
      const prevCustomIdx = (titleKey && titleToCustomIndex.get(titleKey)) ?? (altKey && titleToCustomIndex.get(altKey));
      if (prevCustomIdx !== undefined && result[prevCustomIdx]) {
        seenIds.delete(String(result[prevCustomIdx].id).trim());
        result[prevCustomIdx] = item;
        seenIds.add(idStr);
        if (titleKey) seenTitles.add(titleKey);
        if (altKey) seenTitles.add(altKey);
        continue;
      }

      seenIds.add(idStr);
      if (titleKey) seenTitles.add(titleKey);
      if (altKey) seenTitles.add(altKey);
      result.push(item);
    }
  }
  return result.filter(Boolean);
};

// Cargar elementos auto-descubiertos desde localStorage al iniciar
const AUTO_CATALOG_STORAGE_KEY = 'az_auto_catalog_v4';
try {
  if (typeof localStorage !== 'undefined') {
    // Limpiar claves obsoletas o versiones previas con datos erróneos
    localStorage.removeItem('az_auto_catalog_v2');
    localStorage.removeItem('az_auto_catalog_v3');
    const savedAuto = localStorage.getItem(AUTO_CATALOG_STORAGE_KEY);
    if (savedAuto) {
      const parsedAuto = JSON.parse(savedAuto);
      if (parsedAuto && typeof parsedAuto === 'object') {
        delete parsedAuto['299982']; // Limpiar ID erróneo
        for (const [k, val] of Object.entries(parsedAuto)) {
          if (val && val.id && !DB_CATALOG_ITEMS[k] && k !== '299982') {
            DB_CATALOG_ITEMS[k] = val;
            DB_CATALOG_LIST.unshift(val);
          }
        }
      }
    }
  }
} catch {}

let lastDynamicSyncTime = 0;
let dynamicSyncPromise = null;

// Clasificador inteligente de contenido: desambigua entre Película, Serie Occidental y Anime
export const resolveMediaClassification = (row, movData, tvData) => {
  const sTitleNorm = (row.search_title || '').toLowerCase().trim();
  const hasMultipleEps = Number(row.total_episodes) > 1 || Number(row.max_season) > 1;

  if (!movData && !tvData) return null;
  if (movData && !tvData) return { data: movData, isMovie: true };
  if (!movData && tvData) return { data: tvData, isMovie: false };

  const movTitle = (movData.title || movData.original_title || '').toLowerCase().trim();
  const tvTitle = (tvData.name || tvData.original_name || '').toLowerCase().trim();

  const movMatch = movTitle && (sTitleNorm.includes(movTitle) || movTitle.includes(sTitleNorm));
  const tvMatch = tvTitle && (sTitleNorm.includes(tvTitle) || tvTitle.includes(sTitleNorm));

  const movVotes = Number(movData.vote_count || 0);
  const tvVotes = Number(tvData.vote_count || 0);

  // 1. Si pertenece a una colección de películas oficial en TMDB (ej: Harry Potter, Arma Mortal, etc.)
  if (movData.belongs_to_collection && movVotes > 500) {
    return { data: movData, isMovie: true };
  }

  // 2. Si el título de la película coincide y el de la serie no
  if (movMatch && !tvMatch) {
    return { data: movData, isMovie: true };
  }

  // 3. Si el título de la serie coincide y el de la película no
  if (tvMatch && !movMatch) {
    return { data: tvData, isMovie: false };
  }

  // 4. Si uno tiene una cantidad abrumadora de votos sobre el otro (ej. Harry Potter 24k vs Testigo 1 voto)
  if (movVotes > 1000 && tvVotes < 100) {
    return { data: movData, isMovie: true };
  }
  if (tvVotes > 1000 && movVotes < 100) {
    return { data: tvData, isMovie: false };
  }

  // 5. Si tiene múltiples episodios y temporadas reales de TV y la serie tiene votos respetables
  if (hasMultipleEps && tvVotes > 50 && Number(tvData.number_of_seasons || 1) >= 1 && !movData.belongs_to_collection) {
    return { data: tvData, isMovie: false };
  }

  // 6. Por defecto según votos y relevancia
  const isMov = movVotes >= tvVotes;
  return { data: isMov ? movData : tvData, isMovie: isMov };
};

const mapDynamicTmdbItem = (tmdbData, isMovie, row) => {
  const movieGenreLookup = {
    16: 'Animación',
    28: 'Action & Adventure',
    12: 'Action & Adventure',
    878: 'Sci-Fi & Fantasy',
    14: 'Sci-Fi & Fantasy',
    35: 'Comedia',
    18: 'Drama',
    9648: 'Misterio',
    10759: 'Action & Adventure',
    10765: 'Sci-Fi & Fantasy'
  };
  // Solo se clasifica como Anime si es estrictamente japonés (idioma japonés o país de origen Japón)
  const isAnime = !isMovie && (tmdbData.original_language === 'ja' || (Array.isArray(tmdbData.origin_country) && tmdbData.origin_country.includes('JP')));
  const mappedGenres = new Set();
  if (Array.isArray(tmdbData.genres)) {
    tmdbData.genres.forEach(g => {
      if (movieGenreLookup[g.id]) mappedGenres.add(movieGenreLookup[g.id]);
      if (TMDB_GENRES[g.name]) mappedGenres.add(g.name);
    });
  }
  if (Array.isArray(tmdbData.genre_ids)) {
    tmdbData.genre_ids.forEach(gid => {
      if (movieGenreLookup[gid]) mappedGenres.add(movieGenreLookup[gid]);
    });
  }
  if (mappedGenres.size === 0) {
    mappedGenres.add(isAnime ? 'Animación' : 'Drama');
  }

  const poster = tmdbData.poster_path
    ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
    : 'https://via.placeholder.com/225x318?text=No+Image';
  const backdrop = tmdbData.backdrop_path
    ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}`
    : poster;
  const totalEps = isMovie ? 1 : Math.max(Number(row.total_episodes || 1), 1);
  const maxSeason = isMovie ? 1 : Math.max(Number(row.max_season || tmdbData.number_of_seasons || 1), 1);

  return {
    id: Number(tmdbData.id),
    title: tmdbData.title || tmdbData.name || row.search_title,
    searchTitle: row.search_title || '',
    image: poster,
    banner: backdrop,
    backdrop: backdrop,
    hasBackdrop: Boolean(tmdbData.backdrop_path),
    score: tmdbData.vote_average ? Number(tmdbData.vote_average).toFixed(1) : '8.0',
    totalEpisodes: totalEps,
    episodes: totalEps,
    number_of_seasons: maxSeason,
    type: isMovie ? 'Película' : (isAnime ? 'TV' : 'Serie'),
    contentType: isMovie ? 'peliculas' : (isAnime ? 'animes' : 'series'),
    isMovie,
    description: tmdbData.overview || 'Sin sinopsis disponible.',
    genres: Array.from(mappedGenres),
    status: isMovie ? 'Finalizado' : (tmdbData.status === 'Ended' ? 'Finalizado' : 'En emisión'),
    isCustom: false,
    isSecret: false
  };
};

// Auto-descubrimiento en tiempo real de cualquier película, serie o anime añadido en anime_episodes (SQL Editor)
const syncDynamicEpisodesCatalog = async (customAnimes = []) => {
  const now = Date.now();
  if (dynamicSyncPromise) return dynamicSyncPromise;
  if (now - lastDynamicSyncTime < 5000) return;

  dynamicSyncPromise = (async () => {
    try {
      let summaryRows = [];
      const { data: viewData, error: viewErr } = await supabase
        .from('catalog_episodes_summary')
        .select('*');

      if (!viewErr && Array.isArray(viewData) && viewData.length > 0) {
        summaryRows = viewData;
      } else {
        // Respaldo directo si la vista no está disponible
        const { data: rawEps } = await supabase
          .from('anime_episodes')
          .select('id, anime_tmdb_id, search_title, episode_name, episode_number, season_number')
          .order('id', { ascending: false })
          .limit(1000);
        if (Array.isArray(rawEps)) {
          const mapByGroup = new Map();
          for (const ep of rawEps) {
            const tmdbId = ep.anime_tmdb_id ? String(ep.anime_tmdb_id).trim() : '';
            const sTitle = (ep.search_title || '').trim();
            if (!sTitle) continue;
            const gKey = tmdbId || sTitle.toLowerCase();
            if (!mapByGroup.has(gKey)) {
              mapByGroup.set(gKey, {
                anime_tmdb_id: tmdbId || null,
                search_title: sTitle,
                sample_episode_name: ep.episode_name || sTitle,
                epsSet: new Set([Number(ep.episode_number || 1)]),
                max_season: Number(ep.season_number || 1),
                max_id: Number(ep.id || 0)
              });
            } else {
              const g = mapByGroup.get(gKey);
              g.epsSet.add(Number(ep.episode_number || 1));
              if (Number(ep.season_number || 1) > g.max_season) g.max_season = Number(ep.season_number || 1);
            }
          }
          summaryRows = Array.from(mapByGroup.values()).map(g => ({
            anime_tmdb_id: g.anime_tmdb_id,
            search_title: g.search_title,
            sample_episode_name: g.sample_episode_name,
            total_episodes: g.epsSet.size,
            max_season: g.max_season,
            max_id: g.max_id
          }));
        }
      }

      const customIds = new Set(customAnimes.map(c => String(c.id).trim()));
      const customTitles = new Set(customAnimes.map(c => (c.title || '').toLowerCase().trim()));
      const existingTitles = new Set(
        Object.values(DB_CATALOG_ITEMS).flatMap(it => [
          (it.title || '').toLowerCase().trim(),
          (it.searchTitle || '').toLowerCase().trim()
        ]).filter(Boolean)
      );

      let addedNew = false;
      const autoSaved = (() => {
        try {
          return JSON.parse(localStorage.getItem(AUTO_CATALOG_STORAGE_KEY) || '{}');
        } catch {
          return {};
        }
      })();

      for (const row of summaryRows) {
        const idStr = row.anime_tmdb_id ? String(row.anime_tmdb_id).trim() : '';
        const sTitleNorm = (row.search_title || '').toLowerCase().trim();
        if (!sTitleNorm) continue;

        // Si ya existe en DB_CATALOG_ITEMS, actualizar conteo y corregir clasificación
        if (idStr && DB_CATALOG_ITEMS[idStr]) {
          const item = DB_CATALOG_ITEMS[idStr];
          if (!item.searchTitle && row.search_title) item.searchTitle = row.search_title;
          if (!item.isMovie && item.contentType !== 'peliculas') {
            if (Number(row.total_episodes) > Number(item.totalEpisodes || 0)) {
              item.totalEpisodes = Number(row.total_episodes);
              item.episodes = Number(row.total_episodes);
            }
            if (Number(row.max_season) > Number(item.number_of_seasons || 1)) {
              item.number_of_seasons = Number(row.max_season);
            }
          }
          continue;
        }

        // Si es un custom que ya está cargado en customAnimes, omitir para no duplicar
        if (idStr && idStr.startsWith('custom-') && customIds.has(idStr)) {
          continue;
        }

        // Si no tiene anime_tmdb_id (se insertó en SQL sin ID), omitir si ya existe en catálogo
        if (!idStr && (customTitles.has(sTitleNorm) || existingTitles.has(sTitleNorm))) {
          continue;
        }

        // Nuevo elemento detectado en anime_episodes: resolver vía TMDB con clasificación robusta
        try {
          const hasMultipleEps = Number(row.total_episodes) > 1 || Number(row.max_season) > 1;
          let resolvedItem = null;

          if (idStr && /^\d+$/.test(idStr)) {
            const [tvData, movData] = await Promise.all([
              fetch(`${BASE_URL}/tv/${idStr}?api_key=${TMDB_API_KEY}&language=es-MX`).then(r => r.ok ? r.json() : null).catch(() => null),
              fetch(`${BASE_URL}/movie/${idStr}?api_key=${TMDB_API_KEY}&language=es-MX`).then(r => r.ok ? r.json() : null).catch(() => null)
            ]);

            const resolved = resolveMediaClassification(row, movData, tvData);
            if (resolved) {
              resolvedItem = mapDynamicTmdbItem(resolved.data, resolved.isMovie, row);
            }
          } else {
            // Buscar por título en TMDB si se insertó en SQL Editor sin anime_tmdb_id
            const endpoint = hasMultipleEps ? 'tv' : 'multi';
            const searchRes = await fetch(`${BASE_URL}/search/${endpoint}?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(row.search_title)}&include_adult=false`)
              .then(r => r.ok ? r.json() : null)
              .catch(() => null);
            const firstHit = (searchRes?.results || []).find(r => r.media_type !== 'person');
            if (firstHit && firstHit.id) {
              const isMov = !hasMultipleEps && (firstHit.media_type === 'movie' || Boolean(firstHit.title && !firstHit.name));
              resolvedItem = mapDynamicTmdbItem(firstHit, isMov, row);
              // Vincular automáticamente el anime_tmdb_id en Supabase para futuras consultas
              supabase.from('anime_episodes')
                .update({ anime_tmdb_id: String(firstHit.id) })
                .ilike('search_title', row.search_title)
                .then(() => {}).catch(() => {});
            }
          }

          if (resolvedItem && resolvedItem.id) {
            const keyStr = String(resolvedItem.id);
            DB_CATALOG_ITEMS[keyStr] = resolvedItem;
            DB_CATALOG_LIST.unshift(resolvedItem);
            existingTitles.add((resolvedItem.title || '').toLowerCase().trim());
            existingTitles.add(sTitleNorm);
            autoSaved[keyStr] = resolvedItem;
            addedNew = true;
          }
        } catch (err) {
          console.warn('Error auto-discovering catalog item:', row.search_title, err);
        }
      }

      // Reordenar DB_CATALOG_LIST según el orden más reciente de anime_episodes (max_id DESC)
      if (summaryRows.length > 0) {
        const liveOrder = [];
        const seenLive = new Set();
        for (const row of summaryRows) {
          const k = row.anime_tmdb_id ? String(row.anime_tmdb_id).trim() : '';
          if (k && DB_CATALOG_ITEMS[k] && !seenLive.has(k)) {
            liveOrder.push(DB_CATALOG_ITEMS[k]);
            seenLive.add(k);
          }
        }
        for (const [k, item] of Object.entries(DB_CATALOG_ITEMS)) {
          if (!seenLive.has(k)) {
            liveOrder.push(item);
            seenLive.add(k);
          }
        }
        DB_CATALOG_LIST = liveOrder;
      }

      if (addedNew && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(AUTO_CATALOG_STORAGE_KEY, JSON.stringify(autoSaved));
        } catch {}
      }
      lastDynamicSyncTime = Date.now();
    } catch (e) {
      console.warn('Error in syncDynamicEpisodesCatalog:', e);
    } finally {
      dynamicSyncPromise = null;
    }
  })();

  return dynamicSyncPromise;
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
      const { custom_id, ...cleanData } = animeData || {};
      const desiredId = custom_id ? String(custom_id).trim() : (cleanData.id ? String(cleanData.id).trim() : '');
      const id = desiredId || `custom-${Date.now()}`;
      const payload = { ...cleanData, id };
      const { data, error } = await supabase.from('custom_animes').insert([payload]).select();
      if (error) throw error;

      // Si se asignó un ID real (no custom-...), vincular automáticamente episodios existentes con el mismo título
      if (id && !id.startsWith('custom-') && payload.title) {
        try {
          await supabase
            .from('anime_episodes')
            .update({ anime_tmdb_id: id })
            .ilike('search_title', payload.title.trim());
        } catch (syncErr) {
          console.warn('No se pudieron sincronizar episodios con el nuevo TMDB ID:', syncErr);
        }
      }

      return data;
    } catch (error) {
      console.error('Error adding custom anime:', error);
      throw error;
    }
  },

  updateCustomAnime: async (id, animeData) => {
    try {
      const { custom_id, ...cleanData } = animeData || {};
      const oldIdStr = String(id).trim();
      const targetId = custom_id ? String(custom_id).trim() : oldIdStr;
      const payload = { ...cleanData, id: targetId };

      const { data, error } = await supabase.from('custom_animes').update(payload).eq('id', oldIdStr).select();
      if (error) throw error;

      // Si cambió el ID o tiene un TMDB ID asignado, sincronizar anime_episodes
      if (targetId && !targetId.startsWith('custom-')) {
        try {
          if (targetId !== oldIdStr) {
            await supabase
              .from('anime_episodes')
              .update({ anime_tmdb_id: targetId })
              .eq('anime_tmdb_id', oldIdStr);
          }
          if (payload.title) {
            await supabase
              .from('anime_episodes')
              .update({ anime_tmdb_id: targetId })
              .ilike('search_title', payload.title.trim());
          }
        } catch (syncErr) {
          console.warn('No se pudieron sincronizar episodios al actualizar TMDB ID:', syncErr);
        }
      }

      return data;
    } catch (error) {
      console.error('Error updating custom anime:', error);
      throw error;
    }
  },

  searchTmdbForAdmin: async (query, mediaType = 'multi') => {
    try {
      const q = String(query || '').trim();
      if (!q) return [];

      const mapItemForAdmin = (item, forcedType = null) => {
        const isMovie = forcedType === 'movie' || item.media_type === 'movie' || Boolean(item.title && !item.name);
        const rawGenres = item.genres
          ? item.genres.map(g => g.name)
          : (item.genre_ids ? item.genre_ids.map(gid => TMDB_GENRES_REVERSE[gid]).filter(Boolean) : []);
        // Mapear también IDs de géneros de películas de TMDB a nuestras etiquetas
        const movieGenreLookup = {
          16: 'Animación',
          28: 'Action & Adventure',
          12: 'Action & Adventure',
          878: 'Sci-Fi & Fantasy',
          14: 'Sci-Fi & Fantasy',
          35: 'Comedia',
          18: 'Drama',
          9648: 'Misterio'
        };
        const mappedGenres = new Set(rawGenres.filter(g => TMDB_GENRES[g]));
        if (Array.isArray(item.genre_ids)) {
          item.genre_ids.forEach(gid => {
            if (movieGenreLookup[gid]) mappedGenres.add(movieGenreLookup[gid]);
          });
        }
        if (Array.isArray(item.genres)) {
          item.genres.forEach(g => {
            if (movieGenreLookup[g.id]) mappedGenres.add(movieGenreLookup[g.id]);
            if (TMDB_GENRES[g.name]) mappedGenres.add(g.name);
          });
        }

        const releaseDate = item.release_date || item.first_air_date || '';
        const year = releaseDate ? releaseDate.substring(0, 4) : '';

        return {
          id: String(item.id),
          title: item.title || item.name || item.original_title || item.original_name || '',
          original_title: item.original_title || item.original_name || '',
          year,
          media_type: isMovie ? 'movie' : 'tv',
          typeLabel: isMovie ? 'Película' : (item.original_language === 'ja' ? 'Anime / TV' : 'Serie TV'),
          image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
          banner: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : '',
          description: item.overview || '',
          total_episodes: isMovie ? 1 : (item.number_of_episodes || 12),
          status: isMovie ? 'Finalizado' : (item.status === 'Ended' ? 'Finalizado' : 'En emisión'),
          genres: Array.from(mappedGenres)
        };
      };

      // Si el usuario ingresó un ID numérico directo (ej. 10191)
      if (/^\d+$/.test(q)) {
        const results = [];
        if (mediaType === 'movie' || mediaType === 'multi') {
          const mov = await fetchWithDelay(`${BASE_URL}/movie/${q}?api_key=${TMDB_API_KEY}&language=es-MX`).catch(() => null);
          if (mov && mov.id) results.push(mapItemForAdmin(mov, 'movie'));
        }
        if (mediaType === 'tv' || mediaType === 'multi') {
          const tv = await fetchWithDelay(`${BASE_URL}/tv/${q}?api_key=${TMDB_API_KEY}&language=es-MX`).catch(() => null);
          if (tv && tv.id) results.push(mapItemForAdmin(tv, 'tv'));
        }
        return results;
      }

      if (mediaType === 'movie') {
        const res = await fetchWithDelay(`${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(q)}&include_adult=false`);
        return (res?.results || []).slice(0, 8).map(item => mapItemForAdmin(item, 'movie'));
      }
      if (mediaType === 'tv') {
        const res = await fetchWithDelay(`${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(q)}&include_adult=false`);
        return (res?.results || []).slice(0, 8).map(item => mapItemForAdmin(item, 'tv'));
      }

      // 'multi': buscar películas y series en paralelo
      const [movRes, tvRes] = await Promise.all([
        fetchWithDelay(`${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(q)}&include_adult=false`).catch(() => ({ results: [] })),
        fetchWithDelay(`${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(q)}&include_adult=false`).catch(() => ({ results: [] }))
      ]);
      const combined = [
        ...(movRes?.results || []).slice(0, 5).map(item => mapItemForAdmin(item, 'movie')),
        ...(tvRes?.results || []).slice(0, 5).map(item => mapItemForAdmin(item, 'tv'))
      ];
      return combined;
    } catch (err) {
      console.error('Error searching TMDB for Admin:', err);
      return [];
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
     await syncDynamicEpisodesCatalog(customAnimes);
     return dedupeCatalogList([...DB_CATALOG_LIST, ...customAnimes]);
  },

  // Inicio - Populares (Trending Anime)
  getTrendingAnime: async () => {
    try {
      const allCatalog = await api.getCatalogAnimes(false);
      const catalogAnimes = allCatalog.filter(a => a.contentType === 'animes' || (!a.isMovie && a.genres?.includes('Animación') && a.contentType !== 'series'));
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
      const allCatalog = await api.getCatalogAnimes(false);
      const catalogAnimes = allCatalog.filter(a => a.contentType === 'animes' || (!a.isMovie && a.genres?.includes('Animación') && a.contentType !== 'series'));
      const url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=500&page=1&include_adult=false`;
      const data = await fetchWithDelay(url);
      return dedupeCatalogList([...catalogAnimes.slice(0, 8), ...data.results.map(mapAnimeData)]);
    } catch (error) {
      console.error('Error fetching top anime:', error);
      return [];
    }
  },

  // Inicio - Series Populares (Series Occidentales y Globales)
  getTrendingSeries: async () => {
    try {
      const allCatalog = await api.getCatalogAnimes(false);
      const catalogSeries = allCatalog.filter(a => a.contentType === 'series');
      const url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&without_original_language=ja&sort_by=popularity.desc&page=1&include_adult=false`;
      const data = await fetchWithDelay(url);
      const mapped = (data?.results || []).map(mapAnimeData);
      return dedupeCatalogList([...catalogSeries, ...mapped]);
    } catch (error) {
      console.error('Error fetching trending series:', error);
      return [];
    }
  },

  // Inicio - Películas y Sagas
  getTrendingMovies: async () => {
    try {
      const allCatalog = await api.getCatalogAnimes(false);
      const catalogMovies = allCatalog.filter(a => a.contentType === 'peliculas' || a.isMovie);
      const url = `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=es-MX&sort_by=popularity.desc&page=1&include_adult=false`;
      const data = await fetchWithDelay(url);
      const mapped = (data?.results || []).map(item => mapAnimeData({ ...item, media_type: 'movie' }));
      return dedupeCatalogList([...catalogMovies, ...mapped]);
    } catch (error) {
      console.error('Error fetching trending movies:', error);
      return [];
    }
  },

  // Inicio - Recientes
  getRecentAnime: async () => {
    try {
      const allCatalog = await api.getCatalogAnimes(false);
      const catalogAnimes = allCatalog.filter(a => a.contentType === 'animes');
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

      if (DB_CATALOG_ITEMS[strId]) {
         return { ...DB_CATALOG_ITEMS[strId] };
      }

      // Verificar si está en custom_animes (tanto con ID custom-... como con TMDB ID asignado desde antes, ej. 10191)
      try {
        const { data: customData } = await supabase.from('custom_animes').select('*').eq('id', strId).maybeSingle();
        if (customData) {
          const mapped = mapCustomAnime(customData);
          // Si tiene un TMDB ID numérico asignado, enriquecer banner/backdrop, score y trailer desde TMDB
          if (/^\d+$/.test(strId)) {
            try {
              const endpoint = mapped.isMovie ? 'movie' : 'tv';
              const tmdbExtra = await fetchWithDelay(`${BASE_URL}/${endpoint}/${strId}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=videos`).catch(() => null);
              if (tmdbExtra && tmdbExtra.id) {
                if (!mapped.hasBackdrop && tmdbExtra.backdrop_path) {
                  mapped.backdrop = `https://image.tmdb.org/t/p/original${tmdbExtra.backdrop_path}`;
                  mapped.banner = mapped.backdrop;
                  mapped.hasBackdrop = true;
                }
                if ((!mapped.score || mapped.score === 'N/A') && tmdbExtra.vote_average) {
                  mapped.score = Number(tmdbExtra.vote_average).toFixed(1);
                }
                if (!mapped.trailer && tmdbExtra.videos?.results?.length > 0) {
                  mapped.trailer = `https://www.youtube.com/embed/${tmdbExtra.videos.results[0].key}`;
                }
              }
            } catch {}
          }
          return mapped;
        }
      } catch {}

      if (strId.startsWith('custom-')) {
         return null;
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

          const resolved = resolveMediaClassification({
            search_title: row.search_title || '',
            total_episodes: 1,
            max_season: 1
          }, movieData, tvData);

          if (resolved) {
            const mapped = mapAnimeData({ ...resolved.data, media_type: resolved.isMovie ? 'movie' : 'tv' });
            if (resolved.isMovie) {
              mapped.saga_collection_title = row.search_title;
              mapped.saga_episode_name = row.episode_name;
              mapped.saga_episode_number = row.episode_number;
            }
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

      const fallbackResolved = resolveMediaClassification({
        search_title: '',
        total_episodes: 1,
        max_season: 1
      }, movieData, tvData);

      if (fallbackResolved) {
        return mapAnimeData({ ...fallbackResolved.data, media_type: fallbackResolved.isMovie ? 'movie' : 'tv' });
      }

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
        const titleLower = `${ca.title || ''} ${ca.searchTitle || ''}`.toLowerCase();
        return queryWords.every(word => titleLower.includes(word));
      });

      const multiUrl = `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(query)}&include_adult=false`;
      const data = await fetchWithDelay(multiUrl);
      const tmdbHits = (data?.results || [])
        .filter(item => (item.media_type === 'tv' || item.media_type === 'movie') && !isEcchiOrNSFW(item))
        .map(mapAnimeData);
      return dedupeCatalogList([...matchedCustom, ...tmdbHits]);
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
        const titleLower = `${ca.title || ''} ${ca.searchTitle || ''}`.toLowerCase();
        const descLower = (ca.description || '').toLowerCase();
        return queryWords.every(w => titleLower.includes(w) || descLower.includes(w));
      });

      // Si el usuario especificó un tipo, respetarlo pero sin bloquear series occidentales o películas
      if (typeFilter === 'peliculas') {
        matchedCustom = matchedCustom.filter(ca => ca.contentType === 'peliculas');
      } else if (typeFilter === 'series') {
        matchedCustom = matchedCustom.filter(ca => ca.contentType === 'series');
      }
      if (genreName && genreName !== 'Todos') {
        matchedCustom = matchedCustom.filter(ca => ca.genres && ca.genres.includes(genreName));
      }

      // 2. Buscar en TMDB según el tipo (sin restringir por idioma japonés 'ja')
      let tmdbResults = [];

      if (typeFilter === 'peliculas') {
        const movieUrl = `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(cleanQ)}&include_adult=false`;
        const data = await fetchWithDelay(movieUrl);
        tmdbResults = (data.results || []).map(item => mapAnimeData({ ...item, media_type: 'movie' }));
      } else if (typeFilter === 'series') {
        const tvUrl = `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(cleanQ)}&include_adult=false`;
        const data = await fetchWithDelay(tvUrl);
        tmdbResults = (data.results || []).map(mapAnimeData);
      } else {
        // 'todos' y 'animes': Buscar tanto películas como series en TMDB sin filtrar por 'ja'
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
      const strId = String(id || '').trim();
      const { data: customData } = !DB_CATALOG_ITEMS[strId]
        ? await supabase.from('custom_animes').select('*').eq('id', strId).maybeSingle()
        : { data: null };

      if (customData || strId.startsWith('custom-')) {
         if (!customData) return [];
         
         const isSingleCustomMovie = Number(customData.total_episodes) === 1;

         // Buscar episodios scrapeados en la BD para heredar nombres y temporadas (por título o por TMDB ID)
         let scrapedEps = [];
         const { data: byTitleEps } = await supabase
            .from('anime_episodes')
            .select('episode_number, season_number, episode_name')
            .ilike('search_title', customData.title)
            .order('episode_number', { ascending: true });
         if (byTitleEps && byTitleEps.length > 0) {
           scrapedEps = byTitleEps;
         } else if (!strId.startsWith('custom-')) {
           const { data: byIdEps } = await supabase
             .from('anime_episodes')
             .select('episode_number, season_number, episode_name')
             .eq('anime_tmdb_id', strId)
             .order('episode_number', { ascending: true });
           if (byIdEps && byIdEps.length > 0) scrapedEps = byIdEps;
         }

         if (scrapedEps && scrapedEps.length > 0) {
             const uniqueEps = [];
             const seen = new Set();
             for (const ep of scrapedEps) {
                 const key = String(ep.season_number || 1) + "-" + String(ep.episode_number);
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueEps.push(ep);
                }
             }
             uniqueEps.sort((a, b) => {
                const sa = Number(a.season_number || 1);
                const sb = Number(b.season_number || 1);
                if (sa !== sb) return sa - sb;
                return Number(a.episode_number) - Number(b.episode_number);
             });

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

      // Si ya tiene episodios registrados en Supabase (anime_episodes), construir directamente desde dbEps deduplicados por temporada y episodio
      if (dbEps.length > 0) {
        const byEpKey = new Map();
        for (const ep of dbEps) {
          const sNum = Number(ep.season_number || 1);
          const epNum = Number(ep.episode_number);
          const key = `${sNum}-${epNum}`;
          const existing = byEpKey.get(key);
          if (!existing || (!existing.episode_name && ep.episode_name) || (/^Episodio\s+\d+$/i.test(existing.episode_name || '') && ep.episode_name && !/^Episodio\s+\d+$/i.test(ep.episode_name))) {
            byEpKey.set(key, ep);
          }
        }
        const sortedUnique = Array.from(byEpKey.values()).sort((a, b) => {
          const sa = Number(a.season_number || 1);
          const sb = Number(b.season_number || 1);
          if (sa !== sb) return sa - sb;
          return Number(a.episode_number) - Number(b.episode_number);
        });
        return sortedUnique.map((ep, idx) => ({
          id: ep.episode_number,
          tmdb_episode_id: ep.episode_number,
          title: ep.episode_name || `Episodio ${ep.episode_number}`,
          url: ep.episode_number,
          season: ep.season_number || 1,
          season_number: ep.season_number || 1,
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
      // 1. Prioridad: Buscar por anime_tmdb_id si está provisto (ej. '671', '941', '108978', 'custom-...')
      if (animeId) {
        const idStr = String(animeId).trim();

        // 1a. Si hay seasonNumber, buscar específicamente esa temporada y episodio
        if (seasonNumber) {
          const { data: bySeasonData } = await supabase
            .from('anime_episodes')
            .select('*')
            .eq('anime_tmdb_id', idStr)
            .eq('season_number', seasonNumber)
            .eq('episode_number', episodeId)
            .order('created_at', { ascending: false });

          if (bySeasonData && bySeasonData.length > 0) {
            serversData = bySeasonData;
          }
        }

        // 1b. Fallback por episode_number general
        if (serversData.length === 0) {
          let q = supabase.from('anime_episodes').select('*').eq('anime_tmdb_id', idStr);
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
      }

      // 2. Prioridad: Buscar por search_title clásico con season_number y episode_number
      if (serversData.length === 0 && cleanTitle) {
        if (seasonNumber) {
          const { data: byTitleSeason } = await supabase
            .from('anime_episodes')
            .select('*')
            .ilike('search_title', cleanTitle)
            .eq('season_number', seasonNumber)
            .eq('episode_number', episodeId)
            .order('created_at', { ascending: false });

          if (byTitleSeason && byTitleSeason.length > 0) {
            serversData = byTitleSeason;
          }
        }

        if (serversData.length === 0) {
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
        let servers = serversData.map(lat => {
          const rawLang = String(lat.language || 'sub').toLowerCase().trim();
          let normalizedLang = 'sub';
          if (rawLang.includes('lat') || rawLang === 'es' || rawLang === 'español' || rawLang === 'spanish') normalizedLang = 'latino';
          else if (rawLang.includes('cast')) normalizedLang = 'castellano';
          else if (rawLang.includes('sub') || rawLang.includes('jap') || rawLang === 'ja') normalizedLang = 'sub';
          else if (rawLang === 'none') normalizedLang = 'none';
          else normalizedLang = rawLang;

          return {
            name: lat.server_name,
            description: `Servidor Oficial (${normalizedLang.toUpperCase()})`,
            url: lat.video_url,
            color: lat.server_name.includes('FILEMOON') ? '#3b82f6' : 
                   lat.server_name.includes('EARNVIDS') ? '#10b981' : 
                   lat.server_name.includes('STREAMWISH') ? '#8b5cf6' : 
                   lat.server_name.includes('ZOPLAYER') ? '#f59e0b' : '#64748b',
            icon: 'S',
            lang: normalizedLang,
            skip_start: lat.skip_start || null,
            skip_end: lat.skip_end || null,
            outro_start: lat.outro_start || null
          };
        });

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

  // Obtener Idiomas de Audio Disponibles (Latino, Castellano, Sub) para la ficha
  getAnimeLanguages: async (animeId, animeTitle) => {
    try {
      const strId = String(animeId || '').trim();
      let query = supabase.from('anime_episodes').select('language');
      if (strId && !strId.startsWith('custom-')) {
        query = query.eq('anime_tmdb_id', strId);
      } else if (animeTitle) {
        query = query.ilike('search_title', animeTitle.trim());
      }
      const { data } = await query.limit(100);
      if (data && data.length > 0) {
        const langs = new Set();
        data.forEach(r => {
          const raw = String(r.language || '').toLowerCase().trim();
          if (raw.includes('lat') || raw === 'es' || raw === 'español' || raw === 'spanish') langs.add('Latino');
          else if (raw.includes('cast')) langs.add('Castellano');
          else if (raw.includes('sub') || raw.includes('jap') || raw === 'ja') langs.add('Subtitulado');
          else if (raw && raw !== 'none') langs.add(raw.charAt(0).toUpperCase() + raw.slice(1));
        });
        return Array.from(langs);
      }
    } catch (e) {
      console.error('Error fetching anime languages:', e);
    }
    return [];
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

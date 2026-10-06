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

  // Inicio - Populares (Trending)
  getTrendingAnime: async () => {
    try {
      const customAnimes = await api.getCustomAnimes(false);
      const url1 = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=popularity.desc&page=1&include_adult=false`;
      const url2 = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=popularity.desc&page=2&include_adult=false`;
      const [res1, res2] = await Promise.all([ fetchWithDelay(url1), fetchWithDelay(url2) ]);
      const combined = [...(res1?.results || []), ...(res2?.results || [])].map(mapAnimeData);
      return [...customAnimes, ...combined];
    } catch (error) {
      console.error('Error fetching trending anime:', error);
      return [];
    }
  },

  // Inicio - Top Anime
  getTopAnime: async () => {
    try {
      const customAnimes = await api.getCustomAnimes(false);
      const url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=500&page=1&include_adult=false`;
      const data = await fetchWithDelay(url);
      return [...customAnimes.slice(0, 5), ...data.results.map(mapAnimeData)];
    } catch (error) {
      console.error('Error fetching top anime:', error);
      return [];
    }
  },

  // Inicio - Recientes
  getRecentAnime: async () => {
    try {
      const customAnimes = await api.getCustomAnimes(false);
      const url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=first_air_date.desc&page=1&include_adult=false`;
      const data = await fetchWithDelay(url);
      return [...customAnimes, ...data.results.map(mapAnimeData)];
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
        customAnimes = await api.getCustomAnimes(false);
        
        // Filtrar custom animes por tipo si no es 'todos'
        if (typeFilter && typeFilter !== 'todos') {
          customAnimes = customAnimes.filter(ca => ca.contentType === typeFilter);
        }

        // Filtrar custom animes por género si no es 'Todos'
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
        // 'todos': anime japonés
        url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=popularity.desc&page=${page}&include_adult=false`;
        if (genreName !== 'Todos' && TMDB_GENRES[genreName]) {
          url += `&with_genres=${TMDB_GENRES[genreName]}`;
        }
      }

      const data = await fetchWithDelay(url);
      const mapped = (data.results || []).map(mapAnimeData);
      return [...customAnimes, ...mapped];
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

      // 1. Verificar si este TMDB ID está registrado en anime_episodes de Supabase (por ejemplo: Harry Potter 1 ID 671, Arma Mortal ID 941, etc.)
      try {
        const { data: dbRows } = await supabase
          .from('anime_episodes')
          .select('anime_tmdb_id, search_title, episode_name, episode_number')
          .eq('anime_tmdb_id', strId)
          .limit(1);

        if (dbRows && dbRows.length > 0) {
          const row = dbRows[0];
          try {
            const movieUrl = `${BASE_URL}/movie/${strId}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=videos`;
            const movieData = await fetchWithDelay(movieUrl);
            if (movieData && (movieData.title || movieData.original_title)) {
              const mapped = mapAnimeData({ ...movieData, media_type: 'movie' });
              mapped.saga_collection_title = row.search_title;
              mapped.saga_episode_name = row.episode_name;
              mapped.saga_episode_number = row.episode_number;
              return mapped;
            }
          } catch {}
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
      const customAnimes = await api.getCustomAnimes(true);
      const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 0);
      
      const matchedCustom = customAnimes.filter(ca => {
        if (ca.isSecret) return false;
        const titleLower = ca.title.toLowerCase();
        return queryWords.every(word => titleLower.includes(word));
      });

      const url = `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(query)}&include_adult=false`;
      const data = await fetchWithDelay(url);
      const animes = data.results.filter(item => item.original_language === 'ja');
      return [...matchedCustom, ...animes.map(mapAnimeData)];
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

      // 1. Buscar en custom_animes (Supabase)
      const customAnimes = await api.getCustomAnimes(false);
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

      // Unir y deduplicar por id
      const combined = [...matchedCustom, ...tmdbResults];
      const seen = new Set();
      const unique = [];
      for (const item of combined) {
        const idStr = String(item.id);
        if (!seen.has(idStr)) {
          seen.add(idStr);
          unique.push(item);
        }
      }

      return unique;
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

      let finalEpisodes = allEpisodes;
      if (allEpisodes.length > 0) {
        finalEpisodes = allEpisodes.map((ep, index) => {
          const dbEpInfo = (dbEps && dbEps.find(e => e.episode_number === (index + 1))) || {};
          
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
              const dbEpInfo = (dbEps && dbEps.find(e => e.episode_number === i)) || {};
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

      // 2. Prioridad: Buscar por episode_name (para películas individuales registradas en sagas/colecciones)
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

      // 3. Prioridad: Buscar por search_title clásico con episode_number
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

import { supabase } from './supabase';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

const TMDB_GENRES = {
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

// Función auxiliar para mapear el formato de TMDB al formato que espera nuestra UI (como el de Jikan)
const mapAnimeData = (item) => ({
  id: item.id,
  title: item.name || item.original_name,
  image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/225x318?text=No+Image',
  score: item.vote_average ? (item.vote_average).toFixed(1) : 'N/A',
  totalEpisodes: item.number_of_episodes || null, 
  episodes: item.number_of_episodes || null,
  type: 'TV',
  description: item.overview || 'Sin sinopsis disponible.',
  genres: item.genres 
    ? item.genres.map(g => g.name) 
    : (item.genre_ids ? item.genre_ids.map(id => TMDB_GENRES_REVERSE[id]).filter(Boolean) : []),
  status: item.status === 'Ended' ? 'Finalizado' : item.status === 'Returning Series' ? 'En emisión' : item.status,
  trailer: item.videos?.results?.length > 0 ? `https://www.youtube.com/embed/${item.videos.results[0].key}` : null,
});

// Implementación de retraso para no saturar la API (aunque TMDB soporta 50 req/s, es buena práctica)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let lastRequestTime = 0;

const fetchWithDelay = async (url) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < 100) { // 100ms delay for TMDB
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
  // Inicio - Populares (Trending)
  getTrendingAnime: async () => {
    try {
      const url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=popularity.desc&page=1`;
      const data = await fetchWithDelay(url);
      return data.results.map(mapAnimeData);
    } catch (error) {
      console.error('Error fetching trending anime:', error);
      return [];
    }
  },

  // Inicio - Top Anime (Mejor valorados)
  getTopAnime: async () => {
    try {
      const url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=500&page=1`;
      const data = await fetchWithDelay(url);
      return data.results.map(mapAnimeData);
    } catch (error) {
      console.error('Error fetching top anime:', error);
      return [];
    }
  },

  // Inicio - Recientes (En emisión)
  getRecentAnime: async () => {
    try {
      const url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=first_air_date.desc&page=1`;
      const data = await fetchWithDelay(url);
      return data.results.map(mapAnimeData);
    } catch (error) {
      console.error('Error fetching recent anime:', error);
      return [];
    }
  },

  // Descubrir (Para el Catálogo con Paginación y Filtros)
  getDiscoverAnime: async (page = 1, genreName = 'Todos') => {
    try {
      let url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=popularity.desc&page=${page}`;
      
      if (genreName !== 'Todos' && TMDB_GENRES[genreName]) {
        url += `&with_genres=${TMDB_GENRES[genreName]}`;
      }

      const data = await fetchWithDelay(url);
      return data.results.map(mapAnimeData);
    } catch (error) {
      console.error('Error fetching discover anime:', error);
      return [];
    }
  },

  // Detalles del Anime
  getAnimeInfo: async (id) => {
    try {
      const url = `${BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=videos`;
      const data = await fetchWithDelay(url);
      return mapAnimeData(data);
    } catch (error) {
      console.error('Error fetching anime info:', error);
      return null;
    }
  },

  // Búsqueda
  searchAnime: async (query) => {
    try {
      if (!query) return [];
      const url = `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(query)}`;
      const data = await fetchWithDelay(url);
      // Filtrar para asegurar que solo devuelva contenido en japonés (anime)
      const animes = data.results.filter(item => item.original_language === 'ja');
      return animes.map(mapAnimeData);
    } catch (error) {
      console.error('Error searching anime:', error);
      return [];
    }
  },

  // Episodios - Extrae los episodios de la temporada 1 (o la temporada principal)
  getAnimeEpisodes: async (id) => {
    try {
      const info = await api.getAnimeInfo(id);
      if (!info) return [];
      
      const numSeasons = info.number_of_seasons || 1; 
      let allEpisodes = [];
      let absoluteEpCount = 1;

      // Iterar por todas las temporadas (excluyendo la 0 que suele ser especiales)
      for (let s = 1; s <= numSeasons; s++) {
        const seasonUrl = `${BASE_URL}/tv/${id}/season/${s}?api_key=${TMDB_API_KEY}&language=es-MX`;
        try {
          const seasonData = await fetchWithDelay(seasonUrl);
          if (seasonData.episodes && seasonData.episodes.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const seasonEps = seasonData.episodes
              .filter(ep => !ep.air_date || ep.air_date <= today) // Evitar episodios futuros
              .map(ep => ({
                id: ep.episode_number,
                title: `T${s}E${ep.episode_number} - ${ep.name}`,
                url: ep.episode_number,
                season: s,
                absolute_id: absoluteEpCount++ // Para mantener un id único en la UI
              }));
            allEpisodes = [...allEpisodes, ...seasonEps];
          }
        } catch (e) {
          console.error(`Error fetching season ${s}`, e);
        }
      }
      
      // Consultar Supabase para ver cuántos episodios tenemos realmente
      let dbMaxEpisode = 0;
      try {
        const { data } = await supabase
          .from('anime_episodes')
          .select('episode_number')
          .ilike('search_title', info.title) // ilike no distingue mayúsculas/minúsculas
          .order('episode_number', { ascending: false })
          .limit(1);
          
        if (data && data.length > 0) {
           dbMaxEpisode = data[0].episode_number;
        }
      } catch (e) { console.error("Error al consultar Supabase episodios", e); }

      let finalEpisodes = allEpisodes;
      if (allEpisodes.length > 0) {
        finalEpisodes = allEpisodes.map(ep => ({
          ...ep,
          tmdb_episode_id: ep.id,
          id: ep.absolute_id 
        }));
      }

      // Si tenemos más episodios en la BD de los que TMDB reporta, los rellenamos
      if (finalEpisodes.length < dbMaxEpisode) {
          const startingId = finalEpisodes.length + 1;
          for (let i = startingId; i <= dbMaxEpisode; i++) {
              finalEpisodes.push({
                  id: i,
                  tmdb_episode_id: i,
                  title: `Episodio ${i} (Extra)`,
                  url: i,
                  season: 1
              });
          }
      }

      if (finalEpisodes.length > 0) {
         return finalEpisodes;
      }
      
      // Fallback si no hay detalles de episodios pero sabemos el total
      const total = info.number_of_episodes || 12;
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

  // Reproductor - Ahora usando IDs de TMDB para iFrames funcionales reales
  getEpisodeServers: async (animeTitle, episodeId, language = 'sub', animeId = null, seasonNumber = 1) => {
    
    // Configuraciones de idioma (algunos reproductores multi-idioma cambian basados en la fuente)
    let langName = 'Subtitulado';
    if (language === 'latino') langName = 'Latino';
    if (language === 'castellano') langName = 'Castellano';

    // Asegurarnos de tener el animeId de TMDB (si no lo pasan, usamos YouTube fallback, pero deberíamos pasarlo desde Watch.jsx)
    if (!animeId) {
       const searchUrl = `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(animeTitle)}`;
       try {
         const data = await fetchWithDelay(searchUrl);
         if (data.results.length > 0) animeId = data.results[0].id;
       } catch(e) {}
    }

    if (animeId) {
      let servers = [];
      // Intentar obtener el servidor desde Supabase
      try {
        const { data, error } = await supabase
          .from('anime_episodes')
          .select('*')
          .ilike('search_title', animeTitle)
          .eq('episode_number', episodeId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const lat = data[0];
          servers.unshift({
            name: 'Principal',
            description: `Servidor Oficial (${lat.server_name})`,
            url: lat.video_url,
            color: '#f59e0b',
            icon: 'P'
          });
        } else {
          servers.push({
            name: 'No Disponible',
            description: 'Este episodio aún no se ha agregado al catálogo.',
            url: '',
            color: '#4b5563',
            icon: 'X'
          });
        }
      } catch (e) {
        console.error("No se pudo obtener el servidor de Supabase", e);
      }

      return servers;
    } else {
       // Fallback a YouTube si falla la obtención del TMDB ID
       const query = encodeURIComponent(`${animeTitle} episodio ${episodeId} ${langName}`);
       return [{
         name: 'YOUTUBE FALLBACK',
         description: 'Búsqueda en YouTube',
         url: `https://www.youtube.com/embed?listType=search&list=${query}`,
         color: '#ff0000',
         icon: 'Y'
       }];
    }
  }
};

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

// Map TMDB data
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
  isCustom: false,
  isSecret: false
});

// Map Custom Anime data
const mapCustomAnime = (item) => ({
  id: item.id,
  title: item.title,
  image: item.image || 'https://via.placeholder.com/225x318?text=No+Image',
  score: item.score || 'N/A',
  totalEpisodes: item.total_episodes || null,
  episodes: item.total_episodes || null,
  type: 'TV',
  description: item.description || 'Sin sinopsis disponible.',
  genres: item.genres || [],
  status: item.status || 'En emisión',
  trailer: null,
  isCustom: true,
  isSecret: item.is_secret || false
});

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
      const url1 = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=popularity.desc&page=1`;
      const url2 = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=popularity.desc&page=2`;
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
      const url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=500&page=1`;
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
      const url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=first_air_date.desc&page=1`;
      const data = await fetchWithDelay(url);
      return [...customAnimes, ...data.results.map(mapAnimeData)];
    } catch (error) {
      console.error('Error fetching recent anime:', error);
      return [];
    }
  },

  // Descubrir (Para el Catálogo)
  getDiscoverAnime: async (page = 1, genreName = 'Todos') => {
    try {
      let customAnimes = [];
      if (page === 1) {
        customAnimes = await api.getCustomAnimes(false);
        if (genreName !== 'Todos') {
          customAnimes = customAnimes.filter(ca => ca.genres.includes(genreName));
        }
      }

      let url = `${BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=es-MX&with_original_language=ja&sort_by=popularity.desc&page=${page}`;
      if (genreName !== 'Todos' && TMDB_GENRES[genreName]) {
        url += `&with_genres=${TMDB_GENRES[genreName]}`;
      }
      const data = await fetchWithDelay(url);
      return [...customAnimes, ...data.results.map(mapAnimeData)];
    } catch (error) {
      console.error('Error fetching discover anime:', error);
      return [];
    }
  },

  // Detalles del Anime
  getAnimeInfo: async (id) => {
    try {
      if (String(id).startsWith('custom-')) {
         const { data } = await supabase.from('custom_animes').select('*').eq('id', id).single();
         return data ? mapCustomAnime(data) : null;
      }

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
      const customAnimes = await api.getCustomAnimes(true);
      const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 0);
      
      const matchedCustom = customAnimes.filter(ca => {
        if (ca.isSecret) return false;
        const titleLower = ca.title.toLowerCase();
        return queryWords.every(word => titleLower.includes(word));
      });

      const url = `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(query)}`;
      const data = await fetchWithDelay(url);
      const animes = data.results.filter(item => item.original_language === 'ja');
      return [...matchedCustom, ...animes.map(mapAnimeData)];
    } catch (error) {
      console.error('Error searching anime:', error);
      return [];
    }
  },

  // Episodios
  getAnimeEpisodes: async (id) => {
    try {
      if (String(id).startsWith('custom-')) {
         const { data } = await supabase.from('custom_animes').select('*').eq('id', id).single();
         if (!data) return [];
         const total = data.total_episodes || 12;
         const names = data.episode_names || {};
         return Array.from({ length: total }, (_, i) => ({
           id: i + 1,
           tmdb_episode_id: i + 1,
           title: names[i + 1] || `T1E${i + 1}`,
           url: i + 1,
           season: 1
         }));
      }

      const info = await api.getAnimeInfo(id);
      if (!info) return [];
      
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
      try {
        const { data } = await supabase
          .from('anime_episodes')
          .select('episode_number')
          .ilike('search_title', info.title)
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

      if (finalEpisodes.length > 0) return finalEpisodes;
      
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

  getEpisodeServers: async (animeTitle, episodeId, language = 'sub', animeId = null, seasonNumber = 1) => {
    if (!animeId) {
       const searchUrl = `${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(animeTitle)}`;
       try {
         const data = await fetchWithDelay(searchUrl);
         if (data.results.length > 0) animeId = data.results[0].id;
       } catch(e) {}
    }

    if (animeId || String(animeId).startsWith('custom-')) {
      let servers = [];
      try {
        const { data, error } = await supabase
          .from('anime_episodes')
          .select('*')
          .ilike('search_title', animeTitle)
          .eq('episode_number', episodeId)
          .order('created_at', { ascending: false });
        if (data && data.length > 0) {
          servers = data.map(lat => ({
            name: lat.server_name,
            description: `Servidor Oficial (${lat.language.toUpperCase()})`,
            url: lat.video_url,
            color: lat.server_name.includes('FILEMOON') ? '#3b82f6' : 
                   lat.server_name.includes('EARNVIDS') ? '#10b981' : 
                   lat.server_name.includes('STREAMWISH') ? '#8b5cf6' : 
                   lat.server_name.includes('ZOPLAYER') ? '#f59e0b' : '#64748b',
            icon: 'S',
            lang: lat.language
          }));
          
          servers = servers.filter((server, index, self) =>
            index === self.findIndex((t) => t.url === server.url)
          );

        } else {
          servers.push({
            name: 'No Disponible',
            description: 'Este episodio aún no se ha agregado al catálogo.',
            url: '',
            color: '#4b5563',
            icon: 'X',
            lang: 'none'
          });
        }
      } catch (e) {
        console.error("No se pudo obtener el servidor de Supabase", e);
      }
      return servers;
    } else {
       const query = encodeURIComponent(`${animeTitle} episodio ${episodeId} ${language}`);
       return [{
         name: 'YOUTUBE FALLBACK',
         description: 'Búsqueda en YouTube',
         url: `https://www.youtube.com/embed?listType=search&list=${query}`,
         color: '#ff0000',
         icon: 'Y',
         lang: language
       }];
    }
  }
};

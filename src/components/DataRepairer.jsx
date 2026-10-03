import { useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { api } from '../services/api';

const DataRepairer = () => {
  const [favoriteAnimes, setFavoriteAnimes] = useLocalStorage('favoriteAnimes', []);
  const [continueWatching, setContinueWatching] = useLocalStorage('continueWatching', []);
  const [hiddenAnimes, setHiddenAnimes] = useLocalStorage('hiddenAnimes', []);
  const [watchedAnimes, setWatchedAnimes] = useLocalStorage('watchedAnimes', []);

  useEffect(() => {
    const repairFavorites = async () => {
      if (!Array.isArray(favoriteAnimes)) return;
      
      let needsUpdate = false;
      const newFavs = [...favoriteAnimes];
      
      for (let i = 0; i < newFavs.length; i++) {
        const fav = newFavs[i];
        if (typeof fav === 'string' || typeof fav === 'number') {
          // It's just an ID from the Mobile App! Fetch its info
          try {
            const info = await api.getAnimeInfo(fav);
            if (info) {
              newFavs[i] = { id: info.id, title: info.title, image: info.image };
              needsUpdate = true;
            } else {
              // Try to find it in animezona_fav_objects if exists locally
              const objectsStr = window.localStorage.getItem('animezona_fav_objects');
              if (objectsStr) {
                  try {
                      const objects = JSON.parse(objectsStr);
                      const found = objects.find(o => String(o.id) === String(fav));
                      if (found) {
                          newFavs[i] = { id: found.id, title: found.title, image: found.image };
                          needsUpdate = true;
                      }
                  } catch(e){}
              }
            }
          } catch(e) {}
        }
      }

      if (needsUpdate) {
        setFavoriteAnimes(newFavs);
      }
    };

    const repairContinue = () => {
      if (!Array.isArray(continueWatching)) return;
      
      let needsUpdate = false;
      const newCW = continueWatching.map(cw => {
        if (cw && typeof cw === 'object' && cw.animeId && !cw.id) {
          needsUpdate = true;
          // Transform Mobile format to Web format
          return {
            id: cw.animeId,
            title: cw.title,
            image: cw.image,
            episode: cw.episodeNum,
            timestamp: cw.time
          };
        }
        return cw;
      });

      if (needsUpdate) {
        setContinueWatching(newCW);
      }
    };

    const repairWatched = () => {
      if (!Array.isArray(watchedAnimes)) return;
      let needsUpdate = false;
      const newW = watchedAnimes.map(w => {
        if (w && typeof w === 'object' && w.animeId && !w.id) {
          needsUpdate = true;
          return {
            id: w.animeId,
            title: w.title,
            image: w.image,
            episode: w.episodeNum || w.episode
          };
        }
        return w;
      });

      if (needsUpdate) {
        setWatchedAnimes(newW);
      }
    };

    const repairHidden = async () => {
      if (!Array.isArray(hiddenAnimes)) return;
      let needsUpdate = false;
      const newHidden = [...hiddenAnimes];

      for (let i = 0; i < newHidden.length; i++) {
        const h = newHidden[i];
        if (typeof h === 'string' || typeof h === 'number') {
          // Just ID
          try {
            const info = await api.getAnimeInfo(h);
            if (info) {
              newHidden[i] = { id: info.id, title: info.title, image: info.image };
              needsUpdate = true;
            }
          } catch(e) {}
        }
      }

      if (needsUpdate) {
        setHiddenAnimes(newHidden);
      }
    };

    repairFavorites();
    repairContinue();
    repairWatched();
    repairHidden();

  }, [favoriteAnimes, continueWatching, hiddenAnimes, watchedAnimes]);

  return null;
};

export default DataRepairer;

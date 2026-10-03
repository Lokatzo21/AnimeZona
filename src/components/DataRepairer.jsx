import { useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { api } from '../services/api';

const DataRepairer = () => {
  const [favoriteAnimes, setFavoriteAnimes] = useLocalStorage('favoriteAnimes', []);
  const [continueWatching, setContinueWatching] = useLocalStorage('continueWatching', []);
  const [hiddenAnimes, setHiddenAnimes] = useLocalStorage('hiddenAnimes', []);
  const [watchedAnimes, setWatchedAnimes] = useLocalStorage('watchedAnimes', []);
  const isRepairingRef = useRef(false);

  useEffect(() => {
    if (isRepairingRef.current) return;

    const repairFavorites = async () => {
      if (!Array.isArray(favoriteAnimes) || favoriteAnimes.length === 0) return;

      const needsRepair = favoriteAnimes.some(
        fav => typeof fav === 'string' || typeof fav === 'number' || !fav || !fav.title || !fav.image
      );
      if (!needsRepair) return;

      isRepairingRef.current = true;
      try {
        const repaired = await Promise.all(
          favoriteAnimes.map(async (fav) => {
            if (fav && typeof fav === 'object' && fav.id && fav.title && fav.image) {
              return fav;
            }
            const id = typeof fav === 'object' && fav !== null ? fav.id : fav;
            if (!id || id === '[object Object]') return null;

            try {
              const info = await api.getAnimeInfo(id);
              if (info && info.title) {
                return {
                  id: String(info.id),
                  title: info.title,
                  image: info.image || ''
                };
              }
            } catch (e) {}

            return fav && typeof fav === 'object' && fav.id ? fav : { id: String(id) };
          })
        );

        const filtered = repaired.filter(Boolean);
        setFavoriteAnimes(filtered);
      } finally {
        isRepairingRef.current = false;
      }
    };

    const repairContinue = () => {
      if (!Array.isArray(continueWatching) || continueWatching.length === 0) return;

      const needsRepair = continueWatching.some(
        cw => cw && typeof cw === 'object' && ((cw.animeId && !cw.id) || (cw.time !== undefined && cw.timestamp === undefined))
      );
      if (!needsRepair) return;

      const newCW = continueWatching.map((cw) => {
        if (cw && typeof cw === 'object') {
          return {
            id: cw.id || cw.animeId,
            animeId: cw.animeId || cw.id,
            title: cw.title || 'Anime',
            image: cw.image || '',
            episode: cw.episode || cw.episodeNum || 1,
            episodeNum: cw.episodeNum || cw.episode || 1,
            timestamp: cw.timestamp ?? cw.time ?? 0,
            time: cw.time ?? cw.timestamp ?? 0
          };
        }
        return cw;
      });

      setContinueWatching(newCW);
    };

    const repairWatched = () => {
      if (!Array.isArray(watchedAnimes) || watchedAnimes.length === 0) return;

      const needsRepair = watchedAnimes.some(
        w => w && typeof w === 'object' && w.animeId && !w.id
      );
      if (!needsRepair) return;

      const newW = watchedAnimes.map((w) => {
        if (w && typeof w === 'object' && w.animeId && !w.id) {
          return {
            id: w.animeId,
            title: w.title,
            image: w.image,
            episode: w.episodeNum || w.episode
          };
        }
        return w;
      });

      setWatchedAnimes(newW);
    };

    const repairHidden = async () => {
      if (!Array.isArray(hiddenAnimes) || hiddenAnimes.length === 0) return;

      const needsRepair = hiddenAnimes.some(
        h => typeof h === 'string' || typeof h === 'number' || !h || !h.title || !h.image
      );
      if (!needsRepair) return;

      const repaired = await Promise.all(
        hiddenAnimes.map(async (h) => {
          if (h && typeof h === 'object' && h.id && h.title && h.image) {
            return h;
          }
          const id = typeof h === 'object' && h !== null ? h.id : h;
          if (!id || id === '[object Object]') return null;

          try {
            const info = await api.getAnimeInfo(id);
            if (info && info.title) {
              return {
                id: String(info.id),
                title: info.title,
                image: info.image || ''
              };
            }
          } catch (e) {}

          return h && typeof h === 'object' && h.id ? h : { id: String(id) };
        })
      );

      setHiddenAnimes(repaired.filter(Boolean));
    };

    repairFavorites();
    repairContinue();
    repairWatched();
    repairHidden();
  }, [favoriteAnimes, continueWatching, hiddenAnimes, watchedAnimes]);

  return null;
};

export default DataRepairer;

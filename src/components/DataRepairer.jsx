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

            return {
              id: String(id),
              title: (fav && typeof fav === 'object' && fav.title) ? fav.title : `Anime #${id}`,
              image: (fav && typeof fav === 'object' && fav.image) ? fav.image : 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80',
              banner: (fav && typeof fav === 'object' && (fav.banner || fav.backdrop)) ? (fav.banner || fav.backdrop) : '',
              score: (fav && typeof fav === 'object' && fav.score) ? fav.score : '9.0',
              description: (fav && typeof fav === 'object' && fav.description) ? fav.description : ''
            };
          })
        );

        const filtered = repaired.filter(Boolean);
        setFavoriteAnimes(filtered);
      } finally {
        isRepairingRef.current = false;
      }
    };

    const ID_MIGRATIONS = {
      'custom-1791092665853': 226362, // El Eternauta
      'custom-1791530479852': 127529, // Sabuesos
      'custom-1776054217371': 228878  // Efectos colaterales
    };

    const normalizeAndDedupe = (list, isContinue = false) => {
      const normalized = list.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const rawId = String(item.id || item.animeId || '').trim();
        const migratedId = ID_MIGRATIONS[rawId] || item.id || item.animeId;
        let title = item.title || 'Anime';
        let image = item.image || '';

        if (String(migratedId) === '278624' && (title === 'AMAZON 3D' || !title)) {
          title = 'Lucky';
          image = 'https://image.tmdb.org/t/p/w500/vZ3GfOoeha2xVCPec0jv2jf3yfC.jpg';
        } else if (String(migratedId) === '226362') {
          title = 'El Eternauta';
          image = 'https://image.tmdb.org/t/p/w500/9Krv5NvKa5a3Q3b1l2B3rP9Bj8E.jpg';
        } else if (String(migratedId) === '127529') {
          title = 'Sabuesos';
          image = image || 'https://image.tmdb.org/t/p/w500/pWzp4HpDifuyNF8zkPIy8MKCg2d.jpg';
        }

        if (isContinue) {
          const ep = item.episode || item.episodeNum || item.episodeNumber || 1;
          const ts = item.timestamp ?? item.time ?? item.progress ?? 0;
          return {
            ...item,
            id: migratedId,
            animeId: migratedId,
            title,
            image,
            episode: ep,
            episodeNum: ep,
            episodeNumber: ep,
            timestamp: ts,
            time: ts
          };
        }

        return {
          ...item,
          id: migratedId,
          title,
          image,
          episode: item.episodeNum || item.episode
        };
      });

      const deduped = [];
      for (const item of normalized) {
        if (!item || typeof item !== 'object' || !item.id) continue;
        const idStr = String(item.id).trim();
        const titleNorm = (item.title || '').trim().toLowerCase();
        const existingIdx = deduped.findIndex(
          ex => String(ex.id).trim() === idStr || (titleNorm && (ex.title || '').trim().toLowerCase() === titleNorm)
        );
        if (existingIdx === -1) {
          deduped.push(item);
        } else {
          const ex = deduped[existingIdx];
          const exIsCustom = String(ex.id).startsWith('custom-');
          const curIsCustom = String(item.id).startsWith('custom-');
          if (exIsCustom && !curIsCustom) {
            deduped[existingIdx] = { ...ex, ...item, id: item.id, animeId: item.id };
          }
        }
      }
      return deduped;
    };

    const repairContinue = () => {
      if (!Array.isArray(continueWatching) || continueWatching.length === 0) return;

      const deduped = normalizeAndDedupe(continueWatching, true);
      if (JSON.stringify(deduped) !== JSON.stringify(continueWatching)) {
        setContinueWatching(deduped);
      }
    };

    const repairWatched = () => {
      if (!Array.isArray(watchedAnimes) || watchedAnimes.length === 0) return;

      const deduped = normalizeAndDedupe(watchedAnimes, false);
      if (JSON.stringify(deduped) !== JSON.stringify(watchedAnimes)) {
        setWatchedAnimes(deduped);
      }
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

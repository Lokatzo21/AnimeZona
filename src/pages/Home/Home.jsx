import React, { useEffect, useState, useMemo } from 'react';
import Carousel from '../../components/Carousel/Carousel';
import AnimeCard from '../../components/AnimeCard/AnimeCard';
import HeroCarousel from '../../components/HeroCarousel/HeroCarousel';
import { SkeletonRow, SkeletonGrid } from '../../components/SkeletonCard/SkeletonCard';
import { api, isEcchiOrNSFW } from '../../services/api';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import styles from './Home.module.css';

const Home = () => {
  const [topAnime, setTopAnime] = useState(() => {
    try {
      const c = localStorage.getItem('anime_cached_home_top');
      return c ? JSON.parse(c) : [];
    } catch { return []; }
  });
  const [allTimeAnime, setAllTimeAnime] = useState(() => {
    try {
      const c = localStorage.getItem('anime_cached_home_trending');
      return c ? JSON.parse(c) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const c1 = localStorage.getItem('anime_cached_home_top');
      const c2 = localStorage.getItem('anime_cached_home_trending');
      return !(c1 && c2 && JSON.parse(c1).length > 0);
    } catch { return true; }
  });
  
  // Local storage para animes favoritos y ocultos
  const [favoriteAnimes, setFavoriteAnimes] = useLocalStorage('favoriteAnimes', []);
  const [hiddenAnimes, setHiddenAnimes] = useLocalStorage('hiddenAnimes', []);
  const [continueWatching, setContinueWatching] = useLocalStorage('continueWatching', []);

  useEffect(() => {
    let isMounted = true;
    const fetchHomeData = async () => {
      try {
        // Ejecutar llamadas concurrentemente en paralelo sin demoras innecesarias
        const [top, allTime] = await Promise.all([
          api.getTopAnime(),
          api.getTrendingAnime()
        ]);
        
        if (!isMounted) return;

        if (Array.isArray(top) && top.length > 0) {
          setTopAnime(top);
          try { localStorage.setItem('anime_cached_home_top', JSON.stringify(top)); } catch {}
        }
        if (Array.isArray(allTime) && allTime.length > 0) {
          setAllTimeAnime(allTime);
          try { localStorage.setItem('anime_cached_home_trending', JSON.stringify(allTime)); } catch {}
        }
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    document.title = "Inicio";
    fetchHomeData();

    return () => { isMounted = false; };
  }, []);

  // Animes para el Hero Carousel superior:
  // 1. Favoritos del usuario y Continuar Viendo con backdrop HD
  // 2. Recomendados seguros de la comunidad (Top Anime)
  // 3. Filtro estricto que elimina ecchi, contenido para adultos o sugerente
  const carouselAnimes = useMemo(() => {
    const list = [];
    const seen = new Set();

    const isSafe = (a) => {
      if (!a || typeof a !== 'object' || !a.id || !a.title) return false;
      const idStr = String(a.id);
      if (seen.has(idStr)) return false;
      if ((hiddenAnimes || []).some(h => String(h.id) === idStr)) return false;
      if (a.isSecret || a.is_secret) return false;
      if (isEcchiOrNSFW(a)) return false;
      return true;
    };

    // 1. Prioridad: Animes de la lista del usuario (Favoritos y Continuar Viendo)
    const userPool = [
      ...(favoriteAnimes || []).map(f => ({ ...f, _source: 'fav' })),
      ...(continueWatching || []).map(c => ({ ...c, _source: 'cw' }))
    ];

    for (const item of userPool) {
      if (!item || !item.id) continue;
      const idStr = String(item.id);
      if (seen.has(idStr)) continue;

      // Buscar si tenemos datos enriquecidos con fondo HD en allTimeAnime o topAnime
      const enriched = (allTimeAnime || []).find(a => String(a.id) === idStr) || 
                       (topAnime || []).find(a => String(a.id) === idStr) ||
                       item;

      const hasHdBackdrop = Boolean(
        enriched.hasBackdrop || 
        (enriched.backdrop && !enriched.backdrop.includes('placeholder')) || 
        (enriched.banner && !enriched.banner.includes('placeholder') && !enriched.banner.includes('w500'))
      );

      if (isSafe(enriched) && hasHdBackdrop) {
        seen.add(idStr);
        list.push({
          ...enriched,
          badgeLabel: item._source === 'fav' ? 'En tus Favoritos' : 'En tu Lista'
        });
      }
    }

    // 2. Recomendados aclamados por la comunidad (Top Anime sin ecchi con alta calificación y votos)
    const communityTop = (topAnime || []).filter(a => isSafe(a) && (a.hasBackdrop || (a.backdrop && !a.backdrop.includes('placeholder'))));
    for (const a of communityTop) {
      if (list.length >= 6) break;
      const idStr = String(a.id);
      if (!seen.has(idStr)) {
        seen.add(idStr);
        list.push({ ...a, badgeLabel: 'Recomendado de la Comunidad' });
      }
    }

    // 3. Completar con tendencias populares limpias si hacen falta
    const trendingSafe = (allTimeAnime || []).filter(a => isSafe(a) && (a.hasBackdrop || (a.backdrop && !a.backdrop.includes('placeholder'))));
    for (const a of trendingSafe) {
      if (list.length >= 6) break;
      const idStr = String(a.id);
      if (!seen.has(idStr)) {
        seen.add(idStr);
        list.push({ ...a, badgeLabel: 'Popular en Tendencia' });
      }
    }

    return list.slice(0, 6);
  }, [allTimeAnime, topAnime, favoriteAnimes, continueWatching, hiddenAnimes]);

  const displayFavorites = useMemo(() => {
    return (favoriteAnimes || [])
      .filter(a => a && (typeof a === 'object' ? a.id : a))
      .map(a => {
        if (typeof a === 'object') {
          return {
            ...a,
            id: String(a.id),
            title: a.title || `Anime #${a.id}`,
            image: a.image || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80'
          };
        }
        return {
          id: String(a),
          title: `Anime #${a}`,
          image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80'
        };
      });
  }, [favoriteAnimes]);

  const handleToggleFavorite = (anime) => {
    const animeId = typeof anime === 'object' ? anime.id : anime;
    const isFav = (favoriteAnimes || []).some(a => String(typeof a === 'object' ? a.id : a) === String(animeId));
    if (isFav) {
      setFavoriteAnimes((favoriteAnimes || []).filter(a => String(typeof a === 'object' ? a.id : a) !== String(animeId)));
    } else {
      const fullObj = typeof anime === 'object' ? {
        id: String(anime.id),
        title: anime.title || `Anime #${anime.id}`,
        image: anime.image || '',
        banner: anime.banner || anime.backdrop || '',
        backdrop: anime.backdrop || null,
        hasBackdrop: anime.hasBackdrop || false,
        score: anime.score || '9.0',
        description: anime.description || ''
      } : {
        id: String(animeId),
        title: `Anime #${animeId}`,
        image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80'
      };
      setFavoriteAnimes([fullObj, ...(favoriteAnimes || [])]);
    }
  };

  const handleHide = (anime) => {
    setHiddenAnimes([{
      id: anime.id,
      title: anime.title,
      image: anime.image
    }, ...(hiddenAnimes || [])]);
  };

  const handleRemoveContinue = (animeId) => {
    const target = (continueWatching || []).find(a => String(a.id) === String(animeId));
    const targetTitle = (target?.title || '').trim().toLowerCase();
    setContinueWatching((continueWatching || []).filter(a =>
      String(a.id) !== String(animeId) &&
      (!targetTitle || (a.title || '').trim().toLowerCase() !== targetTitle)
    ));
  };

  const uniqueContinueWatching = useMemo(() => {
    const seenIds = new Set();
    const seenTitles = new Set();
    const out = [];
    for (const a of (continueWatching || [])) {
      if (!a || typeof a !== 'object' || !a.id) continue;
      const idStr = String(a.id).trim();
      const titleNorm = (a.title || '').trim().toLowerCase();
      if (seenIds.has(idStr) || (titleNorm && seenTitles.has(titleNorm))) continue;
      seenIds.add(idStr);
      if (titleNorm) seenTitles.add(titleNorm);
      out.push(a);
    }
    return out;
  }, [continueWatching]);

  return (
    <div className={styles.homeContainer}>
      {/* Carrusel Hero Superior (Borde a borde con degradado cinematográfico) */}
      <HeroCarousel 
        animes={carouselAnimes}
        loading={loading}
        favoriteAnimes={favoriteAnimes}
        onToggleFavorite={handleToggleFavorite}
      />

      <div className={styles.homeContent}>
        {/* Continuar Viendo */}
      {uniqueContinueWatching.length > 0 && (
        <Carousel title="Continuar Viendo">
          {uniqueContinueWatching.map(anime => (
            <AnimeCard 
              key={`continue-${anime.id}`}
              anime={anime}
              isFavorite={(favoriteAnimes || []).some(fav => String(typeof fav === 'object' ? fav.id : fav) === String(anime.id))}
              onToggleFavorite={handleToggleFavorite}
              onRemoveContinue={handleRemoveContinue}
            />
          ))}
        </Carousel>
      )}

      {/* Carrusel de Favoritos (Solo aparece si hay favoritos) */}
      {displayFavorites.length > 0 && (
        <Carousel title="Tus Animes Favoritos">
          {displayFavorites.map(anime => (
            <AnimeCard 
              key={`fav-${anime.id}`}
              anime={anime}
              isFavorite={true}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </Carousel>
      )}

      {/* Carrusel con animes recomendados */}
      <Carousel title="Animes Recomendados (Top)">
        {loading && (!topAnime || topAnime.length === 0) ? (
          <SkeletonRow count={6} />
        ) : (
          (topAnime || [])
            .filter(a => !(hiddenAnimes || []).some(h => String(h.id) === String(a.id)))
            .slice(0, 10).map(anime => (
            <AnimeCard 
              key={`top-${anime.id}`}
              anime={anime}
              isFavorite={(favoriteAnimes || []).some(a => String(typeof a === 'object' ? a.id : a) === String(anime.id))}
              onToggleFavorite={handleToggleFavorite}
              onHide={handleHide}
            />
          ))
        )}
      </Carousel>

      {/* Animes Recomendados (De todos los animes existentes - Grid) */}
      <section className={styles.allTimeSection}>
        <h2 className={styles.gridTitle}>Animes Recomendados (Catálogo Global)</h2>
        {loading && (!allTimeAnime || allTimeAnime.length === 0) ? (
          <SkeletonGrid count={10} />
        ) : (
          <div className={styles.animeGrid}>
            {(allTimeAnime || [])
              .filter(a => !(hiddenAnimes || []).some(h => String(h.id) === String(a.id)))
              .map(anime => (
              <AnimeCard 
                key={`alltime-${anime.id}`}
                anime={anime}
                isFavorite={(favoriteAnimes || []).some(a => String(typeof a === 'object' ? a.id : a) === String(anime.id))}
                onToggleFavorite={handleToggleFavorite}
                onHide={handleHide}
              />
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
};

export default Home;

import React, { useEffect, useState, useMemo } from 'react';
import Carousel from '../../components/Carousel/Carousel';
import AnimeCard from '../../components/AnimeCard/AnimeCard';
import HeroCarousel from '../../components/HeroCarousel/HeroCarousel';
import { api, isEcchiOrNSFW } from '../../services/api';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import styles from './Home.module.css';

const Home = () => {
  const [topAnime, setTopAnime] = useState([]);
  const [allTimeAnime, setAllTimeAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Local storage para animes favoritos y ocultos
  const [favoriteAnimes, setFavoriteAnimes] = useLocalStorage('favoriteAnimes', []);
  const [hiddenAnimes, setHiddenAnimes] = useLocalStorage('hiddenAnimes', []);
  const [continueWatching, setContinueWatching] = useLocalStorage('continueWatching', []);

  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true);
      // Ejecutar secuencialmente con un pequeño retraso para evitar el error 429 (Too Many Requests) de Jikan
      const top = await api.getTopAnime();
      await new Promise(r => setTimeout(r, 400));
      
      const allTime = await api.getTrendingAnime();
      
      setTopAnime(Array.isArray(top) ? top : []);
      setAllTimeAnime(Array.isArray(allTime) ? allTime : []);
      setLoading(false);
    };

    document.title = "Inicio";
    fetchHomeData();
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

  const handleToggleFavorite = (anime) => {
    const isFav = (favoriteAnimes || []).some(a => a.id === anime.id);
    if (isFav) {
      setFavoriteAnimes((favoriteAnimes || []).filter(a => a.id !== anime.id));
    } else {
      setFavoriteAnimes([{
        id: anime.id,
        title: anime.title,
        image: anime.image,
        banner: anime.banner,
        backdrop: anime.backdrop,
        hasBackdrop: anime.hasBackdrop,
        score: anime.score,
        description: anime.description
      }, ...(favoriteAnimes || [])]);
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
    setContinueWatching((continueWatching || []).filter(a => a.id !== animeId));
  };

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
      {(continueWatching || []).length > 0 && (
        <Carousel title="Continuar Viendo">
          {(continueWatching || []).filter(a => typeof a === 'object' && a.id).map(anime => (
            <AnimeCard 
              key={`continue-${anime.id}`}
              anime={anime}
              isFavorite={favoriteAnimes.some(fav => fav.id === anime.id)}
              onToggleFavorite={handleToggleFavorite}
              onRemoveContinue={handleRemoveContinue}
            />
          ))}
        </Carousel>
      )}

      {/* Carrusel de Favoritos (Solo aparece si hay favoritos) */}
      {(favoriteAnimes || []).filter(a => a && typeof a === 'object' && a.id && a.title).length > 0 && (
        <Carousel title="Tus Animes Favoritos">
          {(favoriteAnimes || []).filter(a => a && typeof a === 'object' && a.id && a.title).map(anime => (
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
        {loading ? (
          <p className={styles.loadingText}>Cargando recomendaciones...</p>
        ) : (
          (topAnime || [])
            .filter(a => !(hiddenAnimes || []).some(h => h.id === a.id))
            .slice(0, 10).map(anime => (
            <AnimeCard 
              key={`top-${anime.id}`}
              anime={anime}
              isFavorite={(favoriteAnimes || []).some(a => a.id === anime.id)}
              onToggleFavorite={handleToggleFavorite}
              onHide={handleHide}
            />
          ))
        )}
      </Carousel>


      {/* Animes Recomendados (De todos los animes existentes - Grid) */}
      <section className={styles.allTimeSection}>
        <h2 className={styles.gridTitle}>Animes Recomendados (Catálogo Global)</h2>
        {loading ? (
          <p className={styles.loadingText}>Cargando catálogo...</p>
        ) : (
          <div className={styles.animeGrid}>
            {(allTimeAnime || [])
              .filter(a => !(hiddenAnimes || []).some(h => h.id === a.id))
              .map(anime => (
              <AnimeCard 
                key={`alltime-${anime.id}`}
                anime={anime}
                isFavorite={(favoriteAnimes || []).some(a => a.id === anime.id)}
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

import React, { useEffect, useState } from 'react';
import Carousel from '../../components/Carousel/Carousel';
import AnimeCard from '../../components/AnimeCard/AnimeCard';
import { api } from '../../services/api';
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
  const { user } = useAuth();

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

  // Ocultar menú contextual al hacer click en cualquier lado
  // Efecto eliminado

  const handleToggleFavorite = (anime) => {
    const isFav = favoriteAnimes.some(a => a.id === anime.id);
    if (isFav) {
      setFavoriteAnimes(favoriteAnimes.filter(a => a.id !== anime.id));
    } else {
      setFavoriteAnimes([{
        id: anime.id,
        title: anime.title,
        image: anime.image,
      }, ...favoriteAnimes]);
    }
  };

  const handleHide = (anime) => {
    setHiddenAnimes([{
      id: anime.id,
      title: anime.title,
      image: anime.image
    }, ...hiddenAnimes]);
  };

  const handleRemoveContinue = (animeId) => {
    setContinueWatching(continueWatching.filter(a => a.id !== animeId));
  };

  return (
    <div className={styles.homeContainer}>
      {/* Continuar Viendo */}
      {continueWatching && continueWatching.length > 0 && (
        <Carousel title="Continuar Viendo">
          {continueWatching.map(anime => (
            <AnimeCard 
              key={`continue-${anime.id}`}
              anime={anime}
              isFavorite={favoriteAnimes.some(a => a.id === anime.id)}
              onToggleFavorite={handleToggleFavorite}
              onHide={handleHide}
              onRemoveContinue={handleRemoveContinue}
            />
          ))}
        </Carousel>
      )}

      {/* Carrusel de Favoritos (Solo aparece si hay favoritos) */}
      {favoriteAnimes.length > 0 && (
        <Carousel title="Tus Animes Favoritos">
          {favoriteAnimes.map(anime => (
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
          topAnime
            .filter(a => !hiddenAnimes.some(h => h.id === a.id))
            .slice(0, 10).map(anime => (
            <AnimeCard 
              key={`top-${anime.id}`}
              anime={anime}
              isFavorite={favoriteAnimes.some(a => a.id === anime.id)}
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
            {allTimeAnime
              .filter(a => !hiddenAnimes.some(h => h.id === a.id))
              .map(anime => (
              <AnimeCard 
                key={`alltime-${anime.id}`}
                anime={anime}
                isFavorite={favoriteAnimes.some(a => a.id === anime.id)}
                onToggleFavorite={handleToggleFavorite}
                onHide={handleHide}
              />
            ))}
          </div>
        )}
      </section>

      {/* Menú Contextual (Custom) */}
    </div>
  );
};

export default Home;

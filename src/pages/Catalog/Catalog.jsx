import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import AnimeCard from '../../components/AnimeCard/AnimeCard';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import styles from './Catalog.module.css';

const ALL_GENRES = [
  'Animación', 'Action & Adventure', 'Sci-Fi & Fantasy', 'Comedia', 'Drama', 'Misterio'
];

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGenre = searchParams.get('genre') || 'Todos';

  const [catalog, setCatalog] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  
  const [favoriteAnimes, setFavoriteAnimes] = useLocalStorage('favoriteAnimes', []);
  const [hiddenAnimes, setHiddenAnimes] = useLocalStorage('hiddenAnimes', []);
  
  const loaderRef = useRef(null);

  // Reiniciar estado cuando cambia el género
  useEffect(() => {
    setCatalog([]);
    setPage(1);
    setHasMore(true);
    // El fetch real se hará por el efecto de `page` a continuación
  }, [selectedGenre]);

  // Fetch de datos
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      const data = await api.getDiscoverAnime(page, selectedGenre);
      
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setCatalog(prev => {
          // Filtrar duplicados por si acaso
          const newItems = data.filter(item => !prev.some(p => p.id === item.id));
          return [...prev, ...newItems];
        });
      }
      setLoading(false);
    };

    if (hasMore) {
      fetchCatalog();
    }
  }, [page, selectedGenre, hasMore]);

  // Intersection Observer para Infinite Scroll
  const handleObserver = useCallback((entries) => {
    const target = entries[0];
    if (target.isIntersecting && !loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: "200px", // Empezar a cargar un poco antes de llegar al final
      threshold: 0
    };
    const observer = new IntersectionObserver(handleObserver, option);
    if (loaderRef.current) observer.observe(loaderRef.current);
    
    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [handleObserver, loaderRef.current]);

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

  const setGenreFilter = (genre) => {
    if (genre === 'Todos') {
      searchParams.delete('genre');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ genre });
    }
  };

  const filteredCatalog = catalog.filter(a => !hiddenAnimes.some(h => h.id === a.id));

  return (
    <div className={styles.catalogContainer}>
      <h1 className={styles.title}>Catálogo de Anime</h1>

      <div className={styles.filtersContainer}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Filtrar por Género:</span>
          <button 
            className={`${styles.genreBtn} ${selectedGenre === 'Todos' ? styles.active : ''}`}
            onClick={() => setGenreFilter('Todos')}
          >
            Todos
          </button>
          {ALL_GENRES.map(genre => (
            <button 
              key={genre}
              className={`${styles.genreBtn} ${selectedGenre === genre ? styles.active : ''}`}
              onClick={() => setGenreFilter(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {filteredCatalog.map(anime => (
          <AnimeCard 
            key={`catalog-${anime.id}`}
            anime={anime}
            isFavorite={favoriteAnimes.some(a => a.id === anime.id)}
            onToggleFavorite={handleToggleFavorite}
            onHide={handleHide}
          />
        ))}
      </div>

      {loading && (
        <div className={styles.loading}>
          Cargando más animes...
        </div>
      )}
      
      {!loading && catalog.length === 0 && (
        <div className={styles.emptyState}>
          <h3>No se encontraron animes</h3>
          <p>Prueba seleccionando otro género.</p>
        </div>
      )}

      {/* Elemento invisible al final para disparar el scroll */}
      <div ref={loaderRef} style={{ height: '20px', margin: '20px 0' }}></div>
    </div>
  );
};

export default Catalog;

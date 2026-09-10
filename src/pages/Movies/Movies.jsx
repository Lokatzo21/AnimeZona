import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';
import styles from './Movies.module.css';

const Movies = () => {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [contentType, setContentType] = useState('movies');
  
  const loaderRef = useRef(null);

  useEffect(() => {
    document.title = contentType === 'movies' ? `Películas VIP` : `Series VIP`;
  }, [contentType]);

  useEffect(() => {
    // Reset state when type changes
    setMovies([]);
    setPage(1);
    setHasMore(true);
  }, [contentType]);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://zonaapis.arcando.cloud/list?type=${contentType}&page=${page}`);
        const data = await response.json();
        
        if (data.status === 'success' && data.items) {
          if (data.items.length === 0 || !data.hasNextPage) {
            setHasMore(false);
          }
          
          let allNewItems = data.items;
          
          setMovies(prev => {
            const fixUrl = (url) => url ? url.replace('arcando.cloud//', 'arcando.cloud/') : url;
            const newItems = allNewItems
              .filter(item => !prev.some(p => p.url === item.url))
              .map(item => ({
                ...item,
                image: fixUrl(item.image),
                extractUrl: fixUrl(item.extractUrl)
              }));
            return [...prev, ...newItems];
          });
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching items:", error);
        setHasMore(false);
      }
      setLoading(false);
    };

    if (hasMore) {
      fetchMovies();
    }
  }, [page, hasMore, contentType]);

  const handleObserver = useCallback((entries) => {
    const target = entries[0];
    if (target.isIntersecting && !loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: "200px",
      threshold: 0
    };
    const observer = new IntersectionObserver(handleObserver, option);
    if (loaderRef.current) observer.observe(loaderRef.current);
    
    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [handleObserver, loaderRef.current]);

  return (
    <div className={styles.moviesContainer}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{contentType === 'movies' ? 'Películas VIP' : 'Series VIP'}</h1>
          <p className={styles.subtitle}>Listado oficial de la API de ZonaLatam</p>
        </div>
        <div className={styles.typeToggle}>
          <button 
            className={`${styles.toggleBtn} ${contentType === 'movies' ? styles.active : ''}`}
            onClick={() => setContentType('movies')}
          >
            Películas
          </button>
          <button 
            className={`${styles.toggleBtn} ${contentType === 'tvshows' ? styles.active : ''}`}
            onClick={() => setContentType('tvshows')}
          >
            Series
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {movies.map((movie, idx) => {
          const encodedUrl = encodeURIComponent(movie.extractUrl);
          
          return (
            <div key={`${movie.url}-${idx}`} className={styles.movieCard}>
              <div className={styles.imageContainer}>
                <img src={movie.image} alt={movie.title} className={styles.image} loading="lazy" />
                <div className={styles.overlay}>
                  <Link 
                    to={`/movie-watch?url=${encodedUrl}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={styles.playButton}
                  >
                    <PlayCircle size={48} color="white" />
                  </Link>
                </div>
                {movie.quality && (
                  <span className={styles.qualityBadge}>{movie.quality}</span>
                )}
                {movie.rating && (
                  <span className={styles.ratingBadge}>⭐ {movie.rating}</span>
                )}
              </div>
              <div className={styles.info}>
                <h3 className={styles.movieTitle} title={movie.title}>{movie.title}</h3>
                <div className={styles.meta}>
                  <span className={styles.year}>{movie.year || ''}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className={styles.loading}>
          Cargando más contenido...
        </div>
      )}
      
      {!loading && movies.length === 0 && (
        <div className={styles.emptyState}>
          <h3>No se encontró contenido</h3>
        </div>
      )}

      <div ref={loaderRef} style={{ height: '20px', margin: '20px 0' }}></div>
    </div>
  );
};

export default Movies;

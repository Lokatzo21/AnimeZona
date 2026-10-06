import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { api } from '../../services/api';
import AnimeCard from '../../components/AnimeCard/AnimeCard';
import { SkeletonGrid } from '../../components/SkeletonCard/SkeletonCard';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import styles from './Catalog.module.css';

const ALL_GENRES = [
  'Animación', 'Action & Adventure', 'Sci-Fi & Fantasy', 'Comedia', 'Drama', 'Misterio'
];

const TYPE_OPTIONS = [
  { id: 'todos', label: '🔥 Todo', titleSuffix: 'Catálogo Completo' },
  { id: 'animes', label: '🎌 Animes', titleSuffix: 'Catálogo de Anime' },
  { id: 'peliculas', label: '🎬 Películas y Sagas', titleSuffix: 'Películas y Sagas' },
  { id: 'series', label: '📺 Series', titleSuffix: 'Catálogo de Series' }
];

let catalogCache = {};

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedType = searchParams.get('type') || 'todos';
  const selectedGenre = searchParams.get('genre') || 'Todos';
  const cacheKey = `${selectedType}_${selectedGenre}`;

  const [catalog, setCatalog] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Búsqueda dentro del Catálogo
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [favoriteAnimes, setFavoriteAnimes] = useLocalStorage('favoriteAnimes', []);
  const [hiddenAnimes, setHiddenAnimes] = useLocalStorage('hiddenAnimes', []);
  
  const loaderRef = useRef(null);

  const currentTypeObj = TYPE_OPTIONS.find(t => t.id === selectedType) || TYPE_OPTIONS[0];
  const pageTitle = selectedGenre !== 'Todos' 
    ? `${currentTypeObj.titleSuffix} - ${selectedGenre}`
    : currentTypeObj.titleSuffix;

  // Debounce para la búsqueda del catálogo (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Ejecutar búsqueda en el catálogo cuando cambia debouncedQuery, tipo o género
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    const executeCatalogSearch = async () => {
      setIsSearching(true);
      const results = await api.searchCatalog(debouncedQuery, selectedType, selectedGenre);
      if (!isCancelled) {
        setSearchResults(results);
        setIsSearching(false);
      }
    };
    executeCatalogSearch();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, selectedType, selectedGenre]);

  // Reiniciar estado o cargar de caché cuando cambia el tipo o género
  useEffect(() => {
    const cached = catalogCache[cacheKey];
    if (cached) {
      setCatalog(cached.catalog);
      setPage(cached.page);
      setHasMore(cached.hasMore);
      setIsRestoring(true);
      
      setTimeout(() => {
        window.scrollTo(0, cached.scrollY);
      }, 50);
    } else {
      setCatalog([]);
      setPage(1);
      setHasMore(true);
      setIsRestoring(false);
    }
    
    document.title = pageTitle;
  }, [cacheKey, pageTitle]);

  // Actualizar caché cuando los datos cambian
  useEffect(() => {
    if (catalog.length > 0) {
      catalogCache[cacheKey] = {
        catalog,
        page,
        hasMore,
        scrollY: catalogCache[cacheKey]?.scrollY || window.scrollY
      };
    }
  }, [catalog, page, hasMore, cacheKey]);

  // Guardar scroll position en el caché en tiempo real
  useEffect(() => {
    const handleScroll = () => {
      if (catalogCache[cacheKey]) {
        catalogCache[cacheKey].scrollY = window.scrollY;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [cacheKey]);

  // Fetch de datos
  useEffect(() => {
    if (isRestoring) {
      setIsRestoring(false);
      return;
    }

    const fetchCatalog = async () => {
      setLoading(true);
      const data = await api.getDiscoverAnime(page, selectedGenre, selectedType);
      
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setCatalog(prev => {
          const newItems = data.filter(item => !prev.some(p => p.id === item.id));
          return [...prev, ...newItems];
        });
      }
      setLoading(false);
    };

    if (hasMore) {
      fetchCatalog();
    }
  }, [page, selectedGenre, selectedType, hasMore]);

  // Intersection Observer para Infinite Scroll
  const handleObserver = useCallback((entries) => {
    const target = entries[0];
    if (target.isIntersecting && !loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const isSearchActive = Boolean(debouncedQuery.trim());

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: "200px",
      threshold: 0
    };
    const observer = new IntersectionObserver(handleObserver, option);
    if (loaderRef.current && !isSearchActive) observer.observe(loaderRef.current);
    
    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [handleObserver, loaderRef.current, isSearchActive]);

  const handleToggleFavorite = (anime) => {
    const isFav = favoriteAnimes.some(a => String(typeof a === 'object' ? a.id : a) === String(anime.id));
    if (isFav) {
      setFavoriteAnimes(favoriteAnimes.filter(a => String(typeof a === 'object' ? a.id : a) !== String(anime.id)));
    } else {
      setFavoriteAnimes([{
        id: String(anime.id),
        title: anime.title,
        image: anime.image,
        banner: anime.banner || anime.backdrop || '',
        score: anime.score || '9.0',
        type: anime.type || 'Anime',
        description: anime.description || ''
      }, ...favoriteAnimes.filter(a => String(typeof a === 'object' ? a.id : a) !== String(anime.id))]);
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
    const newParams = new URLSearchParams(searchParams);
    if (genre === 'Todos') {
      newParams.delete('genre');
    } else {
      newParams.set('genre', genre);
    }
    setSearchParams(newParams);
  };

  const setTypeFilter = (type) => {
    const newParams = new URLSearchParams(searchParams);
    if (type === 'todos') {
      newParams.delete('type');
    } else {
      newParams.set('type', type);
    }
    setSearchParams(newParams);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const activeList = isSearchActive ? searchResults : catalog;
  const filteredCatalog = activeList.filter(a => !hiddenAnimes.some(h => String(h.id) === String(a.id)));

  return (
    <div className={styles.catalogContainer}>
      <h1 className={styles.title}>{pageTitle}</h1>

      <div className={styles.filtersContainer}>
        {/* Barra de Búsqueda Dedicada del Catálogo */}
        <div className={styles.catalogSearchWrapper}>
          <Search className={styles.catalogSearchIcon} size={18} />
          <input
            type="text"
            className={styles.catalogSearchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              selectedType === 'peliculas'
                ? 'Buscar películas y sagas (ej: Deadpool, Harry Potter, Arma Mortal)...'
                : selectedType === 'series'
                ? 'Buscar series en el catálogo...'
                : selectedType === 'animes'
                ? 'Buscar animes en el catálogo...'
                : 'Buscar películas, series y animes en el catálogo...'
            }
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.catalogSearchClear}
              onClick={handleClearSearch}
              title="Borrar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {isSearchActive && (
          <div className={styles.searchResultsNotice}>
            <span>
              Resultados para: <strong>"{debouncedQuery}"</strong> en {currentTypeObj.label}
            </span>
            <span className={styles.searchResultsCount}>
              {isSearching ? 'Buscando...' : `${filteredCatalog.length} encontrados`}
            </span>
          </div>
        )}

        {/* Pestañas de Tipo de Contenido */}
        <div className={styles.typeTabs}>
          {TYPE_OPTIONS.map(t => (
            <button
              key={t.id}
              className={`${styles.typeTab} ${selectedType === t.id ? styles.activeType : ''}`}
              onClick={() => setTypeFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtro por Género */}
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

      {(loading || isSearching) && filteredCatalog.length === 0 ? (
        <SkeletonGrid count={12} />
      ) : (
        <div className={styles.grid}>
          {filteredCatalog.map(anime => (
            <AnimeCard 
              key={`catalog-${anime.id}`}
              anime={anime}
              isFavorite={favoriteAnimes.some(a => String(typeof a === 'object' ? a.id : a) === String(anime.id))}
              onToggleFavorite={handleToggleFavorite}
              onHide={handleHide}
            />
          ))}
        </div>
      )}

      {loading && !isSearchActive && catalog.length > 0 && (
        <div className={styles.loading}>
          Cargando más animes...
        </div>
      )}
      
      {!loading && !isSearching && filteredCatalog.length === 0 && (
        <div className={styles.emptyState}>
          <h3>{isSearchActive ? 'No se encontraron resultados' : 'No se encontraron animes'}</h3>
          <p>
            {isSearchActive
              ? `No encontramos "${debouncedQuery}" en ${currentTypeObj.label}. Prueba buscando en "🔥 Todo" o con otro término.`
              : 'Prueba seleccionando otro género o categoría.'}
          </p>
        </div>
      )}

      {/* Elemento invisible al final para disparar el scroll (solo cuando no hay búsqueda activa) */}
      {!isSearchActive && <div ref={loaderRef} style={{ height: '20px', margin: '20px 0' }}></div>}
    </div>
  );
};

export default Catalog;

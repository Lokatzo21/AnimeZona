import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Play, Eye, Heart, Check } from 'lucide-react';
import { api } from '../../services/api';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AnimeDetails.module.css';

const AnimeDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const passedAnime = location.state?.anime;

  const [animeInfo, setAnimeInfo] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [activeSeason, setActiveSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sagaInfo, setSagaInfo] = useState(null);
  const [favoriteAnimes, setFavoriteAnimes] = useLocalStorage('favoriteAnimes', []);
  const [secretLikes, setSecretLikes] = useLocalStorage('secretLikes', []);
  const [watchedEpisodes, setWatchedEpisodes] = useLocalStorage('watchedEpisodes', []);
  const [continueWatching, setContinueWatching] = useLocalStorage('continueWatching', []);
  const [watchedAnimes, setWatchedAnimes] = useLocalStorage('watchedAnimes', []);
  const [customLists, setCustomLists] = useLocalStorage('customLists', []);
  const [scrapingStatus, setScrapingStatus] = useState(null);
  const navigate = useNavigate();
  const { showToast, showConfirm } = useUI();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showListModal, setShowListModal] = useState(false);

  useEffect(() => {
    if (user?.email) {
      api.isAdmin(user.email).then(setIsAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [user]);
  
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);

  const fetchScrapingStatus = async (tmdbId) => {
    const status = await api.getScrapingStatus(tmdbId);
    setScrapingStatus(status);
  };

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      const typeHint = (passedAnime?.type === 'Película' || passedAnime?.contentType === 'peliculas' || passedAnime?.isMovie) ? 'movie' : null;
      const info = await api.getAnimeInfo(id, typeHint);
      await new Promise(r => setTimeout(r, 200));
      const eps = await api.getAnimeEpisodes(id, info?.totalEpisodes);
      const sInfo = await api.getSagaInfo(info?.id || id, info?.title);
      
      setAnimeInfo(info);
      setEpisodes(eps);
      setSagaInfo(sInfo);
      setLoading(false);
      
      if (eps && eps.length > 0) {
        const seasons = [...new Set(eps.map(ep => ep.season || ep.season_number || 1))].sort((a, b) => a - b);
        if (seasons.length > 0) {
          setActiveSeason(seasons[0]);
        }
      }
      
      if (info) {
        fetchScrapingStatus(info.id);
        const interval = setInterval(() => fetchScrapingStatus(info.id), 5000);
        return () => clearInterval(interval);
      }
    };
    fetchInfo();
  }, [id]);

  React.useEffect(() => {
    if (animeInfo) {
      document.title = `Anime - ${animeInfo.title}`;
    } else {
      document.title = `Detalles del Anime`;
    }
  }, [animeInfo]);

  const handleClearWatched = () => {
    // Filtrar para quitar todos los de este anime
    const newWatched = watchedEpisodes.filter(id => !id.startsWith(`${animeInfo.id}-`));
    setWatchedEpisodes(newWatched);
    
    // También limpiamos el anime de "Continuar viendo" y "Animes vistos"
    setContinueWatching(continueWatching.filter(a => String(a.id) !== String(animeInfo.id)));
    setWatchedAnimes(watchedAnimes.filter(a => String(a.id) !== String(animeInfo.id)));
  };

  if (loading) {
    return <div className={styles.loading}>Cargando información del anime...</div>;
  }

  if (!animeInfo) {
    return <div className={styles.loading}>Error al cargar el anime.</div>;
  }

  const isFavorite = favoriteAnimes.some(a => String(a?.id || a) === String(animeInfo.id));

  const startPress = (e) => {
    if (e.button && e.button !== 0) return; // Ignore right clicks
    isLongPress.current = false;
    const duration = isFavorite ? 5000 : 3000;
    
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      const isSecret = secretLikes.some(a => String(a?.id || a) === String(animeInfo.id));
      if (!isSecret) {
        setSecretLikes(prev => [{ id: String(animeInfo.id), title: animeInfo.title, image: animeInfo.image }, ...prev]);
        showToast("Listo :)");
      } else {
        showToast("Ya está en tus secretos");
      }
    }, duration);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleToggleFavorite = (e) => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    if (isFavorite) {
      showConfirm("¿Estás seguro que deseas quitar este anime de tus favoritos?", () => {
        setFavoriteAnimes(favoriteAnimes.filter(a => String(a?.id || a) !== String(animeInfo.id)));
      });
    } else {
      setFavoriteAnimes([{
        id: String(animeInfo.id),
        title: animeInfo.title,
        image: animeInfo.image,
        banner: animeInfo.banner || animeInfo.backdrop || '',
        score: animeInfo.score || '9.0',
        description: animeInfo.description || '',
        type: animeInfo.type || 'Anime'
      }, ...favoriteAnimes.filter(a => String(a?.id || a) !== String(animeInfo.id))]);
    }
  };

  const handleToggleEpisodeWatched = (e, epId) => {
    e.preventDefault(); // Evitar que navegue al episodio
    e.stopPropagation();
    const globalEpId = `${animeInfo.id}-${epId}`;
    
    if (watchedEpisodes.includes(globalEpId)) {
      setWatchedEpisodes(prev => {
        const currentList = prev || [];
        return currentList.filter(id => id !== globalEpId);
      });
      
      // Si ya no queda NINGÚN episodio visto de este anime, lo quitamos de "Continuar Viendo"
      setWatchedEpisodes(prevWatched => {
        const hasWatchedAny = prevWatched.some(id => id.startsWith(`${animeInfo.id}-`));
        if (!hasWatchedAny) {
          setContinueWatching(prev => (prev || []).filter(a => String(a.id) !== String(animeInfo.id)));
          setWatchedAnimes(prev => (prev || []).filter(a => String(a.id) !== String(animeInfo.id)));
        }
        return prevWatched; // don't change it here, just read it
      });

    } else {
      setWatchedEpisodes(prev => [globalEpId, ...(prev || [])]);
      
      // Añadir a Continuar Viendo
      setContinueWatching(prev => {
        const currentList = prev || [];
        const epObj = episodes.find(e => String(e.id) === String(epId));
        const sNum = epObj?.season || epObj?.season_number || activeSeason || 1;
        const animeData = {
          id: animeInfo.id,
          title: animeInfo.title,
          image: animeInfo.image,
          episodeNumber: epId,
          episodeId: epId,
          episode: epId,
          season: sNum,
          seasonNum: sNum,
          seasonNumber: sNum,
          timestamp: 0,
          time: 0
        };
        const normTitle = (animeInfo.title || '').trim().toLowerCase();
        const filtered = currentList.filter(a =>
          String(a.id) !== String(animeInfo.id) &&
          (!normTitle || (a.title || '').trim().toLowerCase() !== normTitle)
        );
        return [animeData, ...filtered].slice(0, 20);
      });

      // Añadir a Historial
      setWatchedAnimes(prev => {
        const currentList = prev || [];
        const normTitle = (animeInfo.title || '').trim().toLowerCase();
        const filtered = currentList.filter(a =>
          String(a.id) !== String(animeInfo.id) &&
          (!normTitle || (a.title || '').trim().toLowerCase() !== normTitle)
        );
        return [{
          id: animeInfo.id,
          title: animeInfo.title,
          image: animeInfo.image,
          status: animeInfo.status
        }, ...filtered];
      });
    }
  };

  return (
    <div className={styles.detailsContainer}>
      {/* Cabecera / Portada / Info */}
      <div className={styles.header}>
        <div className={styles.coverWrapper}>
          <img src={animeInfo.image} alt={animeInfo.title} className={styles.coverImage} />
        </div>
        
        <div className={styles.info}>
          <h1 className={styles.title}>{animeInfo.title}</h1>
          
          <div className={styles.meta}>
            <span className={styles.status}>{animeInfo.status}</span>
            <button 
              className={`${styles.favoriteToggle} ${isFavorite ? styles.isFavorite : ''}`}
              onPointerDown={startPress}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onPointerCancel={cancelPress}
              onClick={handleToggleFavorite}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
              title="Añadir a favoritos"
            >
              <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
              {isFavorite ? 'En Favoritos' : 'Añadir a Favoritos'}
            </button>

            <button
              className={styles.favoriteToggle}
              style={{ background: '#334155', color: '#f8fafc', marginLeft: '10px' }}
              onClick={() => {
                if (!customLists || customLists.length === 0) {
                  showToast('No tienes listas. Créalas en tu Perfil > Mis Listas.');
                  return;
                }
                setShowListModal(true);
              }}
            >
              {(customLists || []).some(l => l.animes && l.animes.some(a => a.id === animeInfo.id))
                ? '✓ En Lista'
                : '+ Añadir a Lista'}
            </button>

            {/* Scraping Button/Status (Only Admin) */}
            {isAdmin && (
              !scrapingStatus || scrapingStatus.status === 'error' ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    onClick={() => navigate('/admin', { state: { scraperTitle: animeInfo.title, scraperTmdb: animeInfo.id } })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
                      backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.5rem', 
                      border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem'
                    }}
                  >
                    {scrapingStatus?.status === 'error' ? 'Reintentar Scrapeo' : 'Scrapear'}
                  </button>
                  {scrapingStatus?.status === 'error' && (
                    <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>Falló último intento</span>
                  )}
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
                  backgroundColor: scrapingStatus.status === 'processing' ? '#eab308' : '#22c55e', 
                  color: 'white', borderRadius: '0.5rem', fontWeight: 500, fontSize: '0.875rem'
                }}>
                  {scrapingStatus.status === 'pending' && 'En Cola de Extracción'}
                  {scrapingStatus.status === 'processing' && 'Extrayendo Episodios...'}
                  {scrapingStatus.status === 'completed' && 'Episodios Extraídos'}
                </div>
              )
            )}
          </div>

          <div className={styles.tags}>
            {animeInfo.genres?.map(genre => (
              <span 
                key={genre} 
                className={styles.tag} 
                onClick={() => navigate(`/catalog?genre=${encodeURIComponent(genre)}`)}
                style={{ cursor: 'pointer' }}
                title={`Ver catálogo de ${genre}`}
              >
                {genre}
              </span>
            ))}
          </div>

          <p className={styles.synopsis}>{animeInfo.description}</p>
        </div>
      </div>

      {/* Banner de Saga / Colección Vinculada (si es una película dentro de una saga) */}
      {sagaInfo && !sagaInfo.isParentCollection && (
        <div className={styles.sagaBanner}>
          <div className={styles.sagaHeader}>
            <div className={styles.sagaHeaderLeft}>
              <span className={styles.sagaBadge}>🎬 Saga / Colección</span>
              <h3 className={styles.sagaTitle}>{sagaInfo.sagaTitle}</h3>
              <p className={styles.sagaSubtitle}>
                Esta película forma parte de la saga ({sagaInfo.totalMovies} películas disponibles).
              </p>
            </div>
            {sagaInfo.collectionId && (
              <Link to={`/anime/${sagaInfo.collectionId}`} className={styles.sagaViewAllBtn}>
                Ver Colección Completa
              </Link>
            )}
          </div>

          <div className={styles.sagaMoviesRow}>
            {sagaInfo.movies.map((m) => {
              const isCurrent = String(m.tmdb_id) === String(animeInfo.id) ||
                (m.title && animeInfo.title && m.title.toLowerCase().includes(animeInfo.title.toLowerCase()));

              return (
                <Link
                  key={m.episode_number}
                  to={m.tmdb_id ? `/anime/${m.tmdb_id}` : (sagaInfo.collectionId ? `/anime/${sagaInfo.collectionId}` : '#')}
                  className={`${styles.sagaMovieChip} ${isCurrent ? styles.sagaMovieCurrent : ''}`}
                  title={m.title}
                >
                  <span className={styles.sagaMovieNum}>Entrega #{m.episode_number}</span>
                  <span className={styles.sagaMovieName}>{m.title}</span>
                  {isCurrent && <span className={styles.currentBadge}>Viendo</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}


      {/* Lista de Episodios o Reproductor de Película */}
      {(() => {
        const isMovie = Boolean(
          (animeInfo?.type === 'Película' ||
           animeInfo?.contentType === 'peliculas' ||
           animeInfo?.isMovie ||
           Number(animeInfo?.totalEpisodes) === 1) &&
          !sagaInfo?.isParentCollection &&
          !animeInfo?.isCollection &&
          animeInfo?.type !== 'Serie' &&
          animeInfo?.type !== 'Anime' &&
          episodes.length <= 1
        );

        if (isMovie) {
          return (
            <div className={styles.episodesSection}>
              <h2 className={styles.sectionTitle} style={{ marginBottom: '1.25rem' }}>Película</h2>
              <div className={styles.moviePlayerCard}>
                <div className={styles.movieCardLeft}>
                  <div className={styles.movieIconWrapper}>
                    <Play size={26} className={styles.moviePlayIcon} />
                  </div>
                  <div className={styles.movieTextInfo}>
                    <h3 className={styles.movieCardTitle}>
                      {episodes[0]?.title && !episodes[0].title.startsWith('Episodio 1')
                        ? episodes[0].title
                        : animeInfo.title}
                    </h3>
                    <span className={styles.movieCardSubtitle}>
                      Película Completa • {animeInfo.status || 'Disponible'}
                    </span>
                  </div>
                </div>
                <Link
                  to={`/watch/${animeInfo.id}/${episodes[0]?.id || 1}`}
                  className={styles.moviePlayBtn}
                >
                  <Play size={18} />
                  <span>Ver Película</span>
                </Link>
              </div>
            </div>
          );
        }

        return (
          <div className={styles.episodesSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                {sagaInfo?.isParentCollection && (animeInfo?.type === 'Película' || animeInfo?.isCollection)
                  ? `Películas de la Colección (${episodes.length})` 
                  : `Episodios (${episodes.length})`}
              </h2>
              
              {/* Botón para limpiar vistos */}
              {episodes.some(ep => watchedEpisodes.includes(`${animeInfo.id}-${ep.id}`)) && (
                <button 
                  onClick={handleClearWatched}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(30, 41, 59, 0.8)', color: '#cbd5e1', fontSize: '0.875rem', fontWeight: 500, borderRadius: '0.5rem', border: '1px solid #334155', cursor: 'pointer' }}
                  title="Marcar todos como no vistos"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Limpiar vistos
                </button>
              )}
            </div>

            {/* Season Tabs */}
            {(() => {
              const seasons = [...new Set(episodes.map(ep => ep.season || ep.season_number || 1))].sort((a, b) => a - b);
              if (seasons.length > 1) {
                return (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {seasons.map(season => (
                      <button
                        key={season}
                        onClick={() => setActiveSeason(season)}
                        style={{
                          padding: '0.5rem 1.5rem',
                          borderRadius: '8px',
                          background: activeSeason === season ? 'var(--primary-color)' : 'rgba(30, 41, 59, 0.5)',
                          color: 'white',
                          fontWeight: activeSeason === season ? 'bold' : 'normal',
                          border: '1px solid',
                          borderColor: activeSeason === season ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Temporada {season}
                      </button>
                    ))}
                  </div>
                );
              }
              return null;
            })()}

            <div className={styles.episodesGrid}>
              {episodes
                .filter(ep => (ep.season || ep.season_number || 1) === activeSeason)
                .map((ep, index) => {
                const globalEpId = `${animeInfo.id}-${ep.id}`;
                const isEpWatched = watchedEpisodes.includes(globalEpId);
                
                let cleanTitle = ep.title || '';
                cleanTitle = cleanTitle.replace(/^T\d+E\d+\s*-\s*/i, '');
                const displayTitle = sagaInfo?.isParentCollection
                  ? cleanTitle
                  : `T${activeSeason}E${index + 1} - ${cleanTitle}`;
                
                return (
                  <Link 
                    to={`/watch/${animeInfo.id}/${ep.id}`} 
                    key={ep.id}
                    className={`glass-panel ${styles.episodeCard} ${isEpWatched ? styles.episodeWatched : ''}`}
                    title={displayTitle}
                  >
                    <div className={styles.epInfo}>
                      <div className={styles.epNumber}>{displayTitle}</div>
                      {isEpWatched && (
                        <span className={styles.watchedText}>
                          <Check size={14} />
                          Visto
                        </span>
                      )}
                    </div>
                    
                    <div className={styles.playOverlay}>
                      <Play size={24} />
                    </div>

                    <button 
                      className={`${styles.epWatchBtn} ${isEpWatched ? styles.isWatchedBtn : ''}`}
                      onClick={(e) => handleToggleEpisodeWatched(e, ep.id)}
                      title={isEpWatched ? "Marcar como no visto" : "Marcar como visto"}
                    >
                      <Eye size={20} />
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Modal de Listas */}
      {showListModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }} onClick={() => setShowListModal(false)}>
          <div style={{ background: '#0f172a', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '15px' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.4rem' }}>Guardar en Lista</h3>
              <button onClick={() => setShowListModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
              {(customLists || []).map(list => {
                const isAdded = list.animes && list.animes.some(a => a.id === animeInfo.id);
                return (
                  <button
                    key={list.id}
                    onClick={() => {
                      const updated = (customLists || []).map(l => {
                        if (l.id !== list.id) return l;
                        const animes = l.animes || [];
                        if (!isAdded) {
                          return { ...l, animes: [...animes, { id: animeInfo.id, title: animeInfo.title, image: animeInfo.image }] };
                        } else {
                          return { ...l, animes: animes.filter(a => a.id !== animeInfo.id) };
                        }
                      });
                      setCustomLists(updated);
                      setShowListModal(false);
                      showToast(isAdded ? 'Removido de ' + list.name : 'Guardado en ' + list.name);
                    }}
                    style={{ padding: '16px', background: isAdded ? 'rgba(16, 185, 129, 0.1)' : '#1e293b', border: isAdded ? '1px solid #10b981' : '1px solid #334155', borderRadius: '12px', color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '1.1rem', transition: 'all 0.2s ease' }}
                    onMouseOver={(e) => !isAdded && (e.currentTarget.style.background = '#334155')}
                    onMouseOut={(e) => !isAdded && (e.currentTarget.style.background = '#1e293b')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: isAdded ? '600' : '400', color: isAdded ? '#10b981' : '#f8fafc' }}>{list.name}</span>
                      {isAdded && <span style={{ fontSize: '0.9rem', background: '#10b981', color: '#000', padding: '2px 10px', borderRadius: '12px', fontWeight: 'bold' }}>✓ Guardado</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimeDetails;

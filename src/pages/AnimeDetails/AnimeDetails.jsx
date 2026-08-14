import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Eye, Heart, Check } from 'lucide-react';
import { api } from '../../services/api';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useUI } from '../../contexts/UIContext';
import styles from './AnimeDetails.module.css';

const AnimeDetails = () => {
  const { id } = useParams();
  const [animeInfo, setAnimeInfo] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [favoriteAnimes = [], setFavoriteAnimes] = useLocalStorage('favoriteAnimes', []);
  const [secretLikes = [], setSecretLikes] = useLocalStorage('secretLikes', []);
  const [watchedEpisodes = [], setWatchedEpisodes] = useLocalStorage('watchedEpisodes', []);
  const [continueWatching = [], setContinueWatching] = useLocalStorage('continueWatching', []);
  const [watchedAnimes = [], setWatchedAnimes] = useLocalStorage('watchedAnimes', []);
  const navigate = useNavigate();
  const { showToast, showConfirm } = useUI();
  
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      setError(false);
      try {
        // Hard timeout: si tarda más de 15s, terminamos con error
        const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
        
        const info = await Promise.race([
          api.getAnimeInfo(id),
          timeout(12000)
        ]).catch(() => null);

        const eps = await Promise.race([
          api.getAnimeEpisodes(id, info),
          timeout(15000)
        ]).catch(() => []);
        
        setAnimeInfo(info);
        setEpisodes(Array.isArray(eps) ? eps : []);
        if (!info) setError(true);
      } catch (e) {
        console.error('fetchInfo failed:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [id]);

  const handleClearWatched = () => {
    // Filtrar para quitar todos los de este anime
    const newWatched = (watchedEpisodes || []).filter(id => !id.startsWith(`${animeInfo.id}-`));
    setWatchedEpisodes(newWatched);
    
    // También limpiamos el anime de "Continuar viendo" y "Animes vistos"
    setContinueWatching((continueWatching || []).filter(a => String(a.id) !== String(animeInfo.id)));
    setWatchedAnimes((watchedAnimes || []).filter(a => String(a.id) !== String(animeInfo.id)));
  };

  if (loading) {
    return <div className={styles.loading}>Cargando información del anime...</div>;
  }

  if (error || !animeInfo) {
    return (
      <div className={styles.loading} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <p>No se pudo cargar este anime.</p>
        <button 
          onClick={() => window.location.reload()}
          style={{ padding: '0.5rem 1.5rem', background: '#e11d48', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const isFavorite = (favoriteAnimes || []).some(a => a.id === animeInfo.id);

  const startPress = (e) => {
    if (e.button && e.button !== 0) return; // Ignore right clicks
    isLongPress.current = false;
    const duration = isFavorite ? 5000 : 3000;
    
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      const isSecret = (secretLikes || []).some(a => a.id === animeInfo.id);
      if (!isSecret) {
        setSecretLikes(prev => [{ id: animeInfo.id, title: animeInfo.title, image: animeInfo.image }, ...(prev || [])]);
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
        setFavoriteAnimes((favoriteAnimes || []).filter(a => a.id !== animeInfo.id));
      });
    } else {
      setFavoriteAnimes([{
        id: animeInfo.id,
        title: animeInfo.title,
        image: animeInfo.image,
      }, ...(favoriteAnimes || [])]);
    }
  };

  useEffect(() => {
    if (animeInfo) {
      document.title = `${animeInfo.title} | Anime`;
    } else {
      document.title = 'Detalles | Anime';
    }
  }, [animeInfo]);

  const handleToggleEpisodeWatched = (e, epId) => {
    e.preventDefault(); // Evitar que navegue al episodio
    e.stopPropagation();
    const globalEpId = `${animeInfo.id}-${epId}`;
    
    if ((watchedEpisodes || []).includes(globalEpId)) {
      const newWatched = (watchedEpisodes || []).filter(id => id !== globalEpId);
      setWatchedEpisodes(newWatched);
      
      // Si ya no queda NINGÚN episodio visto de este anime, lo quitamos de "Continuar Viendo"
      const hasWatchedAny = newWatched.some(id => id.startsWith(`${animeInfo.id}-`));
      if (!hasWatchedAny) {
        setContinueWatching((continueWatching || []).filter(a => String(a.id) !== String(animeInfo.id)));
        setWatchedAnimes((watchedAnimes || []).filter(a => String(a.id) !== String(animeInfo.id)));
      }
    } else {
      setWatchedEpisodes([globalEpId, ...(watchedEpisodes || [])]);
      
      // Añadir a Continuar Viendo y Animes Vistos
      const animeData = {
        id: animeInfo.id,
        title: animeInfo.title,
        image: animeInfo.image,
        episodeNumber: epId,
        episodeId: epId
      };
      
      setContinueWatching((continueWatching || []).filter(item => String(item.id) !== String(animeInfo.id))); // Quitar el viejo para ponerlo arriba
      setContinueWatching(prev => {
        const filtered = (prev || []).filter(item => String(item.id) !== String(animeInfo.id));
        return [animeData, ...filtered].slice(0, 20);
      });

      setWatchedAnimes(prev => {
        const currentList = prev || [];
        if (!currentList.some(a => String(a.id) === String(animeInfo.id))) {
          return [{
            id: animeInfo.id,
            title: animeInfo.title,
            image: animeInfo.image,
            status: animeInfo.status
          }, ...currentList];
        }
        return currentList;
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

      {/* Lista de Episodios */}
      <div className={styles.episodesSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Episodios ({(episodes || []).length})</h2>
          
          {/* Botón para limpiar vistos */}
          {(episodes || []).some(ep => (watchedEpisodes || []).includes(`${animeInfo.id}-${ep.id}`)) && (
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
        <div className={styles.episodesGrid}>
          {(episodes || []).map(ep => {
            const globalEpId = `${animeInfo.id}-${ep.id}`;
            const isEpWatched = (watchedEpisodes || []).includes(globalEpId);
            
            return (
              <Link 
                to={`/watch/${animeInfo.id}/${ep.id}`} 
                key={ep.id}
                className={`glass-panel ${styles.episodeCard} ${isEpWatched ? styles.episodeWatched : ''}`}
                title={ep.title}
              >
                <div className={styles.epInfo}>
                  <div className={styles.epNumber}>{ep.title}</div>
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
    </div>
  );
};

export default AnimeDetails;

import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Play, X } from 'lucide-react';
import styles from './AnimeCard.module.css';
import { useUI } from '../../contexts/UIContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const AnimeCard = ({ anime, isFavorite, isWatched, onToggleFavorite, onToggleWatch, onContextMenu, onHide, onRestore, onRemoveContinue }) => {
  const navigate = useNavigate();
  const { showToast, showConfirm } = useUI();
  const [secretLikes, setSecretLikes] = useLocalStorage('secretLikes', []);
  const [videoProgress] = useLocalStorage('videoProgress', {});
  const [confirmHide, setConfirmHide] = useState(false);
  
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);

  if (!anime || typeof anime !== 'object' || !anime.id) return null;

  const handleContextMenu = (e) => {
    if (onContextMenu) {
      e.preventDefault();
      onContextMenu(e, anime);
    }
  };

  const targetEp = anime.episodeNumber || anime.episode || anime.episodeNum || (anime.episodeId ? String(anime.episodeId) : null);
  const linkTo = targetEp ? `/watch/${anime.id}/${targetEp}` : `/anime/${anime.id}`;
  const season = anime.season || anime.seasonNum || anime.seasonNumber || 1;
  const isContinueWatching = Boolean(onRemoveContinue || targetEp);

  // Extraer progreso de tiempo en segundos (de las propiedades del anime o del mapa videoProgress)
  let rawTime = Number(anime.time ?? anime.timestamp ?? anime.progress ?? 0);
  if ((!rawTime || rawTime <= 0) && targetEp && anime.id) {
    const key = `${anime.id}-${targetEp}`;
    if (videoProgress && videoProgress[key]) {
      rawTime = Number(videoProgress[key]);
    }
  }

  const formatTimeDetailed = (seconds) => {
    const s = Number(seconds);
    if (isNaN(s) || s <= 0) return '';
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    }
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const formattedTime = formatTimeDetailed(rawTime);
  const progressPercent = rawTime > 0 ? Math.min(100, Math.max(3, (rawTime / (anime.duration || 1440)) * 100)) : 0;

  const handleTagClick = (e, genre) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/catalog?genre=${encodeURIComponent(genre)}`);
  };

  const handleMouseLeave = () => {
    if (confirmHide) setConfirmHide(false);
    cancelPress();
  };

  const startPress = (e) => {
    if (e.button && e.button !== 0) return; // Ignore right clicks
    isLongPress.current = false;
    const duration = isFavorite ? 5000 : 3000;
    
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      const isSecret = secretLikes.some(a => a.id === anime.id);
      if (!isSecret) {
        setSecretLikes(prev => [{ id: anime.id, title: anime.title, image: anime.image }, ...prev]);
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

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    if (isFavorite) {
      showConfirm("¿Estás seguro que deseas quitar este anime de tus favoritos?", () => {
        if (onToggleFavorite) onToggleFavorite(anime);
      });
    } else {
      if (onToggleFavorite) onToggleFavorite(anime);
    }
  };

  return (
    <div className={styles.card} onContextMenu={handleContextMenu} onMouseLeave={handleMouseLeave}>
      <Link to={linkTo} className={styles.imageContainer}>
        <img src={anime.image} alt={anime.title} className={styles.image} loading="lazy" />
        {onRemoveContinue && (
          <button 
            className={styles.removeContinueBtn}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveContinue(anime.id); }}
            title="Quitar de Continuar Viendo"
          >
            <X size={16} />
          </button>
        )}
        <div className={styles.overlay}>
          <Play className={styles.playIcon} size={40} />
          {onHide && !confirmHide && !isContinueWatching && (
            <button 
              className={styles.overlayActionBtn} 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmHide(true); }}
            >
              Ocultar<br/>Recomendación
            </button>
          )}
          {onHide && confirmHide && !isContinueWatching && (
            <div className={styles.confirmHideContainer} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <span className={styles.confirmText}>¿Seguro?</span>
              <div className={styles.confirmButtons}>
                <button className={styles.confirmBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHide(anime); }}>Sí</button>
                <button className={styles.cancelBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmHide(false); }}>No</button>
              </div>
            </div>
          )}
          {onRestore && (
            <button 
              className={`${styles.overlayActionBtn} ${styles.restoreBtn}`} 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRestore(anime); }}
            >
              Restaurar<br/>Anime
            </button>
          )}
          {/* Etiquetas (Géneros) Overlay */}
          {anime.genres && anime.genres.length > 0 && (
            <div className={styles.tagsContainer}>
              {anime.genres.slice(0, 3).map((g, idx) => (
                <button 
                  key={idx} 
                  className={styles.tagBtn}
                  onClick={(e) => handleTagClick(e, g)}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>
        {targetEp && (
          <div className={styles.episodeBadge}>
            T{season} Ep {targetEp}
          </div>
        )}
        {progressPercent > 0 && (
          <div className={styles.progressBarTrack}>
            <div 
              className={styles.progressBarFill} 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        )}
      </Link>
      
      <div className={styles.info}>
        <div className={styles.titleWrapper}>
          <h3 className={styles.title} title={anime.title}>{anime.title}</h3>
          {isContinueWatching && targetEp && (
            <span className={styles.continueSubtitle}>
              T{season} Ep.{targetEp} {formattedTime ? `• ${formattedTime}` : ''}
            </span>
          )}
          {anime.status && !isContinueWatching && (
            <span className={`${styles.statusBadge} ${anime.status === 'En emisión' ? styles.statusAiring : styles.statusFinished}`}>
              {anime.status}
            </span>
          )}
        </div>
        <div className={styles.actions}>
          {onToggleFavorite !== undefined && (
            <button 
              className={`${styles.favoriteBtn} ${isFavorite ? styles.isFavorite : ''}`}
              onPointerDown={startPress}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onPointerCancel={cancelPress}
              onClick={handleFavoriteClick}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
              title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            >
              <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimeCard;

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
  const [confirmHide, setConfirmHide] = useState(false);
  
  const pressTimer = useRef(null);
  const isLongPress = useRef(false);

  const handleContextMenu = (e) => {
    if (onContextMenu) {
      e.preventDefault();
      onContextMenu(e, anime);
    }
  };

  const linkTo = anime.episodeId ? `/watch/${anime.id}/${anime.episodeId}` : `/anime/${anime.id}`;

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
        <img src={anime.image} alt={anime.title} className={styles.image} loading="lazy" draggable={false} />
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
          {onHide && !confirmHide && (
            <button 
              className={styles.overlayActionBtn} 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmHide(true); }}
            >
              Ocultar<br/>Recomendación
            </button>
          )}
          {onHide && confirmHide && (
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
        {anime.episodeNumber && (
          <div className={styles.episodeBadge}>
            Ep {anime.episodeNumber}
          </div>
        )}
      </Link>
      
      <div className={styles.info}>
        <div className={styles.titleWrapper}>
          <h3 className={styles.title} title={anime.title}>{anime.title}</h3>
          {anime.status && (
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

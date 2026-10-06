import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, Heart, ChevronLeft, ChevronRight, Sparkles, Star, Info } from 'lucide-react';
import styles from './HeroCarousel.module.css';

const HeroCarousel = ({ animes = [], loading = false, favoriteAnimes = [], onToggleFavorite }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);

  const validAnimes = (animes || []).filter(a => a && typeof a === 'object' && a.id && a.title).slice(0, 6);

  // Auto-play timer (cada 6.5s si no hay hover)
  useEffect(() => {
    if (loading || validAnimes.length <= 1 || isHovered) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validAnimes.length);
    }, 6500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [validAnimes.length, isHovered, loading]);

  const handlePrev = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? validAnimes.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % validAnimes.length);
  };

  if (loading && validAnimes.length === 0) {
    return (
      <div className={styles.heroSkeleton}>
        <div className={styles.skeletonShimmer} />
        <div className={styles.skeletonContent}>
          <div className={styles.skeletonBadge} />
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonDesc} />
          <div className={styles.skeletonBtns} />
        </div>
      </div>
    );
  }

  if (validAnimes.length === 0) return null;

  return (
    <div 
      className={styles.heroContainer}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides */}
      {validAnimes.map((anime, index) => {
        const isActive = index === currentIndex;
        const isFav = favoriteAnimes.some(fav => (fav?.id || fav) === anime.id);
        const hasWideBackdrop = Boolean(anime.hasBackdrop || (anime.backdrop && !anime.backdrop.includes('placeholder')));
        const bannerUrl = anime.backdrop || anime.banner || anime.image;

        return (
          <div 
            key={`hero-${anime.id}`} 
            className={`${styles.slide} ${isActive ? styles.activeSlide : ''}`}
            aria-hidden={!isActive}
          >
            {/* Background Backdrop Image */}
            <div className={styles.imageWrapper}>
              <img 
                src={bannerUrl} 
                alt={anime.title} 
                className={`${styles.backdropImage} ${!hasWideBackdrop ? styles.blurredFallback : ''} ${isActive ? styles.zoomActive : ''}`}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchpriority={isActive ? "high" : "auto"}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  if (anime.image && e.currentTarget.src !== anime.image) {
                    e.currentTarget.src = anime.image;
                  } else {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=85';
                  }
                }}
              />
            </div>

            {/* Gradients: Vignette, bottom fade, top fade, left text protection */}
            <div className={styles.topGradient} />
            <div className={styles.sideGradient} />
            <div className={styles.bottomGradient} />
            <div className={styles.ambientGlow} />

            {/* Slide Content */}
            <div className={styles.contentContainer}>
              <div className={styles.infoWrapper}>
                {/* Meta Badges */}
                <div className={styles.metaRow}>
                  <span className={styles.featuredBadge}>
                    <Sparkles size={13} className={styles.sparkleIcon} />
                    {anime.badgeLabel || 'Recomendado'}
                  </span>

                  {anime.score && anime.score !== 'N/A' && (
                    <span className={styles.scoreBadge}>
                      <Star size={13} fill="#f59e0b" color="#f59e0b" />
                      {anime.score}
                    </span>
                  )}

                  {anime.status && (
                    <span className={styles.statusPill}>
                      {anime.status}
                    </span>
                  )}

                  {anime.genres && anime.genres.length > 0 && (
                    <div className={styles.genresList}>
                      {anime.genres.slice(0, 3).map((genre, idx) => (
                        <span key={idx} className={styles.genrePill}>
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Anime Title */}
                <h1 className={styles.animeTitle} title={anime.title}>
                  {anime.title}
                </h1>

                {/* Synopsis */}
                <p className={styles.synopsis}>
                  {anime.description || 'Disfruta de esta increíble historia disponible en AnimeZona.'}
                </p>

                {/* Action Buttons */}
                <div className={styles.actionsRow}>
                  <Link 
                    to={`/anime/${anime.id}`}
                    className={styles.playBtn}
                  >
                    <Play size={18} fill="currentColor" />
                    <span>Ver Serie</span>
                  </Link>

                  {onToggleFavorite && (
                    <button 
                      className={`${styles.favoriteBtn} ${isFav ? styles.isFavorited : ''}`}
                      onClick={() => onToggleFavorite(anime)}
                      title={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
                      type="button"
                    >
                      <Heart 
                        size={18} 
                        fill={isFav ? "currentColor" : "none"} 
                      />
                      <span>{isFav ? 'En Favoritos' : 'Favorito'}</span>
                    </button>
                  )}

                  <Link 
                    to={`/anime/${anime.id}`}
                    className={styles.detailsBtn}
                    title="Más detalles"
                  >
                    <Info size={18} />
                    <span>Detalles</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation Arrows */}
      {validAnimes.length > 1 && (
        <>
          <button 
            className={`${styles.arrowBtn} ${styles.prevArrow}`}
            onClick={handlePrev}
            aria-label="Anime anterior"
            type="button"
          >
            <ChevronLeft size={26} />
          </button>

          <button 
            className={`${styles.arrowBtn} ${styles.nextArrow}`}
            onClick={handleNext}
            aria-label="Siguiente anime"
            type="button"
          >
            <ChevronRight size={26} />
          </button>
        </>
      )}

      {/* Slide Indicators / Dots */}
      {validAnimes.length > 1 && (
        <div className={styles.indicators}>
          {validAnimes.map((anime, index) => (
            <button
              key={index}
              className={`${styles.indicatorDot} ${index === currentIndex ? styles.activeDot : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Ir a diapositiva ${index + 1}: ${anime.title}`}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroCarousel;

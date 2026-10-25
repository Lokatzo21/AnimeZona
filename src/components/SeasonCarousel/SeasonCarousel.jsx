import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Layers, Sparkles } from 'lucide-react';
import styles from './SeasonCarousel.module.css';

const SeasonCarousel = ({
  seasons = [],
  activeSeason = 1,
  onSelectSeason,
  episodes = []
}) => {
  const scrollRef = useRef(null);
  const activeBtnRef = useRef(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(seasons.length > 5);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflowing = scrollWidth > clientWidth + 4;
    setIsOverflowing(overflowing);
    setCanScrollLeft(overflowing && scrollLeft > 8);
    setCanScrollRight(overflowing && scrollLeft + clientWidth < scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollState();

    const el = scrollRef.current;
    if (!el) return;

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateScrollState();
      });
      resizeObserver.observe(el);
    }

    const handleWindowResize = () => updateScrollState();
    window.addEventListener('resize', handleWindowResize);

    // Wheel support (horizontal scroll on mouse wheel)
    const handleWheel = (e) => {
      if (el.scrollWidth > el.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && Math.abs(e.deltaY) > 5) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [updateScrollState, seasons]);

  // Center active season when changed
  useEffect(() => {
    if (activeBtnRef.current) {
      activeBtnRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [activeSeason]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -280 : 280;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(updateScrollState, 350);
  };

  const handleFocus = (e) => {
    // Smart TV remote D-pad auto-centering
    e.currentTarget.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });
  };

  if (!seasons || seasons.length <= 1) {
    return null;
  }

  const activeSeasonIndex = seasons.indexOf(activeSeason);
  const activeSeasonNumber = activeSeasonIndex !== -1 ? activeSeasonIndex + 1 : 1;

  return (
    <div className={styles.seasonCarouselContainer}>
      {/* Barra superior de información */}
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <div className={styles.iconBadge}>
            <Layers size={16} />
          </div>
          <h3 className={styles.title}>Temporadas</h3>
          <span className={styles.totalBadge}>
            {seasons.length} {seasons.length === 1 ? 'Temporada' : 'Temporadas'}
          </span>
        </div>

        <div className={styles.metaGroup}>
          <span className={styles.activeIndicator}>
            Temporada activa: <strong className={styles.highlightText}>T{activeSeason}</strong>
            <span className={styles.ratioText}> ({activeSeasonNumber} de {seasons.length})</span>
          </span>

          {isOverflowing && (
            <div className={styles.scrollHint} title="Usa las flechas o desliza para ver más temporadas">
              <span className={styles.hintDot} />
              <span>Desliza para ver más</span>
              <ChevronRight size={13} className={styles.hintChevron} />
            </div>
          )}
        </div>
      </div>

      {/* Carrusel deslizable */}
      <div className={styles.carouselWrapper}>
        {/* Flecha izquierda */}
        {isOverflowing && (
          <button
            type="button"
            className={`${styles.navButton} ${styles.navLeft} ${canScrollLeft ? styles.navActive : styles.navDisabled}`}
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Temporadas anteriores"
            title="Ver temporadas anteriores"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* Gradiente izquierdo para indicar continuidad */}
        {isOverflowing && (
          <div
            className={`${styles.fadeGradient} ${styles.fadeLeft} ${canScrollLeft ? styles.visible : ''}`}
            aria-hidden="true"
          />
        )}

        {/* Pista deslizable con botones */}
        <div
          className={styles.scrollTrack}
          ref={scrollRef}
          onScroll={updateScrollState}
        >
          {seasons.map(season => {
            const isActive = season === activeSeason;
            const count = episodes.filter(
              ep => (ep.season || ep.season_number || 1) === season
            ).length;

            return (
              <button
                key={season}
                ref={isActive ? activeBtnRef : null}
                type="button"
                onClick={() => onSelectSeason(season)}
                onFocus={handleFocus}
                className={`${styles.seasonTab} ${isActive ? styles.activeTab : ''}`}
                aria-selected={isActive}
                role="tab"
              >
                <span className={styles.seasonLabel}>Temporada {season}</span>
                {count > 0 && (
                  <span className={`${styles.epCount} ${isActive ? styles.activeEpCount : ''}`}>
                    {count} {count === 1 ? 'ep' : 'eps'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Gradiente derecho para indicar continuidad */}
        {isOverflowing && (
          <div
            className={`${styles.fadeGradient} ${styles.fadeRight} ${canScrollRight ? styles.visible : ''}`}
            aria-hidden="true"
          />
        )}

        {/* Flecha derecha */}
        {isOverflowing && (
          <button
            type="button"
            className={`${styles.navButton} ${styles.navRight} ${canScrollRight ? styles.navActive : styles.navDisabled}`}
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Siguientes temporadas"
            title="Ver siguientes temporadas"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SeasonCarousel;

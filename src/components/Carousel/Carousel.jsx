import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Carousel.module.css';

const Carousel = ({ title, children }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth : current.offsetWidth;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!children || (Array.isArray(children) && children.length === 0)) {
    return null;
  }

  return (
    <section className={styles.carouselSection}>
      {title && <h2 className={styles.title}>{title}</h2>}
      
      <div className={styles.carouselContainer}>
        <button 
          className={`${styles.navBtn} ${styles.prevBtn}`}
          onClick={() => scroll('left')}
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className={styles.scrollWrapper} ref={scrollRef}>
          {children}
        </div>

        <button 
          className={`${styles.navBtn} ${styles.nextBtn}`}
          onClick={() => scroll('right')}
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </section>
  );
};

export default Carousel;

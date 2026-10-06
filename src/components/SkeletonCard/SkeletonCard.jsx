import React from 'react';
import styles from './SkeletonCard.module.css';

export const SkeletonCard = () => {
  return (
    <div className={styles.card}>
      <div className={styles.imagePlaceholder}>
        <div className={styles.shimmer} />
      </div>
      <div className={styles.infoPlaceholder}>
        <div className={styles.titleLine}>
          <div className={styles.shimmer} />
        </div>
        <div className={styles.subtitleLine}>
          <div className={styles.shimmer} />
        </div>
      </div>
    </div>
  );
};

export const SkeletonRow = ({ count = 6 }) => {
  return (
    <div className={styles.skeletonRow}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={`skel-row-${idx}`} />
      ))}
    </div>
  );
};

export const SkeletonGrid = ({ count = 10 }) => {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={`skel-grid-${idx}`} />
      ))}
    </div>
  );
};

export default SkeletonCard;

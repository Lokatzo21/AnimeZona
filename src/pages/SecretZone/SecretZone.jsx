import React from 'react';
import AnimeCard from '../../components/AnimeCard/AnimeCard';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import styles from './SecretZone.module.css';

const SecretZone = () => {
  const [secretLikes = [], setSecretLikes] = useLocalStorage('secretLikes', []);

  useEffect(() => {
    document.title = 'Secreto | Anime';
  }, []);

  // Función para quitar de la lista secreta si se desea
  const handleRemoveSecretLike = (animeId) => {
    setSecretLikes(prev => prev.filter(a => a.id !== animeId));
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🤫 Zona Secreta</h1>
      <p className={styles.subtitle}>Aquí están los animes a los que les diste un "Me gusta secreto".</p>
      
      {secretLikes.length === 0 ? (
        <div className={styles.emptyState}>
          No tienes animes secretos aún. (Mantén presionado el botón de Me gusta por 3 segundos en cualquier anime).
        </div>
      ) : (
        <div className={styles.grid}>
          {secretLikes.map(anime => (
            <AnimeCard 
              key={anime.id}
              anime={anime}
              isFavorite={true}
              onToggleFavorite={() => handleRemoveSecretLike(anime.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SecretZone;

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
  const handleRemove = (animeId) => {
    setSecretLikes((secretLikes || []).filter(a => a.id !== animeId));
  };

  return (
    <div className={styles.secretContainer}>
      <h1 className={styles.title}>Zona Secreta</h1>
      <p className={styles.subtitle}>Aquí están los animes que has marcado manteniendo pulsado el botón de favoritos.</p>
      
      {(secretLikes || []).length > 0 ? (
        <div className={styles.grid}>
          {(secretLikes || []).map(anime => (
            <AnimeCard 
              key={`secret-${anime.id}`}
              anime={anime}
              isFavorite={true}
              onToggleFavorite={() => handleRemove(anime.id)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No tienes animes en tu zona secreta.</p>
          <small>(Mantén presionado el botón de favoritos en cualquier anime para añadirlo aquí)</small>
        </div>
      )}
    </div>
  );
};

export default SecretZone;

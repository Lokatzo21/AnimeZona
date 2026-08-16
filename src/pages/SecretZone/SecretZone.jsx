import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import AnimeCard from '../../components/AnimeCard/AnimeCard';
import { api } from '../../services/api';
import styles from './SecretZone.module.css';
import { ArrowLeft, Lock } from 'lucide-react';

const SecretZone = () => {
  const navigate = useNavigate();
  const [secretContinueWatching, setSecretContinueWatching] = useLocalStorage('secretContinueWatching', []);
  const [secretWatchedAnimes, setSecretWatchedAnimes] = useLocalStorage('secretWatchedAnimes', []);
  const [secretLikes, setSecretLikes] = useLocalStorage('secretLikes', []);
  const [activeTab, setActiveTab] = useState('historial');
  const [secretCatalog, setSecretCatalog] = useState([]);

  useEffect(() => {
    if (activeTab === 'historial') {
      document.title = "Historial Secreto | AnimeZona";
    } else if (activeTab === 'favoritos') {
      document.title = "Favoritos Secretos | AnimeZona";
    } else if (activeTab === 'catalogo') {
      document.title = "Catálogo Secreto | AnimeZona";
      loadSecretCatalog();
    }
  }, [activeTab]);

  const loadSecretCatalog = async () => {
    const data = await api.getCustomAnimes(true);
    setSecretCatalog(data.filter(a => a.isSecret));
  };

  const handleRemoveContinue = (animeId) => {
    setSecretContinueWatching((secretContinueWatching || []).filter(a => a.id !== animeId));
  };

  const handleReturn = () => {
    navigate('/');
  };

  return (
    <div className={styles.secretContainer}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Lock className={styles.lockIcon} size={32} />
          <div>
            <h1 className={styles.title}>Zona Secreta</h1>
            <p className={styles.subtitle}>Tu actividad aquí está oculta del perfil principal</p>
          </div>
        </div>
        <button className={styles.returnBtn} onClick={handleReturn}>
          <ArrowLeft size={18} /> Volver a la normalidad
        </button>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'historial' ? styles.active : ''}`}
          onClick={() => setActiveTab('historial')}
        >
          Historial Secreto
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'favoritos' ? styles.active : ''}`}
          onClick={() => setActiveTab('favoritos')}
        >
          Favoritos Secretos
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'catalogo' ? styles.active : ''}`}
          onClick={() => setActiveTab('catalogo')}
        >
          Catálogo Secreto
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'historial' && (
          <div>
            <h2 className={styles.sectionTitle}>Continuar Viendo</h2>
            {(secretContinueWatching || []).length === 0 ? (
              <p className={styles.emptyMsg}>No tienes episodios pendientes en modo secreto.</p>
            ) : (
              <div className={styles.grid}>
                {(secretContinueWatching || []).map(anime => (
                  <AnimeCard 
                    key={`secrethistory-${anime.id}`} 
                    anime={anime} 
                    isFavorite={(secretLikes || []).some(a => a.id === anime.id)}
                    onRemoveContinue={handleRemoveContinue}
                  />
                ))}
              </div>
            )}

            <h2 className={styles.sectionTitle} style={{ marginTop: '3rem' }}>Animes Vistos</h2>
            {(secretWatchedAnimes || []).length === 0 ? (
              <p className={styles.emptyMsg}>Aún no has marcado ningún anime secreto como visto.</p>
            ) : (
              <div className={styles.grid}>
                {(secretWatchedAnimes || []).map(anime => (
                  <AnimeCard 
                    key={`secretwatched-${anime.id}`} 
                    anime={anime} 
                    isFavorite={(secretLikes || []).some(a => a.id === anime.id)}
                    isWatched={true} 
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'favoritos' && (
          <div>
            <h2 className={styles.sectionTitle}>Me Gusta Secretos</h2>
            {(secretLikes || []).length === 0 ? (
              <p className={styles.emptyMsg}>No tienes animes favoritos en secreto.</p>
            ) : (
              <div className={styles.grid}>
                {(secretLikes || []).map(anime => (
                  <AnimeCard 
                    key={`secretlike-${anime.id}`} 
                    anime={anime}
                    isFavorite={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'catalogo' && (
          <div>
            <h2 className={styles.sectionTitle}>Catálogo Secreto (Custom)</h2>
            {secretCatalog.length === 0 ? (
              <p className={styles.emptyMsg}>No hay animes secretos en la base de datos.</p>
            ) : (
              <div className={styles.grid}>
                {secretCatalog.map(anime => (
                  <AnimeCard 
                    key={`secretcatalog-${anime.id}`} 
                    anime={anime}
                    isFavorite={(secretLikes || []).some(a => a.id === anime.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecretZone;

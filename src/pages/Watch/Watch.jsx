import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { List, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import styles from './Watch.module.css';

const Watch = () => {
  const { id, episode } = useParams();
  const navigate = useNavigate();
  const [servers, setServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [animeInfo, setAnimeInfo] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('sub'); // 'sub', 'latino', 'castellano'
  const [continueWatching, setContinueWatching] = useLocalStorage('continueWatching', []);
  const [watchedEpisodes, setWatchedEpisodes] = useLocalStorage('watchedEpisodes', []);
  const [watchedAnimes, setWatchedAnimes] = useLocalStorage('watchedAnimes', []);
  const playerRef = useRef(null);
  const sidebarListRef = useRef(null);
  const activeEpisodeRef = useRef(null);

  // Auto-scroll al reproductor cuando cambia el episodio y termina de cargar
  useEffect(() => {
    if (!loading && playerRef.current) {
      setTimeout(() => {
        playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }

    // Auto-scroll de la lista de episodios en la barra lateral
    if (!loading && activeEpisodeRef.current && sidebarListRef.current) {
      setTimeout(() => {
        const container = sidebarListRef.current;
        const activeItem = activeEpisodeRef.current;
        
        // Centrar el elemento activo en el contenedor de la lista
        const scrollPos = activeItem.offsetTop - container.offsetTop - (container.clientHeight / 2) + (activeItem.clientHeight / 2);
        
        container.scrollTo({
          top: scrollPos,
          behavior: 'smooth'
        });
      }, 600); // Ligeramente después del scroll principal para evitar conflictos
    }
  }, [episode, loading, episodes]);

  useEffect(() => {
    const fetchWatchData = async () => {
      setLoading(true);
      
      // Fetch secuencial para evitar rate limit de Jikan
      const info = await api.getAnimeInfo(id);
      await new Promise(r => setTimeout(r, 400));
      
      const eps = await api.getAnimeEpisodes(id, info?.totalEpisodes);
      
      setAnimeInfo(info);
      setEpisodes(eps);
      setLoading(false);
    };
    fetchWatchData();
  }, [id, episode]);

  // Efecto separado para actualizar el reproductor cuando cambia el idioma o episodio
  useEffect(() => {
    const fetchServers = async () => {
      if (animeInfo) {
        // Find the current episode object to get its season and correct tmdb episode id
        const currentEp = episodes.find(ep => ep.id.toString() === episode.toString());
        const seasonNumber = currentEp ? currentEp.season : 1;
        const correctEpisodeId = currentEp ? currentEp.tmdb_episode_id : episode;
        
        const serversData = await api.getEpisodeServers(animeInfo.title, correctEpisodeId, language, animeInfo.id, seasonNumber);
        setServers(serversData);
        if (serversData.length > 0) {
          setActiveServer(serversData[0]);
        }

        // Guardar progreso en Continuar Viendo
        setContinueWatching(prev => {
          const currentList = prev || [];
          const animeData = {
            id: animeInfo.id,
            title: animeInfo.title,
            image: animeInfo.image,
            episodeNumber: episode, // Guardamos el número del episodio para la tarjeta
            episodeId: episode // ID real del episodio para el link
          };
          
          // Eliminar si ya existía para ponerlo al principio (asegurar que comparamos strings)
          const filtered = currentList.filter(item => String(item.id) !== String(animeInfo.id));
          const newList = [animeData, ...filtered];
          
          // Mantener máximo 20 elementos para no llenar el local storage
          return newList.slice(0, 20);
        });

        // Marcar como visto automáticamente
        setWatchedEpisodes(prev => {
          const currentList = prev || [];
          const epStr = `${animeInfo.id}-${episode}`;
          if (!currentList.includes(epStr)) {
            return [...currentList, epStr];
          }
          return currentList;
        });

        // Agregar a la lista general de "Animes Vistos" del perfil
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
    fetchServers();
  }, [language, animeInfo, episode, episodes]);

  if (loading) return <div className={styles.loading}>Cargando episodio...</div>;

  // Helper functions for prev/next
  const currentEpIndex = episodes.findIndex(ep => ep.id.toString() === episode.toString());
  const prevEpisode = currentEpIndex > 0 ? episodes[currentEpIndex - 1] : null;
  const nextEpisode = currentEpIndex >= 0 && currentEpIndex < episodes.length - 1 ? episodes[currentEpIndex + 1] : null;
  const currentEpTitle = currentEpIndex >= 0 ? episodes[currentEpIndex].title : `Episodio ${episode}`;

  return (
    <div className={styles.watchContainer}>
      <div className={styles.header}>
        <Link to={`/anime/${id}`} className={styles.backLink}>
          <ChevronLeft size={20} />
          Volver a {animeInfo?.title}
        </Link>
        <h1 className={styles.title}>{currentEpTitle}</h1>
      </div>

      <div className={styles.playerControls} ref={playerRef}>
        <div className={styles.serverSelector}>
          <span className={styles.langLabel}>Servidor:</span>
          <div className={styles.serverButtons}>
            {servers.map((server, idx) => (
              <button 
                key={idx} 
                className={`${styles.serverBtn} ${activeServer?.name === server.name ? styles.serverActive : ''}`} 
                onClick={() => setActiveServer(server)}
              >
                <Play size={16} />
                {server.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.watchLayout}>
        <div className={styles.mainContent}>
          <div className={styles.playerSection}>
            <div className={styles.playerContainer}>
              <div className={styles.videoWrapper}>
                {activeServer ? (
                  <iframe 
                    src={activeServer.url} 
                    allowFullScreen 
                    className={styles.iframe}
                    title="Reproductor"
                  ></iframe>
                ) : (
                  <div className={styles.loadingServer}>Cargando servidor...</div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className={styles.sidebar}>
              <div className={styles.sidebarHeader}>
                <div>
                  <span className={styles.sidebarTitle}>Episodios</span>
                  <span className={styles.sidebarCount}> {episodes.length}</span>
                </div>
                <Link to={`/anime/${id}`} className={styles.sidebarLink}>Ver ficha</Link>
              </div>
              <div className={styles.episodesList} ref={sidebarListRef}>
                {episodes.map(ep => {
                  const isActive = ep.id.toString() === episode.toString();
                  const isNext = nextEpisode && ep.id.toString() === nextEpisode.id.toString();
                  const thumb = animeInfo.image; // Usamos la portada del anime
                  
                  return (
                    <Link 
                      key={ep.id} 
                      to={`/watch/${id}/${ep.id}`}
                      ref={isActive ? activeEpisodeRef : null}
                      className={`${styles.sidebarEpisode} ${isActive ? styles.sidebarEpisodeActive : ''}`}
                    >
                      <img src={thumb} alt={ep.title} className={styles.epThumb} />
                      <div className={styles.epInfo}>
                        <div className={styles.epNumber}>{ep.title}</div>
                        {(isActive || isNext) && (
                          <div className={`${styles.epStatus} ${isActive ? styles.epStatusActive : ''}`}>
                            {isActive ? 'Viendo ahora' : 'Siguiente'}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.controls}>
            <button 
              className={styles.controlBtn} 
              disabled={!prevEpisode}
              onClick={() => navigate(`/watch/${id}/${prevEpisode?.id}`)}
            >
              <ChevronLeft size={20} />
              Episodio Anterior
            </button>

            <Link to={`/anime/${id}`} className={styles.controlBtn}>
              <List size={20} />
              Lista de Episodios
            </Link>

            <button 
              className={styles.controlBtn} 
              disabled={!nextEpisode}
              onClick={() => navigate(`/watch/${id}/${nextEpisode?.id}`)}
            >
              Siguiente Episodio
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Watch;

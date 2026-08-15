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
  const [videoProgress, setVideoProgress] = useLocalStorage('videoProgress', {});
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const [promptShownForEp, setPromptShownForEp] = useState(false);
  const playerRef = useRef(null);
  const sidebarListRef = useRef(null);
  const activeEpisodeRef = useRef(null);
  const nativeVideoRef = useRef(null);
  const lastSavedTime = useRef(0);

  useEffect(() => {
    setPromptShownForEp(false);
    setShowResumePrompt(false);
    lastSavedTime.current = 0;
  }, [episode]);

  const handleVideoLoaded = () => {
    if (promptShownForEp) return; // Ya se le preguntó para este episodio
    const key = `${id}-${episode}`;
    const progress = videoProgress?.[key];
    if (progress && progress > 5) { // Si vio más de 5 segundos
      setSavedTime(progress);
      setShowResumePrompt(true);
      setPromptShownForEp(true);
      if (nativeVideoRef.current) {
         nativeVideoRef.current.pause();
      }
    }
  };

  // Efecto para capturar el progreso si la sincronización de Supabase llega tarde
  useEffect(() => {
    const key = `${id}-${episode}`;
    const progress = videoProgress?.[key];
    if (progress && progress > 5 && !promptShownForEp && nativeVideoRef.current && nativeVideoRef.current.readyState >= 1) {
      setSavedTime(progress);
      setShowResumePrompt(true);
      setPromptShownForEp(true);
      nativeVideoRef.current.pause();
    }
  }, [videoProgress, episode, id, promptShownForEp]);

  const handleTimeUpdate = () => {
    if (!nativeVideoRef.current) return;
    const currentTime = nativeVideoRef.current.currentTime;
    // Guardar progreso cada 15 segundos
    if (Math.abs(currentTime - lastSavedTime.current) > 15) {
      lastSavedTime.current = currentTime;
      const key = `${id}-${episode}`;
      setVideoProgress(prev => ({
        ...(prev || {}),
        [key]: currentTime
      }));
    }
  };

  const handleResume = () => {
    if (nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = savedTime;
      nativeVideoRef.current.play();
    }
    setShowResumePrompt(false);
  };

  const handleStartOver = () => {
    if (nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = 0;
      nativeVideoRef.current.play();
    }
    
    // Forzar el guardado de progreso en 0 inmediatamente
    lastSavedTime.current = 0;
    const key = `${id}-${episode}`;
    setVideoProgress(prev => ({
      ...(prev || {}),
      [key]: 0
    }));
    
    setShowResumePrompt(false);
  };


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
        
        let scrollPos;
        if (window.innerWidth <= 1024) {
          // En celular/tablet, alinear el elemento activo hasta arriba
          scrollPos = activeItem.offsetTop - container.offsetTop;
        } else {
          // En PC, centrar el elemento activo en el contenedor
          scrollPos = activeItem.offsetTop - container.offsetTop - (container.clientHeight / 2) + (activeItem.clientHeight / 2);
        }
        
        container.scrollTo({
          top: scrollPos,
          behavior: 'smooth'
        });
      }, 600);
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

  React.useEffect(() => {
    if (animeInfo) {
      document.title = `Lokatzo21 | Viendo ${animeInfo.title} - Episodio ${episode}`;
    } else {
      document.title = `Lokatzo21 | Viendo Anime`;
    }
  }, [animeInfo, episode]);

  // Efecto separado para actualizar el reproductor cuando cambia el episodio
  useEffect(() => {
    const fetchServers = async () => {
      if (animeInfo) {
        const currentEp = episodes.find(ep => ep.id.toString() === episode.toString());
        const seasonNumber = currentEp ? currentEp.season : 1;
        const correctEpisodeId = currentEp ? currentEp.tmdb_episode_id : episode;
        
        // Obtenemos todos los servidores (de todos los idiomas) para este episodio
        const serversData = await api.getEpisodeServers(animeInfo.title, correctEpisodeId, 'sub', animeInfo.id, seasonNumber);

        // Priorizar servidores ZONAAPS o .mp4 para que aparezcan primero
        serversData.sort((a, b) => {
          const isA_mp4 = a.url?.includes('.mp4') || a.name === 'ZONAAPS';
          const isB_mp4 = b.url?.includes('.mp4') || b.name === 'ZONAAPS';
          if (isA_mp4 && !isB_mp4) return -1;
          if (!isA_mp4 && isB_mp4) return 1;
          return 0;
        });

        setServers(serversData);

        // Intentar seleccionar un idioma disponible preferido (LAT > SUB > CAST)
        const availableLangs = [...new Set(serversData.map(s => s.lang))];
        let defaultLang = 'sub';
        if (availableLangs.includes('latino')) defaultLang = 'latino';
        else if (availableLangs.includes('sub')) defaultLang = 'sub';
        else if (availableLangs.length > 0 && availableLangs[0] !== 'none') defaultLang = availableLangs[0];

        setLanguage(defaultLang);

        const langServers = serversData.filter(s => s.lang === defaultLang || s.lang === 'none');
        if (langServers.length > 0) {
          setActiveServer(langServers[0]);
        } else {
           setActiveServer(serversData[0]); // fallback
        }

        // Guardar progreso en Continuar Viendo
        setContinueWatching(prev => {
          const currentList = prev || [];
          const animeData = {
            id: animeInfo.id,
            title: animeInfo.title,
            image: animeInfo.image,
            episodeNumber: episode,
            episodeId: episode
          };
          const filtered = currentList.filter(item => String(item.id) !== String(animeInfo.id));
          return [animeData, ...filtered].slice(0, 20);
        });

        // Marcar como visto automáticamente
        setWatchedEpisodes(prev => {
          const currentList = prev || [];
          const epStr = `${animeInfo.id}-${episode}`;
          if (!currentList.includes(epStr)) return [...currentList, epStr];
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
  }, [animeInfo, episode, episodes]); // quitamos 'language' de dependencias porque ya no fetchea de nuevo

  // Handler para cuando el usuario cambia de idioma manualmente
  const handleLanguageChange = (newLang) => {
      setLanguage(newLang);
      const langServers = servers.filter(s => s.lang === newLang || s.lang === 'none');
      if (langServers.length > 0) {
          setActiveServer(langServers[0]);
      }
  };

  if (loading) return <div className={styles.loading}>Cargando episodio...</div>;

  // Helper functions for prev/next
  const currentEpIndex = episodes.findIndex(ep => ep.id.toString() === episode.toString());
  const prevEpisode = currentEpIndex > 0 ? episodes[currentEpIndex - 1] : null;
  const nextEpisode = currentEpIndex >= 0 && currentEpIndex < episodes.length - 1 ? episodes[currentEpIndex + 1] : null;
  const currentEpTitle = currentEpIndex >= 0 ? episodes[currentEpIndex].title : `Episodio ${episode}`;

  // Filtrar servidores a mostrar según el idioma seleccionado
  const visibleServers = servers.filter(s => s.lang === language || s.lang === 'none');
  const availableLanguages = [...new Set(servers.map(s => s.lang).filter(l => l !== 'none'))];

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
        
        {availableLanguages.length > 0 && (
            <div className={styles.languageSelector}>
              <span className={styles.langLabel}>Idioma:</span>
              <div className={styles.langButtons}>
                {availableLanguages.includes('latino') && (
                    <button 
                      className={`${styles.langBtn} ${language === 'latino' ? styles.langActive : ''}`} 
                      onClick={() => handleLanguageChange('latino')}
                    >
                      Español Latino
                    </button>
                )}
                {availableLanguages.includes('sub') && (
                    <button 
                      className={`${styles.langBtn} ${language === 'sub' ? styles.langActive : ''}`} 
                      onClick={() => handleLanguageChange('sub')}
                    >
                      Subtitulado
                    </button>
                )}
                {availableLanguages.includes('castellano') && (
                    <button 
                      className={`${styles.langBtn} ${language === 'castellano' ? styles.langActive : ''}`} 
                      onClick={() => handleLanguageChange('castellano')}
                    >
                      Castellano
                    </button>
                )}
              </div>
            </div>
        )}

        <div className={styles.serverSelector}>
          <span className={styles.langLabel}>Servidor:</span>
          <div className={styles.serverButtons}>
            {visibleServers.map((server, idx) => (
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
                  activeServer?.url?.includes('.mp4') ? (
                    <>
                      <video 
                        ref={nativeVideoRef}
                        src={activeServer.url} 
                        controls 
                        playsInline
                        preload="metadata"
                        poster={animeInfo?.image || ''}
                        className={styles.iframe}
                        onLoadedMetadata={handleVideoLoaded}
                        onTimeUpdate={handleTimeUpdate}
                      ></video>
                      
                      {showResumePrompt && (
                        <div className={styles.resumeOverlay}>
                          <div className={styles.resumeBox}>
                            <h3>Continuar Viendo</h3>
                            <p>Te quedaste en el minuto {Math.floor(savedTime / 60)}:{(Math.floor(savedTime % 60)).toString().padStart(2, '0')}</p>
                            <div className={styles.resumeActions}>
                              <button onClick={handleResume} className={styles.resumeBtn}>Continuar</button>
                              <button onClick={handleStartOver} className={styles.startOverBtn}>Empezar de cero</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <iframe 
                      src={activeServer.url} 
                      allowFullScreen 
                      className={styles.iframe}
                      title="Reproductor"
                    ></iframe>
                  )
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
              <span className={styles.desktopText}>Episodio Anterior</span>
            </button>

            <Link to={`/anime/${id}`} className={styles.controlBtn}>
              <List size={20} />
              <span className={styles.desktopText}>Lista de Episodios</span>
            </Link>

            <button 
              className={styles.controlBtn} 
              disabled={!nextEpisode}
              onClick={() => navigate(`/watch/${id}/${nextEpisode?.id}`)}
            >
              <span className={styles.desktopText}>Siguiente Episodio</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Watch;

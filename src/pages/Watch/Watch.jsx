import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useAuth } from '../../contexts/AuthContext';
import { List, ChevronLeft, ChevronRight, Play, Lightbulb, Cast, EyeOff, SkipForward, FastForward, Maximize, Settings } from 'lucide-react';
import styles from './Watch.module.css';

const PRIORITY_ORDER = [
  'ZONAAPS',
  'CINEBEL',
  'MULTI-AUDIO',
  'MULTI - AUDIO',
  'ARCHIVE',
  'EARNVIDS',
  'VIMEO',
  'GOODSTREAM',
  'STREAMWISH',
  'UQLOAD',
  'FILEMOON',
  'FILELIONS',
  'VOE',
  'VIDEOAPP'
];

const sortServersByPriority = (srvList) => {
  if (!Array.isArray(srvList)) return [];
  return [...srvList].sort((a, b) => {
    const isA_mp4 = a.url?.includes('.mp4') || a.name?.toUpperCase().includes('CINEBEL');
    const isB_mp4 = b.url?.includes('.mp4') || b.name?.toUpperCase().includes('CINEBEL');
    if (isA_mp4 && !isB_mp4) return -1;
    if (!isA_mp4 && isB_mp4) return 1;

    const aName = a.name?.toUpperCase() || '';
    const bName = b.name?.toUpperCase() || '';
    const ai = PRIORITY_ORDER.findIndex(p => aName.includes(p));
    const bi = PRIORITY_ORDER.findIndex(p => bName.includes(p));

    const aRank = ai === -1 ? 999 : ai;
    const bRank = bi === -1 ? 999 : bi;

    if (aRank !== bRank) return aRank - bRank;
    return aName.localeCompare(bName);
  });
};

const Watch = () => {
  const { id, episode } = useParams();
  
  useEffect(() => {
    if (!window.chrome || !window.chrome.cast) {
      const script = document.createElement('script');
      script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
      document.body.appendChild(script);

      window.__onGCastApiAvailable = (isAvailable) => {
        if (isAvailable && window.cast) {
          window.cast.framework.CastContext.getInstance().setOptions({
            receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
          });
        }
      };
    }
  }, []);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [servers, setServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [animeInfo, setAnimeInfo] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('sub'); // 'sub', 'latino', 'castellano'
  const [continueWatching, setContinueWatching] = useLocalStorage('continueWatching', []);
  const [watchedEpisodes, setWatchedEpisodes] = useLocalStorage('watchedEpisodes', []);
  const [watchedAnimes, setWatchedAnimes] = useLocalStorage('watchedAnimes', []);
  const [secretLikes, setSecretLikes] = useLocalStorage('secretLikes', []);
  const [secretContinueWatching, setSecretContinueWatching] = useLocalStorage('secretContinueWatching', []);
  const [secretWatchedAnimes, setSecretWatchedAnimes] = useLocalStorage('secretWatchedAnimes', []);
  const [videoProgress, setVideoProgress] = useLocalStorage('videoProgress', {});
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const [promptShownForEp, setPromptShownForEp] = useState(false);
  
  // Custom Player States
  const [cinemaMode, setCinemaMode] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  
  // Facebook states
  const [fbLoading, setFbLoading] = useState(false);
  const [resolvedFbUrl, setResolvedFbUrl] = useState(null);
  const [fbQualities, setFbQualities] = useState(null);
  const [currentFbQuality, setCurrentFbQuality] = useState('');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [qualityChangeTime, setQualityChangeTime] = useState(null);

  useEffect(() => {
    if (user) {
      api.isAdmin(user.email).then(setIsAdmin);
    }
  }, [user]);

  const playerRef = useRef(null);
  const sidebarListRef = useRef(null);
  const activeEpisodeRef = useRef(null);
  const nativeVideoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const lastSavedTime = useRef(0);
  const currentEp = episodes.find(ep => String(ep?.id ?? '') === String(episode ?? ''));
  const currentSeason = currentEp ? (currentEp.season || 1) : 1;

  // Admin Config States
  const [introStartInput, setIntroStartInput] = useState('');
  const [introEndInput, setIntroEndInput] = useState('');
  const [outroStartInput, setOutroStartInput] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    if (activeServer) {
      const formatTime = (seconds) => {
        if (!seconds) return '';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      };
      setIntroStartInput(formatTime(activeServer.skip_start));
      setIntroEndInput(formatTime(activeServer.skip_end));
      setOutroStartInput(formatTime(activeServer.outro_start));
    }
  }, [activeServer]);

  const handleSaveTimes = async () => {
    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      const parts = timeStr.split(':');
      if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      return parseInt(timeStr);
    };

    const times = {
      skip_start: parseTime(introStartInput),
      skip_end: parseTime(introEndInput),
      outro_start: parseTime(outroStartInput)
    };

    const success = await api.updateEpisodeTimes(id, episode, times);
    if (success) {
      alert("¡Tiempos guardados exitosamente! 🚀");
      // Update local state to reflect changes instantly without reload
      setActiveServer(prev => ({
        ...prev,
        skip_start: times.skip_start,
        skip_end: times.skip_end,
        outro_start: times.outro_start
      }));
      setShowAdminPanel(false);
    } else {
      alert("Error al guardar los tiempos.");
    }
  };

  useEffect(() => {
    setPromptShownForEp(false);
    setShowResumePrompt(false);
    setShowSkipIntro(false);
    setShowNextEpisode(false);
    lastSavedTime.current = 0;
  }, [episode]);

  useEffect(() => {
    setResolvedFbUrl(null);
    setFbQualities(null);
    setCurrentFbQuality('');
    setShowQualityMenu(false);
    if (activeServer && activeServer.url && (activeServer.url.includes('facebook.com') && !activeServer.url.includes('plugins/video'))) {
      setFbLoading(true);
      fetch(`/api/extract-fb?url=${encodeURIComponent(activeServer.url)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setResolvedFbUrl(data.mp4_url);
              if (data.qualities) {
                setFbQualities(data.qualities);
                setCurrentFbQuality(data.qualities['720p'] ? '720p' : '360p');
              }
          } else {
            console.error("Error extracted fb:", data.error);
          }
        })
        .finally(() => setFbLoading(false));
    }
  }, [activeServer]);

  const changeQuality = (qKey, url) => {
    if (nativeVideoRef.current) {
      setQualityChangeTime(nativeVideoRef.current.currentTime);
    }
    setCurrentFbQuality(qKey);
    setResolvedFbUrl(url);
    setShowQualityMenu(false);
  };

  const handleVideoLoaded = () => {
    if (qualityChangeTime !== null && nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = qualityChangeTime;
      nativeVideoRef.current.play();
      setQualityChangeTime(null);
      return;
    }
    if (promptShownForEp) return; // Ya se le preguntó para este episodio
    const key = `${id}-${episode}`;
    const progress = videoProgress?.[key];
    if (progress && progress > 5) {
      if (nativeVideoRef.current && nativeVideoRef.current.currentTime < 5) {
        setSavedTime(progress);
        setShowResumePrompt(true);
        setPromptShownForEp(true);
        nativeVideoRef.current.pause();
      } else {
        setPromptShownForEp(true);
      }
    }
  };

  // Efecto para capturar el progreso si la sincronización de Supabase llega tarde
  useEffect(() => {
    const key = `${id}-${episode}`;
    const progress = videoProgress?.[key];
    if (progress && progress > 5 && !promptShownForEp && nativeVideoRef.current && nativeVideoRef.current.readyState >= 1) { if (nativeVideoRef.current.currentTime < 5) { setSavedTime(progress); setShowResumePrompt(true); setPromptShownForEp(true); nativeVideoRef.current.pause(); } else { setPromptShownForEp(true); } }
  }, [videoProgress, episode, id, promptShownForEp]);

  const handleTimeUpdate = () => {
    if (!nativeVideoRef.current) return;
    const currentTime = nativeVideoRef.current.currentTime;
    
    // Verificar si estamos en el rango de intro
    if (activeServer?.skip_start && activeServer?.skip_end) {
      if (currentTime >= activeServer.skip_start && currentTime < activeServer.skip_end) {
        setShowSkipIntro(true);
      } else {
        setShowSkipIntro(false);
      }
    }

    // Verificar si empezó el outro (para Siguiente Episodio)
    if (activeServer?.outro_start && currentTime >= activeServer.outro_start) {
      setShowNextEpisode(true);
    } else {
      setShowNextEpisode(false);
    }

    // Guardar progreso cada 15 segundos
    if (Math.abs(currentTime - lastSavedTime.current) > 15) {
      lastSavedTime.current = currentTime;
      const key = `${id}-${episode}`;
      setVideoProgress(prev => ({
        ...(prev || {}),
        [key]: currentTime
      }));

      // Mantener sincronizado Continuar Viendo con tiempo y temporada exactos
      const updateCwItem = prev => {
        const list = prev || [];
        return list.map(item => {
          if (String(item.id) === String(id) || String(item.animeId) === String(id)) {
            return {
              ...item,
              timestamp: currentTime,
              time: currentTime,
              progress: currentTime,
              season: currentSeason || item.season || 1,
              seasonNum: currentSeason || item.seasonNum || 1,
              seasonNumber: currentSeason || item.seasonNumber || 1,
              episode: episode,
              episodeNumber: episode,
              episodeId: episode
            };
          }
          return item;
        });
      };

      const isSecret = secretLikes.some(a => String(a.id) === String(id));
      if (isSecret) {
        setSecretContinueWatching(updateCwItem);
      } else {
        setContinueWatching(updateCwItem);
      }
    }
  };

  const skipIntro = () => {
    if (nativeVideoRef.current && activeServer?.skip_end) {
      nativeVideoRef.current.currentTime = activeServer.skip_end;
      setShowSkipIntro(false);
    }
  };

  const handleCast = async () => {
    try {
      if (window.cast && window.cast.framework) {
        const castContext = window.cast.framework.CastContext.getInstance();
        try {
          await castContext.requestSession();
          const session = castContext.getCurrentSession();
          if (session) {
            const url = resolvedFbUrl || activeServer?.url;
            if (url) {
                const mediaInfo = new window.chrome.cast.media.MediaInfo(url, 'video/mp4');
                const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
                request.currentTime = nativeVideoRef.current ? nativeVideoRef.current.currentTime : 0;
                
                await session.loadMedia(request);
                // alert("Transmitiendo a TV con éxito."); // omit to be less annoying
                if (nativeVideoRef.current) nativeVideoRef.current.pause();
                return;
            }
          }
        } catch (err) {
          console.warn("Cast SDK fallback...", err);
        }
      }

      if (nativeVideoRef.current && nativeVideoRef.current.remote && nativeVideoRef.current.remote.prompt) {
        try {
          await nativeVideoRef.current.remote.prompt();
          return;
        } catch (err) {
          console.warn("remote.prompt fallback", err);
        }
      }

      alert("No se pudo iniciar automáticamente. En PC: Haz clic en el menú de 3 puntos del navegador (arriba a la derecha) y elige 'Transmitir'. En móvil: Usa el botón nativo del reproductor o asegúrate de estar en la misma red Wi-Fi que tu TV.");
    } catch (error) {
      console.error(error);
      alert("Error al intentar transmitir.");
    }
  };

  const toggleControls = () => {
    setControlsVisible(prev => !prev);
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    if (!document.fullscreenElement) {
      if (videoContainerRef.current?.requestFullscreen) {
        videoContainerRef.current.requestFullscreen().catch(err => console.log(err));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
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
    if (!loading && videoContainerRef.current) {
      setTimeout(() => {
        const rect = videoContainerRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Ajuste fino para centrar: tiene en cuenta el tamaño de la ventana y un offset para el header
        const navbarOffset = 80; // Ajusta este valor si el navbar es más grande/pequeño
        const targetY = scrollTop + rect.top + (rect.height / 2) - (window.innerHeight / 2) - (navbarOffset / 2);
        
        window.scrollTo({
          top: targetY,
          behavior: 'smooth'
        });
      }, 400);
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
      document.title = `Viendo ${animeInfo.title} - Episodio ${episode}`;
    } else {
      document.title = `Viendo Anime`;
    }
  }, [animeInfo, episode]);

  // Efecto separado para actualizar el reproductor cuando cambia el episodio
  useEffect(() => {
    const fetchServers = async () => {
      if (animeInfo) {
        const currentEp = episodes.find(ep => ep.id.toString() === episode.toString());
        const seasonNumber = currentEp ? currentEp.season : 1;
        const correctEpisodeId = currentEp ? currentEp.id : episode;
        
        // Obtenemos todos los servidores (de todos los idiomas) para este episodio
        const serversData = await api.getEpisodeServers(animeInfo.title, correctEpisodeId, 'sub', animeInfo.id, seasonNumber);

        // Ordenar todos los servidores por la prioridad oficial
        const sortedServers = sortServersByPriority(serversData);
        setServers(sortedServers);

        // Intentar seleccionar un idioma disponible preferido (LAT > SUB > CAST)
        const availableLangs = [...new Set(sortedServers.map(s => s.lang))];
        let defaultLang = 'sub';
        if (availableLangs.includes('latino')) defaultLang = 'latino';
        else if (availableLangs.includes('sub')) defaultLang = 'sub';
        else if (availableLangs.length > 0 && availableLangs[0] !== 'none') defaultLang = availableLangs[0];

        setLanguage(defaultLang);

        const langServers = sortedServers.filter(s => s.lang === defaultLang || s.lang === 'none');
        if (langServers.length > 0) {
          setActiveServer(langServers[0]);
        } else {
           setActiveServer(sortedServers[0]); // fallback
        }

        const isSecret = secretLikes.some(a => String(a.id) === String(animeInfo.id));
        
        // Guardar progreso en Continuar Viendo (Normal o Secreto)
        const updateContinueWatching = prev => {
          const currentList = prev || [];
          const currentProgress = videoProgress?.[`${animeInfo.id}-${episode}`] || 0;
          const animeData = {
            id: animeInfo.id,
            title: animeInfo.title,
            image: animeInfo.image,
            episodeNumber: episode,
            episodeId: episode,
            episode: episode,
            season: seasonNumber || 1,
            seasonNum: seasonNumber || 1,
            seasonNumber: seasonNumber || 1,
            timestamp: currentProgress,
            time: currentProgress,
            progress: currentProgress
          };
          const filtered = currentList.filter(item => String(item.id) !== String(animeInfo.id));
          return [animeData, ...filtered].slice(0, 20);
        };
        
        if (isSecret) {
          setSecretContinueWatching(updateContinueWatching);
        } else {
          setContinueWatching(updateContinueWatching);
        }

        // Marcar como visto automáticamente
        setWatchedEpisodes(prev => {
          const currentList = prev || [];
          const epStr = `${animeInfo.id}-${episode}`;
          if (!currentList.includes(epStr)) return [...currentList, epStr];
          return currentList;
        });

        // Agregar a la lista general de "Animes Vistos" del perfil (Normal o Secreto)
        const updateWatchedAnimes = prev => {
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
        };

        if (isSecret) {
          setSecretWatchedAnimes(updateWatchedAnimes);
        } else {
          setWatchedAnimes(updateWatchedAnimes);
        }
      }
    };
    fetchServers();
  }, [animeInfo, episode, episodes]); // quitamos 'language' de dependencias porque ya no fetchea de nuevo

  // Handler para cuando el usuario cambia de idioma manualmente
  const handleLanguageChange = (newLang) => {
      setLanguage(newLang);
      const langServers = sortServersByPriority(servers.filter(s => s.lang === newLang || s.lang === 'none'));
      if (langServers.length > 0) {
          setActiveServer(langServers[0]);
      }
  };

  if (loading) return <div className={styles.loading}>Cargando episodio...</div>;

  // Helper functions for prev/next
  const currentEpIndex = episodes.findIndex(ep => ep.id.toString() === episode.toString());
  const prevEpisode = currentEpIndex > 0 ? episodes[currentEpIndex - 1] : null;
  const nextEpisode = currentEpIndex >= 0 && currentEpIndex < episodes.length - 1 ? episodes[currentEpIndex + 1] : null;
  
  const isMovie = Boolean(
    animeInfo?.type === 'Película' ||
    animeInfo?.contentType === 'peliculas' ||
    animeInfo?.isMovie ||
    episodes.length === 1
  );

  let currentEpTitle = `Episodio ${episode}`;
  if (isMovie) {
    currentEpTitle = episodes[0]?.title && !episodes[0].title.startsWith('Episodio 1')
      ? episodes[0].title
      : animeInfo?.title || 'Película Completa';
  } else if (currentEpIndex >= 0) {
      const epData = episodes[currentEpIndex];
      const epSeason = epData.season || epData.season_number || 1;
      const seasonEps = episodes.filter(e => (e.season || e.season_number || 1) === epSeason);
      const epIndexInSeason = seasonEps.findIndex(e => e.id.toString() === episode.toString());
      let cleanTitle = epData.title || '';
      cleanTitle = cleanTitle.replace(/^T\d+E\d+\s*-\s*/i, '');
      currentEpTitle = `T${epSeason}E${epIndexInSeason + 1} - ${cleanTitle}`;
  }

  // Filtrar servidores a mostrar según el idioma seleccionado y orden de prioridad oficial
  const visibleServers = sortServersByPriority(
    servers.filter(s => s.lang === language || s.lang === 'none')
  );
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
                      Latino
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

      {cinemaMode && <div className={styles.cinemaOverlay} onClick={() => setCinemaMode(false)}></div>}

      <div className={styles.watchLayout}>
        <div className={styles.mainContent}>
          <div className={styles.playerSection}>
            <div className={`${styles.playerContainer} ${cinemaMode ? styles.playerContainerCinema : ''}`} ref={videoContainerRef}>
              <div className={styles.videoWrapper}>
                {activeServer ? (
                  (activeServer?.url?.includes('facebook.com') && !activeServer.url.includes('plugins/video')) ? (
                    fbLoading ? (
                      <div className={styles.loadingServer}>Hackeando a Mark Zuckerberg... (Extrayendo MP4 de Facebook)</div>
                    ) : resolvedFbUrl ? (
                      <>
                        <video 
                          ref={nativeVideoRef}
                          src={resolvedFbUrl} 
                          controls={controlsVisible}
                          playsInline
                          preload="metadata"
                          poster={animeInfo?.image || ''}
                          className={styles.iframe}
                          onLoadedMetadata={handleVideoLoaded}
                          onTimeUpdate={handleTimeUpdate}
                          onPause={handleTimeUpdate}
                          onClick={() => { if(!controlsVisible) { nativeVideoRef.current.paused ? nativeVideoRef.current.play() : nativeVideoRef.current.pause() } }}
                        ></video>
                        
                        {showSkipIntro && (
                          <button onClick={skipIntro} className={styles.skipIntroBtn}>
                            <SkipForward size={20} /> Saltar Intro
                          </button>
                        )}

                        {showNextEpisode && nextEpisode && (
                          <button onClick={() => navigate(`/watch/${id}/${nextEpisode?.id}`)} className={styles.nextEpBtn}>
                            <FastForward size={20} /> Siguiente Episodio
                          </button>
                        )}
                        
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
                      <div className={styles.loadingServer}>Hubo un error extrayendo el video de Facebook. URL recibida: {activeServer.url}</div>
                    )
                  ) : activeServer?.url?.includes('.mp4') ? (
                    <>
                      <video 
                        ref={nativeVideoRef}
                        src={activeServer.url} 
                        controls={controlsVisible}
                        playsInline
                        preload="metadata"
                        poster={animeInfo?.image || ''}
                        className={styles.iframe}
                        onLoadedMetadata={handleVideoLoaded}
                        onTimeUpdate={handleTimeUpdate}
                        onPause={handleTimeUpdate}
                        onDoubleClick={handleDoubleClick}
                        onClick={() => { if(!controlsVisible) { nativeVideoRef.current.paused ? nativeVideoRef.current.play() : nativeVideoRef.current.pause() } }}
                      ></video>
                      
                      {showSkipIntro && (
                        <button onClick={skipIntro} className={styles.skipIntroBtn}>
                          <SkipForward size={20} /> Saltar Intro
                        </button>
                      )}
                      
                      {showNextEpisode && nextEpisode && (
                        <button onClick={() => navigate(`/watch/${id}/${nextEpisode?.id}`)} className={styles.nextEpBtn}>
                          <FastForward size={20} /> Siguiente Episodio
                        </button>
                      )}
                      
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
                  ) : activeServer?.name?.includes('(Descarga)') ? (
                    <div className={styles.downloadContainer} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1e293b', color: 'white'}}>
                        <h3 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Enlace de Descarga</h3>
                        <p style={{marginBottom: '1.5rem', color: '#94a3b8'}}>Este servidor es para descargar el episodio, no para reproducirlo aquí.</p>
                        <a href={activeServer.url} target="_blank" rel="noopener noreferrer" style={{background: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold'}}>
                            Ir a Descargar
                        </a>
                    </div>
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

            {/* Custom Toolbar */}
            <div className={styles.playerToolbar}>
              <button onClick={() => setCinemaMode(!cinemaMode)} className={styles.toolbarBtn} title="Modo Cine">
                <Lightbulb size={18} fill={cinemaMode ? 'white' : 'none'} />
                <span>{cinemaMode ? 'Encender luz' : 'Apagar luz'}</span>
              </button>
              
              {(activeServer?.url?.includes('.mp4') || (activeServer?.url?.includes('facebook.com') && !activeServer.url.includes('plugins/video'))) && (
                <>
                  <button onClick={handleDoubleClick} className={styles.toolbarBtn} title="Pantalla Completa">
                    <Maximize size={18} />
                    <span>Pantalla Completa</span>
                  </button>
                  {fbQualities && Object.keys(fbQualities).length > 1 && (
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setShowQualityMenu(!showQualityMenu)} className={styles.toolbarBtn} title="Calidad">
                        <Settings size={18} />
                        <span>{currentFbQuality}</span>
                      </button>
                      {showQualityMenu && (
                        <div className={styles.qualityMenu} style={{ position: 'absolute', bottom: '100%', left: '0', background: 'rgba(0,0,0,0.8)', padding: '5px', borderRadius: '5px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 50 }}>
                          {Object.entries(fbQualities).map(([key, url]) => (
                            <button key={key} onClick={() => changeQuality(key, url)} style={{ background: currentFbQuality === key ? '#3b82f6' : 'transparent', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '3px' }}>
                              {key}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={toggleControls} className={styles.toolbarBtn} title="Ocultar Controles">
                    <EyeOff size={18} />
                    <span>{controlsVisible ? 'Ocultar Controles' : 'Mostrar Controles'}</span>
                  </button>
                  <button onClick={handleCast} className={styles.toolbarBtn} title="Transmitir a TV (Chromecast/Roku)">
                    <Cast size={18} />
                    <span>Transmitir</span>
                  </button>
                </>
              )}

              {isAdmin && (activeServer?.url?.includes('.mp4') || (activeServer?.url?.includes('facebook.com') && !activeServer.url.includes('plugins/video')) || activeServer?.name?.includes('Multi - Audio Z')) && (
                <button 
                  onClick={() => setShowAdminPanel(!showAdminPanel)} 
                  className={styles.toolbarBtn} 
                  style={{ marginLeft: 'auto' }}
                >
                  Editar Tiempos
                </button>
              )}
            </div>

            {showAdminPanel && isAdmin && (activeServer?.url?.includes('.mp4') || (activeServer?.url?.includes('facebook.com') && !activeServer.url.includes('plugins/video')) || activeServer?.name?.includes('Multi - Audio Z')) && (
              <div style={{ marginTop: '15px', padding: '15px', background: 'var(--bg-dark-secondary)', borderRadius: 'var(--border-radius-lg)', border: '1px solid #ef4444' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚙️</span> Panel de Control Admin - Tiempos
                </h4>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Intro (Inicio)
                    <input 
                      type="text" 
                      placeholder="Ej. 1:30" 
                      value={introStartInput} 
                      onChange={e => setIntroStartInput(e.target.value)}
                      style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-dark-tertiary)', border: '1px solid var(--glass-border)', color: 'white', marginTop: '6px', width: '90px' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Intro (Fin)
                    <input 
                      type="text" 
                      placeholder="Ej. 3:00" 
                      value={introEndInput} 
                      onChange={e => setIntroEndInput(e.target.value)}
                      style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-dark-tertiary)', border: '1px solid var(--glass-border)', color: 'white', marginTop: '6px', width: '90px' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Botón Sig. Episodio
                    <input 
                      type="text" 
                      placeholder="Ej. 22:15" 
                      value={outroStartInput} 
                      onChange={e => setOutroStartInput(e.target.value)}
                      style={{ padding: '8px', borderRadius: '4px', background: 'var(--bg-dark-tertiary)', border: '1px solid var(--glass-border)', color: 'white', marginTop: '6px', width: '120px' }}
                    />
                  </label>
                  <button 
                    onClick={handleSaveTimes}
                    style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Guardar Tiempos
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '10px 0 0 0' }}>Formato válido: MM:SS (Ej: 1:30) o Segundos (Ej: 90).</p>
              </div>
            )}

            {/* Sidebar */}
            <div className={styles.sidebar}>
              <div className={styles.sidebarHeader}>
                <div>
                  <span className={styles.sidebarTitle}>{isMovie ? 'Película' : 'Episodios'}</span>
                  <span className={styles.sidebarCount}> {episodes.length}</span>
                </div>
                <Link to={`/anime/${id}`} className={styles.sidebarLink}>Ver ficha</Link>
              </div>
              <div className={styles.episodesList} ref={sidebarListRef}>
                {episodes.map(ep => {
                  const isActive = ep.id.toString() === episode.toString();
                  const isNext = nextEpisode && ep.id.toString() === nextEpisode.id.toString();
                  const thumb = animeInfo.image; // Usamos la portada del anime
                  
                  const epSeason = ep.season || ep.season_number || 1;
                  const seasonEps = episodes.filter(e => (e.season || e.season_number || 1) === epSeason);
                  const epIndexInSeason = seasonEps.findIndex(e => e.id.toString() === ep.id.toString());
                  let cleanTitle = ep.title || '';
                  cleanTitle = cleanTitle.replace(/^T\d+E\d+\s*-\s*/i, '');
                  const displayTitle = isMovie
                    ? (ep.title && !ep.title.startsWith('Episodio 1') ? ep.title : animeInfo.title)
                    : `T${epSeason}E${epIndexInSeason + 1} - ${cleanTitle}`;

                  return (
                    <Link 
                      to={`/watch/${id}/${ep.id}`} 
                      key={ep.id}
                      ref={isActive ? activeEpisodeRef : null}
                      className={`${styles.sidebarEpisode} ${isActive ? styles.sidebarEpisodeActive : ''}`}
                    >
                      <img src={thumb} alt={displayTitle} className={styles.epThumb} />
                      <div className={styles.epInfo}>
                        <div className={styles.epNumber}>{displayTitle}</div>
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








import React, { useEffect, useState, useRef } from 'react';
import Hls from 'hls.js';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useAuth } from '../../contexts/AuthContext';
import { List, ChevronLeft, ChevronRight, Play, Lightbulb, Cast, EyeOff, SkipForward, FastForward, Maximize, Settings } from 'lucide-react';
import styles from './Watch.module.css';

const PRIORITY_ORDER = [
  'RUMBLE',
  'ARCHIVE',
  '1080P',
  'FULL HD',
  'FHD',
  '4K',
  'ZONAAPS',
  'ZOPLAYER',
  'CINEBEL',
  'MULTI-AUDIO',
  'MULTI - AUDIO',
  'VIMEO',
  'VIMEOS',
  'GOODSTREAM',
  'EARNVIDS',
  'STREAMWISH',
  'FILEMOON',
  'UQLOAD',
  'FILELIONS',
  'VOE',
  'SAVEFILES',
  'VIDARA',
  'GUPLOAD',
  'DOODSTREAM',
  'DOOD',
  'MIXDROP',
  'MXDROP',
  'VIDEOAPP'
];

const getQualityWeight = (srv) => {
  const name = (srv?.name || '').toUpperCase();
  const url = (srv?.url || '').toUpperCase();
  const filename = url.split('/').pop() || '';
  const text = `${name} ${filename}`;
  if (/(?:^|\b)(?:4K|2160P?)(?:\b|$)/i.test(text)) return 4;
  if (/(?:^|\b)(?:1080P?|FHD|FULL\s*HD)(?:\b|$)/i.test(text)) return 3;
  if (/(?:^|\b)(?:720P?|HD)(?:\b|$)/i.test(text)) return 2;
  if (/(?:^|\b)(?:480P?|SD)(?:\b|$)/i.test(text)) return 1;
  return 0;
};

const sortServersByPriority = (srvList) => {
  if (!Array.isArray(srvList)) return [];
  return [...srvList].sort((a, b) => {
    // 1. MP4 directos SIEMPRE primero (#1)
    const isA_mp4 = a.url?.includes('.mp4');
    const isB_mp4 = b.url?.includes('.mp4');
    if (isA_mp4 && !isB_mp4) return -1;
    if (!isA_mp4 && isB_mp4) return 1;

    // 2. Streams HLS adaptativos (.m3u8) de segundo (#2)
    const isA_hls = a.url?.includes('.m3u8') || a.url?.includes('streamproxy') || a.url?.includes('.p3x8') || a.name?.toUpperCase().includes('ARCANDO');
    const isB_hls = b.url?.includes('.m3u8') || b.url?.includes('streamproxy') || b.url?.includes('.p3x8') || b.name?.toUpperCase().includes('ARCANDO');
    if (isA_hls && !isB_hls) return -1;
    if (!isA_hls && isB_hls) return 1;

    // 3. Prioridad de servidor (RUMBLE / ARCHIVE / 1080P > ZONAAPS > CINEBEL > IFRAMES)
    const aName = a.name?.toUpperCase() || '';
    const bName = b.name?.toUpperCase() || '';
    const ai = PRIORITY_ORDER.findIndex(p => aName.includes(p));
    const bi = PRIORITY_ORDER.findIndex(p => bName.includes(p));

    const aRank = ai === -1 ? 999 : ai;
    const bRank = bi === -1 ? 999 : bi;

    if (aRank !== bRank) return aRank - bRank;

    // 3. Resolución/Calidad (1080p > 720p > 480p) si comparten el mismo nivel de servidor
    const aQual = getQualityWeight(a);
    const bQual = getQualityWeight(b);
    if (aQual !== bQual) return bQual - aQual;

    return aName.localeCompare(bName);
  });
};

const normalizeLang = (lang) => {
  if (!lang) return 'sub';
  const l = String(lang).toLowerCase().trim();
  if (l.includes('lat') || l === 'es' || l === 'español' || l === 'spanish') return 'latino';
  if (l.includes('cast')) return 'castellano';
  if (l.includes('sub') || l.includes('jap') || l === 'ja') return 'sub';
  if (l === 'none') return 'none';
  return l;
};

const Watch = () => {
  const { id, episode } = useParams();
  const [searchParams] = useSearchParams();
  const querySeason = searchParams.get('season') ? parseInt(searchParams.get('season'), 10) : null;
  const stallTimeoutRef = useRef(null);

  const handleVideoWaiting = () => {
    if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);
    // Recuperación inteligente de buffer para Smart TVs (Samsung Tizen / LG webOS)
    stallTimeoutRef.current = setTimeout(() => {
      const vid = nativeVideoRef.current;
      if (vid && !vid.paused && vid.readyState < 3) {
        console.warn('Smart TV video stall detectado: desatorando buffer...');
        vid.currentTime += 0.05;
        vid.play().catch(() => {});
      }
    }, 2500);
  };

  const handleVideoPlaying = () => {
    if (stallTimeoutRef.current) {
      clearTimeout(stallTimeoutRef.current);
      stallTimeoutRef.current = null;
    }
  };
  
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
  const [serverLoading, setServerLoading] = useState(false);
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

  // Mediafire states
  const [resolvedMfUrl, setResolvedMfUrl] = useState(null);
  const [mfLoading, setMfLoading] = useState(false);

  useEffect(() => {
    if (user) {
      api.isAdmin(user.email).then(setIsAdmin);
    }
  }, [user]);

  const playerRef = useRef(null);
  const sidebarListRef = useRef(null);
  const activeEpisodeRef = useRef(null);
  const nativeVideoRef = useRef(null);
  const hlsInstanceRef = useRef(null);
  const videoContainerRef = useRef(null);
  const lastSavedTime = useRef(0);
  const [playbackError, setPlaybackError] = useState(false);

  // Derived episode states safely computed at top-level
  const currentEpIndex = React.useMemo(() => {
    return episodes.findIndex(ep => String(ep?.id ?? '') === String(episode ?? '') || String(ep?.episode_number ?? '') === String(episode ?? ''));
  }, [episodes, episode]);

  const currentEp = currentEpIndex >= 0 ? episodes[currentEpIndex] : null;
  const currentSeason = querySeason || (currentEp ? (currentEp.season || currentEp.season_number || 1) : 1);
  const prevEpisode = currentEpIndex > 0 ? episodes[currentEpIndex - 1] : null;
  const nextEpisode = currentEpIndex >= 0 && currentEpIndex < episodes.length - 1 ? episodes[currentEpIndex + 1] : null;

  const isMovie = Boolean(
    animeInfo?.type === 'Película' ||
    animeInfo?.contentType === 'peliculas' ||
    animeInfo?.isMovie ||
    episodes.length === 1
  );

  const currentEpTitle = React.useMemo(() => {
    let title = `Episodio ${episode}`;
    if (isMovie) {
      title = episodes[0]?.title && !episodes[0].title.startsWith('Episodio 1')
        ? episodes[0].title
        : animeInfo?.title || 'Película Completa';
    } else if (currentEpIndex >= 0 && currentEp) {
      const epSeason = currentEp.season || currentEp.season_number || 1;
      const seasonEps = episodes.filter(e => (e?.season || e?.season_number || 1) === epSeason);
      const epIndexInSeason = seasonEps.findIndex(e => String(e?.id ?? '') === String(currentEp.id ?? ''));
      let cleanTitle = currentEp.title || '';
      cleanTitle = cleanTitle.replace(/^T\d+E\d+\s*-\s*/i, '');
      const indexNum = epIndexInSeason >= 0 ? epIndexInSeason + 1 : (currentEp.episode_number || episode);
      title = `T${epSeason}E${indexNum} - ${cleanTitle}`;
    }
    return title;
  }, [isMovie, episodes, episode, animeInfo?.title, currentEpIndex, currentEp]);

  const isLiveStream = Boolean(
    (animeInfo?.title && /24\/7|en vivo/i.test(animeInfo.title)) ||
    (currentEpTitle && /24\/7|en vivo/i.test(currentEpTitle)) ||
    (activeServer?.url && /streamproxy|\.p3x8|arcando/i.test(activeServer.url)) ||
    (activeServer?.name && /arcando/i.test(activeServer.name))
  );

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
      setServers(prev => prev.map(s => ({
        ...s,
        skip_start: times.skip_start,
        skip_end: times.skip_end,
        outro_start: times.outro_start
      })));
      setShowAdminPanel(false);
    } else {
      alert("Error al guardar los tiempos.");
    }
  };



  useEffect(() => {
    setResolvedFbUrl(null);
    setFbQualities(null);
    setCurrentFbQuality('');
    setShowQualityMenu(false);
    setResolvedMfUrl(null);

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

    // Auto-resolver Mediafire: Obtiene enlace fresco en tiempo real
    const isMfDirectCdn = activeServer?.url && /https?:\/\/download\d+\.mediafire\.com/i.test(activeServer.url);
    const isMf = activeServer && activeServer.url && (
      activeServer.server_name === 'MEDIAFIRE' ||
      activeServer.server_name === 'MEDIAFIRE DIRECTO' ||
      activeServer.url.includes('mediafire.com') ||
      activeServer.url.includes('/api/mediafire')
    );

    if (isMfDirectCdn) {
      setResolvedMfUrl(activeServer.url);
      setMfLoading(false);
    } else if (isMf) {
      setMfLoading(true);
      const apiUrl = activeServer.url.includes('/api/mediafire')
        ? (activeServer.url.includes('?') ? `${activeServer.url}&format=json` : `${activeServer.url}?format=json`)
        : `/api/mediafire?url=${encodeURIComponent(activeServer.url)}&format=json`;

      fetch(apiUrl)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.stream_url) {
            setResolvedMfUrl(data.stream_url);
          } else {
            setResolvedMfUrl(activeServer.url);
          }
        })
        .catch(() => setResolvedMfUrl(activeServer.url))
        .finally(() => setMfLoading(false));
    }
  }, [activeServer]);

  // Handle HLS (.m3u8) streams or MP4 native playback
  useEffect(() => {
    setPlaybackError(false);
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    const streamUrl = activeServer?.url;
    if (!streamUrl) return;

    const isLive = Boolean(
      (animeInfo?.title && /24\/7|en vivo/i.test(animeInfo.title)) ||
      (currentEpTitle && /24\/7|en vivo/i.test(currentEpTitle)) ||
      (streamUrl && /streamproxy|\.p3x8|arcando/i.test(streamUrl)) ||
      (activeServer?.name && /arcando/i.test(activeServer.name))
    );
    const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('streamproxy') || streamUrl.includes('.p3x8') || (activeServer?.name && /arcando/i.test(activeServer.name));

    if (isHls) {
      const video = nativeVideoRef.current;
      if (video) {
        if (Hls.isSupported()) {
          const hls = new Hls({
            maxBufferLength: 30,
            enableWorker: true,
            lowLatencyMode: isLive ? false : true,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            backBufferLength: 30
          });
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.log('Autoplay deferred:', e));
          });
          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              console.warn('HLS fatal error:', data.type);
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  setPlaybackError(true);
                  hls.destroy();
                  break;
              }
            }
          });
          hlsInstanceRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl;
          video.play().catch(e => console.log('Autoplay deferred:', e));
        }
      }
    }

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [activeServer?.url]);

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
    if (isLiveStream || promptShownForEp) return; // Ya se le preguntó para este episodio
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
    if (!isLiveStream && progress && progress > 5 && !promptShownForEp && nativeVideoRef.current && nativeVideoRef.current.readyState >= 1) { if (nativeVideoRef.current.currentTime < 5) { setSavedTime(progress); setShowResumePrompt(true); setPromptShownForEp(true); nativeVideoRef.current.pause(); } else { setPromptShownForEp(true); } }
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
    if (!isLiveStream && Math.abs(currentTime - lastSavedTime.current) > 15) {
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
    let timer1 = null;
    let timer2 = null;

    if (!loading && videoContainerRef.current) {
      timer1 = setTimeout(() => {
        if (!videoContainerRef.current) return;
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
      timer2 = setTimeout(() => {
        const container = sidebarListRef.current;
        const activeItem = activeEpisodeRef.current;
        if (!container || !activeItem) return;
        
        let scrollPos;
        if (window.innerWidth <= 1024) {
          // En celular/tablet, alinear el elemento activo hasta arriba
          scrollPos = activeItem.offsetTop - container.offsetTop;
        } else {
          // En PC, centrar el elemento activo en el contenedor
          scrollPos = activeItem.offsetTop - container.offsetTop - (container.clientHeight / 2) + (activeItem.clientHeight / 2);
        }
        
        container.scrollTo({
          top: Math.max(0, scrollPos),
          behavior: 'smooth'
        });
      }, 600);
    }

    return () => {
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
    };
  }, [episode, loading, episodes.length]);

  // Carga inicial del anime y sus episodios (solo cuando cambia el anime id)
  useEffect(() => {
    let isCancelled = false;
    const fetchWatchData = async () => {
      setLoading(true);
      try {
        const info = await api.getAnimeInfo(id);
        if (isCancelled) return;
        const eps = await api.getAnimeEpisodes(id, info?.totalEpisodes);
        if (isCancelled) return;
        setAnimeInfo(info);
        setEpisodes(eps || []);
      } catch (err) {
        console.error("Error al cargar datos del anime:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    fetchWatchData();
    return () => { isCancelled = true; };
  }, [id]);

  React.useEffect(() => {
    if (animeInfo) {
      document.title = `Viendo ${animeInfo.title} - ${currentEpTitle}`;
    } else {
      document.title = `Viendo Anime`;
    }
  }, [animeInfo, currentEpTitle]);

  // Efecto para actualizar el reproductor cuando cambia el episodio o los episodios cargan
  useEffect(() => {
    let isCurrent = true;

    setPromptShownForEp(false);
    setShowResumePrompt(false);
    setShowSkipIntro(false);
    setShowNextEpisode(false);
    setPlaybackError(false);
    lastSavedTime.current = 0;

    if (stallTimeoutRef.current) {
      clearTimeout(stallTimeoutRef.current);
      stallTimeoutRef.current = null;
    }

    if (nativeVideoRef.current) {
      try {
        nativeVideoRef.current.pause();
        nativeVideoRef.current.removeAttribute('src');
        nativeVideoRef.current.load();
      } catch (e) {}
    }

    if (hlsInstanceRef.current) {
      try {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      } catch (e) {}
    }

    setResolvedFbUrl(null);
    setFbQualities(null);
    setCurrentFbQuality('');
    setShowQualityMenu(false);
    setResolvedMfUrl(null);

    if (!animeInfo) return;

    const fetchServers = async () => {
      setServerLoading(true);
      setActiveServer(null);

      try {
        const curEp = episodes.find(ep => {
          const matchesEp = String(ep?.id ?? '') === String(episode ?? '') || String(ep?.episode_number ?? '') === String(episode ?? '');
          if (querySeason) {
            return matchesEp && ((ep.season || ep.season_number) === querySeason);
          }
          return matchesEp;
        });
        const seasonNumber = querySeason || (curEp ? (curEp.season || curEp.season_number) : 1);
        const correctEpisodeId = curEp ? (curEp.episode_number || curEp.id) : episode;

        // Obtenemos todos los servidores (de todos los idiomas) para este episodio
        const serversData = await api.getEpisodeServers(animeInfo.title, correctEpisodeId, 'sub', animeInfo.id, seasonNumber);
        if (!isCurrent) return;

        const normalizedServers = (serversData || []).map(s => ({
          ...s,
          lang: normalizeLang(s.lang)
        }));

        // Ordenar todos los servidores por la prioridad oficial
        const sortedServers = sortServersByPriority(normalizedServers);
        setServers(sortedServers);

        // Intentar seleccionar un idioma disponible preferido (LAT > SUB > CAST)
        const availableLangs = [...new Set(sortedServers.map(s => s.lang).filter(l => l && l !== 'none'))];
        let defaultLang = 'sub';
        if (availableLangs.includes('latino')) defaultLang = 'latino';
        else if (availableLangs.includes('sub')) defaultLang = 'sub';
        else if (availableLangs.includes('castellano')) defaultLang = 'castellano';
        else if (availableLangs.length > 0) defaultLang = availableLangs[0];

        setLanguage(defaultLang);

        const langServers = sortedServers.filter(s => s.lang === defaultLang || s.lang === 'none');
        if (langServers.length > 0) {
          setActiveServer(langServers[0]);
        } else if (sortedServers.length > 0) {
          setActiveServer(sortedServers[0]);
        } else {
          setActiveServer(null);
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
          const normTitle = (animeInfo.title || '').trim().toLowerCase();
          const filtered = currentList.filter(item =>
            String(item.id) !== String(animeInfo.id) &&
            (!normTitle || (item.title || '').trim().toLowerCase() !== normTitle)
          );
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
          const normTitle = (animeInfo.title || '').trim().toLowerCase();
          const filtered = currentList.filter(a =>
            String(a.id) !== String(animeInfo.id) &&
            (!normTitle || (a.title || '').trim().toLowerCase() !== normTitle)
          );
          return [{
            id: animeInfo.id,
            title: animeInfo.title,
            image: animeInfo.image,
            status: animeInfo.status
          }, ...filtered];
        };

        if (isSecret) {
          setSecretWatchedAnimes(updateWatchedAnimes);
        } else {
          setWatchedAnimes(updateWatchedAnimes);
        }
      } catch (err) {
        console.error("Error al obtener servidores para episodio:", err);
      } finally {
        if (isCurrent) setServerLoading(false);
      }
    };

    fetchServers();

    return () => {
      isCurrent = false;
      if (stallTimeoutRef.current) {
        clearTimeout(stallTimeoutRef.current);
        stallTimeoutRef.current = null;
      }
    };
  }, [id, episode, animeInfo, episodes, querySeason]);

  // Handler para cuando el usuario cambia de idioma manualmente
  const handleLanguageChange = (newLang) => {
      const norm = normalizeLang(newLang);
      setLanguage(norm);
      const langServers = sortServersByPriority(servers.filter(s => normalizeLang(s.lang) === norm || s.lang === 'none'));
      if (langServers.length > 0) {
          setActiveServer(langServers[0]);
      }
  };

  if (loading && !animeInfo) return <div className={styles.loading}>Cargando episodio...</div>;

  if (!loading && !animeInfo) {
    return (
      <div className={styles.watchContainer} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>No pudimos encontrar la información de este anime</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>El título no está disponible o hubo un problema de conexión.</p>
        <Link to="/" style={{ color: 'var(--primary-accent-light)', textDecoration: 'underline' }}>Volver al inicio</Link>
      </div>
    );
  }

  // Filtrar servidores a mostrar según el idioma seleccionado y orden de prioridad oficial
  const curLang = normalizeLang(language);
  const matchedServers = servers.filter(s => normalizeLang(s.lang) === curLang || s.lang === 'none');
  const visibleServers = sortServersByPriority(matchedServers.length > 0 ? matchedServers : servers);
  const availableLanguages = [...new Set(servers.map(s => normalizeLang(s.lang)).filter(l => l && l !== 'none'))];

  return (
    <div className={styles.watchContainer}>
      <div className={styles.header}>
        <Link to={`/anime/${id}`} className={styles.backLink}>
          <ChevronLeft size={20} />
          Volver a {animeInfo?.title || 'Anime'}
        </Link>
        <h1 className={styles.title}>{currentEpTitle}</h1>
      </div>

      <div className={styles.playerControls} ref={playerRef}>
        
        {availableLanguages.length > 0 && (
            <div className={styles.languageSelector}>
              <span className={styles.langLabel}>Idioma:</span>
              <div className={styles.langButtons}>
                {availableLanguages.map(l => {
                  let label = 'Subtitulado';
                  if (l === 'latino') label = 'Latino';
                  else if (l === 'castellano') label = 'Castellano';
                  else label = l.charAt(0).toUpperCase() + l.slice(1);

                  return (
                    <button 
                      key={l}
                      className={`${styles.langBtn} ${curLang === l ? styles.langActive : ''}`} 
                      onClick={() => handleLanguageChange(l)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
        )}

        <div className={styles.serverSelector}>
          <span className={styles.langLabel}>Servidor:</span>
          <div className={styles.serverButtons}>
            {visibleServers.map((server, idx) => (
              <button 
                key={idx} 
                className={`${styles.serverBtn} ${(activeServer?.url ? activeServer.url === server.url : activeServer?.name === server.name) ? styles.serverActive : ''}`} 
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
                {serverLoading ? (
                  <div className={styles.loadingServer}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '42px', height: '42px', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#ff3d00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                      <span style={{ fontSize: '1rem', color: '#e2e8f0', fontWeight: 500 }}>Cargando {currentEpTitle}...</span>
                    </div>
                  </div>
                ) : activeServer ? (
                  (activeServer?.url?.includes('facebook.com') && !activeServer.url.includes('plugins/video')) ? (
                    fbLoading ? (
                      <div className={styles.loadingServer}>Hackeando a Mark Zuckerberg... (Extrayendo MP4 de Facebook)</div>
                    ) : resolvedFbUrl ? (
                      <>
                        <video 
                          ref={nativeVideoRef}
                          key={resolvedFbUrl}
                          src={resolvedFbUrl} 
                          controls={controlsVisible}
                          playsInline
                          webkit-playsinline="true"
                          x-webkit-airplay="allow"
                          preload="metadata"
                          poster={animeInfo?.image || ''}
                          className={styles.iframe}
                          onLoadedMetadata={handleVideoLoaded}
                          onTimeUpdate={handleTimeUpdate}
                          onPause={handleTimeUpdate}
                          onWaiting={handleVideoWaiting}
                          onPlaying={handleVideoPlaying}
                          onClick={() => { if(!controlsVisible) { nativeVideoRef.current?.paused ? nativeVideoRef.current.play().catch(() => {}) : nativeVideoRef.current.pause() } }}
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
                  ) : (activeServer?.server_name === 'MEDIAFIRE' || activeServer?.url?.includes('mediafire.com') || activeServer?.url?.includes('/api/mediafire')) ? (
                    mfLoading ? (
                      <div className={styles.loadingServer}>Conectando con Mediafire... (Generando stream fresco)</div>
                    ) : (
                      <>
                        <video 
                          ref={nativeVideoRef}
                          key={resolvedMfUrl || activeServer.url}
                          src={resolvedMfUrl || activeServer.url} 
                          controls={controlsVisible}
                          playsInline
                          webkit-playsinline="true"
                          x-webkit-airplay="allow"
                          preload="metadata"
                          poster={animeInfo?.image || ''}
                          className={styles.iframe}
                          onLoadedMetadata={handleVideoLoaded}
                          onTimeUpdate={handleTimeUpdate}
                          onPause={handleTimeUpdate}
                          onWaiting={handleVideoWaiting}
                          onPlaying={() => { setPlaybackError(false); handleVideoPlaying(); }}
                          onError={(e) => {
                            console.warn("Mediafire stream load error, verificando si se puede refrescar:", e);
                            if (activeServer.url.includes('/api/mediafire') || activeServer.url.includes('mediafire.com/file/')) {
                              const apiUrl = activeServer.url.includes('/api/mediafire')
                                ? (activeServer.url.includes('?') ? `${activeServer.url}&format=json` : `${activeServer.url}?format=json`)
                                : `/api/mediafire?url=${encodeURIComponent(activeServer.url)}&format=json`;
                              fetch(apiUrl)
                                .then(r => r.json())
                                .then(d => {
                                  if (d.success && d.stream_url && d.stream_url !== resolvedMfUrl) {
                                    setResolvedMfUrl(d.stream_url);
                                  } else {
                                    setPlaybackError(true);
                                  }
                                })
                                .catch(() => setPlaybackError(true));
                            } else {
                              setPlaybackError(true);
                            }
                          }}
                          onDoubleClick={handleDoubleClick}
                          onClick={() => { if(!controlsVisible) { nativeVideoRef.current?.paused ? nativeVideoRef.current.play() : nativeVideoRef.current.pause() } }}
                        ></video>
                        {playbackError && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.85)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            color: '#fff',
                            padding: '20px',
                            textAlign: 'center'
                          }}>
                            <p style={{fontSize: '1.2rem', marginBottom: '15px'}}>No se pudo cargar el stream de Mediafire.</p>
                            <button 
                              onClick={() => {
                                setPlaybackError(false);
                                setMfLoading(true);
                                const apiUrl = activeServer.url.includes('/api/mediafire')
                                  ? (activeServer.url.includes('?') ? `${activeServer.url}&format=json` : `${activeServer.url}?format=json`)
                                  : `/api/mediafire?url=${encodeURIComponent(activeServer.url)}&format=json`;
                                fetch(apiUrl)
                                  .then(r => r.json())
                                  .then(d => {
                                    if (d.success && d.stream_url) setResolvedMfUrl(d.stream_url);
                                  })
                                  .finally(() => setMfLoading(false));
                              }}
                              style={{
                                background: '#ff3d00',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 24px',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              Reintentar Reproducción
                            </button>
                          </div>
                        )}
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
                    )
                  ) : (activeServer?.url?.includes('.mp4') || activeServer?.url?.includes('.m3u8') || activeServer?.url?.includes('streamproxy') || activeServer?.url?.includes('.p3x8') || (activeServer?.name && /arcando/i.test(activeServer.name))) ? (
                    <>
                      <video 
                        ref={nativeVideoRef}
                        key={activeServer.url}
                        src={(activeServer.url?.includes('.m3u8') || activeServer.url?.includes('streamproxy') || activeServer.url?.includes('.p3x8') || (activeServer?.name && /arcando/i.test(activeServer.name))) ? undefined : activeServer.url} 
                        controls={controlsVisible}
                        playsInline
                        webkit-playsinline="true"
                        x-webkit-airplay="allow"
                        preload="metadata"
                        poster={animeInfo?.image || ''}
                        className={styles.iframe}
                        onLoadedMetadata={handleVideoLoaded}
                        onTimeUpdate={handleTimeUpdate}
                        onPause={handleTimeUpdate}
                        onWaiting={handleVideoWaiting}
                        onPlaying={() => { setPlaybackError(false); handleVideoPlaying(); }}
                        onError={(e) => {
                          console.warn("Video stream load error:", e);
                          // Don't show error if it's already playing or if hls handles it
                          if (!activeServer?.url?.includes('.m3u8')) {
                            setPlaybackError(true);
                          }
                        }}
                        onDoubleClick={handleDoubleClick}
                        onClick={() => { if(!controlsVisible) { nativeVideoRef.current?.paused ? nativeVideoRef.current.play() : nativeVideoRef.current.pause() } }}
                      ></video>
                      {playbackError && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0,0,0,0.85)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                          color: '#fff',
                          padding: '20px',
                          textAlign: 'center'
                        }}>
                          <p style={{fontSize: '1.2rem', marginBottom: '15px'}}>No se pudo cargar el stream directamente.</p>
                          <button 
                            onClick={() => {
                              setPlaybackError(false);
                              if (nativeVideoRef.current) {
                                nativeVideoRef.current.load();
                                nativeVideoRef.current.play().catch(console.error);
                              }
                            }}
                            style={{
                              background: '#ff3d00',
                              color: '#fff',
                              border: 'none',
                              padding: '10px 24px',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            Reintentar Reproducción
                          </button>
                        </div>
                      )}
                      
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
                  <div className={styles.loadingServer}>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>No hay servidores disponibles para este episodio.</p>
                      <button 
                        onClick={() => handleLanguageChange(language)} 
                        style={{ background: '#ff3d00', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Reintentar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Toolbar */}
            <div className={styles.playerToolbar}>
              <button onClick={() => setCinemaMode(!cinemaMode)} className={styles.toolbarBtn} title="Modo Cine">
                <Lightbulb size={18} fill={cinemaMode ? 'white' : 'none'} />
                <span>{cinemaMode ? 'Encender luz' : 'Apagar luz'}</span>
              </button>
              
              {(activeServer?.url?.includes('.mp4') || activeServer?.url?.includes('.m3u8') || activeServer?.url?.includes('streamproxy') || activeServer?.url?.includes('.p3x8') || (activeServer?.name && /arcando/i.test(activeServer.name)) || activeServer?.server_name === 'MEDIAFIRE' || activeServer?.url?.includes('mediafire') || (activeServer?.url?.includes('facebook.com') && !activeServer.url.includes('plugins/video'))) && (
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

              {isAdmin && (activeServer?.url?.includes('.mp4') || activeServer?.url?.includes('.m3u8') || activeServer?.server_name === 'MEDIAFIRE' || activeServer?.url?.includes('mediafire') || (activeServer?.url?.includes('facebook.com') && !activeServer.url.includes('plugins/video')) || activeServer?.name?.includes('Multi - Audio Z')) && (
                <button 
                  onClick={() => setShowAdminPanel(!showAdminPanel)} 
                  className={styles.toolbarBtn} 
                  style={{ marginLeft: 'auto' }}
                >
                  Editar Tiempos
                </button>
              )}
            </div>

            {showAdminPanel && isAdmin && (activeServer?.url?.includes('.mp4') || activeServer?.url?.includes('.m3u8') || activeServer?.server_name === 'MEDIAFIRE' || activeServer?.url?.includes('mediafire') || (activeServer?.url?.includes('facebook.com') && !activeServer.url.includes('plugins/video')) || activeServer?.name?.includes('Multi - Audio Z')) && (
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
                  const isActive = String(ep?.id ?? '') === String(episode ?? '') || String(ep?.episode_number ?? '') === String(episode ?? '');
                  const isNext = nextEpisode && (String(ep?.id ?? '') === String(nextEpisode?.id ?? '') || String(ep?.episode_number ?? '') === String(nextEpisode?.episode_number ?? ''));
                  const thumb = animeInfo?.image || '';
                  
                  const epSeason = ep?.season || ep?.season_number || 1;
                  const seasonEps = episodes.filter(e => (e?.season || e?.season_number || 1) === epSeason);
                  const epIndexInSeason = seasonEps.findIndex(e => String(e?.id ?? '') === String(ep?.id ?? ''));
                  let cleanTitle = ep?.title || '';
                  cleanTitle = cleanTitle.replace(/^T\d+E\d+\s*-\s*/i, '');
                  const displayTitle = isMovie
                    ? (ep?.title && !ep.title.startsWith('Episodio 1') ? ep.title : animeInfo?.title || 'Película Completa')
                    : `T${epSeason}E${epIndexInSeason >= 0 ? epIndexInSeason + 1 : (ep?.episode_number || ep?.id)} - ${cleanTitle}`;

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








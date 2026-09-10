import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  ArrowLeft, Settings, X 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './CustomPlayer.module.css';

const formatTime = (seconds) => {
  if (isNaN(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const CustomPlayer = ({ movieData }) => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const streams = movieData?.streams || [];
  const [selectedChannel, setSelectedChannel] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState('MP4');
  
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 is auto

  const [showContinueModal, setShowContinueModal] = useState(false);
  const [savedTime, setSavedTime] = useState(0);

  const fixUrl = (url) => url ? url.replace('arcando.cloud//', 'arcando.cloud/') : url;

  // Initialize and check saved time
  useEffect(() => {
    if (movieData?.post_id || movieData?.title) {
      const id = movieData.post_id || movieData.title;
      const saved = localStorage.getItem(`movie_progress_${id}`);
      if (saved && parseFloat(saved) > 10) {
        setSavedTime(parseFloat(saved));
        setShowContinueModal(true);
      }
    }
  }, [movieData]);

  // Handle stream source changing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || streams.length === 0) return;

    const stream = streams[selectedChannel];
    if (!stream) return;

    let src = '';
    if (selectedFormat === 'MP4') {
      src = fixUrl(stream.proxyUrlMP4 || stream.downloadUrlMP4);
    } else {
      src = fixUrl(stream.proxyUrlHLS || stream.downloadUrlHLS);
    }

    if (!src) {
      // Fallback if requested format is not available
      const fallbackSrc = fixUrl(stream.proxyUrlMP4 || stream.downloadUrlMP4 || stream.proxyUrlHLS || stream.downloadUrlHLS);
      if (fallbackSrc) src = fallbackSrc;
      else return;
    }

    const loadVideo = () => {
      if (Hls.isSupported() && src.includes('m3u8')) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        const hls = new Hls({
          maxBufferLength: 30,
        });
        hlsRef.current = hls;
        
        hls.loadSource(src);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          const availableQualities = hls.levels.map(l => l.height);
          setQualities(availableQualities);
          if (!showContinueModal) {
            video.play().catch(e => console.log('Autoplay prevented', e));
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch(data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("fatal network error encountered, try to recover");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("fatal media error encountered, try to recover");
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });
      } else {
        // Native support (MP4 or Safari HLS)
        video.src = src;
        setQualities([]);
        if (!showContinueModal) {
          video.play().catch(e => console.log('Autoplay prevented', e));
        }
      }
    };

    loadVideo();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [selectedChannel, selectedFormat, streams, showContinueModal]);

  // Video Events
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (movieData?.post_id || movieData?.title) {
      const id = movieData.post_id || movieData.title;
      localStorage.setItem(`movie_progress_${id}`, videoRef.current.currentTime.toString());
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      setLoaded(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }
  };

  // Controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setMuted(val === 0);
    }
  };

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
      if (!newMuted && volume === 0) {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Controls Visibility Timeout
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  };

  const handleQualityChange = (e) => {
    const level = parseInt(e.target.value);
    setCurrentQuality(level);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
    }
  };

  const resumePlayback = (fromStart) => {
    setShowContinueModal(false);
    if (videoRef.current) {
      if (!fromStart) {
        videoRef.current.currentTime = savedTime;
      } else {
        videoRef.current.currentTime = 0;
      }
      videoRef.current.play().catch(e => console.log(e));
    }
  };

  if (streams.length === 0) {
    return (
      <div className={styles.playerContainer} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center', color: '#fff'}}>
          <h2>Oops!</h2>
          <p>Esta película no tiene servidores disponibles en este momento.</p>
          <button className={styles.backBtn} onClick={() => navigate(-1)} style={{margin: '1rem auto'}}>
            <ArrowLeft size={18}/> Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${styles.playerContainer} ${showControls ? styles.interacting : ''}`}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className={styles.videoElement}
        poster={movieData?.poster}
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={handleProgress}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
      />

      <div className={styles.overlay}>
        {/* TOP CONTROLS */}
        <div className={styles.topControls}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
            Salir
          </button>

          <div className={styles.selectors}>
            <div className={styles.selectorGroup}>
              <span className={styles.selectorLabel}>Formato:</span>
              <div className={styles.btnGroup}>
                <button 
                  className={`${styles.selectorBtn} ${selectedFormat === 'HLS' ? styles.active : ''}`}
                  onClick={() => setSelectedFormat('HLS')}
                >
                  HLS
                </button>
                <button 
                  className={`${styles.selectorBtn} ${selectedFormat === 'MP4' ? styles.active : ''}`}
                  onClick={() => setSelectedFormat('MP4')}
                >
                  MP4
                </button>
              </div>
            </div>

            <div className={styles.selectorGroup}>
              <span className={styles.selectorLabel}>Canal:</span>
              <div className={styles.btnGroup}>
                {streams.map((s, idx) => (
                  <button 
                    key={idx}
                    className={`${styles.selectorBtn} ${selectedChannel === idx ? styles.active : ''}`}
                    onClick={() => setSelectedChannel(idx)}
                  >
                    Opción {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER OVERLAY (Buffering or Play btn) */}
        {isBuffering && (
          <div className={styles.centerOverlay}>
            <div className={styles.spinner}></div>
            <span className={styles.loadingText}>Cargando...</span>
          </div>
        )}

        {/* BOTTOM CONTROLS */}
        <div className={styles.bottomControls}>
          <h2 className={styles.movieTitle}>{movieData?.title}</h2>
          
          <div className={styles.progressContainer}>
            <span className={styles.timeText}>{formatTime(currentTime)}</span>
            <div className={styles.progressBarWrapper} onClick={handleSeek}>
              <div 
                className={styles.progressBarLoaded} 
                style={{width: `${duration ? (loaded / duration) * 100 : 0}%`}} 
              />
              <div 
                className={styles.progressBarPlayed} 
                style={{width: `${duration ? (currentTime / duration) * 100 : 0}%`}} 
              />
            </div>
            <span className={styles.timeText}>{formatTime(duration)}</span>
          </div>

          <div className={styles.controlsRow}>
            <div className={styles.leftControls}>
              <button className={styles.controlBtn} onClick={togglePlay}>
                {playing ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor"/>}
              </button>
              <button className={styles.controlBtn} onClick={toggleMute}>
                {muted || volume === 0 ? <VolumeX size={20}/> : <Volume2 size={20}/>}
              </button>
              <input 
                type="range" 
                min="0" max="1" step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className={styles.volumeSlider}
              />
            </div>

            <div className={styles.rightControls}>
              {qualities.length > 0 && (
                <select 
                  className={styles.qualitySelect} 
                  value={currentQuality}
                  onChange={handleQualityChange}
                >
                  <option value={-1}>Auto</option>
                  {qualities.map((q, idx) => (
                    <option key={idx} value={idx}>{q}p</option>
                  ))}
                </select>
              )}
              <button className={styles.controlBtn} onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTINUE WATCHING MODAL */}
      {showContinueModal && (
        <div className={styles.centerOverlay} style={{zIndex: 50}}>
          <div className={styles.continueModal}>
            <div className={styles.modalHeader}>
              <span>CONTINUAR REPRODUCCIÓN</span>
              <button className={styles.modalClose} onClick={() => resumePlayback(true)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {movieData?.poster && <img src={movieData.poster} className={styles.modalPoster} alt="poster" />}
              <div className={styles.modalInfo}>
                <h4>{movieData?.title}</h4>
                <p>{formatTime(savedTime)} / {formatTime(duration || 0)}</p>
              </div>
            </div>
            <div className={styles.modalButtons}>
              <button className={`${styles.modalBtn} ${styles.primary}`} onClick={() => resumePlayback(false)}>
                Continuar ({formatTime(savedTime)})
              </button>
              <button className={`${styles.modalBtn} ${styles.secondary}`} onClick={() => resumePlayback(true)}>
                Desde el inicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomPlayer;

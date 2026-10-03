const fs = require('fs');
let txt = fs.readFileSync('src/pages/Watch/Watch.jsx', 'utf8');

// 1. Inject useEffect for cast_sender.js
const hookInsertStr = `const { id, episode } = useParams();
  
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
  }, []);`;

txt = txt.replace('const { id, episode } = useParams();', hookInsertStr);

// 2. Replace handleCast
const handleCastStart = txt.indexOf('const handleCast = () => {');
const handleCastEnd = txt.indexOf('  const toggleControls = () => {');
if (handleCastStart !== -1 && handleCastEnd !== -1) {
    const oldHandleCast = txt.substring(handleCastStart, handleCastEnd);
    
    const newHandleCast = `const handleCast = async () => {
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
  };\n\n`;
    
    txt = txt.replace(oldHandleCast, newHandleCast);
}

fs.writeFileSync('src/pages/Watch/Watch.jsx', txt, 'utf8');
console.log('Fixed handleCast');

const fs = require('fs');
let txt = fs.readFileSync('src/pages/Watch/Watch.jsx', 'utf8');

const target1 = `if (progress && progress > 5) { // Si vio más de 5 segundos
      setSavedTime(progress);
      setShowResumePrompt(true);
      setPromptShownForEp(true);
      if (nativeVideoRef.current) {
         nativeVideoRef.current.pause();
      }
    }`;

const replace1 = `if (progress && progress > 5) {
      if (nativeVideoRef.current && nativeVideoRef.current.currentTime < 5) {
        setSavedTime(progress);
        setShowResumePrompt(true);
        setPromptShownForEp(true);
        nativeVideoRef.current.pause();
      } else {
        setPromptShownForEp(true);
      }
    }`;

txt = txt.replace(target1, replace1);
fs.writeFileSync('src/pages/Watch/Watch.jsx', txt, 'utf8');
console.log('Replaced handleVideoLoaded');

const fs = require('fs');
let txt = fs.readFileSync('src/pages/Watch/Watch.jsx', 'utf8');

const oldHandleVideoLoaded = `const handleVideoLoaded = () => {
    if (qualityChangeTime !== null && nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = qualityChangeTime;
      nativeVideoRef.current.play();
      setQualityChangeTime(null);
      return;
    }
    if (promptShownForEp) return; // Ya se le preguntó para este episodio
    const key = \`\${id}-\${episode}\`;
    const progress = videoProgress?.[key];
    if (progress && progress > 5) { // Si vio más de 5 segundos
      setSavedTime(progress);
      setShowResumePrompt(true);
      setPromptShownForEp(true);
      if (nativeVideoRef.current) {
         nativeVideoRef.current.pause();
      }
    }
  };`;

const newHandleVideoLoaded = `const handleVideoLoaded = () => {
    if (qualityChangeTime !== null && nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = qualityChangeTime;
      nativeVideoRef.current.play();
      setQualityChangeTime(null);
      return;
    }
    if (promptShownForEp) return; 
    const key = \`\${id}-\${episode}\`;
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
  };`;

const oldUseEffect = `// Efecto para capturar el progreso si la sincronización de Supabase llega tarde
  useEffect(() => {
    const key = \`\${id}-\${episode}\`;
    const progress = videoProgress?.[key];
    if (progress && progress > 5 && !promptShownForEp && nativeVideoRef.current && nativeVideoRef.current.readyState >= 1) {
      setSavedTime(progress);
      setShowResumePrompt(true);
      setPromptShownForEp(true);
      nativeVideoRef.current.pause();
    }
  }, [videoProgress, episode, id, promptShownForEp]);`;

const newUseEffect = `// Efecto para capturar el progreso si la sincronización de Supabase llega tarde
  useEffect(() => {
    const key = \`\${id}-\${episode}\`;
    const progress = videoProgress?.[key];
    if (progress && progress > 5 && !promptShownForEp && nativeVideoRef.current && nativeVideoRef.current.readyState >= 1) {
      if (nativeVideoRef.current.currentTime < 5) {
        setSavedTime(progress);
        setShowResumePrompt(true);
        setPromptShownForEp(true);
        nativeVideoRef.current.pause();
      } else {
        // Si el usuario ya está viendo el video (o lo adelantó), cancelamos el prompt para no molestar
        setPromptShownForEp(true);
      }
    }
  }, [videoProgress, episode, id, promptShownForEp]);`;

const oldHandleStartOver = `const handleStartOver = () => {
    if (nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = 0;
    }
    const key = \`\${id}-\${episode}\`;
    setVideoProgress(prev => ({
      ...(prev || {}),
      [key]: 0
    }));
    
    setShowResumePrompt(false);
  };`;

const newHandleStartOver = `const handleStartOver = () => {
    if (nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = 0;
      nativeVideoRef.current.play().catch(e => console.log(e));
    }
    const key = \`\${id}-\${episode}\`;
    setVideoProgress(prev => ({
      ...(prev || {}),
      [key]: 0
    }));
    setShowResumePrompt(false);
  };`;

txt = txt.replace(oldHandleVideoLoaded, newHandleVideoLoaded);
txt = txt.replace(oldUseEffect, newUseEffect);
txt = txt.replace(oldHandleStartOver, newHandleStartOver);

fs.writeFileSync('src/pages/Watch/Watch.jsx', txt, 'utf8');
console.log('Fixed prompts!');

const fs = require('fs');
let txt = fs.readFileSync('src/pages/Watch/Watch.jsx', 'utf8');

// 1. handleVideoLoaded fix
let startIdx = txt.indexOf('if (progress && progress > 5) { // Si vio');
if (startIdx === -1) {
    startIdx = txt.indexOf('if (progress && progress > 5) {'); // try without comment
}
if (startIdx !== -1) {
    let endIdx = txt.indexOf('    }', startIdx + 100);
    if (endIdx !== -1) {
        const replaceStr = `if (progress && progress > 5) {
      if (nativeVideoRef.current && nativeVideoRef.current.currentTime < 5) {
        setSavedTime(progress);
        setShowResumePrompt(true);
        setPromptShownForEp(true);
        nativeVideoRef.current.pause();
      } else {
        setPromptShownForEp(true);
      }
    }`;
        // we assume endIdx points to the closing brace of the if block
        txt = txt.substring(0, startIdx) + replaceStr + txt.substring(endIdx + 5);
        console.log("Replaced handleVideoLoaded");
    }
} else {
    console.log("Could not find startIdx for handleVideoLoaded");
}

fs.writeFileSync('src/pages/Watch/Watch.jsx', txt, 'utf8');

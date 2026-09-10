const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\manue\\.gemini\\antigravity\\brain\\f0330c5c-c1fc-40b4-bd3b-0c43bfe69646\\.system_generated\\steps\\4183\\content.md', 'utf-8');

const iframeMatches = [...content.matchAll(/<iframe.*?src=[\'\"](.*?)[\'\"].*?>/g)].map(m => m[1]);
console.log('Iframes:', iframeMatches);

const liMatches = [...content.matchAll(/<li.*?>(.*?)<\/li>/gs)].map(m => m[1]);
console.log('LIs:', liMatches.filter(l => l.toLowerCase().includes('server') || l.toLowerCase().includes('play') || l.toLowerCase().includes('option') || l.toLowerCase().includes('latino') || l.toLowerCase().includes('sub')));

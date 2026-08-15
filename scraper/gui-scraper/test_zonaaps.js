const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\manue\\.gemini\\antigravity\\brain\\f0330c5c-c1fc-40b4-bd3b-0c43bfe69646\\.system_generated\\steps\\4165\\content.md', 'utf-8');
const links = [...content.matchAll(/href=[\'\"]?(https:\/\/zonaaps\.com\/episodes\/[^\'\">]+)/g)].map(m => m[1]);
console.log('Episodios encontrados:', [...new Set(links)]);

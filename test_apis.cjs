const https = require('https');

const endpoints = [
  'https://api-consumet.vercel.app/anime/gogoanime/naruto',
  'https://api.aniwatch.co/anime/search?q=naruto',
  'https://aniwatch-api-v1-0.onrender.com/api/v2/hianime/search?q=naruto',
  'https://api.consumet.org/meta/anilist/naruto'
];

endpoints.forEach(url => {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`\n--- ${url} ---`);
      console.log(`Status: ${res.statusCode}`);
      console.log(data.substring(0, 100) + '...');
    });
  }).on('error', err => {
    console.log(`\n--- ${url} ---`);
    console.log(`Error: ${err.message}`);
  });
});

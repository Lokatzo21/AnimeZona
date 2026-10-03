fetch('https://dondever.net/tvshows/el-mentalista/')
  .then(r=>r.text())
  .then(t=> {
    const fs = require('fs');
    fs.writeFileSync('scraper/dondever_test.html', t, 'utf8');
    console.log('Saved');
  });

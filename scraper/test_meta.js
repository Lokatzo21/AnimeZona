fetch('https://dondever.net/tvshows/el-mentalista/')
  .then(r=>r.text())
  .then(t=> {
    console.log('IMAGE:', t.match(/<meta property="og:image" content="(.*?)"/)?.[1]);
    console.log('DESC:', t.match(/<meta property="og:description" content="(.*?)"/)?.[1]);
  });

const { Client } = require('pg');

async function scrapeTioAnime(searchTitle, episodeNumber) {
  try {
    console.log(`[+] Buscando "${searchTitle}" en TioAnime...`);
    // 1. Buscar el anime
    const searchUrl = `https://tioanime.com/directorio?q=${encodeURIComponent(searchTitle)}`;
    const searchRes = await fetch(searchUrl);
    const searchHtml = await searchRes.text();

    // Extraer el link del primer resultado
    // href="/anime/solo-leveling"
    const animeMatch = searchHtml.match(/href="\/anime\/([^"]+)"/);
    if (!animeMatch) {
      console.log("[-] No se encontró el anime en TioAnime.");
      return null;
    }
    const slug = animeMatch[1];
    console.log(`[+] Encontrado: ${slug}`);

    // 2. Ir a la página del episodio
    // TioAnime usa el formato /ver/slug-episodio
    const epUrl = `https://tioanime.com/ver/${slug}-${episodeNumber}`;
    console.log(`[+] Obteniendo episodio: ${epUrl}`);
    
    const epRes = await fetch(epUrl);
    const epHtml = await epRes.text();

    // 3. Extraer el array de videos
    // var videos = [["Fembed","https:\/\/fembed.com\/v\/..."]];
    const videosMatch = epHtml.match(/var videos = (\[\[.*?\]\]);/);
    
    if (!videosMatch) {
      console.log("[-] No se encontraron videos en la página del episodio. Quizás el episodio no existe o la página tiene otra estructura.");
      return null;
    }

    const videosArray = JSON.parse(videosMatch[1]);
    console.log(`[+] Se encontraron ${videosArray.length} opciones de video.`);

    // TioAnime agrupa los servidores. videosArray es algo como:
    // [ [1, "https://mega.nz/..."], [2, "https://fembed..."] ] o similar.
    // Usaremos el primer enlace que encontremos para guardarlo en Supabase.
    
    let bestVideoUrl = null;
    let bestServerName = null;
    
    for (const v of videosArray) {
      const serverCode = v[0]; // Puede ser un numero o string de servidor
      const rawUrl = v[1]; // El iframe URL
      
      // Filtramos urls válidas (reproductores)
      if (rawUrl && rawUrl.includes("http")) {
        bestVideoUrl = rawUrl.replace(/\\\//g, "/"); // limpiar escapes
        bestServerName = `TioAnime Server ${serverCode}`;
        break; // tomamos el primero
      }
    }

    if (bestVideoUrl) {
       console.log(`[+] Video seleccionado: ${bestVideoUrl}`);
       return { url: bestVideoUrl, server: bestServerName };
    } else {
       console.log("[-] No se pudo decodificar la URL del video.");
       return null;
    }

  } catch (err) {
    console.error("[-] Error en el scraper:", err);
    return null;
  }
}

async function saveToSupabase(searchTitle, episodeNumber, serverName, videoUrl) {
  const client = new Client({
    connectionString: "postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres"
  });

  try {
    await client.connect();
    
    // Guardar en la base de datos
    await client.query(`
      INSERT INTO anime_episodes (search_title, episode_number, server_name, video_url)
      VALUES ($1, $2, $3, $4)
    `, [searchTitle.toLowerCase(), episodeNumber, serverName, videoUrl]);
    
    console.log(`[+] ¡Guardado exitosamente en Supabase!`);
    console.log(`[+] Ahora puedes ir a tu página y reproducir el Episodio ${episodeNumber} de ${searchTitle}.`);
  } catch (err) {
    console.error("[-] Error al guardar en base de datos:", err.message);
  } finally {
    await client.end();
  }
}

async function main() {
  const title = process.argv[2];
  const episode = parseInt(process.argv[3]);

  if (!title || !episode) {
    console.log("Uso: node auto_scraper.js \"nombre del anime\" numero_episodio");
    console.log("Ejemplo: node auto_scraper.js \"solo leveling\" 2");
    return;
  }

  const videoData = await scrapeTioAnime(title, episode);
  if (videoData) {
    await saveToSupabase(title, episode, videoData.server, videoData.url);
  }
}

main();

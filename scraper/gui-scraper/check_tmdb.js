const TMDB_API_KEY = "da808c1d560c5717bc2dcb01fde6cc60";

async function run() {
  const res = await fetch(`https://api.themoviedb.org/3/tv/278043?api_key=${TMDB_API_KEY}&language=es-MX`);
  const data = await res.json();
  console.log("Name:", data.name);
  console.log("Number of episodes:", data.number_of_episodes);
  console.log("Seasons:", data.number_of_seasons);
}
run();

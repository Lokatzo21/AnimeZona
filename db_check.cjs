const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/anime_db' });
client.connect().then(async () => {
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'custom_animes'");
    console.log(res.rows);
    process.exit(0);
});

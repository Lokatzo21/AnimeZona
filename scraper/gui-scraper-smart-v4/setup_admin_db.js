const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:M@nuel21M@xMel&&Negra@db.xmlobzzlszwprjtrkicv.supabase.co:5432/postgres' });

async function setup() {
  await client.connect();
  
  console.log('Creando vista user_profiles...');
  await client.query(`
    CREATE OR REPLACE VIEW public.user_profiles AS
    SELECT id, email, created_at, last_sign_in_at FROM auth.users;
    GRANT SELECT ON public.user_profiles TO anon, authenticated;
  `);
  
  console.log('Creando tabla admins...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.admins (
      email text PRIMARY KEY,
      created_at timestamp with time zone DEFAULT now()
    );
    GRANT SELECT, INSERT, DELETE ON public.admins TO anon, authenticated;
  `);
  
  console.log('Insertando admins por defecto...');
  await client.query(`
    INSERT INTO public.admins (email) VALUES 
      ('manuelminuttimoreno21@gmail.com'),
      ('manuelminuttimoreno@gmail.com'),
      ('manuelminuttimoreno2109@gmail.com'),
      ('manuelminuttimoreno2109uni@gmail.com')
    ON CONFLICT DO NOTHING;
  `);
  
  console.log('Creando tabla custom_animes...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.custom_animes (
      id text PRIMARY KEY,
      title text NOT NULL,
      image text,
      description text,
      total_episodes integer,
      genres text[],
      status text,
      is_secret boolean DEFAULT false,
      episode_names jsonb,
      created_at timestamp with time zone DEFAULT now()
    );
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_animes TO anon, authenticated;
  `);
  
  console.log('Setup completado con exito.');
  await client.end();
}

setup().catch(console.error);

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CustomPlayer from '../../components/CustomPlayer/CustomPlayer';
import styles from './MovieWatch.module.css';

const MovieWatch = () => {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url');
  const navigate = useNavigate();

  const [movieData, setMovieData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchMovieData = async () => {
      if (!url) {
        setError('No se proporcionó URL de película.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'success') {
          const fixUrl = (u) => u ? u.replace('arcando.cloud//', 'arcando.cloud/') : u;
          data.poster = fixUrl(data.poster);
          
          setMovieData(data);
          document.title = `Viendo: ${data.title}`;
        } else {
          setError('Error al cargar la película.');
        }
      } catch (err) {
        console.error(err);
        setError('Error de red al extraer película.');
      }
      setLoading(false);
    };

    fetchMovieData();
  }, [url]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando película...</p>
      </div>
    );
  }

  if (error || !movieData) {
    return (
      <div className={styles.errorContainer}>
        <h3>{error || 'No se encontró la película.'}</h3>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>Volver</button>
      </div>
    );
  }

  return (
    <div className={styles.watchContainer}>
      <CustomPlayer movieData={movieData} />
      
      <div className={styles.controlsAndInfo}>
        <div className={styles.movieDetails}>
          <h3>Sinopsis</h3>
          <p>{movieData.description}</p>
        </div>
      </div>
    </div>
  );
};

export default MovieWatch;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Users, PlusCircle, CheckCircle } from 'lucide-react';
import { api, TMDB_GENRES } from '../../services/api';
import styles from './Admin.module.css';

const Admin = () => {
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('usuarios');

  // Users Tab State
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Add Anime Form State
  const [animeForm, setAnimeForm] = useState({
    title: '',
    image: '',
    description: '',
    total_episodes: 12,
    status: 'En emisión',
    is_secret: false,
    genres: []
  });
  const [episodeNames, setEpisodeNames] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Si estamos en localhost, autoverificar
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setIsVerified(true);
    }
  }, []);

  useEffect(() => {
    if (isVerified && activeTab === 'usuarios') {
      loadUsersData();
    }
  }, [isVerified, activeTab]);

  const loadUsersData = async () => {
    setLoadingUsers(true);
    try {
      const usersData = await api.getUsers();
      const adminsData = await api.getAdmins();
      setUsers(usersData);
      setAdmins(adminsData.map(a => a.email));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const isAdmin = await api.isAdmin(emailInput.trim());
    if (isAdmin) {
      setIsVerified(true);
    } else {
      setLoginError('No tienes permisos de administrador o el correo es incorrecto.');
    }
  };

  const handleToggleAdmin = async (email, makeAdmin) => {
    await api.toggleAdmin(email, makeAdmin);
    loadUsersData();
  };

  const handleAnimeChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAnimeForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGenreToggle = (genre) => {
    setAnimeForm(prev => {
      if (prev.genres.includes(genre)) {
        return { ...prev, genres: prev.genres.filter(g => g !== genre) };
      }
      return { ...prev, genres: [...prev.genres, genre] };
    });
  };

  const handleEpisodeNameChange = (epNumber, name) => {
    setEpisodeNames(prev => ({
      ...prev,
      [epNumber]: name
    }));
  };

  const handleAddAnime = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...animeForm,
        episode_names: episodeNames
      };
      await api.addCustomAnime(dataToSave);
      setSuccessMsg('¡Anime añadido correctamente al catálogo!');
      setAnimeForm({
        title: '', image: '', description: '', total_episodes: 12, status: 'En emisión', is_secret: false, genres: []
      });
      setEpisodeNames({});
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      alert('Error al guardar el anime');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVerified) {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.header}>
          <button className={styles.returnBtn} onClick={() => navigate('/')}>
            <ArrowLeft size={18} /> Volver
          </button>
        </div>
        <div className={styles.loginContainer}>
          <div className={styles.loginBox}>
            <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
            <h2>Acceso Restringido</h2>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>Solo personal autorizado.</p>
            <form onSubmit={handleLogin}>
              <input 
                type="email" 
                className={styles.input} 
                placeholder="Ingresa tu correo de Admin..." 
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
              />
              {loginError && <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>{loginError}</p>}
              <button type="submit" className={styles.submitBtn} style={{ marginTop: '1rem' }}>
                Verificar
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ShieldAlert className={styles.icon} size={32} />
          <div>
            <h1 className={styles.title}>Panel de Administración</h1>
            <p className={styles.subtitle}>Gestión de usuarios y animes personalizados</p>
          </div>
        </div>
        <button className={styles.returnBtn} onClick={() => navigate('/')}>
          <ArrowLeft size={18} /> Salir del Panel
        </button>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'usuarios' ? styles.active : ''}`}
          onClick={() => setActiveTab('usuarios')}
        >
          <Users size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '5px' }}/>
          Usuarios
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'animes' ? styles.active : ''}`}
          onClick={() => setActiveTab('animes')}
        >
          <PlusCircle size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '5px' }}/>
          Añadir Anime Custom
        </button>
      </div>

      {activeTab === 'usuarios' && (
        <div>
          <h2>Usuarios Registrados ({users.length})</h2>
          {loadingUsers ? <p>Cargando...</p> : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Fecha de Registro</th>
                    <th>Rol</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isAdmin = admins.includes(u.email);
                    return (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          {isAdmin ? (
                            <span className={`${styles.badge} ${styles.badgeAdmin}`}>ADMIN</span>
                          ) : (
                            <span className={`${styles.badge} ${styles.badgeUser}`}>USER</span>
                          )}
                        </td>
                        <td>
                          {isAdmin ? (
                            <button 
                              className={`${styles.actionBtn} ${styles.btnRemoveAdmin}`}
                              onClick={() => handleToggleAdmin(u.email, false)}
                            >
                              Quitar Admin
                            </button>
                          ) : (
                            <button 
                              className={`${styles.actionBtn} ${styles.btnMakeAdmin}`}
                              onClick={() => handleToggleAdmin(u.email, true)}
                            >
                              Hacer Admin
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'animes' && (
        <div>
          <h2>Crear Anime Personalizado</h2>
          <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>Estos animes se añadirán directamente a tu base de datos y aparecerán en la búsqueda (a menos que sean secretos).</p>
          
          {successMsg && (
            <div style={{ background: '#059669', color: 'white', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={20} /> {successMsg}
            </div>
          )}

          <form onSubmit={handleAddAnime}>
            <div className={styles.formGroup}>
              <label>Título del Anime</label>
              <input type="text" name="title" className={styles.input} value={animeForm.title} onChange={handleAnimeChange} required placeholder="Ej: Link Click (Donghua)" />
            </div>

            <div className={styles.formGroup}>
              <label>URL de Portada (Imagen Vertical)</label>
              <input type="url" name="image" className={styles.input} value={animeForm.image} onChange={handleAnimeChange} required placeholder="https://..." />
            </div>

            <div className={styles.formGroup}>
              <label>Sinopsis</label>
              <textarea name="description" className={`${styles.input} ${styles.textarea}`} value={animeForm.description} onChange={handleAnimeChange} required placeholder="De qué trata el anime..."></textarea>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className={styles.formGroup}>
                <label>Estado</label>
                <select name="status" className={styles.input} value={animeForm.status} onChange={handleAnimeChange}>
                  <option value="En emisión">En emisión</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Total de Episodios</label>
                <input type="number" name="total_episodes" min="1" max="1000" className={styles.input} value={animeForm.total_episodes} onChange={handleAnimeChange} required />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Etiquetas / Géneros</label>
              <div className={styles.genresGrid}>
                {Object.keys(TMDB_GENRES).map(genre => (
                  <label key={genre} className={styles.genreLabel}>
                    <input 
                      type="checkbox" 
                      checked={animeForm.genres.includes(genre)}
                      onChange={() => handleGenreToggle(genre)}
                    />
                    {genre}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel} title="Los animes secretos no aparecen en la página principal ni en el buscador para los usuarios normales.">
                <input type="checkbox" name="is_secret" checked={animeForm.is_secret} onChange={handleAnimeChange} />
                🚫 Marcar como Anime Secreto (Oculto)
              </label>
            </div>

            <div className={styles.formGroup}>
              <label style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>Nombres de Episodios (Opcional)</label>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Si los dejas en blanco, se llamarán automáticamente "T1E1", "T1E2", etc.</p>
              <div className={styles.episodesGrid}>
                {Array.from({ length: animeForm.total_episodes || 0 }).map((_, i) => (
                  <div key={i} className={styles.episodeInput}>
                    <span>Episodio {i + 1}</span>
                    <input 
                      type="text" 
                      className={styles.input} 
                      placeholder={`T1E${i + 1} - ...`} 
                      value={episodeNames[i + 1] || ''}
                      onChange={(e) => handleEpisodeNameChange(i + 1, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isSubmitting} style={{ marginTop: '2rem' }}>
              {isSubmitting ? 'Guardando...' : 'Añadir Anime'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Admin;

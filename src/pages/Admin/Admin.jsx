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

  // Custom Animes Tab State
  const [customAnimes, setCustomAnimes] = useState([]);

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
  const [editingAnimeId, setEditingAnimeId] = useState(null);
  const [episodeNames, setEpisodeNames] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setIsVerified(true);
    }
  }, []);

  useEffect(() => {
    if (isVerified) {
      if (activeTab === 'usuarios') {
        loadUsersData();
      } else if (activeTab === 'lista_animes') {
        loadCustomAnimes();
      }
    }
  }, [isVerified, activeTab]);

  const loadCustomAnimes = async () => {
    try {
      const data = await api.getCustomAnimes(true);
      setCustomAnimes(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditAnime = (anime) => {
    setEditingAnimeId(anime.id);
    setAnimeForm({
      title: anime.title || '',
      image: anime.image || '',
      description: anime.description || '',
      total_episodes: anime.total_episodes || 12,
      status: anime.status || 'En emisión',
      is_secret: anime.is_secret || false,
      genres: anime.genres || []
    });
    setEpisodeNames(anime.episode_names || {});
    setActiveTab('animes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAnime = async (id) => {
    if (window.confirm('¿Seguro que quieres eliminar este anime?')) {
      await api.deleteCustomAnime(id);
      loadCustomAnimes();
    }
  };

  const loadUsersData = async () => {
    setLoadingUsers(true);
    try {
      const usersList = await api.getUsers();
      const adminsList = await api.getAdmins();
      setUsers(usersList);
      setAdmins(adminsList.map(a => a.email));
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
    if (email === 'manuelminuttimoreno21@gmail.com' && !makeAdmin) {
      alert('No puedes quitar el rol de admin al usuario principal.');
      return;
    }
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

  const handleAddCustomAnime = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg('');
    try {
      const payload = {
        ...animeForm,
        total_episodes: parseInt(animeForm.total_episodes, 10),
        episode_names: episodeNames
      };
      
      if (editingAnimeId) {
        await api.updateCustomAnime(editingAnimeId, payload);
        setSuccessMsg('¡Anime actualizado correctamente!');
      } else {
        await api.addCustomAnime(payload);
        setSuccessMsg('¡Anime añadido correctamente al catálogo!');
      }

      setAnimeForm({
        title: '',
        image: '',
        description: '',
        total_episodes: 12,
        status: 'En emisión',
        is_secret: false,
        genres: []
      });
      setEpisodeNames({});
      setEditingAnimeId(null);
      
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (e) {
      alert('Error al guardar el anime.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingAnimeId(null);
    setAnimeForm({
      title: '',
      image: '',
      description: '',
      total_episodes: 12,
      status: 'En emisión',
      is_secret: false,
      genres: []
    });
    setEpisodeNames({});
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
        <button 
          className={`${styles.tabBtn} ${activeTab === 'lista_animes' ? styles.active : ''}`}
          onClick={() => setActiveTab('lista_animes')}
        >
          Ver Animes Añadidos
        </button>
      </div>

      {activeTab === 'usuarios' && (
        <div>
          <h2>Gestión de Administradores y Usuarios</h2>
          
          <div style={{ marginBottom: '2rem', padding: '1rem', background: '#1f2937', borderRadius: '0.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Añadir nuevo Administrador</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Ingresa un correo para darle permisos de admin (incluso si no se ha registrado aún).</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const email = formData.get('newAdminEmail');
              if (email) {
                handleToggleAdmin(email, true);
                e.target.reset();
              }
            }} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <input type="email" name="newAdminEmail" className={styles.input} placeholder="correo@ejemplo.com" required style={{ flex: 1 }} />
              <button type="submit" className={styles.submitBtn} style={{ width: 'auto', padding: '0 1.5rem' }}>Conceder Admin</button>
            </form>
          </div>

          <h2>Usuarios en el Sistema</h2>
          {loadingUsers ? <p>Cargando...</p> : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Estado de Registro</th>
                    <th>Rol</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allEmails = new Set([...users.map(u => u.email), ...admins]);
                    const displayUsers = Array.from(allEmails).map(email => {
                      const userRecord = users.find(u => u.email === email);
                      return {
                        id: userRecord ? userRecord.id : email,
                        email,
                        registered: !!userRecord,
                        created_at: userRecord ? userRecord.created_at : null
                      };
                    });

                    return displayUsers.map(u => {
                      const isAdmin = admins.includes(u.email);
                      const isMainAdmin = u.email === 'manuelminuttimoreno21@gmail.com';
                      return (
                        <tr key={u.id}>
                          <td>{u.email}</td>
                          <td>
                            {u.registered ? (
                              <span style={{ color: '#10b981' }}>Registrado ({new Date(u.created_at).toLocaleDateString()})</span>
                            ) : (
                              <span style={{ color: '#f59e0b' }}>No Registrado</span>
                            )}
                          </td>
                          <td>
                            {isAdmin ? (
                              <span className={`${styles.badge} ${styles.badgeAdmin}`} style={isMainAdmin ? { background: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px' } : {}}>
                                {isMainAdmin && <ShieldAlert size={14} />}
                                {isMainAdmin ? 'MAIN ADMIN' : 'ADMIN'}
                              </span>
                            ) : (
                              <span className={`${styles.badge} ${styles.badgeUser}`}>USER</span>
                            )}
                          </td>
                          <td>
                            {isAdmin ? (
                              !isMainAdmin && (
                                <button 
                                  className={`${styles.actionBtn} ${styles.btnRemoveAdmin}`}
                                  onClick={() => handleToggleAdmin(u.email, false)}
                                >
                                  Quitar Admin
                                </button>
                              )
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
                    });
                  })()}
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

          <form onSubmit={handleAddCustomAnime}>
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

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : (editingAnimeId ? 'Actualizar Anime' : 'Añadir Anime')}
              </button>
              {editingAnimeId && (
                <button type="button" className={styles.submitBtn} style={{ background: '#6b7280' }} onClick={handleCancelEdit}>
                  Cancelar Edición
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'lista_animes' && (
        <div>
          <h2>Animes Personalizados Añadidos ({customAnimes.length})</h2>
          {customAnimes.length === 0 ? (
            <p className={styles.emptyMsg}>Aún no has añadido ningún anime personalizado.</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Portada</th>
                    <th>Título</th>
                    <th>Episodios</th>
                    <th>Estado</th>
                    <th>Secreto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {customAnimes.map(anime => (
                    <tr key={anime.id}>
                      <td>
                        <img src={anime.image} alt={anime.title} style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                      </td>
                      <td>{anime.title}</td>
                      <td>{anime.totalEpisodes}</td>
                      <td>{anime.status}</td>
                      <td>
                        {anime.isSecret ? (
                          <span className={`${styles.badge} ${styles.badgeRemoveAdmin}`} style={{ background: '#ef4444', color: 'white' }}>Sí</span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeUser}`}>No</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className={`${styles.actionBtn}`}
                            style={{ background: '#3b82f6', color: 'white' }}
                            onClick={() => handleEditAnime(anime)}
                          >
                            Editar
                          </button>
                          <button 
                            className={`${styles.actionBtn} ${styles.btnRemoveAdmin}`}
                            onClick={() => handleDeleteAnime(anime.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin;

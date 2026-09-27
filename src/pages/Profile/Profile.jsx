import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useAuth } from '../../contexts/AuthContext';
import AnimeCard from '../../components/AnimeCard/AnimeCard';
import { AVATARS, DEFAULT_AVATAR } from '../../config/avatars';
import styles from './Profile.module.css';

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateProfile, signOut } = useAuth();
  const [continueWatching, setContinueWatching] = useLocalStorage('continueWatching', []);
  const [hiddenAnimes, setHiddenAnimes] = useLocalStorage('hiddenAnimes', []);
  const [favoriteAnimes, setFavoriteAnimes] = useLocalStorage('favoriteAnimes', []);
  const [watchedAnimes, setWatchedAnimes] = useLocalStorage('watchedAnimes', []);
  const [customLists, setCustomLists] = useLocalStorage('customLists', []);
  const [activeTab, setActiveTab] = useState('historial');

  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editUsername, setEditUsername] = useState(user?.user_metadata?.username || '');
  const [editAvatar, setEditAvatar] = useState(user?.user_metadata?.avatar_url || DEFAULT_AVATAR.url);

  const handleRestore = (anime) => {
    setHiddenAnimes((hiddenAnimes || []).filter(a => a.id !== anime.id));
  };

  React.useEffect(() => {
    if (activeTab === 'historial') {
      document.title = "Mi Historial | AnimeZona";
    } else if (activeTab === 'favoritos') {
      document.title = "Mis Favoritos | AnimeZona";
    } else if (activeTab === 'ocultos') {
      document.title = "Animes Ocultos | AnimeZona";
    } else if (activeTab === 'cuenta') {
      document.title = "Mi Cuenta | AnimeZona";
    }
  }, [activeTab]);

  const handleToggleFavorite = (anime) => {
      const isFav = (favoriteAnimes || []).some(a => a.id === anime.id);
      if (isFav) {
        setFavoriteAnimes((favoriteAnimes || []).filter(a => a.id !== anime.id));
      } else {
        setFavoriteAnimes([{
          id: anime.id,
          title: anime.title,
          image: anime.image,
        }, ...(favoriteAnimes || [])]);
      }
  };

  const handleRemoveContinue = (animeId) => {
    setContinueWatching((continueWatching || []).filter(a => a.id !== animeId));
  };

  const handleSaveProfile = async () => {
    await updateProfile({ username: editUsername, avatarUrl: editAvatar });
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const currentUsername = user?.user_metadata?.username || 'Otaku Misterioso';
  const currentAvatarUrl = user?.user_metadata?.avatar_url || DEFAULT_AVATAR.url;

  return (
    <div className={styles.profileContainer}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          <img src={currentAvatarUrl} alt="Avatar" className={styles.avatarImage} />
        </div>
        <div className={styles.userInfo}>
          <h1 className={styles.username}>{currentUsername}</h1>
          <p className={styles.emailText}>{user?.email}</p>
          <p className={styles.stats}>{continueWatching.length} Animes en Historial</p>
          <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
            Editar Perfil
          </button>
        </div>
      </div>

      {isEditing && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Editar Perfil</h2>
            <div className={styles.formGroup}>
              <label>Nombre de Usuario</label>
              <input 
                type="text" 
                value={editUsername} 
                onChange={e => setEditUsername(e.target.value)} 
                placeholder="Otaku Misterioso"
                className={styles.input}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Selecciona un Avatar</label>
              <div className={styles.avatarGrid}>
                {AVATARS.map(av => (
                  <img 
                    key={av.id}
                    src={av.url} 
                    alt={av.name}
                    title={av.name}
                    className={`${styles.avatarOption} ${editAvatar === av.url ? styles.selected : ''}`}
                    onClick={() => setEditAvatar(av.url)}
                  />
                ))}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setIsEditing(false)}>Cancelar</button>
              <button className={styles.saveBtn} onClick={handleSaveProfile}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'historial' ? styles.active : ''}`}
          onClick={() => setActiveTab('historial')}
        >
          Historial
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'favoritos' ? styles.active : ''}`}
          onClick={() => setActiveTab('favoritos')}
        >
          Favoritos
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'listas' ? styles.active : ''}`}
          onClick={() => setActiveTab('listas')}
        >
          Mis Listas
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'ocultos' ? styles.active : ''}`}
          onClick={() => setActiveTab('ocultos')}
          style={{ color: activeTab === 'ocultos' ? '#ff4444' : 'inherit' }}
        >
          Animes Ocultos
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'cuenta' ? styles.active : ''}`}
          onClick={() => setActiveTab('cuenta')}
        >
          Cuenta
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'historial' && (
          <div>
            <h2 className={styles.sectionTitle}>Último capítulo visto</h2>
            {(continueWatching || []).length === 0 ? (
              <p className={styles.emptyMsg}>No tienes episodios pendientes. ¡Ve a ver un anime!</p>
            ) : (
              <div className={styles.grid}>
                {(continueWatching || []).map(anime => (
                  <AnimeCard 
                    key={`history-${anime.id}`} 
                    anime={anime} 
                    onRemoveContinue={handleRemoveContinue}
                  />
                ))}
              </div>
            )}

            <h2 className={styles.sectionTitle} style={{ marginTop: '3rem' }}>Animes Vistos</h2>
            {(watchedAnimes || []).length === 0 ? (
              <p className={styles.emptyMsg}>Aún no has marcado ningún anime completo como visto.</p>
            ) : (
              <div className={styles.grid}>
                {(watchedAnimes || []).map(anime => (
                  <AnimeCard 
                    key={`watched-${anime.id}`} 
                    anime={anime} 
                    isWatched={true} 
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'favoritos' && (
          <div>
            <h2 className={styles.sectionTitle}>Mis Favoritos</h2>
            {(favoriteAnimes || []).length === 0 ? (
              <p className={styles.emptyMsg}>No tienes ningún anime en favoritos.</p>
            ) : (
              <div className={styles.grid}>
                {(favoriteAnimes || []).map(anime => (
                  <AnimeCard 
                    key={`fav-${anime.id}`} 
                    anime={anime}
                    isFavorite={true}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'listas' && (
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 className={styles.sectionTitle} style={{marginBottom: 0}}>Mis Listas Personales</h2>
              <button 
                onClick={() => {
                  const name = prompt("Nombre de la nueva lista:");
                  if(name) setCustomLists([...(customLists || []), {id: `list-${Date.now()}`, name, animes: []}]);
                }}
                className={styles.editBtn}
                style={{padding: '5px 15px'}}
              >
                + Crear Lista
              </button>
            </div>
            
            {(customLists || []).length === 0 ? (
              <p className={styles.emptyMsg}>No has creado ninguna lista aún. (Ej: "Isekais", "Por ver")</p>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '30px'}}>
                {(customLists || []).map(list => (
                  <div key={list.id} style={{background: '#1e293b', padding: '20px', borderRadius: '10px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                      <h3 style={{color: 'white', margin: 0, fontSize: '1.2rem'}}>{list.name} <span style={{fontSize:'0.9rem', color:'#94a3b8'}}>({list.animes?.length || 0} animes)</span></h3>
                      <button 
                        onClick={() => {
                          if(confirm(`¿Eliminar la lista "${list.name}"?`)) {
                            setCustomLists((customLists || []).filter(l => l.id !== list.id));
                          }
                        }}
                        style={{background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer'}}
                      >
                        Eliminar Lista
                      </button>
                    </div>
                    {(!list.animes || list.animes.length === 0) ? (
                       <p style={{color: '#94a3b8', fontSize: '0.9rem'}}>Lista vacía.</p>
                    ) : (
                      <div className={styles.grid}>
                        {list.animes.map(anime => (
                          <div key={`${list.id}-${anime.id}`} style={{position: 'relative'}}>
                            <AnimeCard anime={anime} />
                            <button 
                              onClick={() => {
                                setCustomLists(customLists.map(l => {
                                  if(l.id === list.id) return { ...l, animes: l.animes.filter(a => a.id !== anime.id) };
                                  return l;
                                }));
                              }}
                              style={{position: 'absolute', top: '5px', right: '5px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', zIndex: 10}}
                              title="Quitar de la lista"
                            >
                              X
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ocultos' && (
          <div>
            <h2 className={styles.sectionTitle} style={{ color: '#ff4444' }}>Animes Ocultos</h2>
            <p style={{ color: '#a0a0a0', marginBottom: '20px' }}>
              Estos animes ya no aparecerán en tu página de Inicio ni en las búsquedas. Pasa el ratón sobre uno y haz clic en "Restaurar Anime" para deshacerlo.
            </p>
            {(hiddenAnimes || []).length === 0 ? (
              <p className={styles.emptyMsg}>No tienes ningún anime oculto.</p>
            ) : (
              <div className={styles.grid}>
                {(hiddenAnimes || []).map(anime => (
                  <AnimeCard 
                    key={`hidden-${anime.id}`} 
                    anime={anime} 
                    onRestore={handleRestore}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cuenta' && (
          <div className={styles.accountSection}>
            <h2 className={styles.sectionTitle}>Mi Cuenta</h2>
            <div className={styles.accountCard}>
              <div className={styles.accountInfo}>
                <p><strong>Correo electrónico:</strong> {user?.email}</p>
                <p><strong>Nombre de Usuario:</strong> {currentUsername}</p>
              </div>
              
              <div className={styles.logoutWrapper}>
                {!showLogoutConfirm ? (
                  <button 
                    className={styles.logoutRedBtn}
                    onClick={() => setShowLogoutConfirm(true)}
                  >
                    Cerrar Sesión
                  </button>
                ) : (
                  <div className={styles.logoutConfirmBox}>
                    <p>¿Estás seguro de que deseas cerrar sesión?</p>
                    <div className={styles.logoutActions}>
                      <button 
                        className={styles.cancelLogoutBtn}
                        onClick={() => setShowLogoutConfirm(false)}
                      >
                        Cancelar
                      </button>
                      <button 
                        className={styles.confirmLogoutBtn}
                        onClick={handleSignOut}
                      >
                        Sí, salir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

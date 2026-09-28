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
  const [dragId, setDragId] = useState(null);
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState('');
  const [newListName, setNewListName] = useState('');
  const [showNewListInput, setShowNewListInput] = useState(false);

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

      {/* Barra de control de listas: sticky debajo del tab bar, solo visible en tab listas */}
      {activeTab === 'listas' && (
        <div style={{
          position: 'sticky',
          top: '118px',
          zIndex: 49,
          background: 'var(--bg-dark)',
          paddingBottom: '14px',
          marginBottom: '8px',
          borderBottom: '1px solid #1e293b',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
              Mis Listas <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>— arrastra para ordenar</span>
            </h2>
            <button
              className={styles.editBtn}
              style={{ padding: '5px 15px' }}
              onClick={() => { setShowNewListInput(v => !v); setNewListName(''); }}
            >
              {showNewListInput ? '✕ Cancelar' : '+ Crear Lista'}
            </button>
          </div>
          {showNewListInput && (
            <form
              onSubmit={e => {
                e.preventDefault();
                const n = newListName.trim();
                if (n) {
                  setCustomLists([...(customLists || []), { id: `list-${Date.now()}`, name: n, animes: [] }]);
                  setNewListName('');
                  setShowNewListInput(false);
                }
              }}
              style={{ display: 'flex', gap: '8px', marginTop: '12px' }}
            >
              <input
                autoFocus
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="Nombre de la nueva lista..."
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: 'white', fontSize: '1rem' }}
              />
              <button type="submit" className={styles.editBtn} style={{ padding: '8px 16px' }}>Crear</button>
            </form>
          )}
        </div>
      )}

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
            {(customLists || []).length === 0 ? (
              <p className={styles.emptyMsg}>No has creado ninguna lista aún. (Ej: "Isekais", "Por ver")</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {(customLists || []).map((list, idx) => (
                  <div
                    key={list.id}
                    draggable
                    onDragStart={() => setDragId(list.id)}
                    onDragOver={e => { e.preventDefault(); }}
                    onDrop={() => {
                      if (!dragId || dragId === list.id) return;
                      const from = (customLists || []).findIndex(l => l.id === dragId);
                      const to = idx;
                      const reordered = [...(customLists || [])];
                      const [moved] = reordered.splice(from, 1);
                      reordered.splice(to, 0, moved);
                      setCustomLists(reordered);
                      setDragId(null);
                    }}
                    onDragEnd={() => setDragId(null)}
                    style={{
                      background: dragId === list.id ? '#0f172a' : '#1e293b',
                      padding: '20px',
                      borderRadius: '10px',
                      border: dragId === list.id ? '2px dashed #6366f1' : '2px solid transparent',
                      cursor: 'grab',
                      opacity: dragId === list.id ? 0.5 : 1,
                      transition: 'opacity 0.2s, border 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '10px' }}>
                      {/* Nombre editable */}
                      {editingListId === list.id ? (
                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            const n = editingListName.trim();
                            if (n) setCustomLists((customLists || []).map(l => l.id === list.id ? { ...l, name: n } : l));
                            setEditingListId(null);
                          }}
                          style={{ display: 'flex', gap: '6px', flex: 1 }}
                          onClick={e => e.stopPropagation()}
                        >
                          <input
                            autoFocus
                            value={editingListName}
                            onChange={e => setEditingListName(e.target.value)}
                            style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #6366f1', background: '#0f172a', color: 'white', fontSize: '1rem' }}
                          />
                          <button type="submit" style={{ background: '#6366f1', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>✓</button>
                          <button type="button" onClick={() => setEditingListId(null)} style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
                        </form>
                      ) : (
                        <h3
                          style={{ color: 'white', margin: 0, fontSize: '1.2rem', flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                          title="Haz clic para editar el nombre"
                          onClick={e => { e.stopPropagation(); setEditingListId(list.id); setEditingListName(list.name); }}
                        >
                          ☰ {list.name} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>({list.animes?.length || 0} animes)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 400 }}>✎ editar</span>
                        </h3>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); if (window.confirm(`¿Eliminar la lista "${list.name}"?`)) setCustomLists((customLists || []).filter(l => l.id !== list.id)); }}
                        style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', flexShrink: 0 }}
                      >
                        Eliminar
                      </button>
                    </div>
                    {(!list.animes || list.animes.length === 0) ? (
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Lista vacía.</p>
                    ) : (
                      <div className={styles.grid}>
                        {list.animes.map(anime => (
                          <div key={`${list.id}-${anime.id}`} style={{ position: 'relative' }}>
                            <AnimeCard anime={anime} />
                            <button
                              onClick={e => { e.stopPropagation(); setCustomLists((customLists || []).map(l => l.id === list.id ? { ...l, animes: l.animes.filter(a => a.id !== anime.id) } : l)); }}
                              style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', zIndex: 10 }}
                              title="Quitar de la lista"
                            >✕</button>
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

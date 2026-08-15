import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, PlayCircle, Menu, Heart, X, Bot } from 'lucide-react';
import { api } from '../../services/api';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useAuth } from '../../contexts/AuthContext';
import ScraperModal from '../ScraperModal/ScraperModal';
import styles from './Navbar.module.css';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hiddenAnimes, setHiddenAnimes] = useLocalStorage('hiddenAnimes', []);
  const [favoriteAnimes, setFavoriteAnimes] = useLocalStorage('favoriteAnimes', []);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScraperOpen, setIsScraperOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true);
        const results = await api.searchAnime(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultClick = (id) => {
    navigate(`/anime/${id}`);
    setSearchQuery('');
    setSearchResults([]);
    setIsMobileMenuOpen(false);
  };

  const handleToggleFavorite = (anime) => {
    const isFav = favoriteAnimes.some(a => a.id === anime.id);
    if (isFav) {
      setFavoriteAnimes(favoriteAnimes.filter(a => a.id !== anime.id));
    } else {
      setFavoriteAnimes([{
        id: anime.id,
        title: anime.title,
        image: anime.image,
      }, ...favoriteAnimes]);
    }
  };

  const handleHideResult = (e, anime) => {
    e.stopPropagation();
    setHiddenAnimes([{
      id: anime.id,
      title: anime.title,
      image: anime.image
    }, ...hiddenAnimes]);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (searchQuery.trim().toLowerCase() === 'secreto') {
        navigate('/secret');
        setSearchQuery('');
        setSearchResults([]);
        setIsMobileMenuOpen(false);
      }
    }
  };

  const filteredResults = searchResults.filter(a => !hiddenAnimes.some(h => h.id === a.id));

  return (
    <nav className={`glass ${styles.navbar}`}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.logo}>
          <PlayCircle size={28} color="var(--primary-accent-light)" />
          <span>Anime<span style={{color: 'var(--primary-accent-light)'}}>Zona</span></span>
        </Link>
        
        <div className={`${styles.navLinks} ${isMobileMenuOpen ? styles.mobileOpen : ''}`}>
          <Link to="/" className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>Inicio</Link>
          <Link to="/catalog" className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>Catálogo</Link>
          
          {/* Búsqueda en Móvil */}
          <div className={`${styles.searchContainer} ${styles.mobileSearchOnly}`}>
            <Search size={18} className={styles.searchIcon} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <input 
                type="text" 
                placeholder="Buscar animes..." 
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {searchQuery.length > 0 && (
                <button 
                  className={styles.clearSearchBtn}
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  title="Borrar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            {/* Dropdown de Búsqueda Móvil */}
            {searchQuery.trim().length > 2 && (
              <div className={`glass-panel ${styles.searchResults}`}>
                {isSearching ? (
                  <div className={styles.searchLoading}>Buscando...</div>
                ) : filteredResults.length > 0 ? (
                  filteredResults.map(anime => (
                    <div 
                      key={anime.id} 
                      className={styles.searchResultItem}
                      onClick={() => handleResultClick(anime.id)}
                    >
                      <div className={styles.imageWrapper}>
                        <img src={anime.image} alt={anime.title} className={styles.searchResultImage} />
                        <button 
                          className={`${styles.searchFavBtn} ${favoriteAnimes.some(a => a.id === anime.id) ? styles.isFav : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(anime);
                          }}
                          title="Añadir a favoritos"
                        >
                          <Heart size={12} fill={favoriteAnimes.some(a => a.id === anime.id) ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <span className={styles.searchResultTitle}>{anime.title}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.searchLoading}>No se encontraron animes.</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.navActions}>
          <div className={`${styles.searchContainer} ${styles.desktopSearchOnly}`}>
            <Search size={18} className={styles.searchIcon} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Buscar animes..." 
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {searchQuery.length > 0 && (
                <button 
                  className={styles.clearSearchBtn}
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  title="Borrar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            {/* Dropdown de Búsqueda */}
            {searchQuery.trim().length > 2 && (
              <div className={`glass-panel ${styles.searchResults}`}>
                {isSearching ? (
                  <div className={styles.searchLoading}>Buscando...</div>
                ) : filteredResults.length > 0 ? (
                  filteredResults.map(anime => (
                    <div 
                      key={anime.id} 
                      className={styles.searchResultItem}
                      onClick={() => handleResultClick(anime.id)}
                    >
                      <div className={styles.imageWrapper}>
                        <img src={anime.image} alt={anime.title} className={styles.searchResultImage} />
                        <button 
                          className={`${styles.searchFavBtn} ${favoriteAnimes.some(a => a.id === anime.id) ? styles.isFav : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(anime);
                          }}
                          title="Añadir a favoritos"
                        >
                          <Heart size={12} fill={favoriteAnimes.some(a => a.id === anime.id) ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <span className={styles.searchResultTitle}>{anime.title}</span>
                      <button 
                        className={styles.searchHideBtn}
                        onClick={(e) => handleHideResult(e, anime)}
                        title="Ocultar Recomendación"
                      >
                        Ocultar
                      </button>
                    </div>
                  ))
                ) : (
                  <div className={styles.searchLoading}>No se encontraron animes.</div>
                )}
              </div>
            )}
          </div>
          
          <div className={styles.authSection}>
            <button 
              className={styles.scraperBtn} 
              onClick={() => setIsScraperOpen(true)}
              title="Abrir Control Scraper"
            >
              <Bot size={20} />
            </button>
            
            {user ? (
              <div className={styles.userMenu}>
                <Link to="/profile" className={styles.profileBtn} title={user?.user_metadata?.username || user.email}>
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Profile" className={styles.navAvatar} />
                  ) : (
                    <User size={20} />
                  )}
                </Link>
              </div>
            ) : (
              <Link to="/login" className={styles.loginBtn}>
                Ingresar
              </Link>
            )}
          </div>

          <button className={styles.mobileMenu} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <ScraperModal isOpen={isScraperOpen} onClose={() => setIsScraperOpen(false)} />
    </nav>
  );
};

export default Navbar;

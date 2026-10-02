import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Users, PlusCircle, CheckCircle, Database, ListVideo, Film, ChevronRight, Upload, FileText, Sparkles, Layers, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { api, TMDB_GENRES } from '../../services/api';
import { supabase } from '../../services/supabase';
import styles from './Admin.module.css';

const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVerified, setIsVerified] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('usuarios');

  // Scraped Animes Tab State
  const [scrapedAnimesData, setScrapedAnimesData] = useState([]);
  const [scrapedStats, setScrapedStats] = useState({ animes: 0, episodes: 0, servers: 0 });
  const [globalServerStats, setGlobalServerStats] = useState([]);
  const [showServerStatsModal, setShowServerStatsModal] = useState(false);
  const [loadingScraped, setLoadingScraped] = useState(false);
  const [selectedScrapedAnime, setSelectedScrapedAnime] = useState(null);

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

  // Bulk Episodes Importer State
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [importStats, setImportStats] = useState(null);
  const [selectedSeasonTab, setSelectedSeasonTab] = useState('all');

  // Scraper V3 State
  const [scraperForm, setScraperForm] = useState({ title: '', alt_title: '', tmdb_id: '', provider: 'both', startEpisode: 1 });
  const [scrapingJobs, setScrapingJobs] = useState([]);
  const [isScraperSubmitting, setIsScraperSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.scraperTitle) {
      setActiveTab('scraper');
      setScraperForm(prev => ({
        ...prev,
        title: location.state.scraperTitle,
        tmdb_id: location.state.scraperTmdb ? String(location.state.scraperTmdb) : ''
      }));
      // Limpiar state para no atorarnos en un loop o comportamiento raro si navegamos de nuevo
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setIsVerified(true);
    }
  }, []);

  useEffect(() => {
    if (!isVerified) return;

    if (activeTab === 'usuarios') {
      loadUsersData();
    } else if (activeTab === 'lista_animes') {
      loadCustomAnimes();
    } else if (activeTab === 'scraper') {
      fetchScrapingJobs();
      const interval = setInterval(fetchScrapingJobs, 3000);
      return () => clearInterval(interval);
    } else if (activeTab === 'scraped_animes') {
      loadScrapedAnimes();
    }
  }, [isVerified, activeTab]);

  const fetchScrapingJobs = async () => {
    const { data, error } = await supabase
      .from('scraping_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error && data) {
      setScrapingJobs(data);
    }
  };

  const handleAddScrapingJob = async (e) => {
    e.preventDefault();
    setIsScraperSubmitting(true);
    try {
      let finalTitle = `${scraperForm.title.trim()}||${scraperForm.provider}||${scraperForm.startEpisode}`;
      if (scraperForm.alt_title && scraperForm.alt_title.trim() !== '') {
         finalTitle += `||${scraperForm.alt_title.trim()}`;
      }
      
      const { error } = await supabase.from('scraping_queue').insert([{
        title: finalTitle,
        anime_tmdb_id: scraperForm.tmdb_id.trim() || null,
        status: 'pending',
        logs: []
      }]);
      if (error) throw error;
      setSuccessMsg('Anime añadido a la cola de extracción correctamente.');
      setScraperForm({ title: '', alt_title: '', tmdb_id: '', provider: 'both', startEpisode: 1 });
      fetchScrapingJobs();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Error al añadir a la cola.');
    } finally {
      setIsScraperSubmitting(false);
    }
  };

  const handleScraperChange = (e) => {
    const { name, value } = e.target;
    setScraperForm(prev => ({ ...prev, [name]: value }));
  };

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

  const loadScrapedAnimes = async () => {
    setLoadingScraped(true);
    try {
      // 1. Fetch custom_animes to match titles for images
      const { data: customData } = await supabase.from('custom_animes').select('id, title, image');
      
      // Fetch anime_episodes with pagination to bypass 1000 row limit
      let allData = [];
      let fetchMore = true;
      let from = 0;
      const step = 1000;

      while (fetchMore) {
        const { data, error } = await supabase
          .from('anime_episodes')
          .select('anime_tmdb_id, search_title, episode_number, season_number, server_name, language')
          .range(from, from + step - 1);

        if (error) {
          console.error(error);
          break;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += step;
          if (data.length < step) fetchMore = false;
        } else {
          fetchMore = false;
        }
      }
      
      if (allData.length > 0) {
        const data = allData;
        const animesMap = {};
        let totalEpisodesCount = 0;
        let totalServers = data.length;
        const serverCounts = {};

        data.forEach(ep => {
          // Track global server counts
          if (ep.server_name) {
            const sName = ep.server_name.toUpperCase();
            serverCounts[sName] = (serverCounts[sName] || 0) + 1;
          }

          const key = ep.search_title?.toLowerCase().trim();
          if (!key) return;
          if (!animesMap[key]) {
            animesMap[key] = {
              id: key,
              tmdb_id: ep.anime_tmdb_id,
              title: ep.search_title || 'Desconocido',
              episodesMap: {},
              totalServers: 0,
              poster: null
            };

            // If it has no tmdb_id, try to find it in custom_animes by title
            if (!ep.anime_tmdb_id && ep.search_title && customData) {
               const foundCustom = customData.find(c => c.title.toLowerCase().trim() === ep.search_title.toLowerCase().trim());
               if (foundCustom && foundCustom.image) {
                  animesMap[key].poster = foundCustom.image;
               }
            }
          } else {
             // Keep the TMDB ID if one of the rows has it
             if (!animesMap[key].tmdb_id && ep.anime_tmdb_id) {
                 animesMap[key].tmdb_id = ep.anime_tmdb_id;
             }
          }
          
          if (!animesMap[key].episodesMap[ep.episode_number]) {
            animesMap[key].episodesMap[ep.episode_number] = {
              episode_number: ep.episode_number,
              season_number: ep.season_number || 1,
              servers: []
            };
            totalEpisodesCount++;
          }
          
          const srvLang = ep.language || 'sub';
          const srvName = ep.server_name || 'Desconocido';
          const isDuplicate = animesMap[key].episodesMap[ep.episode_number].servers.some(s => s.name.toUpperCase() === srvName.toUpperCase() && s.lang.toLowerCase() === srvLang.toLowerCase());
          
          if (!isDuplicate) {
            animesMap[key].episodesMap[ep.episode_number].servers.push({
              name: srvName,
              lang: srvLang
            });
            animesMap[key].totalServers++;
          }
        });
        
        // Sort server counts descending
        const sortedServerStats = Object.keys(serverCounts).map(s => ({
          server: s,
          count: serverCounts[s]
        })).sort((a, b) => b.count - a.count);
        setGlobalServerStats(sortedServerStats);

        const animesList = Object.values(animesMap).sort((a,b) => a.title.localeCompare(b.title));
        
        setScrapedStats({
          animes: animesList.length,
          episodes: totalEpisodesCount,
          servers: totalServers
        });
        
        setScrapedAnimesData(animesList);
        
        // Fetch posters for animes asynchronously
        animesList.forEach(async (anime) => {
          if (!anime.poster) {
            try {
              if (anime.tmdb_id) {
                const info = await api.getAnimeInfo(anime.tmdb_id);
                if (info?.image) {
                  setScrapedAnimesData(prev => prev.map(a => a.id === anime.id ? { ...a, poster: info.image } : a));
                }
              } else {
                const results = await api.searchAnime(anime.title);
                if (results && results.length > 0 && results[0].image) {
                  setScrapedAnimesData(prev => prev.map(a => a.id === anime.id ? { ...a, poster: results[0].image } : a));
                }
              }
            } catch(e) {}
          }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingScraped(false);
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

  // --- PARSER DE EPISODIOS Y TEMPORADAS ---
  const parseEpisodesText = (rawText) => {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let currentSeason = 1;
    let parsedEpisodes = [];
    let detectedTitle = null;
    let seasonCounts = {};

    for (const line of lines) {
      // 1. Detectar título si viene indicado: "Serie: El Mentalista"
      const titleMatch = line.match(/^(?:serie|titulo|title|show|anime)\s*:\s*(.+)$/i);
      if (titleMatch) {
        detectedTitle = titleMatch[1].trim();
        continue;
      }

      // 2. Detectar encabezado de temporada: "TEMPORADA 1", "Season 2", "T3", etc.
      const seasonMatch = line.match(/^(?:temporada|season|temp|t)\s*(\d+)[:\s-]*(.*)$/i);
      if (seasonMatch) {
        currentSeason = parseInt(seasonMatch[1], 10);
        continue;
      }

      // 3. Detectar línea de episodio
      let epMatch = line.match(/^(?:episodio|capitulo|cap|ep|episode)\s*(\d+)(?:\s*\(\d+\))?\s*[-:.)]?\s*(.*)$/i);
      let epName = '';

      if (epMatch) {
        epName = epMatch[2].trim();
      } else {
        const numMatch = line.match(/^(\d+)[\s.:)-]+\s*(.*)$/);
        if (numMatch) {
          epName = numMatch[2].trim();
        } else {
          epName = line;
        }
      }

      // Limpiar números absolutos en paréntesis como "(24) - Redención" o "(24) Redención"
      epName = epName.replace(/^\(\d+\)\s*[-:]*\s*/, '').trim();

      seasonCounts[currentSeason] = (seasonCounts[currentSeason] || 0) + 1;
      const seasonEpNum = seasonCounts[currentSeason];

      parsedEpisodes.push({
        season: currentSeason,
        episode: seasonEpNum,
        name: epName || (`Episodio ${seasonEpNum}`)
      });
    }

    return { 
      detectedTitle, 
      parsedEpisodes, 
      seasons: Object.keys(seasonCounts).map(Number).sort((a,b)=>a-b) 
    };
  };

  const handleProcessBulkText = () => {
    if (!bulkText.trim()) return;
    const { detectedTitle, parsedEpisodes, seasons } = parseEpisodesText(bulkText);
    if (parsedEpisodes.length === 0) {
      alert('No se detectaron episodios en el texto.');
      return;
    }

    // Actualizar animeForm automáticamente
    setAnimeForm(prev => ({
      ...prev,
      title: (!prev.title && detectedTitle) ? detectedTitle : prev.title,
      total_episodes: parsedEpisodes.length
    }));

    // Construir nuevo mapa de episodios
    const newEpisodeNames = {};
    parsedEpisodes.forEach((ep, idx) => {
      newEpisodeNames[idx + 1] = {
        name: ep.name,
        season: ep.season,
        episode: ep.episode
      };
    });

    setEpisodeNames(newEpisodeNames);
    setImportStats({
      total: parsedEpisodes.length,
      seasons: seasons.length || 1,
      seasonList: seasons
    });
    if (seasons.length > 0) {
      setSelectedSeasonTab(seasons[0]);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setBulkText(content);
    };
    reader.readAsText(file);
  };

  const getEpisodeData = (epNumber) => {
    const val = episodeNames[epNumber] || episodeNames[String(epNumber)];
    if (!val) {
      return { name: '', season: 1, episode: epNumber };
    }
    if (typeof val === 'object') {
      return {
        name: val.name || val.title || '',
        season: Number(val.season) || 1,
        episode: Number(val.episode) || epNumber
      };
    }
    const match = String(val).match(/^T(\d+)E(\d+)\s*[-:]*\s*(.*)$/i);
    if (match) {
      return {
        name: match[3] || '',
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10)
      };
    }
    return {
      name: String(val).replace(/^T\d+E\d+\s*[-:]*\s*/i, ''),
      season: 1,
      episode: epNumber
    };
  };

  const handleEpisodeFieldChange = (epNumber, field, value) => {
    setEpisodeNames(prev => {
      const current = getEpisodeData(epNumber);
      return {
        ...prev,
        [epNumber]: {
          ...current,
          [field]: (field === 'season' || field === 'episode') ? (parseInt(value, 10) || 1) : value
        }
      };
    });
  };

  const handleAddSeason = () => {
    const total = parseInt(animeForm.total_episodes, 10) || 0;
    const allEpNumbers = Array.from({ length: total }, (_, i) => i + 1);
    let maxSeason = 1;
    allEpNumbers.forEach(n => {
      const d = getEpisodeData(n);
      if (d.season > maxSeason) maxSeason = d.season;
    });
    const nextSeason = maxSeason + 1;
    const nextAbs = total + 1;

    setAnimeForm(prev => ({ ...prev, total_episodes: nextAbs }));
    setEpisodeNames(prev => ({
      ...prev,
      [nextAbs]: { name: '', season: nextSeason, episode: 1 }
    }));
    setSelectedSeasonTab(nextSeason);
  };

  const handleAddEpisodeToSeason = (seasonNum) => {
    const s = seasonNum === 'all' ? 1 : Number(seasonNum);
    const total = parseInt(animeForm.total_episodes, 10) || 0;
    const allEpNumbers = Array.from({ length: total }, (_, i) => i + 1);
    
    let countInSeason = 0;
    allEpNumbers.forEach(n => {
      const d = getEpisodeData(n);
      if (d.season === s) countInSeason++;
    });

    const nextAbs = total + 1;
    setAnimeForm(prev => ({ ...prev, total_episodes: nextAbs }));
    setEpisodeNames(prev => ({
      ...prev,
      [nextAbs]: { name: '', season: s, episode: countInSeason + 1 }
    }));
  };

  const handleDeleteEpisode = (absNumToDelete) => {
    const total = parseInt(animeForm.total_episodes, 10) || 0;
    if (total <= 1) {
      alert("No puedes eliminar el único episodio de la serie.");
      return;
    }
    
    const newEpisodeNames = {};
    let newAbs = 1;
    const seasonCounters = {};

    for (let i = 1; i <= total; i++) {
      if (i === absNumToDelete) continue; // Lo saltamos
      
      const epData = getEpisodeData(i);
      const s = epData.season || 1;
      seasonCounters[s] = (seasonCounters[s] || 0) + 1;
      
      newEpisodeNames[newAbs] = {
        name: epData.name,
        season: s,
        episode: seasonCounters[s] // Recalculamos el número relativo de la temporada para evitar saltos
      };
      newAbs++;
    }

    setAnimeForm(prev => ({ ...prev, total_episodes: newAbs - 1 }));
    setEpisodeNames(newEpisodeNames);
  };

  const handleDeleteSeason = (seasonToDelete) => {
    if (seasonToDelete === 'all') return;
    
    if (!window.confirm(`¿Estás seguro de que deseas eliminar TODOS los episodios de la Temporada ${seasonToDelete}?`)) {
      return;
    }

    const total = parseInt(animeForm.total_episodes, 10) || 0;
    const newEpisodeNames = {};
    let newAbs = 1;
    const seasonCounters = {};
    let removedCount = 0;

    for (let i = 1; i <= total; i++) {
      const epData = getEpisodeData(i);
      if (epData.season === seasonToDelete) {
        removedCount++;
        continue; // Saltamos toda la temporada
      }
      
      const s = epData.season || 1;
      seasonCounters[s] = (seasonCounters[s] || 0) + 1;
      
      newEpisodeNames[newAbs] = {
        name: epData.name,
        season: s,
        episode: seasonCounters[s]
      };
      newAbs++;
    }

    if (removedCount === total) {
      alert("No puedes eliminar la única temporada existente. Añade otra primero.");
      return;
    }

    setAnimeForm(prev => ({ ...prev, total_episodes: newAbs - 1 }));
    setEpisodeNames(newEpisodeNames);
    setSelectedSeasonTab('all');
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
          onClick={() => { setActiveTab('usuarios'); setSelectedScrapedAnime(null); }}
        >
          <Users size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '5px' }}/>
          Usuarios
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'animes' ? styles.active : ''}`}
          onClick={() => { setActiveTab('animes'); setSelectedScrapedAnime(null); }}
        >
          <PlusCircle size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '5px' }}/>
          Añadir Anime Custom
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'lista_animes' ? styles.active : ''}`}
          onClick={() => { setActiveTab('lista_animes'); setSelectedScrapedAnime(null); }}
        >
          Lista de Animes
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'scraper' ? styles.active : ''}`}
          onClick={() => { setActiveTab('scraper'); setSelectedScrapedAnime(null); }}
        >
          Scraper V3 (Bot)
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'scraped_animes' ? styles.active : ''}`}
          onClick={() => setActiveTab('scraped_animes')}
        >
          <Database size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '5px' }}/>
          Animes Scrapeados
        </button>
      </div>

      {activeTab === 'scraper' && (
        <div>
          <h2>Cerebro Scraper V3</h2>
          <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>Añade animes a la cola para que el bot los busque y extraiga de forma automática en segundo plano.</p>
          
          <form onSubmit={handleAddScrapingJob} style={{ background: '#1f2937', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className={styles.formGroup}>
                <label>Título a Guardar (Exacto)</label>
                <input type="text" name="title" className={styles.input} value={scraperForm.title} onChange={handleScraperChange} required placeholder="Ej: Frieren" />
              </div>
              <div className={styles.formGroup}>
                <label>Búsqueda Alternativa (Opcional)</label>
                <input type="text" name="alt_title" className={styles.input} value={scraperForm.alt_title || ''} onChange={handleScraperChange} placeholder="Ej: Sousou no Frieren" />
              </div>
              <div className={styles.formGroup}>
                <label>TMDB ID (Opcional)</label>
                <input type="text" name="tmdb_id" className={styles.input} value={scraperForm.tmdb_id} onChange={handleScraperChange} placeholder="Ej: 37551" />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr auto', gap: '1rem', alignItems: 'end' }}>
              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label>Ep. Inicial</label>
                <input type="number" name="startEpisode" min="1" className={styles.input} value={scraperForm.startEpisode} onChange={handleScraperChange} required />
              </div>
              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label>Proveedor (Fuente de Extracción)</label>
                <select name="provider" className={styles.input} value={scraperForm.provider} onChange={handleScraperChange}>
                  <option value="both">Ambos (Recomendado - Más servidores)</option>
                  <option value="cinebel">Solo Cinebel (VIP)</option>
                  <option value="animeonline">Solo AnimeOnline Ninja (Estándar)</option>
                </select>
              </div>
              <button type="submit" className={styles.submitBtn} disabled={isScraperSubmitting} style={{ width: 'auto', marginBottom: '2px' }}>
                {isScraperSubmitting ? 'Encolando...' : 'Añadir a la Cola'}
              </button>
            </div>
          </form>

          <h3>Trabajos en Cola ({scrapingJobs.length})</h3>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Último Log</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {scrapingJobs.map(job => (
                  <tr key={job.id}>
                    <td style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{job.id.substring(0, 8)}...</td>
                    <td style={{ fontWeight: 'bold', color: 'white' }}>{job.title.split('||')[0]}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold',
                        background: job.status === 'completed' ? '#059669' : job.status === 'error' ? '#ef4444' : job.status === 'processing' ? '#3b82f6' : '#4b5563',
                        color: 'white'
                      }}>
                        {job.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#9ca3af', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.logs && job.logs.length > 0 ? job.logs[job.logs.length - 1].message : 'Esperando turno...'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(job.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

            <div className={styles.formGroup} style={{ marginTop: '2rem', borderTop: '1px solid #334155', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={20} color="#38bdf8" /> Gestión de Temporadas y Episodios
                  </label>
                  <p style={{ color: '#94a3af', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                    Organiza por temporadas o importa tus listas completas desde texto o archivo .txt
                  </p>
                </div>

                <button 
                  type="button" 
                  className={styles.importBtn} 
                  onClick={() => setIsImporterOpen(!isImporterOpen)}
                >
                  <FileText size={16} /> 
                  {isImporterOpen ? 'Cerrar Importador' : 'Importar Lista o .TXT'}
                  {isImporterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* PANEL DE IMPORTACIÓN DESDE TEXTO O .TXT */}
              {isImporterOpen && (
                <div className={styles.importerCard}>
                  <div className={styles.importerHeader}>
                    <h4><Sparkles size={18} /> Autocompletar desde Texto o Archivo .txt</h4>
                    <label className={styles.fileUploadBtn}>
                      <Upload size={16} /> Cargar archivo .txt
                      <input type="file" accept=".txt" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </label>
                  </div>
                  
                  <textarea 
                    className={styles.importerTextarea}
                    placeholder={`Pega aquí tu lista o sube un .txt. Ejemplo:\n\nSerie: El Mentalista\n\nTEMPORADA 1\nEpisodio 1 - Piloto\nEpisodio 2 - Pelo rojo y cinta plateada\n\nTEMPORADA 2\nEpisodio 1 (24) - Redención\nEpisodio 2 (25) - La letra escarlata`}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />

                  <div className={styles.importerActions}>
                    <button 
                      type="button" 
                      className={styles.importBtn} 
                      onClick={handleProcessBulkText}
                      disabled={!bulkText.trim()}
                    >
                      <Sparkles size={16} /> Procesar y Autocompletar
                    </button>
                    <button 
                      type="button" 
                      style={{ background: '#334155', color: '#94a3b8', border: 'none', padding: '0.6rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }} 
                      onClick={() => { setBulkText(''); setImportStats(null); }}
                    >
                      Limpiar
                    </button>
                    {importStats && (
                      <span style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 500 }}>
                        ✅ ¡Procesados {importStats.total} episodios en {importStats.seasons} temporada(s)!
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* SELECTOR DE PESTAÑAS POR TEMPORADA */}
              {(() => {
                const total = parseInt(animeForm.total_episodes, 10) || 0;
                const allNums = Array.from({ length: total }, (_, i) => i + 1);
                const epMap = {};
                allNums.forEach(n => {
                  const d = getEpisodeData(n);
                  const s = d.season || 1;
                  if (!epMap[s]) epMap[s] = [];
                  epMap[s].push({ absNum: n, ...d });
                });
                const seasonsList = Object.keys(epMap).map(Number).sort((a,b) => a - b);
                const activeSeasonEps = selectedSeasonTab === 'all' 
                  ? allNums.map(n => ({ absNum: n, ...getEpisodeData(n) }))
                  : (epMap[selectedSeasonTab] || []);

                return (
                  <div>
                    <div className={styles.seasonTabsContainer}>
                      <button 
                        type="button"
                        className={`${styles.seasonTab} ${selectedSeasonTab === 'all' ? styles.seasonTabActive : ''}`}
                        onClick={() => setSelectedSeasonTab('all')}
                      >
                        Todos <span className={styles.seasonBadge}>{total}</span>
                      </button>

                      {seasonsList.map(s => (
                        <button 
                          key={s}
                          type="button"
                          className={`${styles.seasonTab} ${selectedSeasonTab === s ? styles.seasonTabActive : ''}`}
                          onClick={() => setSelectedSeasonTab(s)}
                        >
                          Temporada {s} <span className={styles.seasonBadge}>{epMap[s]?.length || 0}</span>
                        </button>
                      ))}

                      <button 
                        type="button"
                        className={styles.seasonTab}
                        style={{ borderStyle: 'dashed', borderColor: '#38bdf8', color: '#38bdf8' }}
                        onClick={handleAddSeason}
                      >
                        <Plus size={14} /> Nueva Temporada
                      </button>
                    </div>

                    {/* CUADRÍCULA DE EPISODIOS */}
                    <div className={styles.episodesGrid} style={{ marginTop: '1.25rem' }}>
                      {activeSeasonEps.map((ep) => (
                        <div 
                          key={ep.absNum} 
                          className={styles.episodeInput}
                          style={{ 
                            background: '#0f172a', 
                            padding: '0.85rem', 
                            borderRadius: '0.5rem', 
                            border: '1px solid #1e293b' 
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.85rem' }}>
                              T{ep.season}E{ep.episode}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                #{ep.absNum}
                              </span>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteEpisode(ep.absNum)}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                                title="Eliminar episodio"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <input 
                            type="text" 
                            className={styles.input} 
                            placeholder="Nombre del episodio..." 
                            value={ep.name}
                            onChange={(e) => handleEpisodeFieldChange(ep.absNum, 'name', e.target.value)}
                            style={{ fontSize: '0.85rem' }}
                          />

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Temporada:</span>
                            <input 
                              type="number" 
                              min="1" 
                              value={ep.season} 
                              onChange={(e) => handleEpisodeFieldChange(ep.absNum, 'season', e.target.value)}
                              style={{ 
                                width: '50px', 
                                padding: '0.2rem 0.4rem', 
                                background: '#1e293b', 
                                color: 'white', 
                                border: '1px solid #334155', 
                                borderRadius: '0.25rem', 
                                fontSize: '0.75rem',
                                textAlign: 'center'
                              }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                      <button 
                        type="button" 
                        onClick={() => handleAddEpisodeToSeason(selectedSeasonTab)}
                        style={{ 
                          background: '#1e293b', 
                          color: '#38bdf8', 
                          border: '1px dashed #0284c7', 
                          padding: '0.5rem 1rem', 
                          borderRadius: '0.5rem', 
                          cursor: 'pointer', 
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <Plus size={16} /> Añadir Episodio a {selectedSeasonTab === 'all' ? 'Temporada 1' : `Temporada ${selectedSeasonTab}`}
                      </button>
                      
                      {selectedSeasonTab !== 'all' && (
                        <button 
                          type="button" 
                          onClick={() => handleDeleteSeason(selectedSeasonTab)}
                          style={{ 
                            background: '#1e293b', 
                            color: '#ef4444', 
                            border: '1px dashed #ef4444', 
                            padding: '0.5rem 1rem', 
                            borderRadius: '0.5rem', 
                            cursor: 'pointer', 
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            marginLeft: 'auto'
                          }}
                        >
                          <Trash2 size={16} /> Eliminar Temporada {selectedSeasonTab}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
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

      {activeTab === 'scraped_animes' && (
        <div style={{ marginTop: '2rem' }}>
          {selectedScrapedAnime ? (
            <div>
              <button 
                onClick={() => setSelectedScrapedAnime(null)} 
                style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem' }}
              >
                <ArrowLeft size={18} /> Volver a Animes Scrapeados
              </button>
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                <img 
                  src={selectedScrapedAnime.poster || 'https://via.placeholder.com/225x318?text=No+Image'} 
                  alt={selectedScrapedAnime.title}
                  style={{ width: '200px', borderRadius: '1rem', objectFit: 'cover' }}
                />
                <div>
                  <h2 style={{ fontSize: '2rem', marginBottom: '1rem', textTransform: 'capitalize' }}>{selectedScrapedAnime.title}</h2>
                  <p style={{ color: '#9ca3af', marginBottom: '0.5rem' }}>TMDB ID: {selectedScrapedAnime.tmdb_id || 'N/A'}</p>
                  <p style={{ color: '#9ca3af', marginBottom: '0.5rem' }}>Total Servidores extraídos: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{selectedScrapedAnime.totalServers}</span></p>
                  <p style={{ color: '#9ca3af', marginBottom: '0.5rem' }}>Total Episodios distintos: <span style={{ color: '#10b981', fontWeight: 'bold' }}>{Object.keys(selectedScrapedAnime.episodesMap).length}</span></p>
                </div>
              </div>

              <h3>Episodios por Temporada</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {Object.values(selectedScrapedAnime.episodesMap)
                  .sort((a,b) => a.episode_number - b.episode_number)
                  .map(ep => {
                    const latServers = ep.servers.filter(s => s.lang.toLowerCase().startsWith('lat'));
                    const subServers = ep.servers.filter(s => s.lang.toLowerCase().startsWith('sub'));
                    return (
                  <div key={ep.episode_number} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Temporada {ep.season_number} - Episodio {ep.episode_number}</h4>
                      
                      {subServers.length > 0 && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <span style={{ color: '#9ca3af', fontSize: '0.85rem', marginRight: '0.5rem' }}>SUB ({subServers.length}):</span>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {subServers.map((srv, idx) => (
                              <span key={idx} style={{ background: '#3b82f6', padding: '0.2rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>
                                {srv.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {latServers.length > 0 && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <span style={{ color: '#9ca3af', fontSize: '0.85rem', marginRight: '0.5rem' }}>LAT ({latServers.length}):</span>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {latServers.map((srv, idx) => (
                              <span key={idx} style={{ background: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>
                                {srv.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(ep.servers.length - subServers.length - latServers.length) > 0 && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <span style={{ color: '#9ca3af', fontSize: '0.85rem', marginRight: '0.5rem' }}>OTROS:</span>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {ep.servers.filter(s => !s.lang.toLowerCase().startsWith('lat') && !s.lang.toLowerCase().startsWith('sub')).map((srv, idx) => (
                              <span key={idx} style={{ background: '#6b7280', padding: '0.2rem 0.5rem', borderRadius: '0.3rem', fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>
                                {srv.name} ({srv.lang})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: '0.9rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <strong>{ep.servers.length}</strong> total
                    </div>
                  </div>
                )})}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Animes Scrapeados en Base de Datos</h2>
                {loadingScraped && <span style={{ color: '#3b82f6' }}>Cargando...</span>}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '2.5rem', color: '#3b82f6', margin: 0 }}>{scrapedStats.animes}</h3>
                  <p style={{ color: '#9ca3af', margin: 0 }}>Animes Distintos</p>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '2.5rem', color: '#10b981', margin: 0 }}>{scrapedStats.episodes}</h3>
                  <p style={{ color: '#9ca3af', margin: 0 }}>Total Episodios</p>
                </div>
                <div 
                  onClick={() => setShowServerStatsModal(true)}
                  style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid #8b5cf6', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'}
                >
                  <h3 style={{ fontSize: '2.5rem', color: '#8b5cf6', margin: 0 }}>{scrapedStats.servers}</h3>
                  <p style={{ color: '#9ca3af', margin: 0 }}>Total Servidores de Video</p>
                  <p style={{ fontSize: '0.8rem', color: '#8b5cf6', marginTop: '0.5rem' }}>Clic para ver detalles</p>
                </div>
              </div>

              {showServerStatsModal && createPortal(
                <div style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                  display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                  <div style={{
                    background: '#1f2937', padding: '2rem', borderRadius: '1rem',
                    width: '90%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Estadísticas de Servidores</h3>
                      <button onClick={() => setShowServerStatsModal(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                    </div>
                    
                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: '1rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#1f2937', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          <tr style={{ borderBottom: '1px solid #374151', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem', color: '#9ca3af' }}>Servidor</th>
                            <th style={{ padding: '0.75rem', color: '#9ca3af' }}>Total Enlaces</th>
                          </tr>
                        </thead>
                        <tbody>
                          {globalServerStats.map((stat, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #374151' }}>
                              <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{stat.server}</td>
                              <td style={{ padding: '0.75rem', color: '#10b981' }}>{stat.count}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td style={{ padding: '0.75rem', fontWeight: 'bold', fontSize: '1.1rem' }}>TOTAL GENERAL</td>
                            <td style={{ padding: '0.75rem', fontWeight: 'bold', fontSize: '1.1rem', color: '#3b82f6' }}>{scrapedStats.servers}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>,
                document.body
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
                {scrapedAnimesData.map(anime => (
                  <div 
                    key={anime.id} 
                    onClick={() => setSelectedScrapedAnime(anime)}
                    style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.05)' } }}
                  >
                    <img 
                      src={anime.poster || 'https://via.placeholder.com/225x318?text=Cargando...'} 
                      alt={anime.title}
                      style={{ width: '100%', height: '260px', objectFit: 'cover' }}
                    />
                    <div style={{ padding: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }} title={anime.title}>
                        {anime.title}
                      </h4>
                      <p style={{ margin: 0, marginTop: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                        {Object.keys(anime.episodesMap).length} Episodios
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin;

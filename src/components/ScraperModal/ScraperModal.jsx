import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, Terminal } from 'lucide-react';
import styles from './ScraperModal.module.css';

const ScraperModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    provider: 'zonaaps', // default a zonaaps o animeonline
    url: '',
    mode: 'season',
    startEpisode: 1
  });
  
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const consoleRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Conectar a Server-Sent Events cuando el modal está abierto
    const eventSource = new EventSource('http://localhost:4000/api/logs');
    
    eventSource.onmessage = (event) => {
      try {
        const logData = JSON.parse(event.data);
        setLogs(prev => [...prev, logData]);
        
        // Auto-scroll de la consola
        setTimeout(() => {
          if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
          }
        }, 10);
      } catch(e) {}
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStart = async () => {
    if (!formData.title || !formData.url) {
      alert("Por favor, llena el Título y la URL");
      return;
    }
    
    setIsRunning(true);
    setLogs([{ timestamp: new Date().toLocaleTimeString(), message: 'Enviando tarea al servidor backend...', type: 'info' }]);
    
    const endpoint = formData.mode === 'season' ? '/api/scrape' : '/api/scrape-single';
    
    try {
      const response = await fetch(`http://localhost:4000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          url: formData.url,
          provider: formData.provider,
          startEpisode: formData.startEpisode
        })
      });
      
      if (!response.ok) {
        setIsRunning(false);
        const err = await response.json();
        setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: `Error: ${err.error}`, type: 'error' }]);
      }
    } catch (e) {
      setIsRunning(false);
      setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: `Fallo al conectar con servidor local: ${e.message}`, type: 'error' }]);
    }
  };

  const handleStop = async () => {
    try {
      await fetch('http://localhost:4000/api/stop', { method: 'POST' });
      setIsRunning(false);
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2><Terminal size={20} /> Scraper Controller</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.formGroup}>
            <label>Título del Anime (Exacto a BD)</label>
            <input 
              className={styles.input}
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              placeholder="Ej. Alya Sometimes Hides Her Feelings in Russian" 
            />
          </div>

          <div className={styles.formGroup}>
            <label>URL de Origen</label>
            <input 
              className={styles.input}
              name="url" 
              value={formData.url} 
              onChange={handleChange} 
              placeholder="https://zonaaps.com/tvshows/..." 
            />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Proveedor</label>
              <select className={styles.select} name="provider" value={formData.provider} onChange={handleChange}>
                <option value="zonaaps">ZonaAPS</option>
                <option value="animeonline">AnimeOnline Ninja</option>
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label>Modo</label>
              <select className={styles.select} name="mode" value={formData.mode} onChange={handleChange}>
                <option value="season">Temporada Completa</option>
                <option value="single">Episodio Individual</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>{formData.mode === 'season' ? 'Episodio Inicial' : 'Número de Episodio'}</label>
            <input 
              className={styles.input}
              type="number" 
              name="startEpisode" 
              value={formData.startEpisode} 
              onChange={handleChange} 
              min="1"
            />
          </div>

          <div className={styles.actions}>
            <button className={styles.btnPrimary} onClick={handleStart} disabled={isRunning}>
              {isRunning ? 'Extrayendo...' : <><Play size={16} style={{marginRight: '5px', verticalAlign: 'middle'}}/> Iniciar</>}
            </button>
            <button className={styles.btnSecondary} onClick={handleStop} title="Forzar Cierre del Navegador">
              <Square size={16} />
            </button>
          </div>

          <div className={styles.consoleContainer} ref={consoleRef}>
            {logs.length === 0 && <div className={styles.logTime}>Esperando instrucciones...</div>}
            {logs.map((log, i) => (
              <div key={i} className={`${styles.logLine} ${
                log.type === 'error' ? styles.logError : 
                log.type === 'success' ? styles.logSuccess : 
                log.type === 'warning' ? styles.logWarning : styles.logInfo
              }`}>
                <span className={styles.logTime}>[{log.timestamp}]</span>
                {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScraperModal;

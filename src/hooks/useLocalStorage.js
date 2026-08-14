import { useState, useEffect } from 'react';

// Guardar los timers de debounce a nivel de módulo
const syncTimers = {};

export function useLocalStorage(key, initialValue) {
  // Estado para guardar nuestro valor
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        return parsed !== null ? parsed : initialValue;
      }
      return initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // Retorna una versión envuelta de la función setter de useState que ...
  // ... persiste el nuevo valor en localStorage.
  const setValue = (value) => {
    try {
      setStoredValue(prevStoredValue => {
        const valueToStore = value instanceof Function ? value(prevStoredValue) : value;
        const finalValue = valueToStore !== null ? valueToStore : initialValue;
        
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(finalValue));
          // Emitir evento custom para sincronizar en la misma pestaña
          window.dispatchEvent(new CustomEvent('local-storage-sync', {
            detail: { key, newValue: finalValue }
          }));

          // Sincronizar hacia arriba (Supabase) con DEBOUNCE para evitar rate limits
          if (syncTimers[key]) clearTimeout(syncTimers[key]);
          
          syncTimers[key] = setTimeout(() => {
            import('../services/supabase').then(({ supabase }) => {
              supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                  supabase.from('user_sync').upsert({
                    user_id: user.id,
                    key: key,
                    value: finalValue
                  }).then(({ error }) => {
                    if (error) console.error("Error sincronizando hacia arriba", error);
                  });
                }
              });
            });
          }, 3000); // 3 segundos de debounce
        }
        return finalValue;
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    // Escuchar cambios desde otras pestañas
    const handleStorageChange = (e) => {
      if (e.key === key) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setStoredValue(parsed !== null ? parsed : initialValue);
          } catch {
            setStoredValue(initialValue);
          }
        } else {
          setStoredValue(initialValue);
        }
      }
    };

    // Escuchar cambios en la misma pestaña
    const handleCustomSync = (e) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.newValue !== null ? e.detail.newValue : initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-sync', handleCustomSync);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-sync', handleCustomSync);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}

import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  // Estado para guardar nuestro valor
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
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
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          // Emitir evento custom para sincronizar en la misma pestaña
          window.dispatchEvent(new CustomEvent('local-storage-sync', {
            detail: { key, newValue: valueToStore }
          }));

          // Sincronizar hacia arriba (Supabase) sin bloquear la UI
          import('../services/supabase').then(({ supabase }) => {
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (user) {
                supabase.from('user_sync').upsert({
                  user_id: user.id,
                  key: key,
                  value: valueToStore
                }).then(({ error }) => {
                  if (error) console.error("Error sincronizando hacia arriba", error);
                });
              }
            });
          });
        }
        return valueToStore;
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    // Escuchar cambios desde otras pestañas
    const handleStorageChange = (e) => {
      if (e.key === key) {
        setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
      }
    };

    // Escuchar cambios en la misma pestaña
    const handleCustomSync = (e) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.newValue);
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

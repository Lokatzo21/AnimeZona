import { useState, useEffect } from 'react';

const syncTimers = {};

function validateValue(value, initialValue) {
  if (value === null || value === undefined) return initialValue;
  if (Array.isArray(initialValue) && !Array.isArray(value)) {
    return initialValue; // Corrupted array data (e.g. object {} or string)
  }
  return value;
}

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        return validateValue(parsed, initialValue);
      }
      return initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      setStoredValue(prevStoredValue => {
        const valueToStore = value instanceof Function ? value(prevStoredValue) : value;
        const finalValue = validateValue(valueToStore, initialValue);
        
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(finalValue));
          window.dispatchEvent(new CustomEvent('local-storage-sync', {
            detail: { key, newValue: finalValue }
          }));

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
          }, 3000);
        }
        return finalValue;
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setStoredValue(validateValue(parsed, initialValue));
          } catch {
            setStoredValue(initialValue);
          }
        } else {
          setStoredValue(initialValue);
        }
      }
    };

    const handleCustomSync = (e) => {
      if (e.detail.key === key) {
        setStoredValue(validateValue(e.detail.newValue, initialValue));
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

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión actual al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch fresh user data to get the latest avatar_url
        supabase.auth.getUser().then(({ data: { user } }) => {
          setUser(user ?? session.user);
          syncDown(session.user.id);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Escuchar cambios de sesión (login, logout)
    let syncChannel = null;

    const setupSyncChannel = (userId) => {
      if (syncChannel) supabase.removeChannel(syncChannel);
      syncChannel = supabase
        .channel(`user_sync_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_sync',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            const row = payload.new;
            if (row && row.key) {
              let valToStore = row.value;
              if (typeof valToStore === 'string') {
                try {
                  const parsed = JSON.parse(valToStore);
                  if (parsed !== null && typeof parsed === 'object') {
                    valToStore = parsed;
                  }
                } catch(e) {}
              }
              const strForStorage = JSON.stringify(valToStore);
              window.localStorage.setItem(row.key, strForStorage);
              window.dispatchEvent(new CustomEvent('local-storage-sync', {
                detail: { key: row.key, newValue: valToStore }
              }));
            }
          }
        )
        .subscribe();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        syncDown(session.user.id);
        setupSyncChannel(session.user.id);
      } else if (syncChannel) {
        supabase.removeChannel(syncChannel);
      }
    });

    const handleFocusSync = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          syncDown(session.user.id);
        }
      });
    };

    window.addEventListener('focus', handleFocusSync);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocusSync();
    });

    return () => {
      subscription.unsubscribe();
      if (syncChannel) supabase.removeChannel(syncChannel);
      window.removeEventListener('focus', handleFocusSync);
    };
  }, []);

  const syncDown = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_sync')
        .select('key, value')
        .eq('user_id', userId);
        
      if (data) {
        data.forEach((row) => {
          let valToStore = row.value;
          if (typeof valToStore === 'string') {
            try {
              const parsed = JSON.parse(valToStore);
              // Avoid re-parsing regular strings if they happen to be valid JSON somehow, we just want to catch objects/arrays that were stringified
              if (parsed !== null && typeof parsed === 'object') {
                valToStore = parsed;
              }
            } catch(e) {}
          }
          const strForStorage = JSON.stringify(valToStore);
          window.localStorage.setItem(row.key, strForStorage);
          window.dispatchEvent(new CustomEvent('local-storage-sync', {
            detail: { key: row.key, newValue: valToStore }
          }));
        });
      }
    } catch (e) {
      console.error("Error sincronizando de bajada", e);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password) => {
    return supabase.auth.signUp({ email, password });
  };

  const signIn = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  const updateProfile = async ({ username, avatarUrl }) => {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        username: username,
        avatar_url: avatarUrl
      }
    });
    if (data?.user) {
      setUser(data.user);
    }
    return { data, error };
  };

  const value = {
    user,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

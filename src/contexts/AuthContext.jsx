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
      setUser(session?.user ?? null);
      if (session?.user) {
        syncDown(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de sesión (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        syncDown(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncDown = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_sync')
        .select('key, value')
        .eq('user_id', userId);
        
      if (data) {
        data.forEach((row) => {
          window.localStorage.setItem(row.key, JSON.stringify(row.value));
          window.dispatchEvent(new CustomEvent('local-storage-sync', {
            detail: { key: row.key, newValue: row.value }
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

import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Priorité aux variables d'environnement, sinon utiliser les valeurs hardcodées (pour le développement local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dyvxuzaotguwybzgevml.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dnh1emFvdGd1d3liemdldm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0OTQ4NjMsImV4cCI6MjA1OTA3MDg2M30.F7uBYa0m87hFgpwCXFzxOIeLN6-K6e6SZK2AAQZwY1c';
// Aucune clé de service n'est définie ici - elle devra être ajoutée dans les variables d'environnement du projet en production

console.log('Configuration Supabase:', { 
  url: supabaseUrl ? 'définie' : 'manquante', 
  keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0 
});

// Configuration Supabase optimisée pour la persistance des sessions
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // Détection de la session dans l'URL (pour OAuth)
    storageKey: 'truefalse-auth-token', // Clé spécifique pour le stockage
    storage: {
      getItem: (key) => {
        try {
          if (typeof window !== 'undefined') {
            const value = window.localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
          }
          return null;
        } catch (e) {
          console.error('Erreur lors de la récupération de la session stockée:', e);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          if (typeof window !== 'undefined') {
            const stringValue = JSON.stringify(value);
            window.localStorage.setItem(key, stringValue);
          }
        } catch (e) {
          console.error('Erreur lors de la sauvegarde de la session:', e);
        }
      },
      removeItem: (key) => {
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(key);
          }
        } catch (e) {
          console.error('Erreur lors de la suppression de la session:', e);
        }
      }
    }
  },
  global: {
    headers: { 'X-Client-Info': 'truefalse-app' }
  }
});

// Fonction de test pour vérifier la connexion
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('quizzes').select('id').limit(1);
    if (error) {
      console.error('Erreur de connexion à Supabase:', error);
      return { connected: false, error };
    }
    return { connected: true, data };
  } catch (err) {
    console.error('Exception lors de la connexion à Supabase:', err);
    return { connected: false, error: err };
  }
};

// Vérifier si la session est disponible
export const getSessionStatus = async () => {
  try {
    console.log("Récupération de la session utilisateur...");
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erreur lors de la récupération de la session:', error);
      return { hasSession: false, error };
    }
    
    if (data.session) {
      console.log("Session trouvée pour:", data.session.user.email);
    } else {
      console.log("Aucune session trouvée");
    }
    
    return { 
      hasSession: !!data.session, 
      session: data.session,
      user: data.session?.user || null
    };
  } catch (err) {
    console.error('Exception lors de la récupération de la session:', err);
    return { hasSession: false, error: err };
  }
};

// Fonction pour gérer la connexion/déconnexion manuellement
export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error("Erreur lors du rafraîchissement de la session:", error);
      return { success: false, error };
    }
    return { success: true, session: data.session };
  } catch (err) {
    console.error("Exception lors du rafraîchissement de la session:", err);
    return { success: false, error: err };
  }
};

// Fonction pour bypasser toutes les politiques RLS si nécessaire
let supabaseAdmin;

export const getSupabaseAdmin = () => {
  // À implémenter pour les opérations d'administration
  return supabase;
}; 
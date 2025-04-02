import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

// État global pour éviter de perdre la session entre les navigations
let globalAuthState = {
  user: null as User | null,
  profile: null as any,
  isInitialized: false,
  isRedirecting: false, // Eviter les redirections multiples
  lastSessionCheck: 0, // Timestamp de la dernière vérification
  recoveryAttempted: false, // Flag pour savoir si on a déjà tenté une récupération
  checkCount: 0, // Compteur pour limiter le nombre de vérifications
  isLoginPage: false // Flag pour savoir si nous sommes sur la page de login
};

export interface AuthState {
  user: User | null;
  profile: any;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'teacher' | 'student', school?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setIsLoginPage: (isLoginPage: boolean) => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(globalAuthState.user);
  const [profile, setProfile] = useState<any>(globalAuthState.profile);
  const [loading, setLoading] = useState(!globalAuthState.isInitialized);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Mettre à jour l'état pour savoir si nous sommes sur la page de login
  const setIsLoginPage = useCallback((isLoginPage: boolean) => {
    globalAuthState.isLoginPage = isLoginPage;
    console.log(`État page de login mis à jour: ${isLoginPage ? 'sur login' : 'pas sur login'}`);
  }, []);

  // Fonction de redirection sécurisée pour éviter les redirections multiples
  const safeRedirect = useCallback((path: string) => {
    if (globalAuthState.isRedirecting) {
      console.log("Redirection déjà en cours, ignorée pour:", path);
      return;
    }

    console.log("Redirection vers:", path);
    globalAuthState.isRedirecting = true;
    
    // Utilisation de setTimeout pour éviter les problèmes de timing
    setTimeout(() => {
      router.push(path);
      
      // Réinitialiser après un délai pour permettre de futures redirections
      setTimeout(() => {
        globalAuthState.isRedirecting = false;
      }, 1000);
    }, 100);
  }, [router]);

  // Fonction pour vérifier si une session existe dans le localStorage
  const checkLocalStorageSession = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    try {
      const tokenString = window.localStorage.getItem('truefalse-auth-token');
      if (!tokenString) return null;
      
      console.log("Trouvé des données de session dans localStorage");
      return JSON.parse(tokenString);
    } catch (e) {
      console.error("Erreur lors de la lecture du localStorage:", e);
      return null;
    }
  }, []);

  // Fonction pour récupérer la session avec plusieurs tentatives
  const getSessionWithRetry = useCallback(async (maxRetries = 3, delay = 300) => {
    // Si nous sommes sur la page de login, ne pas faire de multiples tentatives
    if (globalAuthState.isLoginPage) {
      maxRetries = 1; // Une seule tentative sur la page de login
    }

    // Incrémenter le compteur de vérifications global
    globalAuthState.checkCount++;
    
    // Limiter les vérifications à 50 max par session utilisateur
    if (globalAuthState.checkCount > 50) {
      console.log("Limite de vérifications de session atteinte, arrêt des vérifications");
      return { session: null };
    }
    
    let retries = 0;
    
    // Si on a déjà une session en cours, accélérer le processus
    const now = Date.now();
    if (now - globalAuthState.lastSessionCheck < 2000 && globalAuthState.user) {
      console.log("Session récemment vérifiée, utilisation du cache");
      return { session: { user: globalAuthState.user } };
    }
    
    // Marquer qu'on a vérifié la session
    globalAuthState.lastSessionCheck = now;
    
    // Essayer d'abord de récupérer une session stockée localement
    // Seulement si on n'est pas sur la page de login
    if (!globalAuthState.isLoginPage) {
      const storedSession = checkLocalStorageSession();
      if (storedSession && !globalAuthState.recoveryAttempted) {
        console.log("Tentative de restauration de session stockée");
        try {
          globalAuthState.recoveryAttempted = true;
          await supabase.auth.setSession(storedSession);
          console.log("Session restaurée depuis le stockage local");
          
          // Courte pause pour permettre à Supabase d'initialiser complètement la session
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Essayer de récupérer immédiatement la session
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            console.log("Session vérifiée après restauration pour:", data.session.user.email);
            return data;
          }
        } catch (e) {
          console.error("Échec de restauration de la session stockée:", e);
        }
      }
    }
    
    while (retries < maxRetries) {
      try {
        console.log(`Tentative de récupération de session ${retries + 1}/${maxRetries}`);
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Erreur lors de la récupération de la session:", error);
          retries++;
          // Attendre avant de réessayer
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Si session récupérée avec succès
        if (data.session) {
          console.log("Session récupérée avec succès pour:", data.session.user.email);
          globalAuthState.checkCount = 0; // Réinitialiser le compteur après succès
          
          // Important: sauvegarder la session dans l'état global
          if (!globalAuthState.user) {
            globalAuthState.user = data.session.user;
          }
        } else {
          console.log("Aucune session active trouvée");
          
          // Si c'est le dernier essai et qu'on a trouvé une session stockée
          // et qu'on n'est pas sur la page de login
          if (retries === maxRetries - 1 && !globalAuthState.isLoginPage) {
            const storedSession = checkLocalStorageSession();
            if (storedSession && !globalAuthState.recoveryAttempted && typeof window !== 'undefined') {
              console.log("Dernier essai: forçage du rechargement pour restaurer la session");
              if (!globalAuthState.recoveryAttempted) {
                globalAuthState.recoveryAttempted = true;
                window.location.reload();
                // Pause artificielle pour empêcher la poursuite du code
                await new Promise(resolve => setTimeout(resolve, 10000));
              }
            }
          }
        }
        
        // Session récupérée avec succès (même si null)
        return data;
      } catch (e) {
        console.error("Exception lors de la récupération de la session:", e);
        retries++;
        
        // Sur la page de login, ne pas réessayer
        if (globalAuthState.isLoginPage) break;
        
        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    if (retries >= maxRetries) {
      console.warn("Échec de récupération de la session après plusieurs tentatives");
    }
    return { session: null };
  }, [checkLocalStorageSession]);

  useEffect(() => {
    // Si nous sommes sur la page de login et qu'aucune session n'existe,
    // ne pas essayer de récupérer constamment la session
    if (globalAuthState.isLoginPage && !globalAuthState.user) {
      setLoading(false);
      return;
    }

    console.log("[DEBUG-AUTH] Initialisation du hook useAuth");

    // Définir un timeout pour éviter le chargement infini - augmenté à 12 secondes
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log("[DEBUG-AUTH] Délai d'authentification dépassé, arrêt du chargement");
        setLoading(false);
        
        // IMPORTANT: Ne pas réinitialiser l'état utilisateur si on a déjà une session
        // Même si le timeout expire, on garde la session existante
        if (globalAuthState.user) {
          console.log("[DEBUG-AUTH] Session existante préservée malgré le timeout");
          setUser(globalAuthState.user);
          setProfile(globalAuthState.profile);
          return;
        }
        
        // Tenter une dernière récupération de session du stockage local
        // Seulement si on n'est pas sur la page de login
        if (!globalAuthState.isLoginPage) {
          try {
            const storedSession = checkLocalStorageSession();
            if (storedSession && !globalAuthState.recoveryAttempted) {
              console.log("[DEBUG-AUTH] Session récupérée du stockage local, tentative de restauration");
              globalAuthState.recoveryAttempted = true;
              
              // Définir la session et forcer un rechargement
              supabase.auth.setSession(storedSession)
                .then(() => {
                  if (typeof window !== 'undefined') {
                    console.log("[DEBUG-AUTH] RECHARGEMENT DE LA PAGE pour finaliser la restauration");
                    // Marquer dans sessionStorage que nous venons de faire un rechargement
                    sessionStorage.setItem('auth_page_reloaded', 'true');
                    window.location.reload();
                  }
                })
                .catch(e => {
                  console.error("[DEBUG-AUTH] Erreur lors de la restauration de la session:", e);
                });
            }
          } catch (e) {
            console.error("[DEBUG-AUTH] Erreur lors de la récupération de la session du stockage:", e);
          }
        }
      }
    }, 12000); // 12 secondes au lieu de 6
    
    // Détection de rechargement récent
    if (typeof window !== 'undefined') {
      // Faire une vérification immédiate dès le chargement pour accélérer
      setTimeout(() => {
        console.log("[DEBUG-AUTH] Vérification rapide de session au démarrage");
        supabase.auth.getSession().then(({data}) => {
          if (data?.session) {
            console.log("[DEBUG-AUTH] Session trouvée au démarrage:", data.session.user.email);
            setUser(data.session.user);
            globalAuthState.user = data.session.user;
            
            // Tout de suite marquer comme non-loading pour éviter le problème d'écran blanc
            setLoading(false);
            
            // Récupérer le profil en arrière-plan sans bloquer
            supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single()
              .then(({ data: profileData }) => {
                if (profileData) {
                  setProfile(profileData);
                  globalAuthState.profile = profileData;
                }
              });
          }
        });
      }, 100); // Vérification presque immédiate
      
      const hasReloaded = sessionStorage.getItem('auth_page_reloaded');
      if (hasReloaded) {
        console.log("[DEBUG-AUTH] Page récemment rechargée, accélération de l'authentification");
        sessionStorage.removeItem('auth_page_reloaded');
        
        // Forcer une tentative immédiate de récupération de session
        getSessionWithRetry(2, 200).then(({ session }) => {
          if (session?.user) {
            console.log("[DEBUG-AUTH] Session récupérée après rechargement:", session.user.email);
            setUser(session.user);
            globalAuthState.user = session.user;
            setLoading(false);
          } else {
            console.log("[DEBUG-AUTH] Pas de session après rechargement");
          }
        });
      }
    }

    // Si l'état global est déjà initialisé, utiliser cet état
    if (globalAuthState.isInitialized && globalAuthState.user) {
      console.log("[DEBUG-AUTH] Utilisation de l'état global existant:", globalAuthState.user.email);
      setUser(globalAuthState.user);
      setProfile(globalAuthState.profile);
      setLoading(false);
      clearTimeout(loadingTimeout);
      return () => clearTimeout(loadingTimeout);
    }

    // Récupérer la session initiale
    const getInitialSession = async () => {
      try {
        setLoading(true);
        
        // Utiliser la fonction avec retry
        const { session } = await getSessionWithRetry();
        
        if (session?.user) {
          console.log("[DEBUG-AUTH] Session utilisateur trouvée:", session.user.email);
          setUser(session.user);
          globalAuthState.user = session.user;
          
          // IMPORTANT: Marquer comme non-loading immédiatement pour éviter l'écran blanc
          setLoading(false);
          
          // Récupérer le profil utilisateur APRÈS avoir marqué comme non-loading
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (profileData) {
              console.log("[DEBUG-AUTH] Profil utilisateur récupéré");
              setProfile(profileData);
              globalAuthState.profile = profileData;
            } else {
              console.warn("[DEBUG-AUTH] Profil non trouvé pour l'utilisateur:", session.user.id);
            }
          } catch (profileError) {
            console.error("[DEBUG-AUTH] Erreur lors de la récupération du profil:", profileError);
          }
        } else {
          console.log("[DEBUG-AUTH] Aucune session trouvée lors de l'initialisation");
          setUser(null);
          setProfile(null);
          globalAuthState.user = null;
          globalAuthState.profile = null;
          setLoading(false);
        }
        
        globalAuthState.isInitialized = true;
      } catch (error: any) {
        console.error("[DEBUG-AUTH] Erreur d'authentification:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    getInitialSession();

    // Configurer le listener de changement d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[DEBUG-AUTH] Évènement de changement d'authentification:", event);
      
      // Mettre à jour l'état avec la nouvelle session
      if (session?.user) {
        setUser(session.user);
        globalAuthState.user = session.user;
        globalAuthState.lastSessionCheck = Date.now();
        globalAuthState.checkCount = 0; // Réinitialiser le compteur
        
        // Récupérer le profil utilisateur
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileData) {
            setProfile(profileData);
            globalAuthState.profile = profileData;
            
            // CORRECTION: Rediriger vers le tableau de bord SEULEMENT lors d'une connexion
            // ET seulement si on n'est pas déjà sur la page du dashboard
            if (event === 'SIGNED_IN' && typeof window !== 'undefined') {
              // Vérifier l'URL actuelle pour éviter les redirections en boucle
              const currentPath = window.location.pathname;
              if (!currentPath.includes('/dashboard')) {
                console.log("[DEBUG-AUTH] Utilisateur connecté, redirection vers le tableau de bord");
                safeRedirect('/dashboard');
              } else {
                console.log("[DEBUG-AUTH] Déjà sur le dashboard, pas de redirection nécessaire");
                
                // Force l'affichage du contenu en marquant dans le sessionStorage
                sessionStorage.setItem('login_redirected', 'true');
              }
            }
          }
        } catch (profileError) {
          console.error("[DEBUG-AUTH] Erreur lors de la récupération du profil:", profileError);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        globalAuthState.user = null;
        globalAuthState.profile = null;
        globalAuthState.isInitialized = false;
        globalAuthState.recoveryAttempted = false;
        globalAuthState.checkCount = 0; // Réinitialiser le compteur
        
        // Redirection vers la page d'accueil en cas de déconnexion
        safeRedirect('/');
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [loading, safeRedirect, getSessionWithRetry, checkLocalStorageSession, globalAuthState.isLoginPage]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Tentative de connexion avec:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      console.log("Connexion réussie");
      
      // Pour éviter les problèmes après la connexion, mettre à jour l'état global immédiatement
      if (data.user) {
        globalAuthState.user = data.user;
        globalAuthState.lastSessionCheck = Date.now();
        globalAuthState.checkCount = 0; // Réinitialiser le compteur
        setUser(data.user);
        
        // Récupérer le profil immédiatement après la connexion
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (profileData) {
            globalAuthState.profile = profileData;
            setProfile(profileData);
            
            // Forcer la navigation vers le tableau de bord avec la redirection sécurisée
            safeRedirect('/dashboard');
          }
        } catch (profileError) {
          console.error("Erreur lors de la récupération du profil après connexion:", profileError);
        }
        
        globalAuthState.isInitialized = true;
        globalAuthState.recoveryAttempted = false;
      }
    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'teacher' | 'student', school?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Créer un nouvel utilisateur
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });

      if (signUpError) throw signUpError;
      if (!user) throw new Error("L'inscription a échoué");

      // Créer le profil utilisateur
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email,
            full_name: fullName,
            role,
            school: school || "" // Utiliser une chaîne vide si school n'est pas fourni
          }
        ]);

      if (profileError) throw profileError;

    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      console.log("Déconnexion en cours...");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Réinitialiser l'état
      setUser(null);
      setProfile(null);
      globalAuthState.user = null;
      globalAuthState.profile = null;
      globalAuthState.isInitialized = false;
      globalAuthState.recoveryAttempted = false;
      globalAuthState.checkCount = 0; // Réinitialiser le compteur
      
      console.log("Déconnexion réussie, redirection vers la page d'accueil");
      
      // Rediriger avec notre fonction sécurisée
      safeRedirect('/');
    } catch (error: any) {
      console.error("Erreur de déconnexion:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Erreur de réinitialisation du mot de passe:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return { user, profile, loading, error, signIn, signUp, signOut, resetPassword, setIsLoginPage };
} 
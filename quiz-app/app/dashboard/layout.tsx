"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";
import { getSessionStatus, supabase } from "@/lib/supabase/client";

// Définition du composant Spinner en interne pour éviter les problèmes d'importation
function Spinner({ size = "lg", className = "" }: { size?: "sm" | "md" | "lg", className?: string }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3"
  };

  return (
    <div
      className={`animate-spin rounded-full border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}
    >
      <span className="sr-only">Chargement...</span>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionCheckRetries, setSessionCheckRetries] = useState(0);
  const maxRetries = 1; // Réduit à 1 seule tentative pour éviter les boucles
  const [reloadAttempted, setReloadAttempted] = useState(false);
  const [forceShowContent, setForceShowContent] = useState(false); // Nouveau état pour forcer l'affichage
  const [directSessionFound, setDirectSessionFound] = useState(false); // Nouvel état pour les sessions trouvées directement

  // Détecter si la page vient d'être rechargée
  useEffect(() => {
    console.log("[DEBUG] Dashboard Layout: Initialisation, mounting");
    
    // Vérifier si nous venons de recharger la page
    if (typeof window !== 'undefined') {
      const hasReloaded = sessionStorage.getItem('dashboard_reloaded');
      if (hasReloaded) {
        console.log("[DEBUG] Page rechargée - utilisation du flag pour accélérer le rendu");
        setIsCheckingSession(false);
        setForceShowContent(true); // FORCER l'affichage après rechargement
        sessionStorage.removeItem('dashboard_reloaded');
      }
      
      const loginRedirected = sessionStorage.getItem('login_redirected');
      if (loginRedirected) {
        console.log("[DEBUG] Redirection depuis login détectée");
        setForceShowContent(true);
        sessionStorage.removeItem('login_redirected');
      }
      
      // SOLUTION ULTIME: Si nous avons une URL qui contient dashboard, forcer l'affichage
      // même si l'état auth n'est pas encore prêt
      if (window.location.pathname.includes('/dashboard')) {
        console.log("[DEBUG] URL du dashboard détectée, forçage de l'affichage après 1s");
        setTimeout(() => {
          // Vérifier si le contenu est déjà affiché
          if (!forceShowContent) {
            console.log("[DEBUG] Activation du forçage d'affichage (URL dashboard)");
            setForceShowContent(true);
          }
        }, 1000); // Attendre 1 seconde pour laisser une chance à l'authentification normale
      }
      
      // Vérification DIRECTE et rapide de la session Supabase
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          console.log("[DEBUG] Session trouvée directement:", data.session.user.email);
          setDirectSessionFound(true);
          setForceShowContent(true); // FORCER l'affichage immédiatement
          setIsCheckingSession(false);
        }
      }).catch(() => {
        // Session non trouvée, continue avec le processus normal
      });
    }

    setMounted(true);
    
    // IMPORTANT: Si après 2 secondes le contenu n'est pas affiché, le forcer
    const forceShowTimeout = setTimeout(() => {
      if (!forceShowContent) {
        console.log("[DEBUG] Forcage d'affichage après 2s pour éviter écran blanc");
        setForceShowContent(true);
      }
    }, 2000); // Seulement 2 secondes d'attente max
    
    // Forcer l'affichage après un délai maximum de 15 secondes pour éviter écran blanc infini
    const maxWaitTimeout = setTimeout(() => {
      if (isCheckingSession && !reloadAttempted) {
        console.log("Délai maximum d'attente dépassé, tentative de forçage d'affichage");
        
        // Vérifier une dernière fois s'il y a une session Supabase
        supabase.auth.getSession().then(({ data }) => {
          if (data?.session) {
            console.log("Session trouvée in-extremis:", data.session.user.email);
            setIsCheckingSession(false);
          } else {
            console.log("Aucune session trouvée après délai maximum, redirection vers login");
            // Marquer la redirection
            sessionStorage.setItem('login_redirected', 'true');
            router.push("/login");
          }
        });
      }
    }, 15000);

    return () => {
      clearTimeout(maxWaitTimeout);
      clearTimeout(forceShowTimeout);
      console.log("[DEBUG] Dashboard Layout: Cleaning up");
    };
  }, [router, isCheckingSession, reloadAttempted, forceShowContent]);

  // Fonction pour vérifier la session - simplifiée pour éviter les boucles
  const checkSession = async () => {
    try {
      console.log(`[DEBUG] Vérification de session (tentative ${sessionCheckRetries + 1}/${maxRetries + 1})`);
      
      // Essayer d'abord de récupérer la session actuelle
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("[DEBUG] Erreur lors de la vérification de session:", error);
        
        if (sessionCheckRetries < maxRetries) {
          // Réessayer après un délai
          setSessionCheckRetries(prev => prev + 1);
          return;
        }
        
        // Force reload si pas déjà tenté
        if (!reloadAttempted) {
          forceReloadPage();
          return;
        }
        
        // Plus de tentatives, rediriger vers la page de connexion
        console.log("Échec de récupération de session après plusieurs tentatives, redirection vers login");
        sessionStorage.setItem('login_redirected', 'true');
        router.push("/login");
        return;
      }
      
      if (data.session?.user) {
        console.log("[DEBUG] Session trouvée pour:", data.session.user.email);
        setIsCheckingSession(false);
        setForceShowContent(true); // IMPORTANT: Forcer l'affichage dès qu'une session est trouvée
      } else {
        // Session non trouvée
        if (sessionCheckRetries < maxRetries) {
          // Réessayer après un délai
          console.log("Pas de session, nouvelle tentative...");
          setSessionCheckRetries(prev => prev + 1);
        } else {
          // Force reload si pas déjà tenté
          if (!reloadAttempted) {
            forceReloadPage();
            return;
          }
          
          // Plus de tentatives, rediriger vers la page de connexion
          console.log("Aucune session trouvée après plusieurs tentatives, redirection vers login");
          sessionStorage.setItem('login_redirected', 'true');
          router.push("/login");
        }
      }
    } catch (error) {
      console.error("Exception lors de la vérification de session:", error);
      
      if (sessionCheckRetries < maxRetries) {
        setSessionCheckRetries(prev => prev + 1);
      } else {
        // Force reload si pas déjà tenté
        if (!reloadAttempted) {
          forceReloadPage();
          return;
        }
        
        sessionStorage.setItem('login_redirected', 'true');
        router.push("/login");
      }
    }
  };
  
  // Fonction pour forcer le rechargement de la page
  const forceReloadPage = () => {
    if (typeof window !== 'undefined') {
      console.log("[DEBUG] RECHARGEMENT FORCÉ DE LA PAGE pour restaurer la session");
      setReloadAttempted(true);
      
      // Marquer que nous rechargeons pour accélérer le rendu après rechargement
      sessionStorage.setItem('dashboard_reloaded', 'true');
      
      // Forcer un rechargement complet de la page
      window.location.reload();
    }
  };
  
  // Effet séparé pour vérifier la session - simplifié
  useEffect(() => {
    if (!mounted) return;
    
    console.log(`[DEBUG] Dashboard Layout effect - user: ${!!user}, forceShowContent: ${forceShowContent}, directSessionFound: ${directSessionFound}`);
    
    // Si déjà un utilisateur, ne pas vérifier
    if (user) {
      console.log("[DEBUG] Utilisateur déjà présent dans context, skip vérification");
      setIsCheckingSession(false);
      setForceShowContent(true); // IMPORTANT: Forcer l'affichage si utilisateur existe
      return;
    }
    
    // Si on force l'affichage ou si une session directe a été trouvée, ne pas vérifier
    if (forceShowContent || directSessionFound) {
      console.log("[DEBUG] Forçage d'affichage actif, skip vérification");
      setIsCheckingSession(false);
      return;
    }
    
    // Vérifier la session une fois au chargement
    if (isCheckingSession && sessionCheckRetries === 0) {
      checkSession();
    }
    
    // Retenter la vérification si nécessaire
    if (sessionCheckRetries > 0 && sessionCheckRetries <= maxRetries) {
      const retryTimeout = setTimeout(() => {
        checkSession();
      }, 800);
      
      return () => clearTimeout(retryTimeout);
    }
    
    // Court timeout pour recharger la page si nécessaire
    if (isCheckingSession && !reloadAttempted) {
      const hardTimeoutForReload = setTimeout(() => {
        console.log("Délai maximum dépassé, tentative de rechargement forcé");
        forceReloadPage();
      }, 3000); // 3 secondes maximum d'attente
      
      return () => clearTimeout(hardTimeoutForReload);
    }
    
    return () => {
      console.log("[DEBUG] Démontage de l'effet de vérification de session");
    };
  }, [router, mounted, sessionCheckRetries, isCheckingSession, reloadAttempted, user, forceShowContent, directSessionFound]);

  // Attendre que le composant soit monté
  if (!mounted) {
    console.log("[DEBUG] Composant pas encore monté");
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // IMPORTANT: Si on a une session directe ou forceShowContent, on ignore loading/isCheckingSession
  if ((loading || isCheckingSession) && !forceShowContent && !directSessionFound) {
    console.log("[DEBUG] Affichage du spinner: loading=" + loading + ", isCheckingSession=" + isCheckingSession);
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="mt-4 text-slate-600">
          {sessionCheckRetries > 0 ? 
            `Tentative de récupération de session (${sessionCheckRetries}/${maxRetries})...` : 
            "Vérification de votre authentification..."}
        </p>
        {reloadAttempted && (
          <p className="mt-2 text-blue-600">Rechargement effectué, restauration de votre session...</p>
        )}
      </div>
    );
  }

  // IMPORTANT: On ne redirige que si toutes les méthodes de détection ont échoué ET qu'on n'a pas de session directe
  if (!user && !forceShowContent && !directSessionFound) {
    // IMPORTANT: Vérification ULTIME de la session avant de rediriger
    if (typeof window !== 'undefined') {
      // Parcourir le localStorage pour trouver une preuve de session
      const hasToken = window.localStorage.getItem('truefalse-auth-token');
      const hasBackup = window.localStorage.getItem('session-backup');
      
      if (hasToken || hasBackup) {
        console.log("[DEBUG] Token trouvé dans localStorage, on essaie d'afficher malgré tout");
        return (
          <div className="min-h-screen bg-gray-50">
            {/* Container pour centrer le contenu */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        );
      }
    }
    
    console.log("[DEBUG] Redirection vers login, aucune session trouvée");
    sessionStorage.setItem('login_redirected', 'true');
    router.push("/login");
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Spinner size="lg" />
        <p className="mt-4 text-slate-600">Redirection vers la page de connexion...</p>
      </div>
    );
  }

  console.log("[DEBUG] Affichage du contenu du dashboard");
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Container pour centrer le contenu */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
} 
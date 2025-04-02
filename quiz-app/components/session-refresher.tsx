"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * Composant utilitaire qui configure le comportement d'authentification Supabase
 * Ce composant n'affiche rien et fonctionne en arrière-plan
 */
export function SessionRefresher() {
  const [hasSession, setHasSession] = useState(false);
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userActivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const checkCountRef = useRef(0); // Pour limiter le nombre de vérifications
  const lastActivityRef = useRef(Date.now());

  // Fonction pour rafraîchir la session
  const refreshSession = async () => {
    if (!hasSession) return;
    
    try {
      // Rafraîchir la session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("Erreur lors du rafraîchissement de la session:", error);
        // Si erreur de rafraîchissement, marquer que la session est peut-être invalide
        setHasSession(false);
        
        // Vérifier immédiatement s'il reste une session valide
        checkSession();
        return;
      }
      
      if (data.session) {
        // Session rafraichie avec succès
        console.log("Session rafraîchie avec succès");
        setHasSession(true);
        setSessionUser(data.session.user?.email || "utilisateur inconnu");
        
        // Sauvegarder la session dans le localStorage comme backup
        if (typeof window !== 'undefined') {
          try {
            const serializedSession = JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token
            });
            console.log("Sauvegarde de la session rafraîchie en localStorage");
            localStorage.setItem('session-backup', serializedSession);
          } catch (e) {
            console.error("Erreur lors de la sauvegarde de la session:", e);
          }
        }
      } else {
        console.warn("Échec du rafraîchissement de la session - aucune session retournée");
        setHasSession(false);
        setSessionUser(null);
        
        // Vérifier immédiatement s'il reste une session valide
        checkSession();
      }
    } catch (error) {
      console.error("Exception lors du rafraîchissement de la session:", error);
      setHasSession(false);
      
      // Vérifier immédiatement s'il reste une session valide
      checkSession();
    }
  };

  // Fonction pour vérifier si l'utilisateur a une session
  const checkSession = async () => {
    // Limiter le nombre de vérifications pour éviter les boucles
    checkCountRef.current += 1;
    if (checkCountRef.current > 50) {
      console.log("Limite de vérifications de session atteinte dans SessionRefresher");
      return;
    }
    
    try {
      const { data } = await supabase.auth.getSession();
      
      if (data?.session) {
        checkCountRef.current = 0; // Réinitialiser le compteur quand une session est trouvée
        const userEmail = data.session.user?.email || "utilisateur sans email";
        console.log("Session Supabase active détectée pour", userEmail);
        setHasSession(true);
        setSessionUser(userEmail);
        
        // Mettre à jour le timestamp de dernière activité
        lastActivityRef.current = Date.now();
        
        // Sauvegarder la session dans le localStorage comme backup
        if (typeof window !== 'undefined') {
          try {
            const serializedSession = JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token
            });
            localStorage.setItem('session-backup', serializedSession);
          } catch (e) {
            console.error("Erreur lors de la sauvegarde de la session:", e);
          }
        }
        
        // Programmer un rafraîchissement avant l'expiration
        if (data.session.expires_at) {
          const expiresAt = new Date(data.session.expires_at * 1000).getTime();
          const now = Date.now();
          const timeUntilExpiry = expiresAt - now;
          
          // Rafraîchir 5 minutes avant l'expiration ou maintenant si < 5 minutes
          const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0);
          
          console.log(`Session expire dans ${(timeUntilExpiry / 60000).toFixed(1)} minutes, rafraîchissement prévu dans ${(refreshTime / 60000).toFixed(1)} minutes`);
          
          // Nettoyer tout timer existant
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
          }
          
          // Programmer le prochain rafraîchissement
          refreshTimerRef.current = setTimeout(() => {
            console.log("Exécution du rafraîchissement programmé de la session");
            refreshSession();
          }, refreshTime);
        }
      } else {
        console.log("Aucune session Supabase active");
        setHasSession(false);
        setSessionUser(null);
        
        // Tenter de récupérer une session de backup si disponible
        if (typeof window !== 'undefined') {
          const backupSession = localStorage.getItem('session-backup');
          if (backupSession) {
            try {
              console.log("Tentative de restauration depuis session de backup");
              const parsedSession = JSON.parse(backupSession);
              await supabase.auth.setSession(parsedSession);
              console.log("Session restaurée depuis backup");
              
              // Revérifier immédiatement
              setTimeout(() => {
                checkSession();
              }, 500);
              
              return;
            } catch (e) {
              console.error("Échec de restauration depuis session de backup:", e);
              localStorage.removeItem('session-backup');
            }
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification de la session:", error);
      setHasSession(false);
    }
  };

  // Fonction pour traquer l'activité de l'utilisateur
  const trackUserActivity = () => {
    lastActivityRef.current = Date.now();
    
    // Si plus de 5 minutes depuis la dernière vérification, vérifier la session
    if (hasSession && Date.now() - lastActivityRef.current > 5 * 60 * 1000) {
      console.log("Plus de 5 minutes d'inactivité, vérification de la session");
      checkSession();
    }
  };

  useEffect(() => {
    // S'assurer que Supabase est correctement configuré pour l'authentification
    console.log("Initialisation des listeners d'authentification Supabase");
    
    // Vérifier l'état d'authentification au chargement
    checkSession();
    
    // Configurer un rafraîchissement régulier pour la vérification de session
    // moins fréquent pour éviter les boucles (toutes les 3 minutes)
    sessionCheckIntervalRef.current = setInterval(() => {
      checkSession();
    }, 180000); // Vérifier la session toutes les 3 minutes
    
    // Configurer le suivi de l'activité utilisateur
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    // Ajouter les écouteurs d'activité
    if (typeof window !== 'undefined') {
      activityEvents.forEach(event => {
        window.addEventListener(event, trackUserActivity);
      });
      
      // Vérifier régulièrement si l'utilisateur est actif
      userActivityTimerRef.current = setInterval(() => {
        // Si session active et utilisateur inactif depuis plus de 10 minutes
        if (hasSession && Date.now() - lastActivityRef.current > 10 * 60 * 1000) {
          console.log("Utilisateur inactif depuis plus de 10 minutes, vérification de session");
          checkSession();
        }
      }, 60000); // Vérifier toutes les minutes
    }
    
    // Configurer l'événement de focus pour rafraîchir la session quand l'utilisateur revient sur la page
    const handleFocus = () => {
      console.log("Fenêtre a reçu le focus, vérification de la session");
      checkSession();
    };
    
    // Ajouter les écouteurs d'événements
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      
      // Écouteur pour détecter les problèmes de connectivité
      window.addEventListener('online', () => {
        console.log("Connectivité rétablie, vérification de la session");
        checkSession();
      });
    }
    
    // Message d'état si une session est maintenue
    if (hasSession && sessionUser) {
      console.log("Session maintenue activement pour:", sessionUser);
    }
    
    return () => {
      console.log("Nettoyage du SessionRefresher");
      
      // Nettoyer tous les intervalles et timeouts
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
      if (userActivityTimerRef.current) {
        clearInterval(userActivityTimerRef.current);
      }
      
      // Retirer les écouteurs d'événements
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('online', handleFocus);
        
        activityEvents.forEach(event => {
          window.removeEventListener(event, trackUserActivity);
        });
      }
    };
  }, [hasSession, sessionUser]);

  // Ce composant ne rend rien visuellement
  return null;
} 
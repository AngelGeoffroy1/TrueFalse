"use client";

import { useEffect, useState, useCallback } from "react";
import { quizApi } from '@/lib/api/quiz-api';

interface CheatDetectionOptions {
  onCheatDetected?: () => void;
  enabled?: boolean;
  trackTabSwitch?: boolean;
  trackCopyPaste?: boolean;
  trackRightClick?: boolean;
  trackFullScreen?: boolean;
  participantId?: string;
}

/**
 * Hook personnalisé pour détecter les tentatives de triche
 * 
 * @param options Options de configuration
 * @returns Statistiques de détection 
 */
export function useCheatDetection({
  onCheatDetected,
  enabled = true,
  trackTabSwitch = true,
  trackCopyPaste = true,
  trackRightClick = true,
  trackFullScreen = false,
  participantId
}: CheatDetectionOptions) {
  // Nombre de tentatives de triche détectées
  const [cheatAttempts, setCheatAttempts] = useState(0);
  
  // Dernière tentative de triche
  const [lastCheatType, setLastCheatType] = useState<string | null>(null);
  
  // Heure de la dernière tentative de triche
  const [lastCheatTime, setLastCheatTime] = useState<Date | null>(null);

  // Fonction pour enregistrer une tentative de triche
  const recordCheatAttempt = useCallback(async (type: string, details?: string) => {
    setCheatAttempts((prev) => prev + 1);
    setLastCheatType(type);
    setLastCheatTime(new Date());
    
    // Si un participantId est fourni, enregistrer dans Supabase
    if (participantId && enabled) {
      try {
        await quizApi.recordCheatAttempt(participantId, type, details);
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la tentative de triche:', error);
      }
    }
    
    // Appeler le callback si fourni
    if (onCheatDetected) {
      onCheatDetected();
    }
  }, [onCheatDetected, participantId, enabled]);

  // Détection de changement d'onglet
  useEffect(() => {
    if (!enabled || !trackTabSwitch) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        recordCheatAttempt("tab_switch", "L'utilisateur a changé d'onglet ou a minimisé la fenêtre");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, trackTabSwitch, recordCheatAttempt]);

  // Détection de copier-coller
  useEffect(() => {
    if (!enabled || !trackCopyPaste) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordCheatAttempt("copy", "L'utilisateur a tenté de copier du contenu");
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordCheatAttempt("paste", "L'utilisateur a tenté de coller du contenu");
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [enabled, trackCopyPaste, recordCheatAttempt]);

  // Détection de clic droit
  useEffect(() => {
    if (!enabled || !trackRightClick) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordCheatAttempt("right_click", "L'utilisateur a fait un clic droit");
    };

    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [enabled, trackRightClick, recordCheatAttempt]);

  // Détection de sortie du mode plein écran
  useEffect(() => {
    if (!enabled || !trackFullScreen) return;

    const handleFullScreenChange = () => {
      if (!document.fullscreenElement) {
        recordCheatAttempt("exit_fullscreen", "L'utilisateur est sorti du mode plein écran");
      }
    };

    document.addEventListener("fullscreenchange", handleFullScreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, [enabled, trackFullScreen, recordCheatAttempt]);

  // Fonction pour demander le mode plein écran
  const requestFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
  }, []);

  // Fonction pour quitter le mode plein écran
  const exitFullScreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error(`Error attempting to exit full-screen mode: ${err.message}`);
      });
    }
  }, []);

  // Activer/désactiver la détection
  const setEnabled = useCallback((isEnabled: boolean) => {
    if (isEnabled === enabled) return;
    
    // Si on active la détection en mode plein écran, demander le plein écran
    if (isEnabled && trackFullScreen) {
      requestFullScreen();
    }
  }, [enabled, trackFullScreen, requestFullScreen]);

  return {
    cheatAttempts,
    lastCheatType,
    lastCheatTime,
    requestFullScreen,
    exitFullScreen,
    setEnabled,
    isEnabled: enabled,
    resetCheatAttempts: () => setCheatAttempts(0),
    reportCheat: recordCheatAttempt
  };
} 
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface QuizTimerProps {
  duration: number; // Durée en secondes
  onTimeUp: () => void;
  isPaused?: boolean;
  className?: string;
}

export function QuizTimer({
  duration,
  onTimeUp,
  isPaused = false,
  className,
}: QuizTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isWarning, setIsWarning] = useState(false);
  const [isDanger, setIsDanger] = useState(false);

  // Réinitialiser le timer lorsque la durée change
  useEffect(() => {
    setTimeRemaining(duration);
    setIsWarning(false);
    setIsDanger(false);
  }, [duration]);

  // Fonction pour formater le temps
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Effet pour gérer le minuteur
  useEffect(() => {
    if (isPaused) return;

    // Définir les états d'alerte
    const warningThreshold = Math.min(10, Math.floor(duration / 3));
    const dangerThreshold = Math.min(5, Math.floor(duration / 5));

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        
        // Vérifier les seuils d'alerte
        if (newTime <= dangerThreshold) {
          setIsDanger(true);
        } else if (newTime <= warningThreshold) {
          setIsWarning(true);
        }
        
        // Si le temps est écoulé
        if (newTime <= 0) {
          clearInterval(timer);
          onTimeUp();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [duration, isPaused, onTimeUp]);

  // Classes CSS pour les différents états du minuteur
  const timerClasses = cn(
    "text-xl font-bold rounded-md py-1 px-3 transition-colors",
    {
      "bg-slate-200 text-slate-800": !isWarning && !isDanger,
      "bg-amber-100 text-amber-800": isWarning && !isDanger,
      "bg-red-100 text-red-800 animate-pulse": isDanger,
    },
    className
  );

  // Classes CSS pour la barre de progression
  const progressClasses = cn(
    "h-1 transition-all duration-1000 rounded-full",
    {
      "bg-slate-500": !isWarning && !isDanger,
      "bg-amber-500": isWarning && !isDanger,
      "bg-red-500": isDanger,
    }
  );

  return (
    <div className="space-y-1">
      <div className={timerClasses}>{formatTime(timeRemaining)}</div>
      <div className="w-full bg-slate-200 rounded-full">
        <div
          className={progressClasses}
          style={{
            width: `${(timeRemaining / duration) * 100}%`,
          }}
        ></div>
      </div>
    </div>
  );
} 
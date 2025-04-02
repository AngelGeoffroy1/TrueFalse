"use client";

import { useEffect, useState, useRef } from "react";
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
  const timeUpTriggeredRef = useRef(false);

  // Réinitialiser le timer lorsque la durée change
  useEffect(() => {
    setTimeRemaining(duration);
    setIsWarning(false);
    setIsDanger(false);
    timeUpTriggeredRef.current = false;
  }, [duration]);

  // Fonction pour formater le temps
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Effet pour gérer le minuteur
  useEffect(() => {
    if (isPaused || timeRemaining <= 0) return;

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
        
        return newTime;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [duration, isPaused, timeRemaining]);

  // Effet séparé pour détecter quand le temps est écoulé
  useEffect(() => {
    if (timeRemaining <= 0 && !timeUpTriggeredRef.current && !isPaused) {
      timeUpTriggeredRef.current = true;
      onTimeUp();
    }
  }, [timeRemaining, onTimeUp, isPaused]);

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
      <div className={timerClasses}>{formatTime(Math.max(0, timeRemaining))}</div>
      <div className="w-full bg-slate-200 rounded-full">
        <div
          className={progressClasses}
          style={{
            width: `${Math.max(0, (timeRemaining / duration) * 100)}%`,
          }}
        ></div>
      </div>
    </div>
  );
} 
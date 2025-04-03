"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import Link from "next/link";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { quizApi } from "@/lib/api/quiz-api";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/use-auth";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckIcon, FilterIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import Image from "next/image";

// Types pour les données
type Student = {
  id: string;
  name: string;
  score: number;
  cheatAttempts: number;
  connected: boolean;
  currentQuestion: number | null;
  answers: Array<{
    questionId: string;
    selectedOptionId: string | null;
    correct: boolean;
    timeSpent: number;
  }>;
};

export default function QuizSession() {
  const { user, loading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  
  const [quiz, setQuiz] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [sessionCode, setSessionCode] = useState<string>("");
  const [participants, setParticipants] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Options de la session
  const [showLiveResults, setShowLiveResults] = useState<boolean>(true);
  const [antiCheatEnabled, setAntiCheatEnabled] = useState<boolean>(true);
  const [autoProgress, setAutoProgress] = useState<boolean>(true);

  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all"); // all, highest, latest
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // État pour les filtres de session
  const [sessionFilter, setSessionFilter] = useState<string[]>([]);
  const [availableSessions, setAvailableSessions] = useState<{id: string, code: string}[]>([]);

  // État pour les options du quiz
  const [quizOptions, setQuizOptions] = useState({
    shuffle_questions: false,
    show_answers: false,
    anti_cheat: false
  });

  // Ajouter un état pour stocker le total des points possibles
  const [totalPoints, setTotalPoints] = useState(0);
  // Ajouter un état pour le nombre de questions
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Remplacer les états liés au timer local et ajouter un état pour le temps écoulé basé sur started_at
  const [sessionElapsedTime, setSessionElapsedTime] = useState<number>(0);
  const [sessionTimerInterval, setSessionTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Chargement du quiz
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { supabase, testSupabaseConnection } = await import('@/lib/supabase/client');
        const connectionTest = await testSupabaseConnection();
        console.log('Test de connexion Supabase:', connectionTest);
        
        if (!connectionTest.connected) {
          toast.error("Problème de connexion à la base de données", {
            description: "Veuillez réessayer ou contacter l'administrateur"
          });
        }
      } catch (error) {
        console.error('Erreur lors du test de connexion:', error);
      }
    };
    
    testConnection();
    
    const fetchQuiz = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const quizData = await quizApi.getQuizWithQuestions(quizId);
        console.log('Quiz chargé avec succès:', quizData);
        setQuiz(quizData);
        
        // Déterminer la limite de temps à afficher en fonction du type de temps
        if (quizData.time_type === 'total') {
          // Si c'est un temps total, on l'affiche en secondes
          setTimeRemaining(quizData.time_total || 0);
        } else {
          // Sinon, on utilise le temps par question
          setTimeRemaining(quizData.time_per_question || 30);
        }
        
        // Vérifier si une session active existe déjà pour ce quiz
        try {
          console.log("Vérification des sessions actives existantes...");
          const activeSessions = await quizApi.getActiveSessions(user.id);
          const existingSessionForQuiz = activeSessions.find(s => s.quiz_id === quizId);
          
          if (existingSessionForQuiz) {
            console.log("Session active trouvée au chargement:", existingSessionForQuiz);
            
            // Restaurer l'état de la session
            setSession(existingSessionForQuiz);
            setSessionCode(existingSessionForQuiz.code);
            setIsSessionActive(true);
            setCurrentQuestionIndex(existingSessionForQuiz.current_question_index || 0);
            
            // Valeurs par défaut pour les options de session
            setShowLiveResults(true); // Valeur par défaut
            setAntiCheatEnabled(true); // Valeur par défaut
            setAutoProgress(false); // Valeur par défaut
            
            // Vérifier les participants existants
            checkParticipants(existingSessionForQuiz.id);
            
            console.log("État de la session restauré avec options par défaut", {
              showLiveResults: true,
              antiCheatEnabled: true,
              autoProgress: false
            });
          } else {
            console.log("Aucune session active trouvée pour ce quiz");
          }
        } catch (error) {
          console.warn("Erreur lors de la vérification des sessions existantes:", error);
        }

        // Calculer le total des points possibles
        if (quizData?.questions) {
          const total = quizData.questions.reduce((sum: number, question: any) => sum + (question.points || 1), 0);
          setTotalPoints(total);
          setTotalQuestions(quizData.questions.length);
        }
      } catch (error) {
        console.error("Erreur lors du chargement du quiz:", error);
        toast.error("Erreur lors du chargement du quiz");
      } finally {
        setIsLoading(false);
      }
    };

    if (!loading && user) {
      fetchQuiz();
    } else if (!loading && !user) {
      router.push('/login');
    }
  }, [quizId, user, loading, router]);

  // Effet pour charger les résultats historiques et mettre en place le rafraîchissement automatique
  useEffect(() => {
    const fetchResults = async () => {
      if (!quizId) return;
      
      try {
        const results = await quizApi.getAllQuizResults(quizId);
        setQuizResults(results);

        // Extraire les sessions uniques pour le filtre
        const uniqueSessions = Array.from(new Set(results.map(r => r.session_id)))
          .map(sessionId => {
            const result = results.find(r => r.session_id === sessionId);
            return { id: sessionId, code: result?.code || "N/A" };
          });
        setAvailableSessions(uniqueSessions);

        applyFiltersAndSearch(results, filter, searchQuery, sessionFilter);
      } catch (error) {
        console.error("Erreur lors du chargement des résultats:", error);
      }
    };

    // Appel initial
    if (!loading) {
      fetchResults();
      
      // Mettre en place le rafraîchissement automatique (toutes les 10 secondes)
      const interval = setInterval(fetchResults, 10000);
      setRefreshInterval(interval);
    }

    // Nettoyage
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [quizId, loading]);

  // Fonction pour appliquer les filtres et la recherche sur les résultats
  const applyFiltersAndSearch = (results: any[], filterType: string, query: string, sessionFilters: string[]) => {
    let filtered = [...results];
    
    // Filtrer par session si des filtres sont sélectionnés
    if (sessionFilters.length > 0) {
      filtered = filtered.filter(result => sessionFilters.includes(result.session_id));
    }
    
    // Appliquer le filtre de tri
    if (filterType === "highest") {
      filtered.sort((a, b) => parseInt(b.score) - parseInt(a.score));
    } else if (filterType === "session") {
      filtered.sort((a, b) => a.session_id.localeCompare(b.session_id));
    } else if (filterType === "latest") {
      // Tri par date de complétion, du plus récent au plus ancien
      filtered.sort((a, b) => {
        // Si completed_at est null, on place ces résultats en dernier
        if (!a.completed_at) return 1;
        if (!b.completed_at) return -1;
        
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
      });
    }
    
    // Appliquer la recherche par nom
    if (query.trim() !== "") {
      filtered = filtered.filter(result => 
        result.name.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    setFilteredResults(filtered);
  };

  // Fonction pour filtrer les résultats
  const handleFilterChange = (filterType: string) => {
    setFilter(filterType);
    applyFiltersAndSearch(quizResults, filterType, searchQuery, sessionFilter);
  };

  // Fonction pour gérer la recherche
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    applyFiltersAndSearch(quizResults, filter, query, sessionFilter);
  };

  // Fonction pour gérer le filtre de session
  const toggleSessionFilter = (sessionId: string) => {
    const newFilters = sessionFilter.includes(sessionId)
      ? sessionFilter.filter(id => id !== sessionId)
      : [...sessionFilter, sessionId];
    
    setSessionFilter(newFilters);
    applyFiltersAndSearch(quizResults, filter, searchQuery, newFilters);
  };

  // Fonction pour démarrer la session
  const startSession = async () => {
    if (!user || !quiz) return;
    
    try {
      setIsLoading(true);
      
      // Générer un code de session aléatoire
      const code = generateSessionCode();
      
      console.log("Préparation à la création d'une session avec le code:", code);
      
      // Vérifier que les données sont bien formées
      if (!quiz.id) {
        toast.error("L'ID du quiz est manquant");
        setIsLoading(false);
        return;
      }
      
      if (!user.id) {
        toast.error("Vous devez être connecté pour créer une session");
        setIsLoading(false);
        return;
      }

      // Vérifier si une session active existe déjà pour ce quiz
      try {
        const activeSessions = await quizApi.getActiveSessions(user.id);
        const existingSessionForQuiz = activeSessions.find(s => s.quiz_id === quiz.id);
        
        if (existingSessionForQuiz) {
          console.log("Session active existante trouvée:", existingSessionForQuiz);
          
          // Utiliser la session existante
          setSession(existingSessionForQuiz);
          setSessionCode(existingSessionForQuiz.code);
          setIsSessionActive(true);
          setCurrentQuestionIndex(existingSessionForQuiz.current_question_index || 0);
          
          // Vérifier les participants
          checkParticipants(existingSessionForQuiz.id);

          // Initialiser le timer basé sur started_at
          if ((existingSessionForQuiz as any).started_at) {
            const startedAt = new Date((existingSessionForQuiz as any).started_at);
            const now = new Date();
            const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
            setSessionElapsedTime(elapsedSeconds);
          }
          
          setIsLoading(false);
          toast.success("Session existante récupérée");
          return;
        }
      } catch (error) {
        console.warn("Erreur lors de la vérification des sessions existantes:", error);
      }
      
      // Créer une nouvelle session avec started_at défini à maintenant
      const now = new Date().toISOString();
      const sessionData = {
        quiz_id: quiz.id,
        teacher_id: user.id,
        code: code,
        is_active: true,
        current_question_index: 0,
        started_at: now
      };
      
      console.log("Création d'une session avec les données:", sessionData);
      
      // Créer la session
      const createdSession = await quizApi.createSession(sessionData);
      
      console.log("Session créée:", createdSession);
      
      // Mettre à jour l'état local
      setSession(createdSession);
      setSessionCode(code);
      setIsSessionActive(true);
      setCurrentQuestionIndex(0);
      setSessionElapsedTime(0); // Réinitialiser le temps écoulé
      
      // Une seule notification de succès
      toast.success("Session démarrée avec succès");
      
    } catch (error) {
      console.error("Erreur lors du démarrage de la session:", error);
      toast.error("Erreur lors du démarrage de la session");
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour arrêter la session
  const stopSession = async () => {
    if (!session) return;
    
    try {
      setIsLoading(true);
      
      // Terminer la session
      await quizApi.endSession(session.id);
      
      // Mettre à jour l'état local
      setSession(null);
      setSessionCode("");
      setIsSessionActive(false);
      setCurrentQuestionIndex(0);
      
      // Arrêter le chronomètre de session
      if (sessionTimerInterval) {
        clearInterval(sessionTimerInterval);
        setSessionTimerInterval(null);
      }
      setSessionElapsedTime(0);
      
      // Mettre à jour tous les participants qui n'ont pas terminé
      if (participants && participants.length > 0) {
        const activeParticipants = participants.filter(p => p.connected && !p.completed_at);
        for (const participant of activeParticipants) {
          try {
            await quizApi.updateParticipant(participant.id, {
              completed_at: new Date().toISOString(),
              connected: false
            });
            console.log(`Participant ${participant.name} marqué comme ayant terminé car la session a été arrêtée.`);
          } catch (error) {
            console.error(`Erreur lors de la mise à jour du participant ${participant.name}:`, error);
          }
        }
      }
      
      // Une seule notification de succès
      toast.success("Session terminée avec succès");
      
    } catch (error) {
      console.error("Erreur lors de l'arrêt de la session:", error);
      toast.error("Erreur lors de l'arrêt de la session");
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour passer à la question suivante
  const nextQuestion = async () => {
    if (!quiz || !session) return;
    
    if (currentQuestionIndex < quiz.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setTimeRemaining(quiz.time_per_question || 30);
      
      // Mettre à jour la question courante dans la base de données
      try {
        await quizApi.updateSession(session.id, {
          current_question_index: nextIndex
        });
      } catch (error) {
        console.error("Erreur lors de la mise à jour de la question:", error);
      }
    } else {
      // Fin du quiz
      stopSession();
    }
  };

  // Fonction pour revenir à la question précédente
  const previousQuestion = async () => {
    if (!session) return;
    
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setTimeRemaining(quiz.time_per_question || 30);
      
      // Mettre à jour la question courante dans la base de données
      try {
        await quizApi.updateSession(session.id, {
          current_question_index: prevIndex
        });
      } catch (error) {
        console.error("Erreur lors de la mise à jour de la question:", error);
      }
    }
  };

  // Générer un code de session aléatoire à 4 caractères
  const generateSessionCode = () => {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  // Vérifier régulièrement les participants
  const checkParticipants = async (sessionId: string) => {
    try {
      const participants = await quizApi.getSessionParticipants(sessionId);
      
      // Vérifier si les participants sont toujours connectés (connecté = a rejoint la session il y a moins de 2 minutes)
      const updatedParticipants = await Promise.all(participants.map(async p => {
        const joinedAt = new Date(p.joined_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - joinedAt.getTime()) / (1000 * 60);
        
        // Si le participant a une activité récente (dans les 2 dernières minutes), il est considéré comme connecté
        // Sinon, vérifier s'il a terminé le quiz
        const isConnected = diffMinutes < 2 && !p.completed_at;
        
        // Si le statut a changé, mettre à jour dans la base de données
        if (p.connected !== isConnected) {
          await quizApi.updateParticipant(p.id, { connected: isConnected })
            .catch(error => console.error("Erreur lors de la mise à jour du statut de connexion:", error));
        }

        // Vérifier si le participant a terminé le quiz (toutes les questions répondues)
        if (quiz && quiz.questions && !p.completed_at) {
          // Récupérer les réponses du participant
          const { data: answers } = await supabase
            .from('answers')
            .select('*')
            .eq('participant_id', p.id);
          
          // Considérer les tentatives de triche comme des réponses pour le calcul de la progression
          const totalAnswersAndCheats = (answers?.length || 0) + (p.cheat_attempts || 0);
          
          // Si le participant a répondu à toutes les questions mais n'a pas encore completed_at
          // OU si le total des réponses et des triches est égal ou supérieur au nombre de questions
          if (answers && (answers.length >= quiz.questions.length || totalAnswersAndCheats >= quiz.questions.length)) {
            console.log(`Le participant ${p.name} a terminé le quiz. Mise à jour de completed_at.`);
            await quizApi.updateParticipant(p.id, { 
              completed_at: new Date().toISOString(),
              connected: false // Déconnecter automatiquement quand terminé
            });
            return { ...p, completed_at: new Date().toISOString(), connected: false };
          }
        }
        
        return { ...p, connected: isConnected };
      }));
      
      // Mettre à jour l'état des participants
      setParticipants(updatedParticipants);
    } catch (error) {
      console.error("Erreur lors de la vérification des participants:", error);
    }
  };

  // Fonction pour calculer la progression en tenant compte des tentatives de triche
  const calculateProgressPercentage = (student: any) => {
    if (!student || !quiz || !quiz.questions) return 0;
    
    // Si le participant a terminé le quiz, afficher 100%
    if (student.completed) return 100;
    
    const totalQuestions = quiz.questions.length;
    const answeredQuestions = student.answersCount || 0;
    const cheatAttempts = student.cheatAttempts || 0;
    
    // Calculer le pourcentage en considérant que triches = questions répondues
    const totalProgress = Math.min(answeredQuestions + cheatAttempts, totalQuestions);
    return Math.round((totalProgress / totalQuestions) * 100);
  };

  // Trouver la fonction mapStudentToTableRow et la remplacer par celle-ci
  const mapStudentToTableRow = (student: any) => {
    // Calcul de la progression en tenant compte des tentatives de triche
    const progression = calculateProgressPercentage(student);
    
    return {
      id: student.id,
      name: student.name,
      code: student.code,
      connected: student.connected,
      score: student.score === null ? 0 : student.score,
      maxScore: totalPoints,
      cheatAttempts: student.cheat_attempts || 0,
      answersCount: student.answers ? student.answers.length : 0,
      progress: progression,
      date: student.completed_at ? new Date(student.completed_at).toLocaleString() : "En cours...",
      completed: !!student.completed_at
    };
  };

  // Effet pour vérifier périodiquement les participants
  useEffect(() => {
    if (!session || !session.id || !isSessionActive) return;

    // Vérifier les participants immédiatement au début
    checkParticipants(session.id);
    
    // Puis vérifier toutes les 5 secondes (au lieu de 10 secondes)
    const interval = setInterval(() => {
      checkParticipants(session.id);
    }, 5000);
    
    // Nettoyer l'intervalle
    return () => clearInterval(interval);
  }, [session, isSessionActive]);

  // Suivre le temps restant
  useEffect(() => {
    // Ne plus gérer le timer de manière active pour éviter les interactions avec le côté étudiant
    // Cela évite les erreurs de type "Cannot read properties of undefined (reading 'text')"
    
    // Si nous sommes sur la page de prévisualisation, nous n'avons pas besoin de déclencher
    // le changement automatique de question

    return () => {}; // Nettoyage (rien à nettoyer)
  }, [isSessionActive]);

  // Nettoyer tous les intervalles et timers lors de la navigation
  useEffect(() => {
    return () => {
      // Cette fonction de nettoyage est appelée lorsque le composant est démonté
      setIsLoading(false); // Arrêter immédiatement tout chargement
      console.log("Nettoyage des ressources lors de la navigation");
    };
  }, []);

  // Charger les options du quiz depuis la base de données
  useEffect(() => {
    if (quiz) {
      setQuizOptions({
        shuffle_questions: quiz.shuffle_questions || false,
        show_answers: quiz.show_answers || false,
        anti_cheat: quiz.anti_cheat || false
      });
    }
  }, [quiz]);

  // Fonction pour sauvegarder les options du quiz
  const saveQuizOptions = async () => {
    if (!quiz || !quiz.id) return;
    
    try {
      setIsLoading(true);
      const result = await quizApi.updateQuiz(quiz.id, quizOptions);
      
      // Mettre à jour l'objet quiz local avec les nouvelles options
      setQuiz({
        ...quiz,
        ...quizOptions
      });
      
      // Une seule notification de succès
      toast.success("Options du quiz mises à jour avec succès");
      
    } catch (error) {
      console.error("Erreur lors de la mise à jour des options du quiz:", error);
      toast.error("Erreur lors de la mise à jour des options");
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour formater le temps du chronomètre (HH:MM:SS)
  const formatSessionTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Ajouter un effet pour initialiser le chronomètre si une session est déjà active au chargement
  useEffect(() => {
    // Si une session est active au chargement, initialiser le chronomètre basé sur started_at
    if (isSessionActive && session && (session as any).started_at) {
      // Fonction pour calculer le temps écoulé
      const calculateElapsedTime = () => {
        const startedAt = new Date((session as any).started_at);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        setSessionElapsedTime(elapsedSeconds);
      };
      
      // Calculer immédiatement
      calculateElapsedTime();
      
      // Configurer l'intervalle pour mettre à jour chaque seconde
      const interval = setInterval(calculateElapsedTime, 1000);
      setSessionTimerInterval(interval);

      // Nettoyage
      return () => {
        clearInterval(interval);
      };
    }
  }, [isSessionActive, session]);

  // Effet pour récupérer périodiquement le temps de session depuis Supabase
  useEffect(() => {
    const fetchSessionTime = async () => {
      if (isSessionActive && session && session.id) {
        try {
          // Récupérer les données de session à jour depuis Supabase
          const { data: sessionData, error } = await supabase
            .from('sessions')
            .select('started_at')
            .eq('id', session.id)
            .single();
          
          if (error) {
            console.error("Erreur lors de la récupération du temps de session:", error);
            return;
          }
          
          if (sessionData && (sessionData as any).started_at) {
            const startedAt = new Date((sessionData as any).started_at);
            const now = new Date();
            const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
            setSessionElapsedTime(elapsedSeconds);
          }
        } catch (error) {
          console.error("Erreur lors de la récupération du temps de session:", error);
        }
      }
    };

    // Récupérer le temps au chargement
    fetchSessionTime();

    // Configurer un intervalle pour récupérer périodiquement le temps (toutes les 30 secondes)
    const interval = setInterval(fetchSessionTime, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [isSessionActive, session]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl">Chargement de la session...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl">Quiz introuvable</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-slate-50"
    >
      <header className="border-b">
        <div className="container mx-auto max-w-7xl py-4 flex justify-between items-center px-4">
          <div></div>
          <div className="flex items-center space-x-2">
            <motion.div 
              animate={{ 
                backgroundColor: isSessionActive ? "#dcfce7" : "#fef3c7",
                color: isSessionActive ? "#166534" : "#92400e"
              }}
              transition={{ duration: 0.3 }}
              className="px-3 py-1 rounded-full text-sm"
            >
              {isSessionActive ? "Session active" : "Session inactive"}
            </motion.div>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Tableau de bord</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{quiz.title}</h2>
            <p className="text-slate-600">{quiz.description}</p>
          </div>
          <motion.div className="flex items-center gap-4" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            {isSessionActive && (
              <div className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                Temps de session: {formatSessionTime(sessionElapsedTime)}
              </div>
            )}
            {isSessionActive ? (
              <Button onClick={stopSession} variant="destructive">Arrêter la session</Button>
            ) : (
              <Button onClick={startSession}>Démarrer la session</Button>
            )}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Section du code de session */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="text-center py-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Code d'accès</h3>
                  <p className="text-4xl font-bold tracking-widest bg-slate-100 inline-block px-6 py-3 rounded-md">
                    {sessionCode || "----"}
                  </p>
                  <p className="text-sm text-slate-500">Les élèves peuvent rejoindre cette session en utilisant ce code</p>
                  
                  <div className="mt-2 text-center">
                    <span 
                      onClick={() => {
                        if (isSessionActive && sessionCode) {
                          // URL de la page de connexion
                          const joinUrl = `${window.location.origin}/quiz/join`;
                          
                          // Ouvrir une nouvelle fenêtre
                          const newWindow = window.open('', '_blank');
                          
                          if (newWindow) {
                            // Écrire un document HTML minimaliste
                            newWindow.document.write(`
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <meta charset="UTF-8">
                                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                  <title>Code d'accès: ${sessionCode}</title>
                                  <style>
                                    body {
                                      font-family: -apple-system, system-ui, sans-serif;
                                      line-height: 1.5;
                                      max-width: 600px;
                                      margin: 0 auto;
                                      padding: 20px;
                                      text-align: center;
                                    }
                                    .code {
                                      font-size: 4em;
                                      font-weight: bold;
                                      color: #3b82f6;
                                      padding: 15px;
                                      margin: 20px auto;
                                      background-color: #f1f5f9;
                                      border-radius: 8px;
                                      letter-spacing: 5px;
                                    }
                                    .qr {
                                      margin: 20px auto;
                                      padding: 10px;
                                      background: white;
                                      border-radius: 8px;
                                      border: 1px solid #e2e8f0;
                                      width: 250px;
                                      height: 250px;
                                    }
                                    .url {
                                      display: inline-block;
                                      margin: 15px 0;
                                      padding: 10px;
                                      background-color: #f1f5f9;
                                      border-radius: 6px;
                                      font-weight: 600;
                                    }
                                    ol {
                                      text-align: left;
                                      margin: 20px auto;
                                      background-color: #f8fafc;
                                      padding: 20px 20px 20px 40px;
                                      border-radius: 8px;
                                    }
                                  </style>
                                </head>
                                <body>
                                  <h1>Rejoindre le quiz</h1>
                                  <div class="code">${sessionCode}</div>
                                  <p>Scannez ce QR code avec votre smartphone:</p>
                                  <div id="qrcode-container" style="margin:15px auto; width:250px; height:250px; background-color:white; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
                                    <img 
                                      src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${joinUrl}" 
                                      alt="QR Code pour rejoindre le quiz" 
                                      style="display:block; margin:0 auto; width:200px; height:200px;" 
                                      onerror="this.onerror=null; this.src='https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${joinUrl}';"
                                    />
                                  </div>
                                  <p>Ou visitez:</p>
                                  <div class="url">${joinUrl}</div>
                                  <ol>
                                    <li>Scannez le QR code ou visitez le lien</li>
                                    <li>Entrez le code: <strong>${sessionCode}</strong></li>
                                    <li>Saisissez votre nom</li>
                                    <li>Attendez le démarrage du quiz</li>
                                  </ol>
                                  <button onclick="window.print()" style="background:#3b82f6; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">
                                    Imprimer
                                  </button>
                                </body>
                              </html>
                            `);
                            
                            newWindow.document.close();
                          }
                        }
                      }}
                      className={`text-blue-600 text-sm ${!isSessionActive ? 'opacity-50 cursor-not-allowed' : 'hover:underline cursor-pointer'}`}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="14" 
                        height="14" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="inline-block mr-1"
                      >
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                        <polyline points="16 6 12 2 8 6"></polyline>
                        <line x1="12" y1="2" x2="12" y2="15"></line>
                      </svg>
                      {isSessionActive ? "Partager le code avec les élèves" : "Session inactive"}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Section de la question actuelle */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
            <Card>
              <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Question {currentQuestionIndex + 1}/{quiz.questions.length}</span>
                    <span className="text-sm text-slate-500">Prévisualisation enseignant</span>
                  </CardTitle>
              </CardHeader>
                <CardContent className="space-y-4">
                  <h3 className="text-xl font-medium">
                    {quiz.questions && quiz.questions[currentQuestionIndex]?.text}
                  </h3>
                  
                  {/* Ajout des détails sur les points et le temps par question */}
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-md text-sm">
                    <div className="font-medium">
                      <span className="text-slate-600">Points:</span> {quiz.questions && quiz.questions[currentQuestionIndex]?.points || 1}
                    </div>
                    <div className="font-medium">
                      {quiz?.time_type === 'specific_question' ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-600">Temps spécifique:</span>
                          <span>
                            {quiz.questions && quiz.questions[currentQuestionIndex]?.time_limit && quiz.questions[currentQuestionIndex]?.time_limit > 0
                              ? `${quiz.questions[currentQuestionIndex].time_limit}s`
                              : "Illimité"}
                          </span>
                        </div>
                      ) : quiz?.time_type === 'total' ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-600">Temps total:</span>
                          <span>{quiz.time_total}s pour tout le quiz</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-600">Temps par question:</span>
                          <span>{quiz.time_per_question || 0}s</span>
                      </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {quiz.questions && quiz.questions[currentQuestionIndex]?.options.map((option: any, index: number) => {
                      // Calculer le nombre de réponses pour cette option
                      const currentQuestion = quiz.questions[currentQuestionIndex];
                      const optionResponses = quizResults.filter(
                        result => result.total_answers > 0
                      ).filter(result => {
                        const answer = result.answers?.find((a: any) => a.question_id === currentQuestion.id);
                        return answer && answer.selected_option_id === option.id;
                      });
                      
                      // Calculer le pourcentage de réponses pour cette option
                      const totalResponsesToQuestion = quizResults.filter(
                        result => result.total_answers > 0 && 
                        result.answers?.some((a: any) => a.question_id === currentQuestion.id)
                      ).length;
                      
                      const responsePercentage = totalResponsesToQuestion > 0 
                        ? Math.round((optionResponses.length / totalResponsesToQuestion) * 100) 
                        : 0;
                        
                      return (
                        <motion.div
                          key={option.id} 
                          whileHover={{ scale: 1.02, backgroundColor: "#f8fafc" }}
                          transition={{ duration: 0.2 }}
                          className={`border p-3 rounded-md ${option.is_correct ? 'border-green-500 bg-green-50' : ''}`}
                        >
                          <div className="flex justify-between items-center mb-2">
                  <div>
                              <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                              {option.text}
                              {option.is_correct && <span className="ml-2 text-green-600">✓</span>}
                            </div>
                      </div>
                          
                          {/* Barre de progression pour le pourcentage de réponses */}
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium">Réponses</span>
                              <span>{responsePercentage}%</span>
                      </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full">
                              <div 
                                className={`h-2 rounded-full ${option.is_correct ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${responsePercentage}%` }}
                              ></div>
                      </div>
                    </div>
                        </motion.div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
            </motion.div>

            {/* Contrôles de navigation */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex justify-between"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline"
                    onClick={previousQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    Question précédente
                  </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outline" 
                    onClick={nextQuestion}
                    disabled={(quiz.questions && currentQuestionIndex === quiz.questions.length - 1)}
                  >
                    Question suivante
                  </Button>
              </motion.div>
            </motion.div>
                </div>

          <div className="space-y-6">
            {/* Options du quiz - remplace les options de la session */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Options du quiz</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="shuffle-questions">Mélanger les questions</Label>
                      <p className="text-sm text-slate-500">Les questions seront présentées dans un ordre aléatoire</p>
                      </div>
                    <Switch 
                      id="shuffle-questions" 
                      checked={quizOptions.shuffle_questions}
                      onCheckedChange={(checked) => setQuizOptions(prev => ({ ...prev, shuffle_questions: checked }))}
                    />
                      </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="show-answers">Montrer les réponses</Label>
                      <p className="text-sm text-slate-500">Les élèves verront les réponses correctes après chaque question</p>
                    </div>
                    <Switch 
                      id="show-answers" 
                      checked={quizOptions.show_answers}
                      onCheckedChange={(checked) => setQuizOptions(prev => ({ ...prev, show_answers: checked }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Limite de temps</Label>
                    <p className="text-sm text-slate-500">
                      {quiz?.time_type === 'total' 
                        ? `Temps total: ${Math.floor(quiz.time_total / 60)} minutes ${quiz.time_total % 60} secondes` 
                        : quiz?.time_type === 'specific_question'
                          ? "Temps spécifique défini pour chaque question"
                          : quiz?.time_per_question
                            ? `Temps par question: ${quiz.time_per_question} secondes`
                            : "Aucune limite de temps"}
                    </p>
                    </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="anti-cheat">Système anti-triche</Label>
                      <p className="text-sm text-slate-500">Passe à la question suivante si l'élève change d'onglet</p>
                    </div>
                    <Switch 
                      id="anti-cheat" 
                      checked={quizOptions.anti_cheat}
                      onCheckedChange={(checked) => setQuizOptions(prev => ({ ...prev, anti_cheat: checked }))}
                    />
                  </div>
                  
                  <Button onClick={saveQuizOptions} className="w-full mt-4">
                    Enregistrer les modifications
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Section Surveillance du quiz */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="mt-10"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="flex space-x-3 items-center">
                <CardTitle>Surveillance du quiz</CardTitle>
                <div className="flex items-center">
                  <motion.div
                    animate={{ 
                      scale: isSessionActive ? [1, 1.15, 1] : 1,
                      opacity: isSessionActive ? [0.7, 1, 0.7] : 0.5
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: isSessionActive ? Infinity : 0,
                      repeatType: "reverse"
                    }}
                    className={`w-2.5 h-2.5 rounded-full ${isSessionActive ? "bg-red-500" : "bg-gray-500"} mr-1.5`}
                  />
                  <span className={`text-xs font-medium ${isSessionActive ? "text-red-600 bg-red-100" : "text-gray-600 bg-gray-100"} px-2 py-0.5 rounded-full`}>
                    {isSessionActive ? "En direct" : "Inactif"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aperçu de la classe */}
              <div>
                <h3 className="text-sm font-medium mb-3 text-slate-700">Aperçu de la classe</h3>
                <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 gap-2">
                  {!isSessionActive ? (
                    <p className="col-span-full text-center text-slate-500 py-4">
                      Démarrez la session pour surveiller les participants
                    </p>
                  ) : participants.length === 0 ? (
                    <p className="col-span-full text-center text-slate-500 py-4">
                      En attente de participants...
                    </p>
                  ) : participants.filter(p => !p.completed_at).length === 0 ? (
                    <p className="col-span-full text-center text-slate-500 py-4">
                      Tous les participants ont terminé la session
                    </p>
                  ) : (
                    participants.filter(p => !p.completed_at).map((participant, index) => {
                      // Déterminer s'il y a une alerte pour ce participant
                      const hasCheatAttempts = participant.cheat_attempts > 0;
                      // Vérifier si le participant a des réponses
                      const hasAnswers = participant.answers && participant.answers.length > 0;
                      // Calculer le temps moyen de réponse
                      const avgResponseTime = hasAnswers 
                        ? participant.answers.reduce((sum: number, ans: any) => sum + (ans.time_spent || 0), 0) / participant.answers.length / 10
                        : 0;
                      // Déterminer si le temps de réponse est anormal (trop rapide ou trop lent)
                      const hasAbnormalResponseTime = hasAnswers && (avgResponseTime < 2 || avgResponseTime > 30);
                      
                      // Déterminer le statut du participant
                      const hasAlert = hasCheatAttempts || hasAbnormalResponseTime;
                      
                      return (
                        <motion.div
                          key={participant.id}
                          whileHover={{ scale: 1.05 }}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg ${
                            hasAlert 
                              ? 'bg-red-50 border border-red-200' 
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium mb-1">
                            {participant.name ? participant.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="text-xs font-medium truncate w-full text-center">
                            {hasAlert ? (
                              <div className="flex items-center justify-center">
                                <svg className="w-3 h-3 text-red-500 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-red-600">Alerte</span>
                              </div>
                            ) : (
                              <span className="text-green-600">Normal</span>
                            )}
                          </span>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
              
              {/* Détails des alertes */}
              <div>
                <h3 className="text-sm font-medium mb-3 text-slate-700">Alertes détectées</h3>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {participants.filter(p => (p.cheat_attempts > 0 || (p.answers && p.answers.length > 0 && (
                    p.answers.reduce((sum: number, ans: any) => sum + (ans.time_spent || 0), 0) / p.answers.length / 10 < 2 || 
                    p.answers.reduce((sum: number, ans: any) => sum + (ans.time_spent || 0), 0) / p.answers.length / 10 > 30
                  )))).length === 0 ? (
                    <p className="text-center text-slate-500 py-4">
                      Aucune alerte détectée
                    </p>
                  ) : (
                    participants
                      .filter(p => (p.cheat_attempts > 0 || (p.answers && p.answers.length > 0 && (
                        p.answers.reduce((sum: number, ans: any) => sum + (ans.time_spent || 0), 0) / p.answers.length / 10 < 2 || 
                        p.answers.reduce((sum: number, ans: any) => sum + (ans.time_spent || 0), 0) / p.answers.length / 10 > 30
                      ))))
                      .map((participant) => {
                        // Calculer le temps moyen de réponse
                        const hasAnswers = participant.answers && participant.answers.length > 0;
                        const avgResponseTime = hasAnswers 
                          ? participant.answers.reduce((sum: number, ans: any) => sum + (ans.time_spent || 0), 0) / participant.answers.length / 10
                          : 0;
                        
                        return (
                          <motion.div 
                            key={participant.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`rounded-lg p-3 border ${participant.cheat_attempts > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-medium text-sm mr-3">
                                {participant.name ? participant.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-medium">{participant.name}</h4>
                                  <div className="flex items-center gap-2">
                                    {participant.completed_at && (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                        Terminé
                                      </span>
                                    )}
                                    <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200">
                                      {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                  </div>
                                </div>
                                {participant.cheat_attempts > 0 && (
                                  <p className="text-sm text-red-700 mt-1">
                                    Changements d'onglets multiples ({participant.cheat_attempts})
                                  </p>
                                )}
                                {hasAnswers && (avgResponseTime < 2 || avgResponseTime > 30) && (
                                  <p className="text-sm text-amber-700 mt-1">
                                    Temps de réponse anormal ({avgResponseTime.toFixed(1)}s)
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                  )}
                </div>
              </div>
              
              {/* Récapitulatif */}
              <div className="flex items-center justify-between text-sm border-t pt-3 mt-2">
                <div>
                  <span className="font-medium">Alertes: </span>
                  <span className="text-red-600 font-medium">
                    {participants.filter(p => (p.cheat_attempts > 0 || (p.answers && p.answers.length > 0 && (
                      p.answers.reduce((sum: number, ans: any) => sum + (ans.time_spent || 0), 0) / p.answers.length / 10 < 2 || 
                      p.answers.reduce((sum: number, ans: any) => sum + (ans.time_spent || 0), 0) / p.answers.length / 10 > 30
                    )))).length}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Participants ayant finis cette session : </span>
                  <span>{participants.filter(p => p.completed_at).length}/{participants.length}</span>
                </div>
                <div>
                  <span className="font-medium">Durée: </span>
                  <span>{formatSessionTime(sessionElapsedTime)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section des résultats */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-10"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Résultats</h2>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="search"
                  placeholder="Rechercher un participant..."
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <FilterIcon size={16} />
                    <span>Trier</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Trier par</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleFilterChange("all")}>
                    <div className="flex items-center gap-2">
                      {filter === "all" && <CheckIcon size={16} />}
                      <span className={filter === "all" ? "font-bold" : ""}>Tous les résultats</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("highest")}>
                    <div className="flex items-center gap-2">
                      {filter === "highest" && <CheckIcon size={16} />}
                      <span className={filter === "highest" ? "font-bold" : ""}>Meilleurs scores</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("latest")}>
                    <div className="flex items-center gap-2">
                      {filter === "latest" && <CheckIcon size={16} />}
                      <span className={filter === "latest" ? "font-bold" : ""}>Plus récents</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFilterChange("session")}>
                    <div className="flex items-center gap-2">
                      {filter === "session" && <CheckIcon size={16} />}
                      <span className={filter === "session" ? "font-bold" : ""}>Par session</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <FilterIcon size={16} />
                    <span>Filtrer</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filtrer par session</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableSessions.length === 0 ? (
                    <DropdownMenuItem disabled>
                      <span className="text-slate-500">Aucune session disponible</span>
                    </DropdownMenuItem>
                  ) : (
                    availableSessions.map((session) => (
                      <DropdownMenuItem key={session.id} onClick={() => toggleSessionFilter(session.id)}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border rounded flex items-center justify-center">
                            {sessionFilter.includes(session.id) && <CheckIcon size={12} />}
                          </div>
                          <span>Session {session.code}</span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                  {sessionFilter.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setSessionFilter([]);
                        applyFiltersAndSearch(quizResults, filter, searchQuery, []);
                      }}>
                        <span className="text-red-500">Effacer les filtres</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <Card>
            <Table>
              <TableCaption>Historique complet des résultats pour ce quiz</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Étudiant</TableHead>
                  <TableHead className="text-center">Code</TableHead>
                  <TableHead className="text-center">Date</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Progression</TableHead>
                  <TableHead className="text-center">Tentatives de triche</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-slate-500">
                      Aucun résultat disponible
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((result) => (
                    <TableRow key={result.participant_id + result.session_id}>
                      <TableCell className="font-medium">{result.name}</TableCell>
                      <TableCell className="text-center">{result.code}</TableCell>
                      <TableCell className="text-center">
                        {result.completed_at 
                          ? new Date(result.completed_at).toLocaleString() 
                          : "En cours..."}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {result.earned_points}/{result.total_points}
                          <div className="w-16 h-3 bg-slate-200 rounded ml-2">
                            <div 
                              className={`h-full rounded ${
                                parseInt(result.earned_points) / parseInt(result.total_points || "1") >= ((quiz?.passing_score || 0) / 100) 
                                  ? "bg-green-500" 
                                  : "bg-red-500"
                              }`} 
                              style={{ width: `${(parseInt(result.earned_points) / parseInt(result.total_points || "1")) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {result.total_answers || result.cheat_attempts ? (
                            <>
                              {(() => {
                                // Calculer la progression en tenant compte des triches
                                const totalAnswers = parseInt(result.total_answers || "0");
                                const cheatAttempts = parseInt(result.cheat_attempts || "0");
                                const totalProgress = Math.min(totalAnswers + cheatAttempts, totalQuestions);
                                const progressPercentage = Math.min(100, Math.round((totalProgress / totalQuestions) * 100));
                                
                                return (
                                  <>
                                    {progressPercentage}%
                                    <div className="w-16 h-3 bg-slate-200 rounded ml-2">
                                      <div 
                                        className={`h-full rounded ${cheatAttempts > 0 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                        style={{ width: `${progressPercentage}%` }}
                                      ></div>
                                    </div>
                                    {cheatAttempts > 0 && (
                                      <span className="ml-1 text-xs text-orange-500" title="A tenté de tricher">*</span>
                                    )}
                                  </>
                                );
                              })()}
                            </>
                          ) : (
                            "0%"
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {result.cheat_attempts > 0 ? (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                            {result.cheat_attempts}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            0
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      </main>
    </motion.div>
  );
} 
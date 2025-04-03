"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { quizApi } from "@/lib/api/quiz-api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell, Label, BarChart, Bar, LabelList,
  PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart
} from "recharts";
import { LogOut, Plus, TrendingUp } from "lucide-react";
import Image from "next/image";

interface ChartDataPoint {
  date: string;
  scoreAvg: number;
  participantsCount: number;
}

interface ParticipantData {
  id: string;
  name: string;
  score: number;
  joined_at: string;
  completed_at: string;
  quiz_id: string;
  session_code: string;
  quiz_title: string;
  cheat_attempts?: number;
}

interface CheatData {
  name: string;
  value: number;
  fill: string;
}

interface ScoreDistributionData {
  range: string;
  count: number;
  fill: string;
}

interface ResponseTimeData {
  name: string;
  value: number;
  fill: string;
}

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [activeSessions, setActiveSessions] = useState<Record<string, {
    id: string, 
    startTime: string, 
    code: string,
    current_question_index?: number
  }>>({});
  const [sessionDurations, setSessionDurations] = useState<Record<string, string>>({});
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [participantsData, setParticipantsData] = useState<ParticipantData[]>([]);
  const [cheatData, setCheatData] = useState<CheatData[]>([]);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistributionData[]>([]);
  const [avgResponseTime, setAvgResponseTime] = useState<number>(0);
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimeData[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !profile) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Récupérer les quiz de l'enseignant
        try {
          const teacherQuizzes = await quizApi.getTeacherQuizzes(user.id);
          setQuizzes(teacherQuizzes || []);
        } catch (quizError) {
          console.warn("Erreur lors de la récupération des quiz:", quizError);
          // Même en cas d'erreur, on continue avec une liste vide
          setQuizzes([]);
        }
        
        // Récupérer les sessions actives
        try {
          const sessions = await quizApi.getActiveSessions(user.id);
          setSessionsCount(sessions?.length || 0);
          
          // Calculer le nombre total de participants
          let totalParticipants = 0;
          if (sessions && sessions.length > 0) {
            await Promise.all(sessions.map(async (session) => {
              try {
                const participants = await quizApi.getSessionParticipants(session.id);
                totalParticipants += participants?.length || 0;
              } catch (participantError) {
                console.warn("Erreur lors de la récupération des participants:", participantError);
              }
            }));
          }
          setParticipantsCount(totalParticipants);

          // Créer une carte des sessions actives par quiz
          const sessionsMap: Record<string, {
            id: string, 
            startTime: string, 
            code: string,
            current_question_index?: number
          }> = {};
          sessions.forEach(session => {
            sessionsMap[session.quiz_id] = {
              id: session.id,
              startTime: session.created_at,
              code: session.code,
              current_question_index: session.current_question_index
            };
          });
          setActiveSessions(sessionsMap);
        } catch (sessionError) {
          console.warn("Erreur lors de la récupération des sessions:", sessionError);
          // Même en cas d'erreur, on continue avec des valeurs par défaut
          setSessionsCount(0);
          setParticipantsCount(0);
        }
      } catch (error: any) {
        const errorMessage = error?.message || "Une erreur est survenue lors de la récupération des données";
        console.error("Erreur dans fetchData:", errorMessage);
        setError(errorMessage);
        
        // Afficher un toast pour informer l'utilisateur
        toast.error("Impossible de charger les données du tableau de bord", {
          description: "Cela peut être dû à un problème de connexion ou de permissions."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Nettoyer lors de la navigation
    return () => {
      // Arrêter immédiatement tout chargement
      setIsLoading(false);
      console.log("Nettoyage des ressources du tableau de bord");
    };
  }, [user, profile]);

  useEffect(() => {
    // Ne rien faire si pas de sessions actives
    if (Object.keys(activeSessions).length === 0) return;
    
    const updateSessionDurations = () => {
      const newDurations: Record<string, string> = {};
      
      Object.entries(activeSessions).forEach(([quizId, session]) => {
        const startTime = new Date(session.startTime).getTime();
        const currentTime = new Date().getTime();
        const elapsedMilliseconds = currentTime - startTime;
        
        // Convertir en heures:minutes:secondes
        const hours = Math.floor(elapsedMilliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((elapsedMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((elapsedMilliseconds % (1000 * 60)) / 1000);
        
        newDurations[quizId] = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      });
      
      setSessionDurations(newDurations);
    };
    
    // Mettre à jour immédiatement
    updateSessionDurations();
    
    // Puis mettre à jour toutes les secondes
    const interval = setInterval(updateSessionDurations, 1000);
    
    return () => clearInterval(interval);
  }, [activeSessions]);

  useEffect(() => {
    const fetchParticipantData = async () => {
      if (!user || !profile) return;
      
      try {
        const { data, error } = await quizApi.getParticipantsWithScores(user.id);
        
        if (error) {
          console.error("Erreur lors de la récupération des scores:", error);
          return;
        }
        
        if (data) {
          setParticipantsData(data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des scores des participants:", error);
      }
    };
    
    fetchParticipantData();
  }, [user, profile]);

  useEffect(() => {
    // Ne rien faire si pas de données de participants
    if (participantsData.length === 0) return;
    
    const generateChartData = () => {
      const data: ChartDataPoint[] = [];
      const now = new Date();
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Définir la date de début en fonction de la plage de temps sélectionnée
      let daysToSubtract = 90;
      if (timeRange === "30d") daysToSubtract = 30;
      if (timeRange === "7d") daysToSubtract = 7;
      
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - daysToSubtract);
      
      // Créer un objet pour stocker les données agrégées par date
      const dateMap: Record<string, { scores: number[], participants: number }> = {};
      
      // Initialiser toutes les dates dans la plage avec des valeurs par défaut
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        dateMap[dateStr] = { scores: [], participants: 0 };
      }
      
      // Remplir le tableau avec les données réelles
      participantsData.forEach(participant => {
        const participantDate = new Date(participant.joined_at).toISOString().split('T')[0];
        
        // Ne traiter que les données dans la plage de temps sélectionnée
        if (dateMap[participantDate]) {
          dateMap[participantDate].scores.push(participant.score);
          dateMap[participantDate].participants += 1;
        }
      });
      
      // Convertir le map en tableau pour le graphique
      Object.entries(dateMap).forEach(([date, dateData]) => {
        // Calculer le score moyen si des scores existent, sinon 0
        const scoreAvg = dateData.scores.length > 0 
          ? Math.round(dateData.scores.reduce((sum, score) => sum + score, 0) / dateData.scores.length) 
          : 0;
        
        data.push({
          date,
          scoreAvg,
          participantsCount: dateData.participants
        });
      });
      
      // Trier les données par date
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setChartData(data);
    };
    
    generateChartData();
  }, [participantsData, timeRange]);

  useEffect(() => {
    // Effet pour récupérer et calculer le temps de réponse moyen
    const fetchAvgResponseTime = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await quizApi.getAvgResponseTime(user.id);

        if (error) {
          console.error('Erreur lors de la récupération des temps de réponse:', error);
          return;
        }

        if (data && data.length > 0) {
          console.log(`Récupération de ${data.length} temps de réponse pour le calcul de la moyenne`);
          
          // Calculer le temps moyen en incluant les valeurs à 0
          const sum = data.reduce((acc: number, curr: { time_spent: number }) => 
            acc + (curr.time_spent || 0), 0);
          
          // Diviser par le nombre total de réponses et par 10 pour convertir en secondes
          const avgTime = Math.round(sum / data.length) / 10;
          console.log(`Temps moyen calculé: ${avgTime}s (somme: ${sum}, nb réponses: ${data.length})`);
          
          setAvgResponseTime(avgTime);

          // Préparer les données pour le graphique radial
          const timeData: ResponseTimeData[] = [
            {
              name: "Temps moyen",
              value: avgTime > 20 ? 100 : (avgTime / 20) * 100, // Normaliser pour l'affichage (max 20 secondes)
              fill: getTimeColor(avgTime)
            }
          ];
          setResponseTimeData(timeData);
        }
      } catch (error) {
        console.error('Exception lors de la récupération des temps de réponse:', error);
      }
    };

    fetchAvgResponseTime();
  }, [user]);

  // Effet pour récupérer les données d'intégrité académique
  useEffect(() => {
    const fetchIntegrityData = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await quizApi.getIntegrityData(user.id);

        if (error) {
          console.error('Erreur lors de la récupération des données d\'intégrité:', error);
          return;
        }

        if (data) {
          // Préparer les données pour le graphique en camembert
          const newCheatData: CheatData[] = [
            { name: "Honnêtes", value: data.honestParticipants, fill: "#4ade80" }, // Vert pour les honnêtes
            { name: "Tentatives de triche", value: data.cheatingParticipants, fill: "#f43f5e" }, // Rouge pour les tentatives de triche
          ];
          
          setCheatData(newCheatData);
          setTotalParticipants(data.totalParticipants);
        }
      } catch (error) {
        console.error('Exception lors de la récupération des données d\'intégrité:', error);
      }
    };

    fetchIntegrityData();
  }, [user]);

  // Effet pour calculer la distribution des scores
  useEffect(() => {
    if (participantsData.length === 0) return;

    // Définir les tranches de scores
    const ranges = [
      { min: 0, max: 20, label: "0-20%", fill: "#f87171" },
      { min: 21, max: 40, label: "21-40%", fill: "#fb923c" },
      { min: 41, max: 60, label: "41-60%", fill: "#facc15" },
      { min: 61, max: 80, label: "61-80%", fill: "#a3e635" },
      { min: 81, max: 100, label: "81-100%", fill: "#4ade80" }
    ];

    // Initialiser le compteur pour chaque tranche
    const distribution = ranges.map(range => ({
      range: range.label,
      count: 0,
      fill: range.fill
    }));

    // Compter le nombre d'élèves dans chaque tranche
    participantsData.forEach(participant => {
      const score = participant.score;
      for (let i = 0; i < ranges.length; i++) {
        if (score >= ranges[i].min && score <= ranges[i].max) {
          distribution[i].count += 1;
          break;
        }
      }
    });

    setScoreDistribution(distribution);
  }, [participantsData]);

  // Fonction pour déterminer la couleur en fonction du temps
  const getTimeColor = (time: number): string => {
    if (time <= 5) return "#4ade80"; // Vert pour rapide
    if (time <= 10) return "#facc15"; // Jaune pour moyen
    if (time <= 15) return "#fb923c"; // Orange pour lent
    return "#f87171"; // Rouge pour très lent
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl flex flex-col items-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
          />
          <p>Chargement...</p>
        </motion.div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Redirection effectuée par le useEffect
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-transparent"
    >
      <header className="w-full bg-transparent">
        <motion.div 
          initial={{ y: -20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ duration: 0.5 }}
          className="w-full px-6 md:px-8 flex justify-between items-center mx-auto"
        >
          <motion.div 
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Link href="/dashboard">
              <div className="flex items-center gap-2 group">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-2 rounded-lg shadow-md group-hover:shadow-blue-500/20 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                </div>
                <motion.span 
                  className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  TrueFalse
                </motion.span>
              </div>
            </Link>
          </motion.div>
          
          <div className="flex items-center gap-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full"
            >
              <span className="text-slate-700 dark:text-slate-200">
                Bonjour, <span className="font-medium">{profile?.full_name || 'Enseignant'}</span>
              </span>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => router.push('/profile')}
                className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 transition-all rounded-full shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </Button>
            </motion.div>
          </div>
        </motion.div>
      </header>

      <main className="w-full py-12 px-6 md:px-8 mx-auto">
        {loading || isLoading ? (
          <div className="flex justify-center items-center h-[80vh]">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360] 
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut" 
              }}
              className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
            />
          </div>
        ) : error ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto px-6 py-8"
          >
            <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Erreur</h3>
              <p>Une erreur est survenue lors du chargement de vos données.</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="mt-4 bg-white border-red-300 text-red-600 hover:bg-red-50"
              >
                Rafraîchir la page
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="w-full mb-12">
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-3xl md:text-4xl font-bold mb-2 text-slate-900 dark:text-white"
              >
                Tableau de bord
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-slate-500 dark:text-slate-400 mb-8"
              >
                Gérez vos quiz et suivez les performances des élèves en temps réel
              </motion.p>
            
              {/* Statistiques avec animation en cascade */}
              <div className="mb-12">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  {/* Carte Quiz créés */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    whileHover={{ 
                      y: -8, 
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    }}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-7 shadow-lg border border-slate-100 dark:border-slate-700 relative overflow-hidden group"
                  >
                    <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-all duration-300"></div>
                    <div className="absolute -bottom-24 -left-12 w-40 h-40 rounded-full bg-blue-500/5 group-hover:bg-blue-500/10 transition-all duration-500"></div>
                    
                    <div className="absolute top-6 right-6">
                      <motion.div 
                        className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl shadow-sm"
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                          <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                      </motion.div>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Quiz créés</h3>
                      <p className="text-4xl font-bold text-slate-900 dark:text-white">
                        {quizzes?.length || 0}
                      </p>
                    </div>
                    
                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                      {quizzes && quizzes.length > 0 ? (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                          <span className="truncate max-w-xs">Dernier: {quizzes[0].title}</span>
                        </>
                      ) : (
                        "Aucun quiz créé pour l'instant"
                      )}
                    </div>
                </motion.div>
                
                  {/* Carte Sessions actives */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    whileHover={{ 
                      y: -8, 
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    }}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-7 shadow-lg border border-slate-100 dark:border-slate-700 relative overflow-hidden group"
                  >
                    <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-green-500/10 group-hover:bg-green-500/20 transition-all duration-300"></div>
                    <div className="absolute -bottom-24 -left-12 w-40 h-40 rounded-full bg-green-500/5 group-hover:bg-green-500/10 transition-all duration-500"></div>
                    
                    <div className="absolute top-6 right-6">
                      <motion.div 
                        className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl shadow-sm"
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                          <path d="M16 2L12 6 8 2"></path>
                          <line x1="12" y1="6" x2="12" y2="14"></line>
                          <circle cx="12" cy="18" r="2"></circle>
                        </svg>
                      </motion.div>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Sessions actives</h3>
                      <p className="text-4xl font-bold text-slate-900 dark:text-white">
                        {sessionsCount}
                      </p>
                    </div>
                    
                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                      {sessionsCount > 0 ? (
                        <>
                          <motion.span 
                            className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"
                            animate={{ 
                              scale: [1, 1.5, 1],
                              opacity: [1, 0.8, 1]
                            }}
                            transition={{ 
                              duration: 2,
                              repeat: Infinity,
                              repeatType: "reverse"
                            }}
                          />
                          <span>{participantsCount} élèves connectés</span>
                        </>
                      ) : (
                        "Aucune session active pour l'instant"
                      )}
                    </div>
                </motion.div>
                
                  {/* Carte Élèves en cours d'évaluation */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    whileHover={{ 
                      y: -8, 
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    }}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-7 shadow-lg border border-slate-100 dark:border-slate-700 relative overflow-hidden group"
                  >
                    <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 transition-all duration-300"></div>
                    <div className="absolute -bottom-24 -left-12 w-40 h-40 rounded-full bg-purple-500/5 group-hover:bg-purple-500/10 transition-all duration-500"></div>
                    
                    <div className="absolute top-6 right-6">
                      <motion.div 
                        className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl shadow-sm"
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </motion.div>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Élèves évalués</h3>
                      <p className="text-4xl font-bold text-slate-900 dark:text-white">
                        {participantsCount}
                      </p>
                    </div>
                    
                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                      {participantsCount > 0 ? (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                          <span>~{Math.round(participantsCount/quizzes.length)} élèves par quiz</span>
                        </>
                      ) : (
                        "Aucun élève connecté pour l'instant"
                      )}
                    </div>
                </motion.div>
              </motion.div>
              </div>

              {/* Graphiques */}
              <div className="space-y-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {/* Graphique d'évolution des scores - réduit à 2/3 de la largeur */}
                <div className="md:col-span-2">
                  <Card>
                    <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                      <div className="grid flex-1 gap-1 text-center sm:text-left">
                        <CardTitle>Évolution des scores</CardTitle>
                        <CardDescription>
                          Visualisation des performances des élèves au fil du temps
                        </CardDescription>
                      </div>
                      <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger
                          className="w-[160px] rounded-lg sm:ml-auto"
                          aria-label="Sélectionner une période"
                        >
                          <SelectValue placeholder="7 derniers jours" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="90d" className="rounded-lg">
                            3 derniers mois
                          </SelectItem>
                          <SelectItem value="30d" className="rounded-lg">
                            30 derniers jours
                          </SelectItem>
                          <SelectItem value="7d" className="rounded-lg">
                            7 derniers jours
                          </SelectItem>
                        </SelectContent>
                      </Select>
            </CardHeader>
                    <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                      <div className="aspect-square max-h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                  offset="5%"
                                  stopColor="#3b82f6"
                                  stopOpacity={0.8}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#3b82f6"
                                  stopOpacity={0.1}
                                />
                              </linearGradient>
                              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                  offset="5%"
                                  stopColor="#8b5cf6"
                                  stopOpacity={0.8}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#8b5cf6"
                                  stopOpacity={0.1}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              minTickGap={32}
                              tickFormatter={(value: string) => {
                                const date = new Date(value)
                                return date.toLocaleDateString("fr-FR", {
                                  month: "short",
                                  day: "numeric",
                                })
                              }}
                            />
                            <Tooltip
                              cursor={false}
                              labelFormatter={(value: string) => {
                                return new Date(value).toLocaleDateString("fr-FR", {
                                  month: "short",
                                  day: "numeric",
                                })
                              }}
                            />
                            <Area
                              name="Participants"
                              dataKey="participantsCount"
                              type="monotone"
                              fill="url(#fillMobile)"
                              stroke="#8b5cf6"
                              stackId="a"
                            />
                            <Area
                              name="Score moyen"
                              dataKey="scoreAvg"
                              type="monotone"
                              fill="url(#fillDesktop)"
                              stroke="#3b82f6"
                              stackId="a"
                            />
                            <Legend />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
            </CardContent>
          </Card>
        </div>

                {/* Nouveau graphique en camembert pour la triche */}
                <div className="md:col-span-1">
                  <Card className="flex flex-col h-full">
                    <CardHeader className="items-center pb-0">
                      <CardTitle>Intégrité académique</CardTitle>
                      <CardDescription>Analyse des tentatives de triche</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 pb-0">
                      <div className="mx-auto aspect-square max-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip 
                              formatter={(value, name) => [`${value} participants`, name]}
                              labelFormatter={() => ''}
                            />
                            <Pie
                              data={cheatData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={2}
                            >
                              {cheatData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                              <Label
                                content={({ viewBox }) => {
                                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                    return (
                                      <text
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                      >
                                        <tspan
                                          x={viewBox.cx}
                                          y={viewBox.cy}
                                          className="fill-foreground text-xl font-bold"
                                        >
                                          {totalParticipants}
                                        </tspan>
                                        <tspan
                                          x={viewBox.cx}
                                          y={(viewBox.cy || 0) + 20}
                                          className="fill-muted-foreground text-xs"
                                        >
                                          participants
                                        </tspan>
                                      </text>
                                    )
                                  }
                                }}
                              />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-2 text-sm pt-4">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#4ade80" }}></div>
                          <span>Honnêtes</span>
                        </div>
                        <span className="font-medium">{cheatData[0]?.value || 0}</span>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f43f5e" }}></div>
                          <span>Tentatives de triche</span>
                        </div>
                        <span className="font-medium">{cheatData[1]?.value || 0}</span>
                      </div>
                    </CardFooter>
                  </Card>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Graphique de distribution des scores */}
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle>Distribution des scores</CardTitle>
                    <CardDescription>Répartition des performances des élèves</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={scoreDistribution}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <defs>
                            {scoreDistribution.map((entry, index) => (
                              <linearGradient
                                key={`gradient-${index}`}
                                id={`barGradient-${index}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop offset="5%" stopColor={entry.fill} stopOpacity={0.9} />
                                <stop offset="95%" stopColor={entry.fill} stopOpacity={0.6} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                          <XAxis
                            dataKey="range"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={{ stroke: '#e2e8f0' }}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(237, 242, 247, 0.5)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white p-3 rounded-md shadow-md border border-gray-200">
                                    <p className="text-sm font-medium text-gray-700">
                                      Tranche: {payload[0].payload.range}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium text-blue-600">{payload[0].value}</span> élèves
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar 
                            dataKey="count" 
                            animationDuration={1500} 
                            animationEasing="ease-out"
                            radius={[6, 6, 0, 0]}
                          >
                            {scoreDistribution.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={`url(#barGradient-${index})`} 
                                cursor="pointer"
                              />
                            ))}
                            <LabelList
                              dataKey="count"
                              position="top"
                              offset={10}
                              fill="#475569"
                              fontSize={12}
                              fontWeight="500"
                              formatter={(value: number) => value > 0 ? value : ''}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-2 text-sm pt-0">
                    <div className="leading-none text-muted-foreground">
                      Visualisation du nombre d'élèves par tranche de score
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-3 justify-center w-full pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <span className="text-xs">0-20%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                        <span className="text-xs">21-40%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <span className="text-xs">41-60%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-lime-400"></div>
                        <span className="text-xs">61-80%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        <span className="text-xs">81-100%</span>
                      </div>
                    </div>
                  </CardFooter>
                </Card>

                {/* Graphique de temps de réponse moyen */}
                <Card className="flex flex-col">
                  <CardHeader className="items-center pb-0">
                    <CardTitle>Temps de réponse moyen</CardTitle>
                    <CardDescription>Vitesse moyenne de réponse aux questions</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-0">
                    <div className="mx-auto aspect-square max-h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                          data={responseTimeData}
                          startAngle={0}
                          endAngle={360}
                          innerRadius={80}
                          outerRadius={110}
                        >
                          <PolarGrid
                            gridType="circle"
                            radialLines={false}
                            stroke="none"
                            className="first:fill-muted last:fill-background"
                            polarRadius={[86, 74]}
                          />
                          <RadialBar 
                            dataKey="value" 
                            background 
                            cornerRadius={10}
                            fill={responseTimeData[0]?.fill || "#4ade80"}
                          />
                          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                            <Label
                              content={({ viewBox }) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                  return (
                                    <text
                                      x={viewBox.cx}
                                      y={viewBox.cy}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                    >
                                      <tspan
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        className="fill-foreground text-4xl font-bold"
                                      >
                                        {avgResponseTime.toFixed(1)}
                                      </tspan>
                                      <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) + 24}
                                        className="fill-muted-foreground"
                                      >
                                        secondes
                                      </tspan>
                                    </text>
                                  )
                                }
                              }}
                            />
                          </PolarRadiusAxis>
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-2 text-sm">
                    <div className="leading-none text-muted-foreground text-center">
                      Temps moyen pour répondre à une question
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        <span className="text-xs">Rapide</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <span className="text-xs">Moyen</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <span className="text-xs">Lent</span>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
              </div>

              {/* Bouton de création de quiz déplacé avec le titre "Vos quiz" */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
              >
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Vos quiz</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez et lancez vos évaluations</p>
                </div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={() => router.push('/dashboard/create')} 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/20 transition-all duration-300"
                  >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un nouveau quiz
                </Button>
                </motion.div>
              </motion.div>

              {/* Liste des quiz */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-10 border border-slate-100 dark:border-slate-700"
              >
                <div className="grid grid-cols-1 gap-4">
                  {quizzes.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="py-12 text-center"
                    >
                      <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                          <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                      </div>
                      <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300">Aucun quiz disponible</h3>
                      <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">Commencez par créer votre premier quiz</p>
                      <Button 
                        onClick={() => router.push('/dashboard/create')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Créer un quiz
                      </Button>
                    </motion.div>
                  ) : (
                    quizzes.map((quiz, index) => {
                    // Calculer le score moyen pour ce quiz à partir des données des participants
                    const quizParticipants = participantsData.filter(p => p.quiz_id === quiz.id);
                    const avgScore = quizParticipants.length > 0 
                      ? Math.round(quizParticipants.reduce((sum, p) => sum + p.score, 0) / quizParticipants.length) 
                      : 0;
                    
                    // Récupérer le code d'accès actuel (s'il existe)
                    const hasActiveSession = quiz.id in activeSessions;
                    const accessCode = hasActiveSession ? activeSessions[quiz.id].code : "-";
                    
                    return (
                      <motion.div 
                        key={quiz.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 * (index % 5) }}
                        whileHover={{ 
                            scale: 1.01, 
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                        }}
                          className="p-5 transition-all duration-200 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm"
                      >
                          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                              <h4 className="text-lg font-medium text-slate-900 dark:text-white">{quiz.title}</h4>
                              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                              <p>Créé le {new Date(quiz.created_at).toLocaleDateString()}</p>
                                <motion.div 
                                  className="flex items-center bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full"
                                  whileHover={{ scale: 1.05 }}
                                >
                                  <TrendingUp className="h-3.5 w-3.5 mr-1 text-blue-500" />
                                  <span className="text-sm">Score moyen: <span className="font-medium text-slate-700 dark:text-slate-300">{avgScore}%</span></span>
                                </motion.div>
                              {quiz.id in activeSessions && (
                                  <motion.div 
                                    className="flex items-center bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full"
                                    animate={{ 
                                      scale: [1, 1.03, 1],
                                      boxShadow: [
                                        "0 0 0 0 rgba(74, 222, 128, 0)",
                                        "0 0 0 4px rgba(74, 222, 128, 0.2)",
                                        "0 0 0 0 rgba(74, 222, 128, 0)"
                                      ]
                                    }}
                                    transition={{ duration: "2", repeat: Infinity }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                  </svg>
                                    <span className="text-sm text-green-700 dark:text-green-400">Code: <span className="font-mono font-medium">{accessCode}</span></span>
                                  </motion.div>
                              )}
                            </div>
                  </div>
                            <div className="flex items-center gap-3">
                              <motion.div 
                                whileHover={{ scale: 1.05 }} 
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  asChild
                                  className="rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                  <Link href={`/dashboard/edit/${quiz.id}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    Modifier
                                  </Link>
                    </Button>
                            </motion.div>
                              
                              <motion.div 
                                whileHover={{ scale: 1.05 }} 
                                whileTap={{ scale: 0.95 }}
                              >
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                  className="rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    asChild
                                >
                                  <Link href={`/dashboard/statistics/${quiz.id}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                                      <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                                      <line x1="6" y1="6" x2="6" y2="6"></line>
                                      <line x1="6" y1="18" x2="6" y2="18"></line>
                                    </svg>
                                    Statistique
                                  </Link>
                                </Button>
                              </motion.div>
                              
                              {quiz.id in activeSessions ? (
                                <div className="flex flex-col items-center">
                                  <motion.div 
                                    whileHover={{ scale: 1.05 }} 
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Button 
                                      variant="default" 
                                      size="sm" 
                                      asChild
                                      className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20"
                                  >
                                    <Link href={`/dashboard/start/${quiz.id}`}>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                      </svg>
                                      En cours
                                    </Link>
                                  </Button>
                                </motion.div>
                                  <motion.span 
                                    className="text-xs text-green-700 dark:text-green-400 font-mono font-medium text-center mt-1"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                  >
                                    {sessionDurations[quiz.id] || '00:00:00'}
                                  </motion.span>
                              </div>
                            ) : (
                                <motion.div 
                                  whileHover={{ scale: 1.05 }} 
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    asChild
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-600/20"
                                  >
                                    <Link href={`/dashboard/start/${quiz.id}`}>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                      </svg>
                                      Lancer
                                    </Link>
                    </Button>
                              </motion.div>
                            )}
                          </div>
                  </div>
                      </motion.div>
                    );
                    })
                  )}
                </div>
              </motion.div>
              </div>
          </>
        )}
      </main>
    </motion.div>
  );
} 
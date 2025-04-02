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
    // Analyser les données de triche des participants
    if (participantsData.length === 0) return;

    // Compter les participants sans tentative de triche et avec tentatives
    let noCheatAttempts = 0;
    let withCheatAttempts = 0;

    participantsData.forEach(participant => {
      if (participant.cheat_attempts && participant.cheat_attempts > 0) {
        withCheatAttempts++;
      } else {
        noCheatAttempts++;
      }
    });

    // Préparer les données pour le graphique en camembert
    const newCheatData: CheatData[] = [
      { name: "Honnêtes", value: noCheatAttempts, fill: "#4ade80" }, // Vert pour les honnêtes
      { name: "Tentatives de triche", value: withCheatAttempts, fill: "#f43f5e" }, // Rouge pour les tentatives de triche
    ];

    setCheatData(newCheatData);
    setTotalParticipants(participantsData.length);
  }, [participantsData]);

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

  // Effet pour récupérer et calculer le temps de réponse moyen
  useEffect(() => {
    const fetchAvgResponseTime = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await quizApi.getAvgResponseTime(user.id);

        if (error) {
          console.error('Erreur lors de la récupération des temps de réponse:', error);
          return;
        }

        if (data && data.length > 0) {
          // Calculer le temps moyen
          const sum = data.reduce((acc: number, curr: { time_spent: number }) => acc + curr.time_spent, 0);
          const avgTime = Math.round(sum / data.length) / 10; // Convertir en secondes et arrondir
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
        <div className="container py-4 px-6 md:px-8 flex justify-between items-center mx-auto">
          <div className="flex items-center space-x-2">
            <Link href="/dashboard">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 text-white p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                </div>
                <span className="font-bold text-xl">TrueFalse</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center">
            <span className="mr-4">Bonjour, {profile?.full_name || 'Enseignant'}</span>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => router.push('/profile')}
              className="bg-transparent hover:bg-gray-100 text-gray-800 border-gray-300 hover:border-gray-400 transition-all rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 px-6 md:px-8 mx-auto max-w-7xl">
        {loading || isLoading ? (
          <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="container mx-auto px-6 py-8">
            <div className="p-4 border border-red-500 bg-red-50 text-red-700 rounded-md">
              <p className="font-semibold">Erreur</p>
              <p>Une erreur est survenue lors du chargement de vos données.</p>
            </div>
        </div>
        ) : (
          <>
            <div className="container mx-auto px-6 py-8">
              {/* Statistiques */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
              >
                <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                    <CardHeader className="pb-0 pt-1">
                      <CardTitle className="flex items-center text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                          <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                        Quiz créés
                      </CardTitle>
                      <CardDescription className="text-blue-100 text-xs">Total de vos évaluations</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0.5 pb-1.5">
                      <p className="text-xl font-bold">{quizzes?.length || 0}</p>
                      <p className="text-xs text-blue-100 mt-0">
                        {quizzes && quizzes.length > 0 
                          ? `Dernier quiz: ${quizzes[0].title}` 
                          : "Aucun quiz créé pour l'instant"}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
                    <CardHeader className="pb-0 pt-1">
                      <CardTitle className="flex items-center text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                          <path d="M16 2L12 6 8 2"></path>
                          <line x1="12" y1="6" x2="12" y2="14"></line>
                          <circle cx="12" cy="18" r="2"></circle>
                        </svg>
                        Sessions actives
                      </CardTitle>
                      <CardDescription className="text-green-100 text-xs">Évaluations en cours</CardDescription>
            </CardHeader>
                    <CardContent className="pt-0.5 pb-1.5">
                      <p className="text-xl font-bold">{sessionsCount}</p>
                      <p className="text-xs text-green-100 mt-0">
                        {sessionsCount > 0 
                          ? `${participantsCount} élèves connectés` 
                          : "Aucune session active pour l'instant"}
                      </p>
            </CardContent>
          </Card>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                    <CardHeader className="pb-0 pt-1">
                      <CardTitle className="flex items-center text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        Élèves en cours d'évaluation
                      </CardTitle>
                      <CardDescription className="text-purple-100 text-xs">Total des participants</CardDescription>
            </CardHeader>
                    <CardContent className="pt-0.5 pb-1.5">
                      <p className="text-xl font-bold">{participantsCount}</p>
                      <p className="text-xs text-purple-100 mt-0">
                        {participantsCount > 0 
                          ? `${Math.round(participantsCount/quizzes.length)} élèves par quiz en moyenne` 
                          : "Aucun élève connecté pour l'instant"}
                      </p>
            </CardContent>
          </Card>
                </motion.div>
              </motion.div>

              {/* Graphiques - Section restructurée avec deux graphiques côte à côte */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
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

              {/* Nouveaux graphiques - Distribution des scores et Temps de réponse */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Graphique de distribution des scores */}
                <Card>
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
                          <CartesianGrid vertical={false} />
                          <XAxis
                            dataKey="range"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                          />
                          <Tooltip
                            formatter={(value) => [`${value} élèves`, "Nombre"]}
                            labelFormatter={(label) => `Tranche: ${label}`}
                          />
                          <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]}>
                            {scoreDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                            <LabelList
                              dataKey="count"
                              position="top"
                              offset={10}
                              className="fill-foreground"
                              fontSize={12}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="leading-none text-muted-foreground">
                      Visualisation du nombre d'élèves par tranche de score
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

              {/* Bouton de création de quiz déplacé avec le titre "Vos quiz" */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Vos quiz</h2>
                <Button onClick={() => router.push('/dashboard/create')} className="text-white bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un nouveau quiz
                </Button>
              </div>

              {/* Liste des quiz */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm p-6 mb-10"
              >
          <div className="grid grid-cols-1 divide-y">
                  {quizzes.map((quiz, index) => {
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
                        transition={{ duration: 0.3, delay: 0.1 * index }}
                        whileHover={{ 
                          scale: 1.02, 
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                          backgroundColor: "#f8fafc"
                        }}
                        className="p-4 transition-all duration-200 rounded-md border border-slate-100"
                      >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-lg font-medium">{quiz.title}</h4>
                            <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-500">
                              <p>Créé le {new Date(quiz.created_at).toLocaleDateString()}</p>
                              <div className="flex items-center">
                                <TrendingUp className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                <span className="text-sm">Score moyen: <span className="font-medium">{avgScore}%</span></span>
                              </div>
                              {quiz.id in activeSessions && (
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                  </svg>
                                  <span className="text-sm">Code: <span className="font-mono font-medium">{accessCode}</span></span>
                                </div>
                              )}
                            </div>
                  </div>
                  <div className="flex gap-2">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/edit/${quiz.id}`}>Modifier</Link>
                    </Button>
                            </motion.div>
                            {quiz.id in activeSessions ? (
                              <div className="flex flex-col items-end space-y-1">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    asChild
                                    className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 flex items-center space-x-1"
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
                                <span className="text-xs text-green-700 font-mono">{sessionDurations[quiz.id] || '00:00:00'}</span>
                              </div>
                            ) : (
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button variant="default" size="sm" asChild>
                      <Link href={`/dashboard/start/${quiz.id}`}>Lancer</Link>
                    </Button>
                              </motion.div>
                            )}
                          </div>
                  </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
              </div>
          </>
        )}
      </main>
    </motion.div>
  );
} 
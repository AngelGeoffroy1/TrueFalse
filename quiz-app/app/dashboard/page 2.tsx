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

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
      className="min-h-screen bg-slate-50"
    >
      <header className="bg-white border-b">
        <div className="container py-4 px-6 md:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold">TrueFalse</h1>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="outline" onClick={() => signOut()}>Se déconnecter</Button>
          </motion.div>
        </div>
      </header>

      <main className="container py-8 px-6 md:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Tableau de bord</h2>
            <p className="text-slate-600">Gérez vos quiz et créez de nouvelles évaluations</p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button size="lg" asChild>
              <Link href="/dashboard/create">Créer un nouveau quiz</Link>
            </Button>
          </motion.div>
        </div>

        {error ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="mb-8 bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <p className="text-red-600">Une erreur est survenue lors du chargement de vos données. Veuillez rafraîchir la page.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          >
            <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardHeader>
                  <CardTitle>Quiz créés</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{quizzes?.length || 0}</p>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardHeader>
                  <CardTitle>Évaluations actives</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{sessionsCount}</p>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardHeader>
                  <CardTitle>Élèves évalués</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold">{participantsCount}</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        <motion.h3 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl font-semibold mb-4"
        >
          Vos quiz
        </motion.h3>
        
        {!quizzes || quizzes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="p-6 text-center">
              <p className="text-slate-500 mb-4">Vous n'avez pas encore créé de quiz.</p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild>
                  <Link href="/dashboard/create">Créer mon premier quiz</Link>
                </Button>
              </motion.div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-lg shadow"
          >
            <div className="grid grid-cols-1 divide-y">
              {quizzes.map((quiz, index) => (
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
                  className="p-4 transition-all duration-200 rounded-md"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-lg font-medium">{quiz.title}</h4>
                      <p className="text-sm text-slate-500">
                        Créé le {new Date(quiz.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/edit/${quiz.id}`}>Modifier</Link>
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="default" size="sm" asChild>
                          <Link href={`/dashboard/start/${quiz.id}`}>Lancer</Link>
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </motion.div>
  );
} 
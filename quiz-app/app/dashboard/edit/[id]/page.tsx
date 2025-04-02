"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/use-auth";
import { quizApi } from "@/lib/api/quiz-api";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function EditQuiz() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;
  
  const [quiz, setQuiz] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // État du formulaire
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [passingScore, setPassingScore] = useState(60);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);
  const [antiCheat, setAntiCheat] = useState(true);
  const [isTimeLimitEnabled, setIsTimeLimitEnabled] = useState(true);
  const [timeType, setTimeType] = useState<'per_question' | 'total' | 'specific_question'>('per_question');

  // Chargement du quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        const quizData = await quizApi.getQuiz(quizId);
        
        if (quizData) {
          setTitle(quizData.title);
          setDescription(quizData.description || "");
          
          // Initialiser le type de temps en fonction des données du quiz
          if (quizData.time_type) {
            setTimeType(quizData.time_type as 'per_question' | 'total' | 'specific_question');
          } else {
            setTimeType(quizData.time_total > 0 ? 'total' : 'per_question');
          }
          
          // Initialiser les valeurs de temps
          if (quizData.time_type === 'total' && quizData.time_total) {
            setTimePerQuestion(Math.round(quizData.time_total / 60)); // Convertir en minutes
            setIsTimeLimitEnabled(quizData.time_total > 0);
          } else if (quizData.time_type === 'specific_question') {
            setIsTimeLimitEnabled(true);
          } else {
            setTimePerQuestion(quizData.time_per_question || 30);
            setIsTimeLimitEnabled(quizData.time_per_question > 0);
          }
          
          setPassingScore(quizData.passing_score || 60);
          setShuffleQuestions(quizData.shuffle_questions || false);
          setShowAnswers(quizData.show_answers || false);
          setAntiCheat(quizData.anti_cheat || false);
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

  // Fonction de sauvegarde des modifications du quiz
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Veuillez saisir un titre pour le quiz");
      return;
    }

    if (!user) {
      toast.error("Vous devez être connecté pour mettre à jour un quiz");
      return;
    }

    setIsLoading(true);

    try {
      const quizData = {
        title,
        description: description || null,
        time_per_question: timeType === 'per_question' ? (isTimeLimitEnabled ? timePerQuestion : 0) : 0,
        time_total: timeType === 'total' ? (isTimeLimitEnabled ? timePerQuestion * 60 : 0) : 0,
        time_type: timeType,
        passing_score: passingScore,
        shuffle_questions: shuffleQuestions,
        show_answers: showAnswers,
        anti_cheat: antiCheat
      };
      
      await quizApi.updateQuiz(quizId, quizData);

      toast.success("Quiz mis à jour avec succès");
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du quiz:", error);
      toast.error(`Erreur lors de la mise à jour du quiz: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditQuestions = () => {
    router.push(`/dashboard/edit/${quizId}/questions`);
  };

  if (isLoading) {
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
            <Button variant="outline" asChild>
              <Link href="/dashboard">Tableau de bord</Link>
            </Button>
          </motion.div>
        </div>
      </header>

      <main className="container py-8 px-6 md:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Modifier le quiz</h2>
            <p className="text-slate-600">Modifiez les informations et les paramètres du quiz</p>
          </div>
          <div className="flex gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Retour au tableau de bord</Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={handleEditQuestions}>
                Modifier les questions
              </Button>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card className="p-6">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="space-y-2"
                >
                  <Label htmlFor="title">Titre du quiz</Label>
                  <Input 
                    id="title" 
                    placeholder="Ex: Mathématiques - Chapitre 3" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="space-y-2"
                >
                  <Label htmlFor="description">Description (optionnelle)</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Une brève description du contenu du quiz"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="time-limit-toggle" className="font-medium">Limite de temps</Label>
                    <Switch
                      id="time-limit-toggle"
                      checked={isTimeLimitEnabled}
                      onCheckedChange={setIsTimeLimitEnabled}
                    />
                  </div>
                  
                  {isTimeLimitEnabled && (
                    <div className="space-y-2 pb-4">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="time-type-total"
                            name="time-type"
                            checked={timeType === 'total'}
                            onChange={() => setTimeType('total')}
                            className="h-4 w-4 text-primary"
                          />
                          <Label htmlFor="time-type-total">Temps total pour le quiz</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="time-type-question"
                            name="time-type"
                            checked={timeType === 'per_question'}
                            onChange={() => setTimeType('per_question')}
                            className="h-4 w-4 text-primary"
                          />
                          <Label htmlFor="time-type-question">Temps identique pour chaque question</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="time-type-specific"
                            name="time-type"
                            checked={timeType === 'specific_question'}
                            onChange={() => setTimeType('specific_question')}
                            className="h-4 w-4 text-primary"
                          />
                          <Label htmlFor="time-type-specific">Temps spécifique par question</Label>
                        </div>
                      </div>

                      {timeType !== 'specific_question' && (
                        <div className="space-y-2">
                          <Label htmlFor="time-per-question">
                            {timeType === 'total' ? "Temps total (minutes)" : "Temps par question (secondes)"}
                          </Label>
                          <Input 
                            id="time-per-question" 
                            type="number" 
                            min={1} 
                            max={timeType === 'total' ? 180 : 300}
                            value={timePerQuestion}
                            onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                          />
                          <p className="text-xs text-slate-500">
                            {timeType === 'total'
                              ? "Le temps total pour compléter l'ensemble du quiz"
                              : "Le temps alloué pour répondre à chaque question"}
                          </p>
                        </div>
                      )}
                      
                      {timeType === 'specific_question' && (
                        <div className="rounded-md bg-blue-50 p-4">
                          <div className="flex">
                            <div className="text-blue-600">
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3 text-sm text-blue-600">
                              <p>
                                Vous avez choisi d'utiliser un temps spécifique pour chaque question. 
                                Vous pourrez définir ces temps dans l'éditeur de questions.
                              </p>
                              <Button variant="link" className="p-0 mt-2" asChild>
                                <Link href={`/dashboard/edit/${quizId}/questions`}>
                                  Aller à l'éditeur de questions
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="pt-4 border-t"
                >
                  <h3 className="text-lg font-medium mb-4">Options du quiz</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="shuffle-questions">Mélanger les questions</Label>
                        <p className="text-sm text-slate-500">Les questions seront présentées dans un ordre aléatoire</p>
                      </div>
                      <Switch 
                        id="shuffle-questions" 
                        checked={shuffleQuestions}
                        onCheckedChange={setShuffleQuestions}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="show-answers">Montrer les réponses</Label>
                        <p className="text-sm text-slate-500">Les élèves verront les réponses correctes après chaque question</p>
                      </div>
                      <Switch 
                        id="show-answers" 
                        checked={showAnswers}
                        onCheckedChange={setShowAnswers}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="anti-cheat">Système anti-triche</Label>
                        <p className="text-sm text-slate-500">Passe à la question suivante si l'élève change d'onglet</p>
                      </div>
                      <Switch 
                        id="anti-cheat" 
                        checked={antiCheat}
                        onCheckedChange={setAntiCheat}
                      />
                    </div>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  className="flex justify-between pt-4"
                >
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleEditQuestions}
                    >
                      Modifier les questions
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      type="submit" 
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <span className="flex items-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Enregistrement...
                        </span>
                      ) : "Enregistrer les modifications"}
                    </Button>
                  </motion.div>
                </motion.div>
              </form>
            </Card>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Détails du quiz</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium">Nombre de questions</h4>
                  <p className="text-slate-600">{quiz?.questions?.length || 0} questions</p>
                </div>
                
                <div>
                  <h4 className="font-medium">Date de création</h4>
                  <p className="text-slate-600">{new Date(quiz?.created_at).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <h4 className="font-medium">Dernière modification</h4>
                  <p className="text-slate-600">{new Date(quiz?.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="mt-8 space-y-3">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}>
                  <Button className="w-full" onClick={handleEditQuestions}>
                    Modifier les questions
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/dashboard/start/${quizId}`}>
                      Lancer le quiz
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
    </motion.div>
  );
} 
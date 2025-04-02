"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { quizApi } from "@/lib/api/quiz-api";
import { toast } from "sonner";

export default function CreateQuiz() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // État du formulaire
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [passingScore, setPassingScore] = useState(60);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);
  const [antiCheat, setAntiCheat] = useState(true);
  const [isTimeLimitEnabled, setIsTimeLimitEnabled] = useState(true);
  const [timeType, setTimeType] = useState<'per_question' | 'total' | 'specific_question'>('total');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Veuillez saisir un titre pour le quiz");
      return;
    }

    if (!user) {
      toast.error("Vous devez être connecté pour créer un quiz");
      return;
    }

    setIsLoading(true);

    try {
      // Créer uniquement le quiz sans toucher aux sessions
      console.log("Tentative de création du quiz avec les données:", {
        title,
        description: description || null,
        teacher_id: user.id,
        time_per_question: timeType === 'per_question' ? (isTimeLimitEnabled ? timePerQuestion : 0) : 0,
        time_total: timeType === 'total' ? (isTimeLimitEnabled ? timePerQuestion * 60 : 0) : 0,
        time_type: timeType,
        passing_score: passingScore,
        shuffle_questions: shuffleQuestions,
        show_answers: showAnswers,
        anti_cheat: antiCheat
      });
      
      const quizData = {
        title,
        description: description || null,
        teacher_id: user.id,
        time_per_question: timeType === 'per_question' ? (isTimeLimitEnabled ? timePerQuestion : 0) : 0,
        time_total: timeType === 'total' ? (isTimeLimitEnabled ? timePerQuestion * 60 : 0) : 0,
        time_type: timeType,
        passing_score: passingScore,
        shuffle_questions: shuffleQuestions,
        show_answers: showAnswers,
        anti_cheat: antiCheat
      };
      
      const newQuiz = await quizApi.createQuiz(quizData);

      toast.success("Quiz créé avec succès");
      
      // Rediriger vers la page de création des questions
      router.push(`/dashboard/edit/${newQuiz.id}/questions`);
    } catch (error: any) {
      console.error("Erreur lors de la création du quiz:", error);
      console.error("Détails de l'erreur:", JSON.stringify(error, null, 2));
      toast.error(`Erreur lors de la création du quiz: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <span className="font-bold text-xl">TrueFalse</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              asChild
              className="bg-transparent hover:bg-gray-100 text-gray-800 border-gray-300 hover:border-gray-400 transition-all"
            >
              <Link href="/dashboard">Retour au tableau de bord</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 px-6 mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Créer un nouveau quiz</h2>
            <p className="text-slate-600">Définissez les informations générales et les paramètres</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="title">Titre du quiz</Label>
                  <Input 
                    id="title" 
                    placeholder="Ex: Mathématiques - Chapitre 3" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optionnelle)</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Une brève description du contenu du quiz"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="time-limit-toggle">Limite de temps</Label>
                    <Switch
                      id="time-limit-toggle"
                      checked={isTimeLimitEnabled}
                      onCheckedChange={setIsTimeLimitEnabled}
                    />
                  </div>
                  
                  {isTimeLimitEnabled && (
                    <div className="space-y-2 mb-4">
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
                          <Label htmlFor="time-type-specific">Temps spécifique par question (à définir après)</Label>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="time-per-question" className={!isTimeLimitEnabled || timeType === 'specific_question' ? "text-slate-400" : ""}>
                      {timeType === 'total' ? "Temps total (minutes)" : "Temps par question (secondes)"}
                    </Label>
                    <Input 
                      id="time-per-question" 
                      type="number" 
                      min={1} 
                      max={timeType === 'total' ? 180 : 300}
                      value={timePerQuestion}
                      onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                      disabled={!isTimeLimitEnabled || timeType === 'specific_question'}
                      className={!isTimeLimitEnabled || timeType === 'specific_question' ? "bg-slate-100 text-slate-400" : ""}
                    />
                    <p className="text-xs text-slate-500">
                      {!isTimeLimitEnabled 
                        ? "Aucune limite de temps n'est appliquée"
                        : timeType === 'specific_question'
                        ? "Vous pourrez définir un temps spécifique pour chaque question dans l'éditeur de questions"
                        : timeType === 'total'
                          ? "Le temps total pour compléter l'ensemble du quiz"
                          : "Le temps alloué pour répondre à chaque question"}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
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
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? "Création en cours..." : "Passer aux questions"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
          
          <div>
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Conseils</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium">Titre clair</h4>
                  <p className="text-slate-600">Donnez un titre descriptif qui permettra de retrouver facilement ce quiz.</p>
                </div>
                
                <div>
                  <h4 className="font-medium">Temps total</h4>
                  <p className="text-slate-600">Définissez le temps total pour l'ensemble du quiz. Vous pouvez aussi désactiver la limite de temps.</p>
                </div>
                
                <div>
                  <h4 className="font-medium">Système anti-triche</h4>
                  <p className="text-slate-600">Cette fonctionnalité aide à garantir l'intégrité de l'évaluation en empêchant les élèves de rechercher les réponses.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
} 
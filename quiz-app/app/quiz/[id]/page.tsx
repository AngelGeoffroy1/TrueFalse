"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { QuizTimer } from "@/components/quiz/quiz-timer";
import { useCheatDetection } from "@/lib/hooks/use-cheat-detection";
import { useEffect, useState, useRef } from "react";
import React from "react";
import { useSearchParams, useParams } from "next/navigation";
import { quizApi } from "@/lib/api/quiz-api";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

// Type pour une question
type Question = {
  id: string;
  text: string;
  options: { id: string; text: string; is_correct?: boolean }[];
  correctOptionId?: string;
  time_limit?: number;
};

// Type pour un quiz
type Quiz = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  time_per_question: number;
  show_answers: boolean;
  anti_cheat: boolean;
  time_type: string;
  time_total?: number;
  shuffle_questions: boolean;
};

export default function QuizPage() {
  const params = useParams();
  const quizId = params.id as string;
  const searchParams = useSearchParams();
  
  // Récupérer l'id du participant depuis les paramètres d'URL
  const participantId = searchParams.get('participant');
  
  // États
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [totalTimeRemaining, setTotalTimeRemaining] = useState<number | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isPerQuestionTimer, setIsPerQuestionTimer] = useState(true);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [participantName, setParticipantName] = useState('');

  // Fonction appelée lorsqu'une triche est détectée
  const handleCheatDetected = async () => {
    // Si une réponse a déjà été soumise, ou si le quiz est terminé, 
    // ou si l'anti-triche est désactivé, ou s'il n'y a pas d'ID participant
    // alors ne pas considérer comme triche
    if (answerSubmitted || quizCompleted || !quiz?.anti_cheat || !participantId) return;
    
    try {
      console.log("Tentative de triche détectée");
      
      // Enregistrer la tentative de triche
      const result = await quizApi.recordCheatAttempt(participantId, 'detection_automatique', 'Comportement suspect détecté');
      
      // Si result est null, cela signifie que le participant a déjà terminé le quiz
      if (!result) {
        console.log("La tentative de triche a été ignorée car le participant a déjà terminé");
        return;
      }
      
      // Mettre à jour le participant avec le nouveau nombre de tentatives de triche
      await quizApi.updateParticipant(participantId, {
        cheat_attempts: (participant?.cheat_attempts || 0) + 1
      });
      
      // Mettre à jour l'état local
      setParticipant((prev: any) => ({
        ...prev,
        cheat_attempts: (prev?.cheat_attempts || 0) + 1
      }));
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la tentative de triche:", error);
    }
    
    // Passer à la question suivante en cas de triche
    moveToNextQuestion();
  };

  // Utiliser notre hook de détection de triche
  const cheatDetection = useCheatDetection({
    onCheatDetected: handleCheatDetected,
    enabled: quiz?.anti_cheat || false,
    trackTabSwitch: true,
    trackCopyPaste: true,
    trackRightClick: true,
    trackFullScreen: false,
  });

  // Ajouter une fonction pour formater le temps
  const formatTimeMMSS = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Charger les données du quiz depuis Supabase
  useEffect(() => {
    // Chargement du quiz et initialisation
    const loadQuiz = async () => {
      try {
        setIsLoading(true);
        
        // Récupérer le quiz
        const loadedQuiz = await quizApi.getQuizWithQuestions(quizId);
        console.log("Quiz chargé:", loadedQuiz);
        
        // Récupérer les informations du participant
        const participantData = await quizApi.getParticipant(participantId as string);
        console.log("Participant chargé:", participantData);
        
        // Mettre à jour l'état avec les données récupérées
        if (loadedQuiz && participantData) {
          // Définir le nom du participant
          setParticipantName(participantData.name);
          
          // Mélanger les questions si l'option est activée
          let quizQuestions = [...loadedQuiz.questions];
          if (loadedQuiz.shuffle_questions) {
            quizQuestions = shuffleArray(quizQuestions);
          }
          
          // Identifier correctement l'option correcte pour chaque question
          const questionsWithCorrectOptions = quizQuestions.map(q => {
            // Trouver l'option correcte
            const correctOption = q.options.find((opt: any) => opt.is_correct === true);
            const correctOptionId = correctOption ? correctOption.id : null;
            
            console.log("Question ID:", q.id, "Option correcte:", correctOptionId);
            
            return {
              ...q,
              // Stocker l'ID de l'option correcte
              correctOptionId: correctOptionId,
              options: q.options.map((opt: any) => ({
                ...opt,
                isSelected: false
              }))
            };
          });
          
          // Formater les données
          const formattedQuiz = {
            ...loadedQuiz,
            questions: questionsWithCorrectOptions
          };
          
          console.log("Options du quiz chargé:", { 
            show_answers: loadedQuiz.show_answers, 
            shuffle_questions: loadedQuiz.shuffle_questions,
            anti_cheat: loadedQuiz.anti_cheat
          });
          
          setQuiz(formattedQuiz);
          
          // Initialiser le minuteur en fonction du type de temps
          if (loadedQuiz.time_type === 'total') {
            // Si on a un temps total, l'utiliser pour le quiz entier
            if (loadedQuiz.time_total && loadedQuiz.time_total > 0) {
              setRemainingTime(loadedQuiz.time_total);
              setIsPerQuestionTimer(false);
            } else {
              // Si le temps total est 0 ou null, pas de limite de temps
              setRemainingTime(null);
              setIsPerQuestionTimer(false);
            }
          } else if (loadedQuiz.time_type === 'specific_question') {
            // Si on a un temps spécifique par question, utiliser celui de la première question
            const firstQuestionTime = questionsWithCorrectOptions[0]?.time_limit;
            if (firstQuestionTime && firstQuestionTime > 0) {
              setRemainingTime(firstQuestionTime);
              setIsPerQuestionTimer(true);
            } else {
              // Si pas de temps spécifique pour la première question, pas de limite
              setRemainingTime(null);
              setIsPerQuestionTimer(true);
            }
          } else {
            // Utiliser le temps par question pour la première question
            if (loadedQuiz.time_per_question && loadedQuiz.time_per_question > 0) {
              setRemainingTime(loadedQuiz.time_per_question);
              setIsPerQuestionTimer(true);
            } else {
              // Si pas de temps par question, pas de limite
              setRemainingTime(null);
              setIsPerQuestionTimer(true);
            }
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement du quiz:", error);
        setError("Impossible de charger le quiz. Veuillez réessayer.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (quizId && participantId) {
      loadQuiz();
    }
    
    // Nettoyer
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [quizId, participantId]);
  
  // Effet pour gérer le minuteur - Complètement remanié pour éviter les déclenchements multiples
  useEffect(() => {
    // Ne rien faire si le quiz est en chargement, n'existe pas, ou si le temps est illimité
    if (isLoading || !quiz || remainingTime === null) return;
    
    // Ne pas démarrer un nouveau timer si la réponse a déjà été soumise
    if (answerSubmitted) return;

    console.log("Démarrage du timer pour la question", currentQuestionIndex + 1, "temps:", remainingTime);
    
    // Créer une variable pour suivre si l'expiration a déjà été traitée
    let expirationHandled = false;
    
    // Démarrer le minuteur
    const interval = setInterval(() => {
      setRemainingTime(prev => {
        // Si le temps est écoulé et que l'expiration n'a pas encore été traitée
        if ((prev === null || prev <= 0) && !expirationHandled && !answerSubmitted) {
          // Marquer l'expiration comme traitée pour éviter les appels multiples
          expirationHandled = true;
          
          // Nettoyer l'intervalle
          clearInterval(interval);
          
          console.log("TEMPS ÉCOULÉ - traitement en cours...");
          
          // Marquer la réponse comme soumise
          setAnswerSubmitted(true);
          
          // Gérer l'expiration du temps en fonction du type de timer
          if (isPerQuestionTimer) {
            console.log("Mode temps par question - enregistrement d'une non-réponse");
            
            // Si mode temps par question et participant existe
            if (participantId && quiz) {
              const currentQuestion = quiz.questions[currentQuestionIndex];
              
              // Utiliser une fonction asynchrone auto-invoquée
              (async () => {
                try {
                  // Enregistrer une non-réponse
                  await quizApi.addParticipantAnswer({
                    participant_id: participantId,
                    question_id: currentQuestion.id,
                    selected_option_id: null, // Pas de réponse sélectionnée
                    is_correct: false,
                    time_spent: quiz.time_per_question || 0
                  });
                  
                  // Mettre à jour la progression du participant
                  await quizApi.updateParticipant(participantId, {
                    current_question: currentQuestionIndex + 1
                  });
                  
                  console.log("Non-réponse enregistrée avec succès");
                  
                  // Afficher un message
                  toast.info("Temps écoulé pour cette question");
                  
                  // IMPORTANT: Attendre avant de passer à la question suivante
                  // Si show_answers est activé, montrer les réponses pendant un moment
                  if (quiz.show_answers) {
                    console.log("Pause pour afficher les réponses avant de passer à la question suivante");
                    setTimeout(() => {
                      moveToNextQuestion();
                    }, 2000);
                  } else {
                    // Sinon passer directement à la question suivante après un court délai
                    setTimeout(() => {
                      moveToNextQuestion();
                    }, 1000);
                  }
                } catch (error) {
                  console.error("Erreur lors de l'enregistrement de la non-réponse:", error);
                  // En cas d'erreur, quand même passer à la question suivante
                  setTimeout(() => {
                    moveToNextQuestion();
                  }, 1000);
                }
              })();
            } else {
              // Pas de participant, simplement passer à la question suivante
              setTimeout(() => {
                moveToNextQuestion();
              }, 1000);
            }
          } else {
            // En mode temps total, terminer le quiz
            console.log("Mode temps total - fin du quiz");
            setQuizCompleted(true);
          }
          
          return 0;
        }
        
        // Décrémenter normalement si le temps n'est pas écoulé
        return prev !== null && prev > 0 ? prev - 1 : 0;
      });
    }, 1000);
    
    // Enregistrer l'intervalle pour pouvoir le nettoyer plus tard
    setTimerInterval(interval);
    
    // Nettoyer l'intervalle lors du démontage du composant
    return () => {
      clearInterval(interval);
    };
  }, [isLoading, quiz, currentQuestionIndex, remainingTime, isPerQuestionTimer, answerSubmitted, participantId]);

  // Fonction pour gérer l'expiration du temps global
  const handleTimeExpired = async () => {
    console.log("Temps total expiré, fin du quiz");
    
    // Si nous avons un participant, marquer comme terminé
    if (participantId && !quizCompleted) {
      try {
        await quizApi.updateParticipant(participantId, {
          completed_at: new Date().toISOString(),
          current_question: currentQuestionIndex + 1 // Enregistrer la progression actuelle
        });
        
        // Mettre à jour l'état local
        setParticipant((prev: any) => ({
          ...prev,
          completed_at: new Date().toISOString()
        }));
      } catch (error) {
        console.error("Erreur lors de la mise à jour du statut du participant:", error);
      }
    }
    
    // Marquer le quiz comme terminé
    setQuizCompleted(true);
  };

  // Fonction pour mélanger un tableau (algorithme de Fisher-Yates)
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Fonction pour passer à la question suivante
  const moveToNextQuestion = () => {
    if (!quiz || currentQuestionIndex >= quiz.questions.length - 1) {
      // C'était la dernière question, terminer le quiz
      setQuizCompleted(true);
      return;
    }
    
    // Passer à la question suivante
    setCurrentQuestionIndex(prev => prev + 1);
    setAnswerSubmitted(false);
    setSelectedOptionId(null);

    // Réinitialiser le minuteur pour la nouvelle question si mode "par question"
    if (isPerQuestionTimer && quiz) {
      if (quiz.time_type === 'specific_question') {
        // Si temps spécifique, utiliser celui de la question courante
        const nextQuestion = quiz.questions[currentQuestionIndex + 1];
        const nextQuestionTime = nextQuestion.time_limit;
        
        if (nextQuestionTime && nextQuestionTime > 0) {
          setRemainingTime(nextQuestionTime);
        } else {
          // Si pas de temps spécifique pour cette question, pas de limite
          setRemainingTime(null);
        }
      } else if (quiz.time_per_question && quiz.time_per_question > 0) {
        // Sinon utiliser le temps standard par question
        setRemainingTime(quiz.time_per_question);
    } else {
        // Si pas de temps par question, pas de limite
        setRemainingTime(null);
      }
    }
  };

  // Fonction pour gérer la sélection d'une option
  const handleOptionSelect = (optionId: string) => {
    if (answerSubmitted) return;
    setSelectedOptionId(optionId);
  };

  // Fonction pour soumettre la réponse
  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || answerSubmitted || !quiz) return;
    
    // Marquer immédiatement comme soumis pour éviter les doublons
    setAnswerSubmitted(true);

    // Désactiver tout timer possible pour éviter le double appel à moveToNextQuestion
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    
    // Déterminer si la réponse est correcte en vérifiant avec correctOptionId
    const isCorrect = selectedOptionId === currentQuestion.correctOptionId;
    
    console.log("Vérification réponse:", { 
      selectedOptionId, 
      correctOptionId: currentQuestion.correctOptionId,
      isCorrect 
    });

    // Si nous avons un participant, enregistrer sa réponse
    if (participantId) {
      try {
        // Calculer le temps passé sur la question
        const timeSpent = quiz.time_type === 'specific_question'
          ? (currentQuestion.time_limit || quiz.time_per_question || 0) - (remainingTime || 0)
          : quiz.time_per_question - (remainingTime || 0);
        
        await quizApi.addParticipantAnswer({
          participant_id: participantId,
          question_id: currentQuestion.id,
          selected_option_id: selectedOptionId,
          is_correct: isCorrect,
          time_spent: Math.max(0, timeSpent)
        });
        
        // Mettre à jour le score du participant si la réponse est correcte
        if (isCorrect) {
          await quizApi.updateParticipant(participantId, {
            score: (participant?.score || 0) + 1,
            current_question: currentQuestionIndex + 1
          });
        } else {
          await quizApi.updateParticipant(participantId, {
            current_question: currentQuestionIndex + 1
          });
        }
      } catch (error) {
        console.error("Erreur lors de l'enregistrement de la réponse:", error);
      }
    }

    // Si l'option show_answers est activée, attendre un court délai avant de passer à la question suivante
    // pour laisser le temps à l'utilisateur de voir la réponse correcte
    if (quiz.show_answers) {
      console.log("Affichage des réponses activé, délai avant la prochaine question");
      setTimeout(() => {
        moveToNextQuestion();
      }, 2000);
    } else {
      console.log("Affichage des réponses désactivé, passage immédiat à la question suivante");
      moveToNextQuestion();
    }
  };

  // Fonction appelée lorsque le temps est écoulé
  const handleTimeUp = async () => {
    // Cette fonction ne fait plus rien, toute la logique a été déplacée dans l'effet du timer
    console.warn("handleTimeUp appelé, mais cette fonction ne devrait plus être utilisée");
  };

  // Ajouter un effet pour détecter quand une session est arrêtée
  useEffect(() => {
    if (!participantId || !quiz) return;
    
    // Fonction pour vérifier si la session est toujours active
    const checkSessionStatus = async () => {
      try {
        // Approche alternative: vérifier directement si la session du participant est active
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('*')
          .eq('quiz_id', quizId)
          .eq('is_active', true)
          .single();
        
        // Si aucune session active n'est trouvée et que le quiz n'est pas terminé
        if (!sessionData && !quizCompleted) {
          console.log("La session a été arrêtée par l'enseignant");
          // Marquer le participant comme ayant terminé
          await quizApi.updateParticipant(participantId, {
            completed_at: new Date().toISOString(),
            connected: false
          });
          
          // Afficher un message et rediriger vers la page de fin
          toast.info("La session a été arrêtée par l'enseignant");
          setQuizCompleted(true);
        }
      } catch (error) {
        console.error("Erreur lors de la vérification du statut de la session:", error);
      }
    };
    
    // Vérifier toutes les 10 secondes
    const interval = setInterval(checkSessionStatus, 10000);
    
    // Nettoyer l'intervalle
    return () => clearInterval(interval);
  }, [participantId, quizId, quiz, quizCompleted]);

  // Vérifier si le quiz a été correctement chargé et si show_answers a la bonne valeur
  useEffect(() => {
    if (quiz) {
      // DEBUG: Vérifier si l'option show_answers est correctement définie
      console.log("DEBUG - show_answers:", quiz.show_answers);
      console.log("Type de show_answers:", typeof quiz.show_answers);
      console.log("Quiz complet:", quiz);
    }
  }, [quiz]);

  // Modifier la fonction shouldShowFeedback pour mieux gérer les différents types possibles
  const shouldShowFeedback = () => {
    // Logger l'état des variables
    console.log("shouldShowFeedback check - show_answers:", quiz?.show_answers, 
      "type:", typeof quiz?.show_answers, 
      "answerSubmitted:", answerSubmitted,
      "Quiz ID:", quiz?.id);
    
    // Vérifier si show_answers est true (de type boolean) ou 'true' (de type string)
    const showAnswersSetting = quiz?.show_answers;
    return ((typeof showAnswersSetting === 'boolean' && showAnswersSetting === true) || 
            (typeof showAnswersSetting === 'string' && showAnswersSetting === 'true')) && 
           answerSubmitted === true;
  };

  // Gestion de l'état de chargement
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl">Chargement du quiz...</p>
      </div>
    );
  }

  // Gestion des erreurs
  if (error || !quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Erreur</h1>
          </CardHeader>
          <CardContent>
            <p className="text-center">{error || "Impossible de charger le quiz"}</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <a href="/">Retour à l'accueil</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Rendu du quiz terminé
  if (quizCompleted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <h1 className="text-3xl font-bold">Quiz terminé !</h1>
            <p className="text-slate-600">Merci d'avoir participé, {participant?.name || 'Élève'}</p>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              {cheatDetection.cheatAttempts > 0 && (
                <div className="p-3 bg-red-100 border border-red-300 rounded mb-4">
                  <p className="text-red-600">
                    {cheatDetection.cheatAttempts} tentative(s) de triche détectée(s)
                  </p>
                </div>
              )}
              <p className="text-lg">
                Vos résultats ont été enregistrés et seront disponibles auprès de votre enseignant.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <a href="/">Retour à l'accueil</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Question actuelle
  const currentQuestion = quiz.questions[currentQuestionIndex];

  // Formater l'affichage du temps restant
  const formatRemainingTime = () => {
    if (remainingTime === null) return '--:--';
    
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-100 to-slate-200 p-4">
      <header className="container mx-auto mb-8 mt-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{quiz.title}</h1>
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {participant?.name || 'Élève'}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              Question {currentQuestionIndex + 1}/{quiz.questions.length}
            </div>
            
            {/* Afficher le temps total s'il est défini */}
            {remainingTime !== null ? (
              <div className="text-sm font-medium bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                Temps restant: {formatRemainingTime()}
              </div>
            ) : (
              <div className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                Temps illimité
              </div>
            )}
          </div>
        </div>
        {/* Barre de progression */}
        <div className="w-full h-2 bg-slate-200 rounded-full mt-2">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{
              width: `${((currentQuestionIndex) / quiz.questions.length) * 100}%`,
            }}
          ></div>
        </div>
      </header>

      <main className="container mx-auto flex-grow flex items-center justify-center">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader>
            <h2 className="text-xl font-medium">{currentQuestion.text}</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                // Vérifier si l'option est correcte en utilisant correctOptionId
                const isCorrectOption = option.id === currentQuestion.correctOptionId;
                
                // Déterminer si cette option est celle que l'utilisateur a sélectionnée
                const isSelectedOption = selectedOptionId === option.id;
                
                // Déterminer si nous devons afficher un feedback visuel en utilisant la fonction améliorée
                const showFeedback = shouldShowFeedback();
                
                // DEBUG: Logger des informations pour chaque option
                console.log(`Option ${option.id}: isCorrect=${isCorrectOption}, isSelected=${isSelectedOption}, showFeedback=${showFeedback}`);
                
                // Déterminer les classes CSS en fonction des conditions
                let optionClasses = "p-4 border rounded-lg cursor-pointer transition-all ";
                
                // Style de base pour l'option sélectionnée (sans feedback)
                if (isSelectedOption && !showFeedback) {
                  optionClasses += "border-blue-500 bg-blue-50 ";
                } else if (!isSelectedOption && !showFeedback) {
                  optionClasses += "border-slate-200 hover:border-slate-300 ";
                }
                
                // Cas où nous devons montrer le feedback (réponse correcte/incorrecte)
                if (showFeedback) {
                  if (isCorrectOption) {
                    // Rendre la bonne réponse visible mais avec une bordure plus fine
                    optionClasses += "border-green-500 bg-green-100 hover:bg-green-200 transition-all ";
                  } else if (isSelectedOption) {
                    // Colorer la sélection incorrecte en rouge mais avec une bordure standard
                    optionClasses += "border-red-500 bg-red-100 ";
                  } else {
                    // Options non sélectionnées et incorrectes
                    optionClasses += "border-slate-200 opacity-60 ";
                  }
                }
                
                return (
                <div
                  key={option.id}
                    className={optionClasses}
                  onClick={() => handleOptionSelect(option.id)}
                >
                    <div className="flex justify-between items-center">
                      <span className={isCorrectOption && showFeedback ? "font-semibold" : ""}>
                        {option.text}
                      </span>
                      {showFeedback && isCorrectOption && (
                        <div className="flex items-center bg-green-200 px-2 py-1 rounded-full">
                          <span className="text-green-700 font-bold text-xl">✓</span>
                          <span className="text-green-700 ml-1 text-sm font-semibold">Bonne réponse!</span>
                        </div>
                      )}
                      {showFeedback && isSelectedOption && !isCorrectOption && (
                        <span className="text-red-600 ml-2 font-bold bg-red-50 px-2 py-1 rounded-full">✗</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              className="invisible" // Caché pour l'instant
            >
              Question précédente
                </Button>
            {/* Toujours afficher le bouton Valider, jamais le bouton Question suivante */}
                <Button
                  onClick={handleSubmitAnswer}
              disabled={!selectedOptionId || answerSubmitted}
                >
              {answerSubmitted 
                ? (currentQuestionIndex < quiz.questions.length - 1 ? "Chargement..." : "Finalisation...") 
                : "Valider"
              }
                </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
} 
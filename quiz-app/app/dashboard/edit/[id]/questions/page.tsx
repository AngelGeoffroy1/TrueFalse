"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/hooks/use-auth";
import { quizApi } from "@/lib/api/quiz-api";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Check, X, Save, GripVertical, PlusCircle, MinusCircle } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';

export default function QuizQuestions() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;
  
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentQuestion, setCurrentQuestion] = useState<{
    id?: string;
    text: string;
    options: {
      id?: string;
      text: string;
      isCorrect: boolean;
      order_index: number;
    }[];
    timeLimit: number;
    points: number;
    order_index: number;
  }>({
    text: "",
    options: [
      { text: "", isCorrect: true, order_index: 0 },
      { text: "", isCorrect: false, order_index: 1 },
      { text: "", isCorrect: false, order_index: 2 },
      { text: "", isCorrect: false, order_index: 3 },
    ],
    timeLimit: 0,
    points: 1,
    order_index: questions.length,
  });

  // Ajouter un état pour la question en cours de modification
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ajouter un état pour suivre la question en cours d'édition inline
  const [inlineEditingQuestionId, setInlineEditingQuestionId] = useState<string | null>(null);
  // Ajouter un état temporaire pour stocker les modifications pendant l'édition inline
  const [inlineEditQuestion, setInlineEditQuestion] = useState<any>(null);

  // Chargement du quiz et des questions
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const quizData = await quizApi.getQuizWithQuestions(quizId);
        setQuiz(quizData);
        if (quizData.questions) {
          setQuestions(quizData.questions);
        }
        
        // Vérifier si le quiz utilise des temps spécifiques par question
        if (quizData.time_type === 'specific_question') {
          // Si oui, afficher un message pour informer l'utilisateur
          toast.info("Ce quiz utilise des temps spécifiques par question. Vous pouvez définir un temps pour chaque question.", {
            duration: 5000,
          });
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

  // Fonction pour ajouter une question
  const handleAddQuestion = async () => {
    if (!currentQuestion.text.trim()) {
      toast.error("Veuillez saisir le texte de la question");
      return;
    }

    // Vérifier qu'au moins une option est correcte
    if (!currentQuestion.options.some(opt => opt.isCorrect)) {
      toast.error("Veuillez indiquer au moins une option correcte");
      return;
    }

    // Vérifier que toutes les options ont un texte
    if (currentQuestion.options.some(opt => !opt.text.trim())) {
      toast.error("Toutes les options doivent avoir un texte");
      return;
    }

    setIsSaving(true);
    try {
      if (editingQuestionId) {
        // Mise à jour d'une question existante
        const updatedQuestion = await quizApi.updateQuestion(editingQuestionId, {
          quiz_id: quizId,
          text: currentQuestion.text,
          time_limit: currentQuestion.timeLimit && currentQuestion.timeLimit > 0 ? currentQuestion.timeLimit : null,
          points: currentQuestion.points || 1,
          order_index: currentQuestion.order_index,
        });

        // Mettre à jour les options
        for (const option of currentQuestion.options) {
          if (option.id) {
            // Option existante à mettre à jour
            await quizApi.updateOption(option.id, {
              question_id: editingQuestionId,
              text: option.text,
              is_correct: option.isCorrect,
              order_index: option.order_index,
            });
          } else {
            // Nouvelle option à ajouter
            await quizApi.addOptions([{
              question_id: editingQuestionId,
              text: option.text,
              is_correct: option.isCorrect,
              order_index: option.order_index,
            }]);
          }
        }

        // Mettre à jour l'état local
        setQuestions(questions.map(q => 
          q.id === editingQuestionId 
            ? { ...updatedQuestion, options: currentQuestion.options } 
            : q
        ));

        toast.success("Question mise à jour avec succès");
        setEditingQuestionId(null);
      } else {
        // Ajout d'une nouvelle question
        const newQuestion = await quizApi.addQuestion({
          quiz_id: quizId,
          text: currentQuestion.text,
          time_limit: currentQuestion.timeLimit && currentQuestion.timeLimit > 0 ? currentQuestion.timeLimit : null,
          points: currentQuestion.points || 1,
          order_index: questions.length,
        });

        // Ajouter les options
        const optionsToAdd = currentQuestion.options.map((option, index) => ({
          question_id: newQuestion.id,
          text: option.text,
          is_correct: option.isCorrect,
          order_index: index,
        }));

        await quizApi.addOptions(optionsToAdd);

        // Mettre à jour l'état local
        const questionWithOptions = {
          ...newQuestion,
          options: optionsToAdd,
        };

        setQuestions([...questions, questionWithOptions]);
        toast.success("Question ajoutée avec succès");
      }

      // Réinitialiser le formulaire
      setCurrentQuestion({
        text: "",
        options: [
          { text: "", isCorrect: true, order_index: 0 },
          { text: "", isCorrect: false, order_index: 1 },
          { text: "", isCorrect: false, order_index: 2 },
          { text: "", isCorrect: false, order_index: 3 },
        ],
        timeLimit: 0,
        points: 1,
        order_index: questions.length + 1,
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout/mise à jour de la question:", error);
      toast.error("Erreur lors de l'enregistrement de la question");
    } finally {
      setIsSaving(false);
    }
  };

  // Fonction pour mettre à jour le texte d'une option
  const handleOptionTextChange = (index: number, text: string) => {
    setCurrentQuestion(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], text };
      return { ...prev, options: newOptions };
    });
  };

  // Fonction pour définir l'option correcte
  const handleSetCorrectOption = (index: number) => {
    setCurrentQuestion(prev => {
      const newOptions = prev.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }));
      return { ...prev, options: newOptions };
    });
  };

  // Fonction pour sauvegarder le quiz et revenir au tableau de bord
  const handleFinish = () => {
    if (questions.length === 0) {
      toast.error("Ajoutez au moins une question avant de terminer");
      return;
    }
    
    toast.success("Quiz sauvegardé avec succès");
    router.push("/dashboard");
  };

  // Ajouter une fonction pour modifier une question existante
  const handleEditQuestion = (question: any) => {
    // Formater les options pour l'édition
    const formattedOptions = question.options.map((opt: any) => ({
      text: opt.text,
      isCorrect: opt.is_correct,
      order_index: opt.order_index,
      id: opt.id
    }));
    
    // Mettre à jour l'état de la question actuelle avec les données de la question à modifier
    setCurrentQuestion({
      id: question.id,
      text: question.text,
      options: formattedOptions,
      timeLimit: question.time_limit || 0,
      points: question.points || 1,
      order_index: question.order_index,
    });
    
    // Marquer cette question comme étant en cours d'édition
    setEditingQuestionId(question.id);
    
    // Faire défiler jusqu'au formulaire
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Ajouter une fonction pour supprimer une question existante
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette question ? Cette action est irréversible.")) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await quizApi.deleteQuestion(questionId);
      
      // Mettre à jour la liste des questions
      setQuestions(questions.filter(q => q.id !== questionId));
      
      toast.success("Question supprimée avec succès");
    } catch (error) {
      console.error("Erreur lors de la suppression de la question:", error);
      toast.error("Erreur lors de la suppression de la question");
    } finally {
      setIsDeleting(false);
    }
  };

  // Fonction pour gérer la fin du drag-and-drop
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    // Le drag and drop n'a pas changé de position
    if (result.destination.index === result.source.index) return;

    // Réorganiser localement les questions
    const reorderedQuestions = Array.from(questions);
    const [removed] = reorderedQuestions.splice(result.source.index, 1);
    reorderedQuestions.splice(result.destination.index, 0, removed);

    // Mettre à jour l'ordre des questions dans l'état local
    setQuestions(reorderedQuestions);

    // Mettre à jour l'ordre des questions dans la base de données
    try {
      setIsLoading(true);
      
      // Mettre à jour l'ordre de chaque question impactée
      for (let i = 0; i < reorderedQuestions.length; i++) {
        await quizApi.updateQuestion(reorderedQuestions[i].id, {
          order_index: i
        });
      }
      
      toast.success("Ordre des questions mis à jour");
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'ordre des questions:", error);
      toast.error("Erreur lors de la mise à jour de l'ordre des questions");
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour démarrer l'édition inline d'une question
  const startInlineEdit = (question: any) => {
    // Créer une copie des données pour l'édition
    const formattedOptions = question.options.map((opt: any) => ({
      id: opt.id,
      text: opt.text,
      isCorrect: opt.is_correct,
      order_index: opt.order_index,
    }));
    
    setInlineEditQuestion({
      id: question.id,
      text: question.text,
      options: formattedOptions,
      timeLimit: question.time_limit || 0,
      points: question.points || 1,
      order_index: question.order_index,
    });
    
    setInlineEditingQuestionId(question.id);
  };

  // Fonction pour annuler l'édition inline
  const cancelInlineEdit = () => {
    setInlineEditingQuestionId(null);
    setInlineEditQuestion(null);
  };

  // Fonction pour sauvegarder l'édition inline
  const saveInlineEdit = async () => {
    if (!inlineEditQuestion) return;
    
    try {
      setIsSaving(true);
      
      // Vérifier si les données sont valides
      if (!inlineEditQuestion.text.trim()) {
        toast.error("Le texte de la question ne peut pas être vide");
        return;
      }
      
      if (!inlineEditQuestion.options.some((opt: any) => opt.isCorrect)) {
        toast.error("Vous devez sélectionner au moins une option correcte");
        return;
      }
      
      if (inlineEditQuestion.options.some((opt: any) => !opt.text.trim())) {
        toast.error("Toutes les options doivent avoir un texte");
        return;
      }
      
      // Mettre à jour la question
      const updatedQuestion = await quizApi.updateQuestion(inlineEditQuestion.id, {
        quiz_id: quizId,
        text: inlineEditQuestion.text,
        time_limit: inlineEditQuestion.timeLimit && inlineEditQuestion.timeLimit > 0 ? inlineEditQuestion.timeLimit : null,
        points: inlineEditQuestion.points || 1,
        order_index: inlineEditQuestion.order_index,
      });
      
      // Mettre à jour les options
      for (const option of inlineEditQuestion.options) {
        if (option.id) {
          // Mettre à jour l'option existante
          await quizApi.updateOption(option.id, {
            question_id: inlineEditQuestion.id,
            text: option.text,
            is_correct: option.isCorrect,
            order_index: option.order_index,
          });
        } else {
          // Ajouter une nouvelle option
          await quizApi.addOptions([{
            question_id: inlineEditQuestion.id,
            text: option.text,
            is_correct: option.isCorrect,
            order_index: option.order_index,
          }]);
        }
      }
      
      // Mettre à jour l'état local
      setQuestions(questions.map(q => 
        q.id === inlineEditQuestion.id 
          ? { 
              ...q, 
              text: inlineEditQuestion.text,
              time_limit: inlineEditQuestion.timeLimit && inlineEditQuestion.timeLimit > 0 ? inlineEditQuestion.timeLimit : null,
              points: inlineEditQuestion.points || 1,
              options: inlineEditQuestion.options.map((opt: any) => ({
                ...opt,
                is_correct: opt.isCorrect,
                question_id: inlineEditQuestion.id,
              }))
            } 
          : q
      ));
      
      toast.success("Question mise à jour avec succès");
      
      // Terminer l'édition inline
      setInlineEditingQuestionId(null);
      setInlineEditQuestion(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la question:", error);
      toast.error("Erreur lors de la mise à jour de la question");
    } finally {
      setIsSaving(false);
    }
  };

  // Fonction pour gérer la sélection de l'option correcte dans l'édition inline
  const handleInlineSetCorrectOption = (index: number) => {
    setInlineEditQuestion((prev: any) => ({
      ...prev,
      options: prev.options.map((opt: any, i: number) => ({
        ...opt,
        isCorrect: i === index,
      })),
    }));
  };

  // Fonction pour ajouter une option dans l'édition inline
  const handleAddOption = () => {
    if (!inlineEditQuestion) return;
    
    const newOptions = [...inlineEditQuestion.options];
    newOptions.push({
      text: "",
      isCorrect: false,
      order_index: newOptions.length,
    });
    
    setInlineEditQuestion({
      ...inlineEditQuestion,
      options: newOptions,
    });
  };

  // Fonction pour supprimer une option dans l'édition inline
  const handleRemoveOption = (index: number) => {
    if (!inlineEditQuestion) return;
    
    // Vérifier qu'il reste au moins 2 options
    if (inlineEditQuestion.options.length <= 2) {
      toast.error("Une question doit avoir au moins 2 options");
      return;
    }
    
    // Si l'option à supprimer est marquée comme correcte, sélectionner la première option comme correcte
    const isRemovingCorrect = inlineEditQuestion.options[index].isCorrect;
    
    const newOptions = [...inlineEditQuestion.options];
    newOptions.splice(index, 1);
    
    // Mettre à jour les order_index
    const updatedOptions = newOptions.map((opt, i) => ({
      ...opt,
      order_index: i,
      isCorrect: isRemovingCorrect && i === 0 ? true : opt.isCorrect,
    }));
    
    setInlineEditQuestion({
      ...inlineEditQuestion,
      options: updatedOptions,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="container py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">TrueFalse</h1>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Tableau de bord</Link>
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Ajouter des questions</h2>
            <p className="text-slate-600">Quiz: {quiz?.title}</p>
          </div>
          <Button onClick={handleFinish}>Terminer</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Liste des questions existantes */}
            {questions.length > 0 && (
              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-medium">Questions existantes ({questions.length})</h3>
                
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="questions-list">
                    {(provided: DroppableProvided) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-4"
                      >
                        {questions.map((question, index) => (
                          <Draggable 
                            key={question.id} 
                            draggableId={question.id} 
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`mb-4 ${snapshot.isDragging ? 'opacity-70' : ''}`}
                              >
                                <Card className="p-4">
                                  {inlineEditingQuestionId === question.id ? (
                                    // Mode édition
                                    <div className="space-y-4">
                                      <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1 mr-4">
                                          <div {...provided.dragHandleProps} className="hidden">
                                            {/* Drag handle caché mais toujours dans le DOM */}
                                          </div>
                                          <Label htmlFor={`question-text-${question.id}`}>Question</Label>
                                          <Textarea 
                                            id={`question-text-${question.id}`}
                                            value={inlineEditQuestion?.text || ""}
                                            onChange={(e) => setInlineEditQuestion((prev: any) => ({ ...prev, text: e.target.value }))}
                                            className="w-full"
                                          />
                                        </div>
                                        <div className="flex space-x-2">
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={saveInlineEdit}
                                            disabled={isSaving}
                                          >
                                            {isSaving ? "Enregistrement..." : "Enregistrer"}
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={cancelInlineEdit}
                                          >
                                            Annuler
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <Label>Options (sélectionnez la réponse correcte)</Label>
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={handleAddOption}
                                          >
                                            <PlusCircle className="h-4 w-4 mr-1" />
                                            Ajouter une option
                                          </Button>
                                        </div>
                                        <div className="space-y-3">
                                          {inlineEditQuestion?.options.map((option: any, optIndex: number) => (
                                            <div key={optIndex} className="flex space-x-2 items-center">
                                              <div 
                                                className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer ${
                                                  option.isCorrect 
                                                    ? "bg-green-500 text-white" 
                                                    : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                                                }`}
                                                onClick={() => handleInlineSetCorrectOption(optIndex)}
                                              >
                                                {option.isCorrect && <Check className="h-4 w-4" />}
                                              </div>
                                              <Input 
                                                value={option.text}
                                                onChange={(e) => {
                                                  const newOptions = [...inlineEditQuestion.options];
                                                  newOptions[optIndex] = { ...newOptions[optIndex], text: e.target.value };
                                                  setInlineEditQuestion((prev: any) => ({ ...prev, options: newOptions }));
                                                }}
                                                className="flex-1"
                                              />
                                              <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => handleRemoveOption(optIndex)}
                                                disabled={inlineEditQuestion.options.length <= 2}
                                              >
                                                <MinusCircle className="h-4 w-4 text-red-500" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="inline-time-limit">Temps limite (secondes)</Label>
                                          <Input 
                                            id="inline-time-limit" 
                                            type="number" 
                                            placeholder="Laisser vide pour aucune limite"
                                            value={inlineEditQuestion?.timeLimit && inlineEditQuestion.timeLimit > 0 ? inlineEditQuestion.timeLimit : ""}
                                            onChange={(e) => setInlineEditQuestion((prev: any) => ({ 
                                              ...prev, 
                                              timeLimit: e.target.value ? Number(e.target.value) : 0 
                                            }))}
                                          />
                                          <p className="text-xs text-gray-500">
                                            {quiz?.time_type === 'specific_question' ? (
                                              <span className="text-amber-500 font-medium">
                                                Ce quiz utilise des temps spécifiques par question. Laissez vide pour un temps illimité.
                                              </span>
                                            ) : quiz?.time_type === 'total' ? (
                                              <span>
                                                Ce quiz utilise un temps total. Cette valeur sera ignorée.
                                              </span>
                                            ) : (
                                              <span>
                                                Ce quiz utilise un temps par question global. Cette valeur sera ignorée.
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="inline-points">Points</Label>
                                          <Input 
                                            id="inline-points" 
                                            type="number" 
                                            min={1}
                                            value={inlineEditQuestion?.points || 1}
                                            onChange={(e) => setInlineEditQuestion((prev: any) => ({ 
                                              ...prev, 
                                              points: Number(e.target.value) 
                                            }))}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    // Mode affichage
                                    <>
                                      <div className="flex justify-between items-start mb-4">
                                        <div className="flex">
                                          <div {...provided.dragHandleProps} className="mr-2 cursor-grab">
                                            <GripVertical className="h-5 w-5 text-slate-400" />
                                          </div>
                                          <div>
                                            <h4 className="font-medium">Question {index + 1}</h4>
                                            <p>{question.text}</p>
                                          </div>
                                        </div>
                                        <div className="flex space-x-2">
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => startInlineEdit(question)}
                                            disabled={isDeleting || inlineEditingQuestionId !== null}
                                          >
                                            Modifier
                                          </Button>
                                          <Button 
                                            variant="destructive" 
                                            size="sm" 
                                            onClick={() => handleDeleteQuestion(question.id)}
                                            disabled={isDeleting}
                                          >
                                            Supprimer
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {question.options.map((option: any) => (
                                          <div 
                                            key={option.id}
                                            className={`text-sm p-2 border rounded ${option.is_correct ? 'bg-green-50 border-green-500' : 'bg-gray-50'}`}
                                          >
                                            {option.text}
                                            {option.is_correct && <span className="ml-2 text-green-600">✓</span>}
                                          </div>
                                        ))}
                                      </div>
                                      <div className="mt-2 flex text-sm text-slate-500 justify-between">
                                        <div>
                                          {question.time_limit && question.time_limit > 0
                                            ? `Temps limite: ${question.time_limit} secondes` 
                                            : "Temps illimité"}
                                        </div>
                                        <div>Points: {question.points || 1}</div>
                                      </div>
                                    </>
                                  )}
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            )}

            {/* Formulaire pour ajouter une nouvelle question */}
            <Card>
              <CardHeader>
                <CardTitle>{editingQuestionId ? "Modifier la question" : "Ajouter une question"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="question-text">Question</Label>
                    <Textarea 
                      id="question-text" 
                      placeholder="Saisissez votre question ici..." 
                      value={currentQuestion.text}
                      onChange={(e) => setCurrentQuestion(prev => ({ ...prev, text: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Options (sélectionnez la réponse correcte)</Label>
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <div key={index} className="flex space-x-2">
                          <div 
                            className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer ${
                              option.isCorrect 
                                ? "bg-green-500 text-white" 
                                : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                            }`}
                            onClick={() => handleSetCorrectOption(index)}
                          >
                            {option.isCorrect && <Check className="h-4 w-4" />}
                          </div>
                          <Input 
                            placeholder={`Option ${index + 1}`}
                            value={option.text}
                            onChange={(e) => handleOptionTextChange(index, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="time-limit">Temps limite (secondes)</Label>
                      <Input 
                        id="time-limit" 
                        type="number" 
                        placeholder="Laisser vide pour aucune limite"
                        value={currentQuestion.timeLimit && currentQuestion.timeLimit > 0 ? currentQuestion.timeLimit : ""}
                        onChange={(e) => setCurrentQuestion(prev => ({ 
                          ...prev, 
                          timeLimit: e.target.value ? Number(e.target.value) : 0 
                        }))}
                      />
                      <p className="text-xs text-gray-500">
                        {quiz?.time_type === 'specific_question' ? (
                          <span className="text-amber-500 font-medium">
                            Ce quiz utilise des temps spécifiques par question. Laissez vide pour un temps illimité.
                          </span>
                        ) : quiz?.time_type === 'total' ? (
                          <span>
                            Ce quiz utilise un temps total. Cette valeur sera ignorée.
                          </span>
                        ) : (
                          <span>
                            Ce quiz utilise un temps par question global. Cette valeur sera ignorée.
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="points">Points</Label>
                      <Input 
                        id="points" 
                        type="number" 
                        min={1}
                        value={currentQuestion.points}
                        onChange={(e) => setCurrentQuestion(prev => ({ 
                          ...prev, 
                          points: Number(e.target.value) 
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={handleAddQuestion} 
                  disabled={isSaving}
                >
                  {isSaving 
                    ? (editingQuestionId ? "Mise à jour en cours..." : "Ajout en cours...") 
                    : (editingQuestionId ? "Mettre à jour la question" : "Ajouter la question")}
                </Button>
              </CardFooter>
            </Card>

            {/* Ajouter un bouton d'annulation de l'édition si nécessaire */}
            {editingQuestionId && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingQuestionId(null);
                  setCurrentQuestion({
                    text: "",
                    options: [
                      { text: "", isCorrect: true, order_index: 0 },
                      { text: "", isCorrect: false, order_index: 1 },
                      { text: "", isCorrect: false, order_index: 2 },
                      { text: "", isCorrect: false, order_index: 3 },
                    ],
                    timeLimit: 0,
                    points: 1,
                    order_index: questions.length,
                  });
                }}
                className="ml-2"
              >
                Annuler l'édition
              </Button>
            )}
          </div>

          <div>
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Conseils</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium">Questions claires</h4>
                  <p className="text-slate-600">Formulez vos questions de manière précise et sans ambiguïté.</p>
                </div>
                
                <div>
                  <h4 className="font-medium">Options de réponse</h4>
                  <p className="text-slate-600">Évitez les options trop évidentes qui donnent des indices sur la bonne réponse.</p>
                </div>
                
                <div>
                  <h4 className="font-medium">Temps limite</h4>
                  <p className="text-slate-600">Ajustez le temps en fonction de la complexité de chaque question si nécessaire.</p>
                </div>
              </div>

              <div className="mt-8">
                <Button className="w-full" onClick={handleFinish}>
                  Terminer
                </Button>
                <p className="text-xs text-center mt-2 text-slate-500">
                  {questions.length === 0 
                    ? "Ajoutez au moins une question avant de terminer" 
                    : `${questions.length} question(s) ajoutée(s)`}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
} 
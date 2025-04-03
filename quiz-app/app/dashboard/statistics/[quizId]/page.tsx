"use client";

import React, { useEffect, useState, use, useRef } from 'react';
import { quizApi } from '@/lib/api/quiz-api';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Toaster } from "@/components/ui/toaster";
import Image from 'next/image';
import Link from 'next/link';

interface QuizStatisticsProps {
  params: Promise<{
    quizId: string;
  }>;
}

interface Question {
  id: string;
  text: string;
  points: number;
}

interface DifficultyQuestion {
  id: string;
  text: string;
  failureRate: number;
}

// Composant pour le rendu PDF avec des couleurs standards (sans OKLCH)
const PDFReport = React.forwardRef<HTMLDivElement, {
  quizData: any;
  statistics: any;
  questions: any[];
  difficultQuestions: any[];
  results: any[];
}>((props, ref) => {
  const { quizData, statistics, questions, difficultQuestions, results } = props;

  // Formater le temps en minutes et secondes
  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0s";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(1);
    
    // Si moins d'une minute, n'afficher que les secondes
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div ref={ref} className="p-8 bg-white" style={{fontFamily: 'Arial, sans-serif', color: '#333'}}>
      <div style={{borderBottom: '1px solid #eaeaea', paddingBottom: '16px', marginBottom: '24px'}}>
        <h1 style={{fontSize: '24px', fontWeight: 'bold', color: '#333'}}>{quizData.title}</h1>
        <div style={{color: '#666', fontSize: '14px', marginTop: '4px'}}>
          {statistics.totalParticipants} participants • {questions.length} questions
        </div>
      </div>

      <div style={{display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap'}}>
        <div style={{background: '#fee2e2', padding: '24px', borderRadius: '8px', flex: '1', minWidth: '200px'}}>
          <div style={{color: '#dc2626', fontSize: '14px'}}>Taux de triche</div>
          <div style={{fontSize: '28px', fontWeight: 'bold', color: '#b91c1c'}}>{statistics.cheatRate}%</div>
        </div>
        
        <div style={{background: '#dbeafe', padding: '24px', borderRadius: '8px', flex: '1', minWidth: '200px'}}>
          <div style={{color: '#1d4ed8', fontSize: '14px'}}>Temps moyen par question</div>
          <div style={{fontSize: '28px', fontWeight: 'bold', color: '#1e40af'}}>
            {statistics.averageTimePerQuestion > 0 
              ? formatTime(statistics.averageTimePerQuestion) 
              : "-- --"}
          </div>
        </div>
        
        <div style={{background: '#f3e8ff', padding: '24px', borderRadius: '8px', flex: '1', minWidth: '200px'}}>
          <div style={{color: '#7e22ce', fontSize: '14px'}}>Score moyen</div>
          <div style={{fontSize: '28px', fontWeight: 'bold', color: '#6b21a8'}}>
            {statistics.earnedPoints.toFixed(1)}/{statistics.totalPoints}
          </div>
        </div>
      </div>

      <div style={{marginBottom: '32px'}}>
        <h2 style={{fontSize: '20px', fontWeight: '600', marginBottom: '16px'}}>Questions difficiles</h2>
        <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap'}}>
          {difficultQuestions.map((question, index) => (
            <div key={question.id} style={{
              background: '#fff',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #eaeaea',
              flex: '1',
              minWidth: '250px'
            }}>
              <div style={{
                height: '8px',
                background: index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#eab308'
              }}></div>
              <div style={{padding: '20px'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px'}}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    background: index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#eab308'
                  }}>
                    {index + 1}
                  </div>
                  <div style={{fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', color: '#666'}}>
                    Question difficile
                  </div>
                </div>
                
                <h3 style={{fontSize: '16px', fontWeight: '500', color: '#333', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                  {question.text}
                </h3>
                
                <div style={{marginTop: '16px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px'}}>
                    <span style={{color: '#666', fontWeight: '500'}}>Taux d'échec</span>
                    <span style={{
                      fontWeight: 'bold',
                      color: question.failureRate > 75 ? '#dc2626' : question.failureRate > 50 ? '#ea580c' : '#ca8a04'
                    }}>{question.failureRate}%</span>
                  </div>
                  <div style={{width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '10px', marginBottom: '16px', position: 'relative'}}>
                    <div style={{
                      height: '10px', 
                      borderRadius: '9999px',
                      width: `${question.failureRate}%`,
                      background: question.failureRate > 75 ? '#ef4444' : question.failureRate > 50 ? '#f97316' : '#eab308',
                      position: 'absolute',
                      top: 0,
                      left: 0
                    }}></div>
                  </div>
                </div>
                
                <div style={{marginTop: '8px', fontSize: '12px', color: '#666'}}>
                  {question.failureRate > 75 ? 'Très difficile' : 
                    question.failureRate > 50 ? 'Difficile' : 
                    'Modérément difficile'}
                </div>
              </div>
            </div>
          ))}
          
          {difficultQuestions.length === 0 && (
            <div style={{
              padding: '32px',
              background: '#fff',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #eaeaea',
              textAlign: 'center',
              width: '100%'
            }}>
              <p style={{color: '#666', fontWeight: '500', marginBottom: '8px'}}>
                Aucune donnée disponible
              </p>
              <p style={{color: '#9ca3af', fontSize: '14px'}}>
                Nous ne pouvons pas identifier les questions difficiles pour ce quiz.
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{marginTop: '48px'}}>
        <h2 style={{fontSize: '20px', fontWeight: '600', marginBottom: '24px'}}>Résultats</h2>
        
        <table style={{width: '100%', fontSize: '14px', borderCollapse: 'collapse'}}>
          <thead style={{fontSize: '12px', color: '#475569', textTransform: 'uppercase'}}>
            <tr>
              <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #eaeaea'}}>ÉTUDIANT</th>
              <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #eaeaea'}}>CODE</th>
              <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #eaeaea'}}>SCORE</th>
              <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid #eaeaea'}}>TRICHE</th>
            </tr>
          </thead>
          <tbody>
            {results.slice(0, 10).map((participant: any) => {
              // Calcul du score sous forme de fraction
              const scoreText = `${participant.earned_points}/${participant.total_points}`;
              const scorePercent = parseInt(participant.score) || 0;
              
              return (
                <tr key={participant.participant_id} style={{borderBottom: '1px solid #eaeaea'}}>
                  <td style={{padding: '12px', fontWeight: '500', color: '#334155'}}>{participant.name}</td>
                  <td style={{padding: '12px'}}>{participant.code}</td>
                  <td style={{padding: '12px'}}>{scoreText} ({scorePercent}%)</td>
                  <td style={{padding: '12px'}}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      borderRadius: '9999px',
                      background: participant.cheat_attempts > 0 ? '#fee2e2' : '#dcfce7',
                      color: participant.cheat_attempts > 0 ? '#b91c1c' : '#15803d'
                    }}>
                      {participant.cheat_attempts || 0}
                    </span>
                  </td>
                </tr>
              );
            })}
            
            {results.length === 0 && (
              <tr>
                <td colSpan={4} style={{padding: '32px', textAlign: 'center', color: '#6b7280'}}>
                  Aucun résultat disponible pour ce quiz.
                </td>
              </tr>
            )}
            
            {results.length > 10 && (
              <tr>
                <td colSpan={4} style={{padding: '12px', textAlign: 'center', color: '#6b7280', fontStyle: 'italic'}}>
                  ... et {results.length - 10} autres participants
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{marginTop: '48px', borderTop: '1px solid #eaeaea', paddingTop: '24px', fontSize: '12px', color: '#6b7280', textAlign: 'center'}}>
        Rapport généré par TrueFalse
      </div>
    </div>
  );
});

PDFReport.displayName = 'PDFReport';

export default function QuizStatistics({ params }: QuizStatisticsProps) {
  const { quizId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [difficultQuestions, setDifficultQuestions] = useState<DifficultyQuestion[]>([]);
  const [statistics, setStatistics] = useState({
    successRate: 0,
    cheatRate: 0,
    averageTimePerQuestion: 0,
    earnedPoints: 0,
    totalPoints: 0,
    totalParticipants: 0,
    scoreDistribution: [] as { name: string; count: number }[],
  });
  
  // États pour les filtres et le tri
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sortCriteria, setSortCriteria] = useState<{field: string, direction: 'asc' | 'desc'}>({field: 'completed_at', direction: 'desc'});
  
  // Référence pour l'export PDF
  const reportRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  
  // États pour les menus déroulants
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  
  // Formater le temps en minutes et secondes
  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0s";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(1);
    
    // Si moins d'une minute, n'afficher que les secondes
    if (minutes === 0) {
      return `${remainingSeconds}s`;
    }
    
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Fonction simple de notification si le composant toast n'est pas disponible
  const showNotification = (options: { 
    title: string, 
    description?: string, 
    variant?: 'default' | 'success' | 'destructive',
    duration?: number 
  }) => {
    console.log(`${options.title}: ${options.description || ''}`);
    // Afficher une alerte uniquement pour les notifications importantes
    if (options.variant === 'success' || options.variant === 'destructive') {
      alert(`${options.title}\n${options.description || ''}`);
    }
  };

  // Récupérer les sessions uniques pour le filtre
  const uniqueSessions = React.useMemo(() => {
    const sessions = new Set<string>();
    results.forEach(result => {
      if (result.code) {
        sessions.add(result.code);
      }
    });
    return Array.from(sessions);
  }, [results]);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        setLoading(true);
        
        // Récupérer les données du quiz
        const quiz = await quizApi.getQuiz(quizId);
        setQuizData(quiz);
        
        // Récupérer les questions du quiz
        const quizWithQuestions = await quizApi.getQuizWithQuestions(quizId);
        setQuestions(quizWithQuestions.questions);
        
        // Récupérer les résultats pour ce quiz
        const quizResults = await quizApi.getAllQuizResults(quizId);
        
        // Inspecter les données pour débogage
        console.log("Résultats bruts: ", JSON.stringify(quizResults[0]?.answers?.slice(0, 2)));
        
        // Vérifier si les temps sont présents
        let hasTimeValues = false;
        if (quizResults && quizResults.length > 0 && quizResults[0].answers) {
          hasTimeValues = quizResults[0].answers.some((a: any) => a.time_spent && a.time_spent > 0);
          console.log("La base de données contient des temps de réponse: ", hasTimeValues);
        }
        
        setResults(quizResults);
        setFilteredResults(quizResults);
        
        // Calculer les statistiques
        if (quizResults && quizResults.length > 0) {
          calculateStatistics(quizResults, quizWithQuestions.questions);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId, user, router]);
  
  // Effet pour filtrer les résultats selon les critères
  useEffect(() => {
    let filtered = [...results];
    
    // Filtre par recherche
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filtre par session
    if (selectedSession) {
      filtered = filtered.filter(item => item.code === selectedSession);
    }
    
    // Tri des résultats
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortCriteria.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'score':
          comparison = parseInt(a.score) - parseInt(b.score);
          break;
        case 'completed_at':
          // Gestion des dates nulles
          if (!a.completed_at) return 1;
          if (!b.completed_at) return -1;
          comparison = new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
          break;
        case 'cheat_attempts':
          comparison = (a.cheat_attempts || 0) - (b.cheat_attempts || 0);
          break;
        default:
          comparison = 0;
      }
      
      return sortCriteria.direction === 'asc' ? comparison : -comparison;
    });
    
    setFilteredResults(filtered);
  }, [results, searchQuery, selectedSession, sortCriteria]);
  
  // Fonction pour gérer le changement de critère de tri
  const handleSortChange = (field: string) => {
    setSortCriteria(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setIsSortOpen(false);
  };
  
  // Fonction pour gérer le filtrage par session
  const handleSessionFilter = (session: string | null) => {
    setSelectedSession(session);
    setIsFilterOpen(false);
  };

  const calculateStatistics = (quizResults: any[], quizQuestions: any[]) => {
    // Nombre total de participants
    const totalParticipants = quizResults.length;
    
    // Calcul du taux de réussite (score > 50%)
    const passedCount = quizResults.filter((result) => parseInt(result.score) >= 50).length;
    const successRate = Math.round((passedCount / totalParticipants) * 100);
    
    // Calcul du taux de triche (participants ayant au moins une tentative de triche)
    const cheatersCount = quizResults.filter((result) => result.cheat_attempts > 0).length;
    const cheatRate = Math.round((cheatersCount / totalParticipants) * 100);
    
    // Calcul du total des points possibles
    const totalPoints = quizQuestions.reduce((sum, q) => sum + (q.points || 1), 0);
    
    // Calcul des points moyens gagnés
    let totalEarnedPoints = 0;
    quizResults.forEach(result => {
      totalEarnedPoints += parseInt(result.earned_points || "0");
    });
    const avgEarnedPoints = totalParticipants > 0 ? totalEarnedPoints / totalParticipants : 0;
    
    // Récupérer les IDs des questions du quiz actuel
    const quizQuestionIds = quizQuestions.map(q => q.id);
    
    // Calcul du temps moyen par question en utilisant time_spent de la table answers
    let totalTimeSpent = 0;
    let totalAnswersCount = 0;
    
    // Afficher les informations de débogage
    console.log(`Nombre de résultats de quiz: ${quizResults.length}`);
    
    quizResults.forEach(result => {
      if (result.answers && result.answers.length > 0) {
        console.log(`Participant ${result.name} a ${result.answers.length} réponses`);
        
        result.answers.forEach((answer: any) => {
          if (quizQuestionIds.includes(answer.question_id)) {
            console.log(`Réponse à la question ${answer.question_id}, temps: ${answer.time_spent || 0}s`);
            
            // Considérer toutes les réponses, même celles avec un temps à 0
            totalTimeSpent += Number(answer.time_spent || 0);
            totalAnswersCount++;
          }
        });
      }
    });
    
    console.log(`Total temps passé: ${totalTimeSpent}s, Nombre de réponses: ${totalAnswersCount}`);
    
    // Si toutes les réponses ont un temps à 0, utiliser une valeur par défaut basée sur le type de temps du quiz
    let averageTimePerQuestion = 0;
    if (totalAnswersCount > 0) {
      // Calculer la moyenne et diviser par 10 pour convertir en secondes (cohérent avec le dashboard)
      averageTimePerQuestion = Math.round(totalTimeSpent / totalAnswersCount) / 10;
      console.log(`Temps moyen par question calculé: ${averageTimePerQuestion}s`);
    } else {
      // Si aucune réponse, utiliser une valeur par défaut
      const defaultTimePerQuestion = (quizData?.time_per_question || 30) / 10;
      averageTimePerQuestion = defaultTimePerQuestion;
      console.log(`Aucune réponse, utilisation du temps par défaut: ${defaultTimePerQuestion}s`);
    }
    
    // Distribution des scores (par points et non pourcentages)
    // Calculer l'intervalle pour 10 niveaux entre 0 et le score maximal possible
    const interval = Math.ceil(totalPoints / 10);
    const ranges = Array.from({ length: 10 }, (_, i) => ({
      min: i * interval,
      max: (i + 1) * interval - 1,
      label: `${i * interval}-${Math.min((i + 1) * interval - 1, totalPoints)}`
    }));
    
    const scoreDistribution = ranges.map(range => {
      const count = quizResults.filter(result => {
        const earnedPoints = parseInt(result.earned_points || "0");
        return earnedPoints >= range.min && earnedPoints <= range.max;
      }).length;
      
      return {
        name: range.label,
        count: count
      };
    });
    
    // Identifier les questions difficiles
    // Pour chaque question, calculer le taux d'échec
    const questionStats = quizQuestions.map(question => {
      // Pour chaque question, compter combien de participants ont échoué
      let incorrectCount = 0;
      let totalAnswers = 0;
      
      quizResults.forEach(result => {
        // Chercher la réponse à cette question parmi les réponses du participant
        const answer = result.answers?.find((a: any) => a.question_id === question.id);
        if (answer) {
          totalAnswers++;
          if (!answer.is_correct) {
            incorrectCount++;
          }
        }
      });
      
      const failureRate = totalAnswers > 0 ? Math.round((incorrectCount / totalAnswers) * 100) : 0;
      
      return {
        id: question.id,
        text: question.text,
        failureRate: failureRate
      };
    });
    
    // Trier les questions par taux d'échec décroissant et prendre les 3 plus difficiles
    const sortedQuestions = [...questionStats].sort((a, b) => b.failureRate - a.failureRate);
    setDifficultQuestions(sortedQuestions.slice(0, 3));
    
    setStatistics({
      successRate,
      cheatRate,
      averageTimePerQuestion,
      earnedPoints: avgEarnedPoints,
      totalPoints,
      totalParticipants,
      scoreDistribution,
    });
  };
  
  // Fonction pour exporter le rapport en PDF
  const exportToPDF = async () => {
    try {
      showNotification({
        title: "Génération du PDF en cours",
        description: "Merci de patienter...",
        duration: 5000,
      });
      
      // Afficher le composant PDF
      setShowPdfPreview(true);
      
      // Attendre que le DOM soit mis à jour
      setTimeout(async () => {
        if (!pdfContainerRef.current) {
          setShowPdfPreview(false);
          throw new Error("Élément PDF non trouvé");
        }
        
        try {
          const canvas = await html2canvas(pdfContainerRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });
          
          // Dimensions de la page
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          // Calcul des proportions
          const canvasRatio = canvas.height / canvas.width;
          const imgWidth = pdfWidth - 20; // Marges de 10mm de chaque côté
          const imgHeight = imgWidth * canvasRatio;
          
          // Si l'image est trop haute pour une page, utiliser une échelle réduite
          if (imgHeight > pdfHeight - 20) {
            const scaleFactor = (pdfHeight - 20) / imgHeight;
            const scaledWidth = imgWidth * scaleFactor;
            const xOffset = (pdfWidth - scaledWidth) / 2;
            
            pdf.addImage(imgData, 'PNG', xOffset, 10, scaledWidth, pdfHeight - 20);
          } else {
            // Si tout tient sur une page
            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
          }
          
          // Télécharger le PDF
          pdf.save(`Statistiques_${quizData.title.replace(/\s+/g, '_')}.pdf`);
          
          showNotification({
            title: "PDF exporté avec succès",
            description: "Le téléchargement devrait commencer automatiquement.",
            variant: "success",
            duration: 3000,
          });
        } catch (error) {
          console.error('Erreur lors de la génération du PDF:', error);
          showNotification({
            title: "Erreur lors de l'export",
            description: `Une erreur s'est produite pendant la génération du PDF: ${error}`,
            variant: "destructive",
            duration: 5000,
          });
        } finally {
          // Cacher le composant PDF une fois terminé
          setShowPdfPreview(false);
        }
      }, 500);
      
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      setShowPdfPreview(false);
      showNotification({
        title: "Erreur lors de l'export",
        description: `Une erreur s'est produite pendant la génération du PDF: ${error}`,
        variant: "destructive",
        duration: 5000,
      });
    }
  };
  
  // Fonction pour partager via différentes méthodes
  const shareReport = async (method: 'copy' | 'email' | 'whatsapp') => {
    try {
      const url = window.location.href;
      const title = `Statistiques du quiz: ${quizData.title}`;
      const summary = `Quiz "${quizData.title}" - ${statistics.totalParticipants} participants - Score moyen: ${statistics.earnedPoints.toFixed(1)}/${statistics.totalPoints}`;
      
      switch (method) {
        case 'copy':
          await navigator.clipboard.writeText(url);
          showNotification({
            title: "Lien copié",
            description: "L'URL a été copiée dans votre presse-papier.",
            duration: 3000,
          });
          break;
          
        case 'email':
          window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(summary + '\n\nConsulter les statistiques complètes: ' + url)}`);
          showNotification({
            title: "Partage par email",
            description: "Votre application de messagerie devrait s'ouvrir.",
            duration: 3000,
          });
          break;
          
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodeURIComponent(title + '\n\n' + summary + '\n\n' + url)}`);
          showNotification({
            title: "Partage WhatsApp",
            description: "WhatsApp s'ouvrira pour partager le rapport.",
            duration: 3000,
          });
          break;
      }
      
      setIsShareMenuOpen(false);
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      showNotification({
        title: "Erreur de partage",
        description: "Une erreur s'est produite lors du partage du rapport.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
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
    );
  }

  if (!quizData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Quiz non trouvé</h2>
              <p className="mb-6">Le quiz demandé n'existe pas ou vous n'avez pas les permissions nécessaires.</p>
              <Button onClick={() => router.push('/dashboard')}>
                Retour au tableau de bord
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-8 w-full" ref={reportRef}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-gray-600">Rapport d'analyse - TrueFalse</h1>
          </div>

          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
              onClick={exportToPDF}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              Exporter PDF
            </Button>
            
            <div className="relative">
              <Button 
                variant="outline" 
                className="bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100"
                onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 mr-2" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
                  />
                </svg>
                Partager
              </Button>
              
              {isShareMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border"
                >
                  <div className="py-1">
                    <button
                      onClick={() => shareReport('copy')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4 mr-2 text-gray-500" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
                        />
                      </svg>
                      Copier le lien
                    </button>
                    <button
                      onClick={() => shareReport('email')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4 mr-2 text-gray-500" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                        />
                      </svg>
                      Partager par email
                    </button>
                    <button
                      onClick={() => shareReport('whatsapp')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4 mr-2 text-gray-500" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                        />
                      </svg>
                      Partager via WhatsApp
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
            
            <Button
              variant="outline"
              className="bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100"
              onClick={() => router.push('/dashboard')}
            >
              Retour au tableau de bord
            </Button>
          </div>
        </div>

        <div className="border-b pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{quizData.title}</h2>
          <div className="text-gray-500 text-sm mt-1">
            {statistics.totalParticipants} participants • {questions.length} questions • Terminé il y a 2h
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-red-50 p-6 rounded-lg">
            <div className="text-red-600 text-sm">Taux de triche</div>
            <div className="text-4xl font-bold text-red-700">{statistics.cheatRate}%</div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="text-blue-600 text-sm">Temps moyen par question</div>
            <div className="text-4xl font-bold text-blue-700">
              {statistics.averageTimePerQuestion > 0 
                ? formatTime(statistics.averageTimePerQuestion) 
                : "-- --"}
            </div>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg">
            <div className="text-purple-600 text-sm">Score moyen</div>
            <div className="text-4xl font-bold text-purple-700">
              {statistics.earnedPoints.toFixed(1)}/{statistics.totalPoints}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Distribution des scores</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statistics.scoreDistribution}
                  margin={{ top: 30, right: 30, left: 10, bottom: 40 }}
                >
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#6b7280', fontSize: 12 }} 
                    tickLine={{ stroke: '#d1d5db' }}
                    axisLine={{ stroke: '#d1d5db' }}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis 
                    hide={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={{ stroke: '#d1d5db' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(237, 242, 247, 0.5)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 rounded-md shadow-md border border-gray-200">
                            <p className="text-sm font-medium text-gray-700">
                              Points: {payload[0].payload.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium text-blue-600">{payload[0].value}</span> participants
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="url(#colorGradient)" 
                    radius={[6, 6, 0, 0]}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    label={{ 
                      position: 'top', 
                      fill: '#4b5563', 
                      fontSize: 12,
                      fontWeight: 500,
                      formatter: (value: number) => value > 0 ? value : ''
                    }}
                  >
                    {statistics.scoreDistribution.map((entry, index) => (
                      <Cell 
                        key={index} 
                        fill={entry.count > Math.max(...statistics.scoreDistribution.map(d => d.count)) * 0.7 ? '#4f46e5' : 'url(#colorGradient)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              Répartition des participants selon les points obtenus sur {statistics.totalPoints} points possibles
            </p>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Questions difficiles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {difficultQuestions.map((question, index) => (
              <motion.div 
                key={question.id}
                className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <div className={`${
                  index === 0 ? 'bg-red-500' : 
                  index === 1 ? 'bg-orange-500' : 
                  'bg-yellow-500'
                } h-2`}></div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${
                      index === 0 ? 'bg-red-500' : 
                      index === 1 ? 'bg-orange-500' : 
                      'bg-yellow-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-gray-500">
                      Question difficile
                    </div>
                  </div>
                  
                  <h3 className="text-base font-medium text-gray-800 mb-4 line-clamp-2">
                    {question.text}
                  </h3>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500 font-medium">Taux d'échec</span>
                      <span className={`font-bold ${
                        question.failureRate > 75 ? 'text-red-600' : 
                        question.failureRate > 50 ? 'text-orange-600' : 
                        'text-yellow-600'
                      }`}>{question.failureRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                      <motion.div 
                        className={`h-2.5 rounded-full ${
                          question.failureRate > 75 ? 'bg-red-500' : 
                          question.failureRate > 50 ? 'bg-orange-500' : 
                          'bg-yellow-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${question.failureRate}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 + 0.3 }}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    {question.failureRate > 75 ? 'Très difficile' : 
                     question.failureRate > 50 ? 'Difficile' : 
                     'Modérément difficile'}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {difficultQuestions.length === 0 && (
              <div className="col-span-3 bg-white rounded-lg p-8 text-center shadow-sm border border-gray-100">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
                <p className="text-gray-500 font-medium mb-2">
                  Aucune donnée disponible
                </p>
                <p className="text-gray-400 text-sm">
                  Nous ne pouvons pas identifier les questions difficiles pour ce quiz.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Résultats</h2>
          
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-72">
              <input
                type="text"
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                placeholder="Rechercher un participant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex space-x-3">
              <div className="relative">
                <button 
                  className={`flex items-center px-4 py-2 bg-white border rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${selectedSession ? 'text-blue-600 border-blue-300' : ''}`}
                  title="Filtrer par session"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 mr-2 transition-colors duration-300 ${selectedSession ? 'text-blue-500' : 'text-gray-500'}`}
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                  {selectedSession ? `Session: ${selectedSession}` : "Filtrer"}
                </button>
                
                {isFilterOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border"
                  >
                    <div className="py-1">
                      <button
                        onClick={() => handleSessionFilter(null)}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${!selectedSession ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        Toutes les sessions
                      </button>
                      
                      {uniqueSessions.map(session => (
                        <button
                          key={session}
                          onClick={() => handleSessionFilter(session)}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${selectedSession === session ? 'bg-blue-50 text-blue-600' : ''}`}
                        >
                          {session}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
              
              <div className="relative">
                <button 
                  className="flex items-center px-4 py-2 bg-white border rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300" 
                  title="Trier les résultats"
                  onClick={() => setIsSortOpen(!isSortOpen)}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5 mr-2 text-gray-500" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" 
                    />
                  </svg>
                  {sortCriteria.field === 'name' ? 'Tri: Nom' : 
                   sortCriteria.field === 'score' ? 'Tri: Score' : 
                   sortCriteria.field === 'cheat_attempts' ? 'Tri: Triche' : 'Tri: Date'}
                  <span className="ml-1">
                    {sortCriteria.direction === 'asc' ? '↑' : '↓'}
                  </span>
                </button>
                
                {isSortOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border"
                  >
                    <div className="py-1">
                      <button
                        onClick={() => handleSortChange('name')}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${sortCriteria.field === 'name' ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        Nom {sortCriteria.field === 'name' && (sortCriteria.direction === 'asc' ? '↑' : '↓')}
                      </button>
                      <button
                        onClick={() => handleSortChange('completed_at')}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${sortCriteria.field === 'completed_at' ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        Date {sortCriteria.field === 'completed_at' && (sortCriteria.direction === 'asc' ? '↑' : '↓')}
                      </button>
                      <button
                        onClick={() => handleSortChange('score')}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${sortCriteria.field === 'score' ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        Score {sortCriteria.field === 'score' && (sortCriteria.direction === 'asc' ? '↑' : '↓')}
                      </button>
                      <button
                        onClick={() => handleSortChange('cheat_attempts')}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${sortCriteria.field === 'cheat_attempts' ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        Tentatives de triche {sortCriteria.field === 'cheat_attempts' && (sortCriteria.direction === 'asc' ? '↑' : '↓')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase">
                <tr>
                  <th scope="col" className="px-6 py-3">ÉTUDIANT</th>
                  <th scope="col" className="px-6 py-3">CODE</th>
                  <th scope="col" className="px-6 py-3">DATE</th>
                  <th scope="col" className="px-6 py-3">SCORE</th>
                  <th scope="col" className="px-6 py-3">PROGRESSION</th>
                  <th scope="col" className="px-6 py-3">TENTATIVES DE TRICHE</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((participant: any) => {
                  // Calcul du score sous forme de fraction
                  const scoreText = `${participant.earned_points}/${participant.total_points}`;
                  const scorePercent = parseInt(participant.score) || 0;
                  
                  // Formater la date
                  const completedDate = participant.completed_at 
                    ? new Date(participant.completed_at)
                    : null;
                  const formattedDate = completedDate 
                    ? `${completedDate.toLocaleDateString('fr-FR')} ${completedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                    : '-';
                  
                  return (
                    <motion.tr 
                      key={participant.participant_id} 
                      className="border-b hover:bg-slate-50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{ backgroundColor: 'rgba(241, 245, 249, 0.9)' }}
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">{participant.name}</td>
                      <td className="px-6 py-4">{participant.code}</td>
                      <td className="px-6 py-4">{formattedDate}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="mr-3">{scoreText}</span>
                          <div className="w-24 bg-gray-200 rounded-full h-2.5">
                            <motion.div 
                              className={`h-2.5 rounded-full ${
                                scorePercent >= 70 ? 'bg-green-500' : 
                                scorePercent >= 50 ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, scorePercent)}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                            ></motion.div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {(() => {
                            // Calculer la progression en tenant compte des tentatives de triche
                            const totalQuestions = questions.length;
                            const answeredQuestions = participant.answers ? participant.answers.length : 0;
                            const cheatAttempts = participant.cheat_attempts || 0;
                            
                            // Calculer le pourcentage: 
                            // - Réponses soumises / total questions
                            // - Si completed_at est défini, on considère que toutes les questions ont été vues
                            const progressPercent = participant.completed_at 
                              ? 100 
                              : Math.min(100, Math.round((answeredQuestions / totalQuestions) * 100));
                            
                            return (
                              <>
                                <span className="mr-3">{progressPercent}%</span>
                                <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                  <motion.div 
                                    className={`h-2.5 rounded-full ${cheatAttempts > 0 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                  ></motion.div>
                                </div>
                                {cheatAttempts > 0 && (
                                  <span className="ml-2 text-xs text-orange-500">*</span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <motion.span 
                          className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
                            participant.cheat_attempts > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}
                          whileHover={{ scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          {participant.cheat_attempts || 0}
                        </motion.span>
                      </td>
                    </motion.tr>
                  );
                })}
                
                {filteredResults.length === 0 && (
                  <tr className="bg-white">
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {results.length > 0 ? 'Aucun résultat ne correspond à votre recherche.' : 'Aucun résultat disponible pour ce quiz.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Composant PDF caché */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none" style={{ visibility: showPdfPreview ? 'visible' : 'hidden' }}>
        <PDFReport 
          ref={pdfContainerRef}
          quizData={quizData}
          statistics={statistics}
          questions={questions}
          difficultQuestions={difficultQuestions}
          results={filteredResults}
        />
      </div>
    </>
  );
} 
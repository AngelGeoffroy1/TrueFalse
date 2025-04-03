import { supabase } from '../supabase/client';
import { Database } from '../supabase/database.types';
import { notFound } from 'next/navigation';

type Quiz = Database['public']['Tables']['quizzes']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];
type Option = Database['public']['Tables']['options']['Row'];
type Session = Database['public']['Tables']['sessions']['Row'];
type Participant = Database['public']['Tables']['participants']['Row'];
type Answer = Database['public']['Tables']['answers']['Row'];

// Quiz API
export const quizApi = {
  // Récupérer tous les quiz d'un enseignant
  async getTeacherQuizzes(teacherId: string) {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des quiz de l\'enseignant:', error);
      throw error;
    }
  },

  // Récupérer un quiz spécifique avec ses questions et options
  async getQuizWithQuestions(quizId: string) {
    try {
      console.log(`Début de récupération du quiz ID ${quizId}`);
      
      // Déboguer le statut d'authentification
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      console.log('Session auth:', session ? `Utilisateur authentifié: ${session.user.id}` : 'Non authentifié');
      if (authError) {
        console.error('Erreur auth:', authError);
      }
      
      // Get quiz data sans utiliser single() pour éviter l'erreur PGRST116
      const { data: quizDataArray, error: quizError, status, statusText } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId);

      console.log('Statut de la requête:', status, statusText);
      
      if (quizError) {
        console.error('Erreur SQL lors de la récupération du quiz:', quizError);
        throw quizError;
      }
      
      // Vérifier si le quiz existe
      if (!quizDataArray || quizDataArray.length === 0) {
        console.error(`Quiz avec ID ${quizId} non trouvé. RLS peut être activé et bloquer l'accès.`);
        
        // Tenter une requête sans RLS pour vérifier si le quiz existe réellement
        // Remarque: cette requête échouera si la fonction rpc n'existe pas ou si l'utilisateur n'a pas les permissions
        try {
          const { data: adminCheck, error: adminError } = await supabase
            .rpc('admin_check_quiz_exists', { quiz_id: quizId });
          
          if (adminError) {
            console.error('Erreur lors de la vérification admin:', adminError);
          } else {
            console.log('Vérification admin du quiz:', adminCheck);
          }
        } catch (rpceError) {
          console.error('Exception lors de la vérification admin:', rpceError);
        }
        
        return null; // Retourner null au lieu de notFound() pour permettre une gestion personnalisée
      }
      
      const quizData = quizDataArray[0];
      console.log(`Quiz ${quizId} trouvé:`, quizData.title);

      // Get questions for this quiz
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });

      if (questionsError) {
        console.error('Erreur SQL lors de la récupération des questions:', questionsError);
        throw questionsError;
      }
      
      console.log(`Nombre de questions trouvées: ${questionsData?.length || 0}`);

      // Get options for all questions
      const questionIds = questionsData?.map(q => q.id) || [];
      
      let optionsData: any[] = [];
      if (questionIds.length > 0) {
        console.log(`Récupération des options pour ${questionIds.length} questions`);
        const { data: options, error: optionsError } = await supabase
          .from('options')
          .select('*')
          .in('question_id', questionIds)
          .order('order_index', { ascending: true });
        
        if (optionsError) {
          console.error('Erreur SQL lors de la récupération des options:', optionsError);
          throw optionsError;
        }
        
        optionsData = options || [];
        console.log(`Nombre d'options trouvées: ${optionsData.length}`);
      }

      // Organize options by question
      const questions = questionsData?.map(question => {
        const questionOptions = optionsData.filter(
          option => option.question_id === question.id
        );
        console.log(`Question ${question.id} a ${questionOptions.length} options`);
        return { ...question, options: questionOptions };
      }) || [];

      console.log(`Retourne le quiz avec ${questions.length} questions`);
      return { ...quizData, questions };
    } catch (error) {
      console.error('Erreur lors de la récupération du quiz avec questions:', error);
      throw error;
    }
  },

  // Créer un nouveau quiz
  async createQuiz(quizData: any) {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .insert({
          title: quizData.title,
          description: quizData.description,
          teacher_id: quizData.teacher_id,
          time_per_question: quizData.time_per_question, 
          time_total: quizData.time_total || 0,
          time_type: quizData.time_type || 'per_question',
          passing_score: quizData.passing_score,
          shuffle_questions: quizData.shuffle_questions,
          show_answers: quizData.show_answers,
          anti_cheat: quizData.anti_cheat,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la création du quiz:', error);
      throw error;
    }
  },

  // Mettre à jour un quiz existant
  async updateQuiz(quizId: string, quizData: any) {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .update({
          ...quizData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quizId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du quiz:', error);
      throw error;
    }
  },

  // Supprimer un quiz
  async deleteQuiz(quizId: string) {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du quiz:', error);
      throw error;
    }
  },

  // Ajouter une question à un quiz
  async addQuestion(questionData: any) {
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert([questionData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la question:', error);
      throw error;
    }
  },

  // Ajouter des options à une question
  async addOptions(optionsData: any[]) {
    try {
      const { data, error } = await supabase
        .from('options')
        .insert(optionsData)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout des options:', error);
      throw error;
    }
  },

  // Créer une session de quiz
  async createSession(sessionData: {
    quiz_id: string;
    teacher_id: string;
    code: string;
    is_active: boolean;
    current_question_index: number;
  }) {
    try {
      console.log("Tentative de création de session avec les colonnes correctes:", sessionData);
      
      const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error("Erreur Supabase détaillée lors de la création de la session:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Erreur lors de la création de la session:", error);
      throw error;
    }
  },

  // Récupérer les sessions actives d'un enseignant
  async getActiveSessions(teacherId: string) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, quiz_id, created_at, code, current_question_index, is_active')
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erreur lors de la récupération des sessions actives:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception lors de la récupération des sessions actives:', error);
      return [];
    }
  },

  // Récupérer une session spécifique par son code
  async getSessionByCode(code: string) {
    try {
      console.log(`Recherche de session avec le code: ${code}`);
      
      // Pour déboguer, ajoutons d'abord une requête pour vérifier si la session existe sans le filtre is_active
      const { data: allData, error: allError } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code);
        
      console.log(`Sessions trouvées avec le code ${code} (sans filtre is_active):`, allData);
      
      if (allError) {
        console.error('Erreur lors de la vérification initiale de session:', allError);
      }
      
      // Maintenant effectuons la requête normale
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code.toUpperCase()) // S'assurer que le code est en majuscules
        .eq('is_active', true);

      if (error) {
        console.error('Erreur SQL lors de la recherche de session par code:', error);
        throw error;
      }
      
      // Vérifier si nous avons des résultats
      if (!data || data.length === 0) {
        console.warn(`Aucune session active trouvée avec le code: ${code}`);
        
        // Si nous trouvons une session inactive, retournons-la avec une indication
        if (allData && allData.length > 0) {
          console.log(`Session trouvée mais inactive:`, allData[0]);
          return { ...allData[0], is_inactive_warning: true };
        }
        
        // Sinon retourner null
        return null;
      }
      
      console.log(`Session active trouvée avec le code ${code}:`, data[0]);
      return data[0];
    } catch (error) {
      console.error('Erreur lors de la récupération de la session par code:', error);
      throw error;
    }
  },

  // Mettre à jour une session
  async updateSession(sessionId: string, sessionData: any) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update({
          ...sessionData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la session:', error);
      throw error;
    }
  },

  // Terminer une session
  async endSession(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la fin de la session:', error);
      throw error;
    }
  },

  // Ajouter un participant à une session
  async addParticipant(participantData: any) {
    try {
      // Préparer les données à insérer, en omettant student_id s'il est null
      const dataToInsert: any = {
        session_id: participantData.session_id,
        name: participantData.name,
        score: participantData.score || 0,
        cheat_attempts: participantData.cheat_attempts || 0,
        connected: participantData.connected !== undefined ? participantData.connected : true,
        current_question: participantData.current_question || 0,
        joined_at: new Date().toISOString()
      };
      
      // Ajouter student_id seulement s'il existe et n'est pas null
      if (participantData.student_id) {
        dataToInsert.student_id = participantData.student_id;
      }

      console.log('Tentative d\'ajout d\'un participant avec les colonnes correctes:', dataToInsert);
      
      // Insérer le participant et récupérer directement le résultat
      const { data: insertedParticipant, error: insertError } = await supabase
        .from('participants')
        .insert([dataToInsert])
        .select('*')
        .single();

      if (insertError) {
        console.error('Erreur Supabase détaillée lors de l\'ajout du participant:', insertError);
        throw insertError;
      }
      
      if (!insertedParticipant) {
        throw new Error('Le participant a été ajouté mais aucune donnée n\'a été retournée');
      }
      
      console.log('Participant ajouté avec succès:', insertedParticipant);
      return insertedParticipant;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du participant:', error);
      throw error;
    }
  },

  // Récupérer les participants d'une session
  async getSessionParticipants(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des participants de la session:', error);
      throw error;
    }
  },

  // Ajouter une réponse
  async addAnswer(answer: Omit<Answer, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('answers')
      .insert([answer])
      .select()
      .single();
    
    if (error) throw error;
    return data as Answer;
  },

  // Récupérer les résultats d'une session
  async getSessionResults(sessionId: string) {
    const { data, error } = await supabase
      .from('session_results')
      .select('*')
      .eq('session_id', sessionId);
    
    if (error) throw error;
    return data;
  },

  // Enregistrer une tentative de triche
  async recordCheatAttempt(participantId: string, type: string, details?: string) {
    try {
      // Vérifier si le participant a déjà terminé le quiz
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('completed_at')
        .eq('id', participantId)
        .single();
      
      if (participantError) {
        console.error("Erreur lors de la vérification du statut du participant:", participantError);
        throw participantError;
      }
      
      // Si le participant a déjà terminé, ne pas enregistrer la tentative de triche
      if (participant?.completed_at) {
        console.log("Tentative de triche ignorée car le participant a déjà terminé le quiz");
        return null;
      }
      
      // Enregistrer la tentative de triche dans la table cheat_attempts
      const { data, error } = await supabase
        .from('cheat_attempts')
        .insert([{
          participant_id: participantId,
          type,
          details
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la tentative de triche:", error);
      throw error;
    }
  },

  async getQuiz(quizId: string) {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (error) throw error;
      if (!data) return notFound();
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération du quiz:', error);
      throw error;
    }
  },

  async updateQuestion(questionId: string, questionData: any) {
    try {
      const { data, error } = await supabase
        .from('questions')
        .update(questionData)
        .eq('id', questionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la question:', error);
      throw error;
    }
  },

  async deleteQuestion(questionId: string) {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de la question:', error);
      throw error;
    }
  },

  async updateOption(optionId: string, optionData: any) {
    try {
      const { data, error } = await supabase
        .from('options')
        .update(optionData)
        .eq('id', optionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'option:', error);
      throw error;
    }
  },

  async deleteOption(optionId: string) {
    try {
      const { error } = await supabase
        .from('options')
        .delete()
        .eq('id', optionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'option:', error);
      throw error;
    }
  },

  async getSession(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      if (!data) return notFound();
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération de la session:', error);
      throw error;
    }
  },

  async updateParticipant(participantId: string, participantData: any) {
    try {
      const { data, error } = await supabase
        .from('participants')
        .update(participantData)
        .eq('id', participantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du participant:', error);
      throw error;
    }
  },

  // Récupérer les informations d'un participant
  async getParticipant(participantId: string) {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('id', participantId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération du participant:', error);
      throw error;
    }
  },

  async addParticipantAnswer(answerData: any) {
    try {
      // Adapter les données en fonction de la structure de la table answers
      const dataToInsert = {
        participant_id: answerData.participant_id,
        question_id: answerData.question_id,
        selected_option_id: answerData.selected_option_id,
        is_correct: answerData.is_correct,
        time_spent: answerData.time_spent || 0
        // created_at sera automatiquement géré par la base de données
      };

      console.log('Tentative d\'ajout d\'une réponse participant avec données:', dataToInsert);
      
      // Insérer la réponse
      const { data: insertedAnswer, error: insertError } = await supabase
        .from('answers')
        .insert([dataToInsert])
        .select()
        .single();

      if (insertError) {
        console.error('Erreur Supabase lors de l\'ajout de la réponse:', insertError);
        throw insertError;
      }
      
      console.log('Réponse ajoutée avec succès:', insertedAnswer);
      return insertedAnswer;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la réponse du participant:', error);
      throw error;
    }
  },

  async getParticipantAnswers(participantId: string) {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .eq('participant_id', participantId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des réponses du participant:', error);
      throw error;
    }
  },

  // Récupérer tous les résultats pour un quiz spécifique
  async getAllQuizResults(quizId: string) {
    try {
      console.log(`Récupération des résultats pour le quiz: ${quizId}`);
      
      // D'abord, récupérer toutes les questions du quiz avec leurs points pour calculer le total correct
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, points')
        .eq('quiz_id', quizId);
        
      if (questionsError) {
        console.error('Erreur lors de la récupération des questions:', questionsError);
        return [];
      }
      
      // Calculer le total des points possibles pour ce quiz
      const totalPointsPossible = questions.reduce((sum, q) => sum + (q.points || 1), 0);
      console.log(`Total des points possibles pour ce quiz: ${totalPointsPossible}`);
      
      // Utiliser directement une requête plus simple pour éviter les problèmes de division par zéro
      const { data, error } = await supabase
        .from('participants')
        .select(`
          id, 
          name, 
          session_id, 
          cheat_attempts, 
          completed_at,
          sessions (
            id, 
            code,
            quizzes (
              id, 
              title
            )
          )
        `)
        .eq('sessions.quizzes.id', quizId)
        .order('completed_at', { ascending: false });
      
      if (error) {
        console.error('Erreur lors de la récupération des participants:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('Aucun participant trouvé pour ce quiz');
        return [];
      }

      // Pour chaque participant, récupérer ses réponses et calculer le score
      const results = await Promise.all(data.map(async (participant: any) => {
        try {
          // Récupérer les réponses du participant avec les points associés à chaque question
          const { data: answers, error: answersError } = await supabase
            .from('answers')
            .select(`
              id,
              is_correct,
              selected_option_id,
              question_id,
              time_spent,
              questions(id, points)
            `)
            .eq('participant_id', participant.id);

          if (answersError) {
            console.error(`Erreur lors de la récupération des réponses pour le participant ${participant.id}:`, answersError);
            return {
              participant_id: participant.id,
              name: participant.name,
              session_id: participant.session_id,
              code: participant.sessions?.code || '',
              quiz_id: quizId,
              quiz_title: participant.sessions?.quizzes?.title || '',
              total_answers: '0',
              correct_answers: '0',
              earned_points: '0',
              total_points: totalPointsPossible.toString(),
              cheat_attempts: participant.cheat_attempts,
              score: '0',
              completed_at: participant.completed_at,
              answers: []
            };
          }

          // Calculer les statistiques
          const totalAnswers = answers?.length || 0;
          const correctAnswers = answers?.filter((a: {is_correct: boolean}) => a.is_correct).length || 0;
          
          // Calculer les points gagnés (somme des points des questions correctement répondues)
          let earnedPoints = 0;
          
          if (answers) {
            earnedPoints = answers.reduce((sum, answer) => {
              // Utiliser any pour contourner les problèmes de typage
              const questionPoints = answer.questions ? (answer.questions as any).points || 1 : 1;
              return sum + (answer.is_correct ? questionPoints : 0);
            }, 0);
          }
          
          // Calculer le score (éviter la division par zéro)
          let score = '0';
          if (totalPointsPossible > 0) {
            score = Math.round((earnedPoints / totalPointsPossible) * 100).toString();
          }

          return {
            participant_id: participant.id,
            name: participant.name,
            session_id: participant.session_id,
            code: participant.sessions?.code || '',
            quiz_id: quizId,
            quiz_title: participant.sessions?.quizzes?.title || '',
            total_answers: totalAnswers.toString(),
            correct_answers: correctAnswers.toString(),
            earned_points: earnedPoints.toString(),
            total_points: totalPointsPossible.toString(),
            cheat_attempts: participant.cheat_attempts,
            score,
            completed_at: participant.completed_at,
            answers: answers || []
          };
        } catch (error) {
          console.error(`Erreur lors du traitement du participant ${participant.id}:`, error);
          return null;
        }
      }));

      // Filtrer les résultats null qui pourraient survenir en cas d'erreur
      const validResults = results.filter(result => result !== null);
      console.log(`${validResults.length} résultats récupérés`);
      
      return validResults;
    } catch (error) {
      console.error('Exception lors de la récupération des résultats du quiz:', error);
      return [];
    }
  },

  // Fonction pour récupérer les scores des participants pour un enseignant donné
  async getParticipantsWithScores(teacherId: string) {
    try {
      // Récupérer d'abord les sessions de l'enseignant
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, quiz_id, code')
        .eq('teacher_id', teacherId);

      if (sessionsError) {
        console.error('Erreur lors de la récupération des sessions:', sessionsError);
        return { data: null, error: sessionsError };
      }

      if (!sessions || sessions.length === 0) {
        return { data: [], error: null };
      }

      // Créer un mapping des sessions pour une référence rapide
      const sessionMap: Record<string, { quiz_id: string, code: string }> = {};
      sessions.forEach(session => {
        sessionMap[session.id] = { 
          quiz_id: session.quiz_id,
          code: session.code
        };
      });

      // Récupérer les IDs de session pour la requête
      const sessionIds = sessions.map(session => session.id);

      // Récupérer les quizzes associés à ces sessions
      const { data: quizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select('id, title')
        .in('id', sessions.map(session => session.quiz_id));

      if (quizzesError) {
        console.error('Erreur lors de la récupération des quizzes:', quizzesError);
        return { data: null, error: quizzesError };
      }

      // Créer un mapping des quizzes pour une référence rapide
      const quizMap: Record<string, { title: string }> = {};
      if (quizzes) {
        quizzes.forEach(quiz => {
          quizMap[quiz.id] = { title: quiz.title };
        });
      }

      // Récupérer directement les participants avec leurs scores
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('id, name, score, joined_at, completed_at, session_id')
        .in('session_id', sessionIds)
        .order('joined_at', { ascending: false });

      if (participantsError) {
        console.error('Erreur lors de la récupération des participants:', participantsError);
        return { data: null, error: participantsError };
      }

      // Formater les données pour correspondre à l'interface ParticipantData
      const formattedData = participants?.map(participant => {
        const session = sessionMap[participant.session_id];
        const quiz = session ? quizMap[session.quiz_id] : null;
        
        return {
          id: participant.id,
          name: participant.name,
          score: participant.score,
          joined_at: participant.joined_at,
          completed_at: participant.completed_at,
          quiz_id: session?.quiz_id,
          session_code: session?.code,
          quiz_title: quiz?.title || 'Quiz inconnu'
        };
      }) || [];

      return { data: formattedData, error: null };
    } catch (error) {
      console.error('Exception lors de la récupération des scores des participants:', error);
      return { data: null, error };
    }
  },

  // Fonction pour récupérer le temps moyen de réponse aux questions
  async getAvgResponseTime(teacherId: string) {
    try {
      // Récupérer d'abord toutes les sessions créées par cet enseignant
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('teacher_id', teacherId);

      if (sessionsError) {
        console.error('Erreur lors de la récupération des sessions:', sessionsError);
        return { data: null, error: sessionsError };
      }

      if (!sessions || sessions.length === 0) {
        return { data: [], error: null };
      }

      // Récupérer tous les IDs de session
      const sessionIds = sessions.map(session => session.id);

      // Récupérer tous les participants de ces sessions
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('id')
        .in('session_id', sessionIds);

      if (participantsError) {
        console.error('Erreur lors de la récupération des participants:', participantsError);
        return { data: null, error: participantsError };
      }

      if (!participants || participants.length === 0) {
        return { data: [], error: null };
      }

      // Récupérer tous les IDs de participant
      const participantIds = participants.map(p => p.id);

      // Récupérer les temps de réponse de ces participants (inclure les temps à 0)
      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .select('time_spent')
        .in('participant_id', participantIds);

      if (answersError) {
        console.error('Erreur lors de la récupération des temps de réponse:', answersError);
        return { data: null, error: answersError };
      }

      return { data: answers || [], error: null };
    } catch (error) {
      console.error('Exception lors de la récupération des temps de réponse:', error);
      return { data: null, error };
    }
  },

  // Fonction pour récupérer les données d'intégrité académique (triche)
  async getIntegrityData(teacherId: string) {
    try {
      // Récupérer d'abord toutes les sessions créées par cet enseignant
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('teacher_id', teacherId);

      if (sessionsError) {
        console.error('Erreur lors de la récupération des sessions:', sessionsError);
        return { 
          data: { totalParticipants: 0, honestParticipants: 0, cheatingParticipants: 0 }, 
          error: sessionsError 
        };
      }

      if (!sessions || sessions.length === 0) {
        return { 
          data: { totalParticipants: 0, honestParticipants: 0, cheatingParticipants: 0 }, 
          error: null 
        };
      }

      // Récupérer tous les IDs de session
      const sessionIds = sessions.map(session => session.id);

      // Récupérer tous les participants de ces sessions avec leur nombre de tentatives de triche
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('id, cheat_attempts')
        .in('session_id', sessionIds);

      if (participantsError) {
        console.error('Erreur lors de la récupération des participants:', participantsError);
        return { 
          data: { totalParticipants: 0, honestParticipants: 0, cheatingParticipants: 0 }, 
          error: participantsError 
        };
      }

      if (!participants || participants.length === 0) {
        return { 
          data: { totalParticipants: 0, honestParticipants: 0, cheatingParticipants: 0 }, 
          error: null 
        };
      }

      // Compter le nombre total de participants
      const totalParticipants = participants.length;

      // Compter les participants avec des tentatives de triche (cheat_attempts > 0)
      const cheatingParticipants = participants.filter(p => p.cheat_attempts && p.cheat_attempts > 0).length;

      // Calculer le nombre de participants honnêtes
      const honestParticipants = totalParticipants - cheatingParticipants;

      return { 
        data: { 
          totalParticipants, 
          honestParticipants, 
          cheatingParticipants 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Exception lors de la récupération des données d\'intégrité:', error);
      return { 
        data: { 
          totalParticipants: 0, 
          honestParticipants: 0, 
          cheatingParticipants: 0
        }, 
        error 
      };
    }
  },
}; 
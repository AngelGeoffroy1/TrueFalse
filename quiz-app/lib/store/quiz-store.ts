import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type QuizOption = {
  id: string;
  text: string;
};

export type Question = {
  id: string;
  text: string;
  options: QuizOption[];
  correctOptionId: string;
  timeLimit?: number; // Temps en secondes pour répondre à cette question spécifique
  points?: number; // Points attribués pour une réponse correcte
};

export type Quiz = {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  timePerQuestion: number; // Temps par défaut pour toutes les questions
  passingScore: number; // Score de réussite en pourcentage
  shuffleQuestions: boolean;
  showAnswers: boolean;
  antiCheat: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Student = {
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

export type Session = {
  id: string;
  quizId: string;
  code: string;
  isActive: boolean;
  startedAt: string;
  endedAt: string | null;
  currentQuestionIndex: number;
  students: Student[];
  antiCheatEnabled: boolean;
  showLiveResults: boolean;
  autoProgress: boolean;
};

// Définition du store
type QuizStore = {
  // État
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  sessions: Session[];
  currentSession: Session | null;
  // Actions - Quiz
  addQuiz: (quiz: Quiz) => void;
  updateQuiz: (id: string, quiz: Partial<Quiz>) => void;
  deleteQuiz: (id: string) => void;
  setCurrentQuiz: (id: string | null) => void;
  // Actions - Session
  createSession: (quizId: string) => Session;
  updateSession: (id: string, session: Partial<Session>) => void;
  endSession: (id: string) => void;
  setCurrentSession: (id: string | null) => void;
  // Actions - Étudiants
  addStudent: (sessionId: string, name: string) => Student;
  updateStudentAnswer: (
    sessionId: string,
    studentId: string,
    questionId: string,
    optionId: string | null,
    timeSpent: number
  ) => void;
  registerCheatAttempt: (sessionId: string, studentId: string) => void;
};

// Données fictives pour la démonstration
const mockQuizzes: Quiz[] = [
  {
    id: "1",
    title: "Mathématiques - Fractions",
    description: "Quiz de base sur les fractions et les opérations",
    questions: [
      {
        id: "q1",
        text: "Quelle est la forme simplifiée de 8/12?",
        options: [
          { id: "a", text: "2/3" },
          { id: "b", text: "4/6" },
          { id: "c", text: "3/4" },
          { id: "d", text: "2/4" },
        ],
        correctOptionId: "a",
      },
      {
        id: "q2",
        text: "Calculez 1/4 + 2/4",
        options: [
          { id: "a", text: "1/2" },
          { id: "b", text: "3/4" },
          { id: "c", text: "3/8" },
          { id: "d", text: "1/8" },
        ],
        correctOptionId: "b",
      },
    ],
    timePerQuestion: 30,
    passingScore: 60,
    shuffleQuestions: false,
    showAnswers: true,
    antiCheat: true,
    createdAt: "2023-04-15T10:30:00Z",
    updatedAt: "2023-04-15T10:30:00Z",
  },
  {
    id: "2",
    title: "Histoire - Révolution française",
    description: "Les dates et événements clés de la Révolution française",
    questions: [
      {
        id: "q1",
        text: "En quelle année a eu lieu la prise de la Bastille?",
        options: [
          { id: "a", text: "1787" },
          { id: "b", text: "1789" },
          { id: "c", text: "1790" },
          { id: "d", text: "1793" },
        ],
        correctOptionId: "b",
      },
      {
        id: "q2",
        text: "Qui était le roi de France au début de la Révolution?",
        options: [
          { id: "a", text: "Louis XIV" },
          { id: "b", text: "Louis XV" },
          { id: "c", text: "Louis XVI" },
          { id: "d", text: "Napoléon Bonaparte" },
        ],
        correctOptionId: "c",
      },
    ],
    timePerQuestion: 45,
    passingScore: 70,
    shuffleQuestions: true,
    showAnswers: false,
    antiCheat: true,
    createdAt: "2023-04-10T14:20:00Z",
    updatedAt: "2023-04-12T09:15:00Z",
  },
  {
    id: "3",
    title: "Sciences - Le système solaire",
    description: "Les planètes et autres corps du système solaire",
    questions: [
      {
        id: "q1",
        text: "Quelle est la planète la plus proche du Soleil?",
        options: [
          { id: "a", text: "Vénus" },
          { id: "b", text: "Mercure" },
          { id: "c", text: "Mars" },
          { id: "d", text: "Terre" },
        ],
        correctOptionId: "b",
      },
      {
        id: "q2",
        text: "Quelle est la plus grande planète du système solaire?",
        options: [
          { id: "a", text: "Saturne" },
          { id: "b", text: "Neptune" },
          { id: "c", text: "Jupiter" },
          { id: "d", text: "Uranus" },
        ],
        correctOptionId: "c",
      },
      {
        id: "q3",
        text: "Laquelle de ces planètes est connue pour ses anneaux?",
        options: [
          { id: "a", text: "Jupiter" },
          { id: "b", text: "Saturne" },
          { id: "c", text: "Uranus" },
          { id: "d", text: "Neptune" },
        ],
        correctOptionId: "b",
      },
    ],
    timePerQuestion: 30,
    passingScore: 75,
    shuffleQuestions: false,
    showAnswers: true,
    antiCheat: true,
    createdAt: "2023-04-05T16:45:00Z",
    updatedAt: "2023-04-05T16:45:00Z",
  },
];

// Création du store
export const useQuizStore = create<QuizStore>()(
  persist(
    (set, get) => ({
      // État initial
      quizzes: mockQuizzes,
      currentQuiz: null,
      sessions: [],
      currentSession: null,

      // Actions - Quiz
      addQuiz: (quiz) => {
        set((state) => ({
          quizzes: [...state.quizzes, quiz],
        }));
      },

      updateQuiz: (id, updatedQuiz) => {
        set((state) => ({
          quizzes: state.quizzes.map((q) =>
            q.id === id ? { ...q, ...updatedQuiz, updatedAt: new Date().toISOString() } : q
          ),
        }));
      },

      deleteQuiz: (id) => {
        set((state) => ({
          quizzes: state.quizzes.filter((q) => q.id !== id),
        }));
      },

      setCurrentQuiz: (id) => {
        if (id === null) {
          set({ currentQuiz: null });
          return;
        }
        const quiz = get().quizzes.find((q) => q.id === id) || null;
        set({ currentQuiz: quiz });
      },

      // Actions - Session
      createSession: (quizId) => {
        const quiz = get().quizzes.find((q) => q.id === quizId);
        if (!quiz) throw new Error("Quiz not found");

        // Génération d'un code de session aléatoire
        const generateSessionCode = () => {
          const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let result = "";
          for (let i = 0; i < 6; i++) {
            result += characters.charAt(
              Math.floor(Math.random() * characters.length)
            );
          }
          return result;
        };

        const session: Session = {
          id: Date.now().toString(),
          quizId,
          code: generateSessionCode(),
          isActive: false,
          startedAt: new Date().toISOString(),
          endedAt: null,
          currentQuestionIndex: 0,
          students: [],
          antiCheatEnabled: quiz.antiCheat,
          showLiveResults: true,
          autoProgress: false,
        };

        set((state) => ({
          sessions: [...state.sessions, session],
          currentSession: session,
        }));

        return session;
      },

      updateSession: (id, updatedSession) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updatedSession } : s
          ),
          currentSession:
            state.currentSession?.id === id
              ? { ...state.currentSession, ...updatedSession }
              : state.currentSession,
        }));
      },

      endSession: (id) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, isActive: false, endedAt: new Date().toISOString() } : s
          ),
          currentSession:
            state.currentSession?.id === id
              ? { ...state.currentSession, isActive: false, endedAt: new Date().toISOString() }
              : state.currentSession,
        }));
      },

      setCurrentSession: (id) => {
        if (id === null) {
          set({ currentSession: null });
          return;
        }
        const session = get().sessions.find((s) => s.id === id) || null;
        set({ currentSession: session });
      },

      // Actions - Étudiants
      addStudent: (sessionId, name) => {
        const student: Student = {
          id: Date.now().toString(),
          name,
          score: 0,
          cheatAttempts: 0,
          connected: true,
          currentQuestion: 0,
          answers: [],
        };

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, students: [...s.students, student] }
              : s
          ),
          currentSession:
            state.currentSession?.id === sessionId
              ? {
                  ...state.currentSession,
                  students: [...state.currentSession.students, student],
                }
              : state.currentSession,
        }));

        return student;
      },

      updateStudentAnswer: (sessionId, studentId, questionId, optionId, timeSpent) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) return;

        const quiz = get().quizzes.find((q) => q.id === session.quizId);
        if (!quiz) return;

        const question = quiz.questions.find((q) => q.id === questionId);
        if (!question) return;

        const correct = optionId === question.correctOptionId;

        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;

            return {
              ...s,
              students: s.students.map((st) => {
                if (st.id !== studentId) return st;

                // Vérifier si l'étudiant a déjà répondu à cette question
                const hasAnswered = st.answers.some((a) => a.questionId === questionId);
                
                // Si l'étudiant a déjà répondu, ne pas modifier son score
                if (hasAnswered) {
                  return {
                    ...st,
                    answers: st.answers.map((a) =>
                      a.questionId === questionId
                        ? {
                            ...a,
                            selectedOptionId: optionId,
                            correct,
                            timeSpent,
                          }
                        : a
                    ),
                  };
                }

                // Sinon, ajouter une nouvelle réponse et mettre à jour le score
                return {
                  ...st,
                  score: correct ? st.score + 1 : st.score,
                  answers: [
                    ...st.answers,
                    {
                      questionId,
                      selectedOptionId: optionId,
                      correct,
                      timeSpent,
                    },
                  ],
                };
              }),
            };
          }),
        }));
      },

      registerCheatAttempt: (sessionId, studentId) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;

            return {
              ...s,
              students: s.students.map((st) => {
                if (st.id !== studentId) return st;
                return {
                  ...st,
                  cheatAttempts: st.cheatAttempts + 1,
                };
              }),
            };
          }),
          currentSession:
            state.currentSession?.id === sessionId
              ? {
                  ...state.currentSession,
                  students: state.currentSession.students.map((st) => {
                    if (st.id !== studentId) return st;
                    return {
                      ...st,
                      cheatAttempts: st.cheatAttempts + 1,
                    };
                  }),
                }
              : state.currentSession,
        }));
      },
    }),
    {
      name: "quiz-store",
      // Ne sauvegarder que les quiz dans le stockage persistant
      partialize: (state) => ({ quizzes: state.quizzes }),
    }
  )
); 
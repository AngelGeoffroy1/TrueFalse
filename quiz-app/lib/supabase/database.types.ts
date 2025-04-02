export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'teacher' | 'student'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role: 'teacher' | 'student'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'teacher' | 'student'
          created_at?: string
          updated_at?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          title: string
          description: string | null
          teacher_id: string
          time_per_question: number
          passing_score: number
          shuffle_questions: boolean
          show_answers: boolean
          anti_cheat: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          teacher_id: string
          time_per_question?: number
          passing_score?: number
          shuffle_questions?: boolean
          show_answers?: boolean
          anti_cheat?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          teacher_id?: string
          time_per_question?: number
          passing_score?: number
          shuffle_questions?: boolean
          show_answers?: boolean
          anti_cheat?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          quiz_id: string
          text: string
          time_limit: number | null
          points: number | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          text: string
          time_limit?: number | null
          points?: number | null
          order_index: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          text?: string
          time_limit?: number | null
          points?: number | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      options: {
        Row: {
          id: string
          question_id: string
          text: string
          is_correct: boolean
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          text: string
          is_correct?: boolean
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          text?: string
          is_correct?: boolean
          order_index?: number
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          quiz_id: string
          teacher_id: string
          code: string
          is_active: boolean
          current_question_index: number | null
          anti_cheat_enabled: boolean
          show_live_results: boolean
          auto_progress: boolean
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          quiz_id: string
          teacher_id: string
          code?: string
          is_active?: boolean
          current_question_index?: number | null
          anti_cheat_enabled?: boolean
          show_live_results?: boolean
          auto_progress?: boolean
          started_at?: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          quiz_id?: string
          teacher_id?: string
          code?: string
          is_active?: boolean
          current_question_index?: number | null
          anti_cheat_enabled?: boolean
          show_live_results?: boolean
          auto_progress?: boolean
          started_at?: string
          ended_at?: string | null
        }
      }
      participants: {
        Row: {
          id: string
          session_id: string
          student_id: string | null
          name: string
          score: number | null
          cheat_attempts: number | null
          connected: boolean
          current_question: number | null
          joined_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          student_id?: string | null
          name: string
          score?: number | null
          cheat_attempts?: number | null
          connected?: boolean
          current_question?: number | null
          joined_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          student_id?: string | null
          name?: string
          score?: number | null
          cheat_attempts?: number | null
          connected?: boolean
          current_question?: number | null
          joined_at?: string
          completed_at?: string | null
        }
      }
      answers: {
        Row: {
          id: string
          participant_id: string
          question_id: string
          selected_option_id: string | null
          is_correct: boolean | null
          time_spent: number | null
          created_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          question_id: string
          selected_option_id?: string | null
          is_correct?: boolean | null
          time_spent?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          question_id?: string
          selected_option_id?: string | null
          is_correct?: boolean | null
          time_spent?: number | null
          created_at?: string
        }
      }
      cheat_attempts: {
        Row: {
          id: string
          participant_id: string
          type: string
          details: string | null
          created_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          type: string
          details?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          type?: string
          details?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      active_sessions: {
        Row: {
          id: string
          quiz_id: string
          teacher_id: string
          code: string
          is_active: boolean
          current_question_index: number | null
          anti_cheat_enabled: boolean
          show_live_results: boolean
          auto_progress: boolean
          started_at: string
          ended_at: string | null
          quiz_title: string
          quiz_description: string | null
          participant_count: number
        }
      }
      session_results: {
        Row: {
          participant_id: string
          name: string
          session_id: string
          code: string
          quiz_id: string
          quiz_title: string
          total_answers: number
          correct_answers: number
          cheat_attempts: number | null
          score: number
          completed_at: string | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 
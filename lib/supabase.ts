import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      notes: {
        Row: {
          id: string
          title: string
          content: string
          created_at: string
          updated_at: string
          user_id: string
          is_shared: boolean
          share_id: string | null
          default_permission: "read" | "write"
        }
        Insert: {
          id?: string
          title: string
          content: string
          created_at?: string
          updated_at?: string
          user_id: string
          is_shared?: boolean
          share_id?: string | null
          default_permission?: "read" | "write"
        }
        Update: {
          id?: string
          title?: string
          content?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          is_shared?: boolean
          share_id?: string | null
          default_permission?: "read" | "write"
        }
      }
      note_collaborators: {
        Row: {
          id: string
          note_id: string
          user_id: string
          permission: "read" | "write"
          created_at: string
        }
        Insert: {
          id?: string
          note_id: string
          user_id: string
          permission: "read" | "write"
          created_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          user_id?: string
          permission?: "read" | "write"
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

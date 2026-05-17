export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brain_dump_items: {
        Row: {
          category: string | null
          created_at: string
          dump_id: string
          id: string
          task_id: string | null
          text: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          dump_id: string
          id?: string
          task_id?: string | null
          text: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          dump_id?: string
          id?: string
          task_id?: string | null
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_dump_items_dump_id_fkey"
            columns: ["dump_id"]
            isOneToOne: false
            referencedRelation: "brain_dumps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_dump_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_dumps: {
        Row: {
          created_at: string
          error: string | null
          id: string
          raw_text: string
          status: Database["public"]["Enums"]["dump_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          raw_text: string
          status?: Database["public"]["Enums"]["dump_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          raw_text?: string
          status?: Database["public"]["Enums"]["dump_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      energy_states: {
        Row: {
          id: string
          level: Database["public"]["Enums"]["energy_level"]
          logged_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          id?: string
          level: Database["public"]["Enums"]["energy_level"]
          logged_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          id?: string
          level?: Database["public"]["Enums"]["energy_level"]
          logged_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      engagement_events: {
        Row: {
          id: string
          kind: string
          metadata: Json | null
          occurred_at: string
          user_id: string
        }
        Insert: {
          id?: string
          kind: string
          metadata?: Json | null
          occurred_at?: string
          user_id: string
        }
        Update: {
          id?: string
          kind?: string
          metadata?: Json | null
          occurred_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          color_token: string | null
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          energy_required: Database["public"]["Enums"]["energy_level"] | null
          id: string
          notes: string | null
          parent_task_id: string | null
          scheduled_for: string | null
          source: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color_token?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          energy_required?: Database["public"]["Enums"]["energy_level"] | null
          id?: string
          notes?: string | null
          parent_task_id?: string | null
          scheduled_for?: string | null
          source?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color_token?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          energy_required?: Database["public"]["Enums"]["energy_level"] | null
          id?: string
          notes?: string | null
          parent_task_id?: string | null
          scheduled_for?: string | null
          source?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rollover_unfinished_tasks: { Args: never; Returns: number }
    }
    Enums: {
      dump_status: "pending" | "processing" | "parsed" | "failed"
      energy_level: "low" | "medium" | "high"
      task_status: "inbox" | "scheduled" | "active" | "done" | "dropped"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      dump_status: ["pending", "processing", "parsed", "failed"],
      energy_level: ["low", "medium", "high"],
      task_status: ["inbox", "scheduled", "active", "done", "dropped"],
    },
  },
} as const

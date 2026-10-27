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
      cards: {
        Row: {
          card_type: string
          championship_id: string
          created_at: string
          id: string
          match_id: string
          minute: number | null
          player_id: string
          team_id: string
        }
        Insert: {
          card_type: string
          championship_id: string
          created_at?: string
          id?: string
          match_id: string
          minute?: number | null
          player_id: string
          team_id: string
        }
        Update: {
          card_type?: string
          championship_id?: string
          created_at?: string
          id?: string
          match_id?: string
          minute?: number | null
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      championships: {
        Row: {
          created_at: string
          format: string
          id: string
          name: string
          owner_id: string
          season: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id?: string
          name: string
          owner_id?: string
          season?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          name?: string
          owner_id?: string
          season?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          assist_player_id: string | null
          championship_id: string
          created_at: string
          id: string
          match_id: string
          minute: number | null
          own_goal: boolean
          player_id: string | null
          team_id: string
        }
        Insert: {
          assist_player_id?: string | null
          championship_id: string
          created_at?: string
          id?: string
          match_id: string
          minute?: number | null
          own_goal?: boolean
          player_id?: string | null
          team_id: string
        }
        Update: {
          assist_player_id?: string | null
          championship_id?: string
          created_at?: string
          id?: string
          match_id?: string
          minute?: number | null
          own_goal?: boolean
          player_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_goals: number
          away_team_id: string
          championship_id: string
          created_at: string
          home_goals: number
          home_team_id: string
          id: string
          leg: number
          played_at: string | null
          round: number
          status: string
        }
        Insert: {
          away_goals?: number
          away_team_id: string
          championship_id: string
          created_at?: string
          home_goals?: number
          home_team_id: string
          id?: string
          leg?: number
          played_at?: string | null
          round?: number
          status?: string
        }
        Update: {
          away_goals?: number
          away_team_id?: string
          championship_id?: string
          created_at?: string
          home_goals?: number
          home_team_id?: string
          id?: string
          leg?: number
          played_at?: string | null
          round?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          championship_id: string
          created_at: string
          id: string
          name: string
          position: string
          shirt_number: number | null
          team_id: string
        }
        Insert: {
          championship_id: string
          created_at?: string
          id?: string
          name: string
          position?: string
          shirt_number?: number | null
          team_id: string
        }
        Update: {
          championship_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: string
          shirt_number?: number | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      suspensions: {
        Row: {
          championship_id: string
          created_at: string
          id: string
          matches_remaining: number
          origin_match_id: string | null
          player_id: string
          reason: string
          served: boolean
        }
        Insert: {
          championship_id: string
          created_at?: string
          id?: string
          matches_remaining?: number
          origin_match_id?: string | null
          player_id: string
          reason: string
          served?: boolean
        }
        Update: {
          championship_id?: string
          created_at?: string
          id?: string
          matches_remaining?: number
          origin_match_id?: string | null
          player_id?: string
          reason?: string
          served?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "suspensions_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspensions_origin_match_id_fkey"
            columns: ["origin_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspensions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          championship_id: string
          color: string
          created_at: string
          crest_url: string | null
          id: string
          name: string
          short_name: string | null
        }
        Insert: {
          championship_id: string
          color?: string
          created_at?: string
          crest_url?: string | null
          id?: string
          name: string
          short_name?: string | null
        }
        Update: {
          championship_id?: string
          color?: string
          created_at?: string
          crest_url?: string | null
          id?: string
          name?: string
          short_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_championship: {
        Args: { _championship_id: string }
        Returns: boolean
      }
      recompute_suspensions: {
        Args: { _championship_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

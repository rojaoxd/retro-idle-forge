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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      game_config: {
        Row: {
          config: Json
          id: number
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      game_creatures: {
        Row: {
          animations: Json
          created_at: string
          id: string
          look_id: number
          name: string
          updated_at: string
        }
        Insert: {
          animations?: Json
          created_at?: string
          id?: string
          look_id: number
          name: string
          updated_at?: string
        }
        Update: {
          animations?: Json
          created_at?: string
          id?: string
          look_id?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_items: {
        Row: {
          armor: number
          attack: number
          capacity: number
          created_at: string
          defense: number
          extra: Json
          has_height: boolean
          id: string
          is_container: boolean
          is_liquid_container: boolean
          is_solid: boolean
          is_stackable: boolean
          is_useable: boolean
          name: string
          sprite_id: number | null
          updated_at: string
          weapon_type: string | null
          weight: number
        }
        Insert: {
          armor?: number
          attack?: number
          capacity?: number
          created_at?: string
          defense?: number
          extra?: Json
          has_height?: boolean
          id?: string
          is_container?: boolean
          is_liquid_container?: boolean
          is_solid?: boolean
          is_stackable?: boolean
          is_useable?: boolean
          name: string
          sprite_id?: number | null
          updated_at?: string
          weapon_type?: string | null
          weight?: number
        }
        Update: {
          armor?: number
          attack?: number
          capacity?: number
          created_at?: string
          defense?: number
          extra?: Json
          has_height?: boolean
          id?: string
          is_container?: boolean
          is_liquid_container?: boolean
          is_solid?: boolean
          is_stackable?: boolean
          is_useable?: boolean
          name?: string
          sprite_id?: number | null
          updated_at?: string
          weapon_type?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_items_sprite_id_fkey"
            columns: ["sprite_id"]
            isOneToOne: false
            referencedRelation: "game_sprites"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sprites: {
        Row: {
          created_at: string
          height: number
          id: number
          sheet_url: string
          tags: string[]
          updated_at: string
          width: number
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          height?: number
          id?: number
          sheet_url: string
          tags?: string[]
          updated_at?: string
          width?: number
          x?: number
          y?: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: number
          sheet_url?: string
          tags?: string[]
          updated_at?: string
          width?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
      game_visual_effects: {
        Row: {
          created_at: string
          frame_rate_ms: number
          frames: Json
          id: string
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          frame_rate_ms?: number
          frames?: Json
          id?: string
          kind: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          frame_rate_ms?: number
          frames?: Json
          id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

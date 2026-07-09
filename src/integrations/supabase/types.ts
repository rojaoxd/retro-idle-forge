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
          item_type: string
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
          item_type?: string
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
          item_type?: string
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
      game_object_sprites: {
        Row: {
          cell_x: number
          cell_y: number
          frame: number
          id: string
          layer: number
          object_id: string
          pattern_x: number
          pattern_y: number
          pattern_z: number
          sprite_id: number
        }
        Insert: {
          cell_x?: number
          cell_y?: number
          frame?: number
          id?: string
          layer?: number
          object_id: string
          pattern_x?: number
          pattern_y?: number
          pattern_z?: number
          sprite_id: number
        }
        Update: {
          cell_x?: number
          cell_y?: number
          frame?: number
          id?: string
          layer?: number
          object_id?: string
          pattern_x?: number
          pattern_y?: number
          pattern_z?: number
          sprite_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_object_sprites_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "game_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_object_sprites_sprite_id_fkey"
            columns: ["sprite_id"]
            isOneToOne: false
            referencedRelation: "game_sprites"
            referencedColumns: ["id"]
          },
        ]
      }
      game_objects: {
        Row: {
          client_id: number | null
          created_at: string
          flags: Json
          frame_duration_ms: number
          frames: number
          height: number
          id: string
          layers: number
          name: string
          object_kind: string
          palette_group: string | null
          pattern_x: number
          pattern_y: number
          pattern_z: number
          updated_at: string
          width: number
        }
        Insert: {
          client_id?: number | null
          created_at?: string
          flags?: Json
          frame_duration_ms?: number
          frames?: number
          height?: number
          id?: string
          layers?: number
          name: string
          object_kind?: string
          palette_group?: string | null
          pattern_x?: number
          pattern_y?: number
          pattern_z?: number
          updated_at?: string
          width?: number
        }
        Update: {
          client_id?: number | null
          created_at?: string
          flags?: Json
          frame_duration_ms?: number
          frames?: number
          height?: number
          id?: string
          layers?: number
          name?: string
          object_kind?: string
          palette_group?: string | null
          pattern_x?: number
          pattern_y?: number
          pattern_z?: number
          updated_at?: string
          width?: number
        }
        Relationships: []
      }
      game_sprites: {
        Row: {
          created_at: string
          hash: string | null
          height: number
          id: number
          palette_group: string | null
          sheet_url: string
          tags: string[]
          updated_at: string
          width: number
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          hash?: string | null
          height?: number
          id?: number
          palette_group?: string | null
          sheet_url: string
          tags?: string[]
          updated_at?: string
          width?: number
          x?: number
          y?: number
        }
        Update: {
          created_at?: string
          hash?: string | null
          height?: number
          id?: number
          palette_group?: string | null
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
      map_areas: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          updated_at: string
          x1: number
          x2: number
          y1: number
          y2: number
          z_max: number
          z_min: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name: string
          updated_at?: string
          x1: number
          x2: number
          y1: number
          y2: number
          z_max?: number
          z_min?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          updated_at?: string
          x1?: number
          x2?: number
          y1?: number
          y2?: number
          z_max?: number
          z_min?: number
        }
        Relationships: []
      }
      map_palettes: {
        Row: {
          created_at: string
          id: string
          name: string
          object_ids: string[]
          palette_group: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          object_ids?: string[]
          palette_group?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          object_ids?: string[]
          palette_group?: string
          updated_at?: string
        }
        Relationships: []
      }
      map_tiles: {
        Row: {
          blocking: boolean
          created_at: string
          id: string
          layer: string
          object_id: string | null
          spawn_monster_id: string | null
          tile_id: number
          updated_at: string
          x: number
          y: number
          z: number
        }
        Insert: {
          blocking?: boolean
          created_at?: string
          id?: string
          layer: string
          object_id?: string | null
          spawn_monster_id?: string | null
          tile_id: number
          updated_at?: string
          x: number
          y: number
          z?: number
        }
        Update: {
          blocking?: boolean
          created_at?: string
          id?: string
          layer?: string
          object_id?: string | null
          spawn_monster_id?: string | null
          tile_id?: number
          updated_at?: string
          x?: number
          y?: number
          z?: number
        }
        Relationships: [
          {
            foreignKeyName: "map_tiles_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "game_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_tiles_spawn_monster_id_fkey"
            columns: ["spawn_monster_id"]
            isOneToOne: false
            referencedRelation: "monsters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_tiles_tile_id_fkey"
            columns: ["tile_id"]
            isOneToOne: false
            referencedRelation: "game_sprites"
            referencedColumns: ["id"]
          },
        ]
      }
      monsters: {
        Row: {
          created_at: string
          exp_reward: number
          hp: number
          id: string
          loot_table: Json
          max_damage: number
          name: string
          speed: number
          sprite_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          exp_reward?: number
          hp?: number
          id?: string
          loot_table?: Json
          max_damage?: number
          name: string
          speed?: number
          sprite_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          exp_reward?: number
          hp?: number
          id?: string
          loot_table?: Json
          max_damage?: number
          name?: string
          speed?: number
          sprite_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monsters_sprite_id_fkey"
            columns: ["sprite_id"]
            isOneToOne: false
            referencedRelation: "game_sprites"
            referencedColumns: ["id"]
          },
        ]
      }
      npc_keywords: {
        Row: {
          answer: string
          created_at: string
          id: string
          keywords: string[]
          npc_id: string
        }
        Insert: {
          answer?: string
          created_at?: string
          id?: string
          keywords?: string[]
          npc_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          keywords?: string[]
          npc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "npc_keywords_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "npcs"
            referencedColumns: ["id"]
          },
        ]
      }
      npc_trades: {
        Row: {
          buy_price: number | null
          created_at: string
          currency: string
          id: string
          npc_id: string
          object_id: string
          sell_price: number | null
          stock: number | null
        }
        Insert: {
          buy_price?: number | null
          created_at?: string
          currency?: string
          id?: string
          npc_id: string
          object_id: string
          sell_price?: number | null
          stock?: number | null
        }
        Update: {
          buy_price?: number | null
          created_at?: string
          currency?: string
          id?: string
          npc_id?: string
          object_id?: string
          sell_price?: number | null
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "npc_trades_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "npcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npc_trades_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "game_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      npcs: {
        Row: {
          created_at: string
          id: string
          idle_messages: string[]
          name: string
          outfit: Json
          spawn_x: number | null
          spawn_y: number | null
          spawn_z: number | null
          speech_farewell: string[]
          speech_greet: string[]
          sprite_object_id: string | null
          updated_at: string
          walk_radius: number
        }
        Insert: {
          created_at?: string
          id?: string
          idle_messages?: string[]
          name: string
          outfit?: Json
          spawn_x?: number | null
          spawn_y?: number | null
          spawn_z?: number | null
          speech_farewell?: string[]
          speech_greet?: string[]
          sprite_object_id?: string | null
          updated_at?: string
          walk_radius?: number
        }
        Update: {
          created_at?: string
          id?: string
          idle_messages?: string[]
          name?: string
          outfit?: Json
          spawn_x?: number | null
          spawn_y?: number | null
          spawn_z?: number | null
          speech_farewell?: string[]
          speech_greet?: string[]
          sprite_object_id?: string | null
          updated_at?: string
          walk_radius?: number
        }
        Relationships: [
          {
            foreignKeyName: "npcs_sprite_object_id_fkey"
            columns: ["sprite_object_id"]
            isOneToOne: false
            referencedRelation: "game_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      online_players: {
        Row: {
          character_name: string
          created_at: string
          id: string
          last_heartbeat: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          character_name: string
          created_at?: string
          id?: string
          last_heartbeat?: string
          user_id: string
          x?: number
          y?: number
        }
        Update: {
          character_name?: string
          created_at?: string
          id?: string
          last_heartbeat?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          character_name: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          character_name: string
          created_at?: string
          id: string
          updated_at?: string
        }
        Update: {
          character_name?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quest_steps: {
        Row: {
          created_at: string
          id: string
          kind: string
          params: Json
          quest_id: string
          reward: Json
          step_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          params?: Json
          quest_id: string
          reward?: Json
          step_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          params?: Json
          quest_id?: string
          reward?: Json
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quest_steps_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          created_at: string
          description: string
          id: string
          min_level: number
          name: string
          storage_key: string
          storage_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          min_level?: number
          name: string
          storage_key: string
          storage_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          min_level?: number
          name?: string
          storage_key?: string
          storage_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      scripts_actions: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          notes: string | null
          target_kind: string
          target_value: number
          updated_at: string
        }
        Insert: {
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          notes?: string | null
          target_kind?: string
          target_value: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          notes?: string | null
          target_kind?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      scripts_movements: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          event: string
          id: string
          name: string
          notes: string | null
          target_kind: string
          target_value: number
          updated_at: string
        }
        Insert: {
          code?: string
          created_at?: string
          enabled?: boolean
          event?: string
          id?: string
          name: string
          notes?: string | null
          target_kind?: string
          target_value: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          event?: string
          id?: string
          name?: string
          notes?: string | null
          target_kind?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      server_configs: {
        Row: {
          id: number
          motd: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          motd?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          motd?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      server_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          meta: Json
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          meta?: Json
          source?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          meta?: Json
          source?: string
        }
        Relationships: []
      }
      spells: {
        Row: {
          created_at: string
          effect_id: string | null
          id: string
          kind: string
          mana_cost: number
          min_level: number
          name: string
          updated_at: string
          vocation_id: string | null
          words: string
        }
        Insert: {
          created_at?: string
          effect_id?: string | null
          id?: string
          kind?: string
          mana_cost?: number
          min_level?: number
          name: string
          updated_at?: string
          vocation_id?: string | null
          words: string
        }
        Update: {
          created_at?: string
          effect_id?: string | null
          id?: string
          kind?: string
          mana_cost?: number
          min_level?: number
          name?: string
          updated_at?: string
          vocation_id?: string | null
          words?: string
        }
        Relationships: [
          {
            foreignKeyName: "spells_effect_id_fkey"
            columns: ["effect_id"]
            isOneToOne: false
            referencedRelation: "game_visual_effects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spells_vocation_id_fkey"
            columns: ["vocation_id"]
            isOneToOne: false
            referencedRelation: "vocations"
            referencedColumns: ["id"]
          },
        ]
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
      vocations: {
        Row: {
          capacity_per_level: number
          created_at: string
          hp_per_level: number
          hp_regen_ms: number
          id: string
          mana_per_level: number
          mana_regen_ms: number
          name: string
          updated_at: string
        }
        Insert: {
          capacity_per_level?: number
          created_at?: string
          hp_per_level?: number
          hp_regen_ms?: number
          id?: string
          mana_per_level?: number
          mana_regen_ms?: number
          name: string
          updated_at?: string
        }
        Update: {
          capacity_per_level?: number
          created_at?: string
          hp_per_level?: number
          hp_regen_ms?: number
          id?: string
          mana_per_level?: number
          mana_regen_ms?: number
          name?: string
          updated_at?: string
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

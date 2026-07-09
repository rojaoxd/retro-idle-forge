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
      ai_usage_logs: {
        Row: {
          cache_hit_tokens: number
          cache_miss_tokens: number
          cost_brl: number
          cost_usd: number
          created_at: string
          id: string
          image_count: number
          input_tokens: number
          model: string
          output_tokens: number
          tool: string
          user_id: string
        }
        Insert: {
          cache_hit_tokens?: number
          cache_miss_tokens?: number
          cost_brl?: number
          cost_usd?: number
          created_at?: string
          id?: string
          image_count?: number
          input_tokens?: number
          model: string
          output_tokens?: number
          tool: string
          user_id: string
        }
        Update: {
          cache_hit_tokens?: number
          cache_miss_tokens?: number
          cost_brl?: number
          cost_usd?: number
          created_at?: string
          id?: string
          image_count?: number
          input_tokens?: number
          model?: string
          output_tokens?: number
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
      cakto_transactions: {
        Row: {
          amount: number | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          event: string
          id: string
          plan: string | null
          processed_at: string
          product_name: string | null
          raw_payload: Json
          ref_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          event: string
          id?: string
          plan?: string | null
          processed_at?: string
          product_name?: string | null
          raw_payload: Json
          ref_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          event?: string
          id?: string
          plan?: string | null
          processed_at?: string
          product_name?: string | null
          raw_payload?: Json
          ref_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          project_id: string | null
          title: string
          tool: string
          updated_at: string
          user_id: string
          version_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          project_id?: string | null
          title?: string
          tool: string
          updated_at?: string
          user_id: string
          version_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string | null
          title?: string
          tool?: string
          updated_at?: string
          user_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "tool_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_project_files: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          name: string
          project_id: string
          size: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          project_id: string
          size?: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          project_id?: string
          size?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatgpt_project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "chatgpt_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chatgpt_projects: {
        Row: {
          created_at: string
          id: string
          name: string
          pinned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pinned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pinned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      claude_project_files: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          name: string
          project_id: string
          size: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          project_id: string
          size?: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          project_id?: string
          size?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claude_project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "claude_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      claude_projects: {
        Row: {
          archived: boolean
          created_at: string
          description: string | null
          favorited: boolean
          id: string
          instructions: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          description?: string | null
          favorited?: boolean
          id?: string
          instructions?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          description?: string | null
          favorited?: boolean
          id?: string
          instructions?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flow_veo_agent_instructions: {
        Row: {
          content: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flow_veo_conversations: {
        Row: {
          created_at: string
          id: string
          settings: Json
          title: string
          updated_at: string
          user_id: string
          version_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          title?: string
          updated_at?: string
          user_id: string
          version_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          title?: string
          updated_at?: string
          user_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_veo_conversations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "tool_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_veo_messages: {
        Row: {
          aspect_ratio: string | null
          content: string
          conversation_id: string
          created_at: string
          duration_seconds: number
          error: string | null
          id: string
          operation_name: string | null
          role: string
          status: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          aspect_ratio?: string | null
          content?: string
          conversation_id: string
          created_at?: string
          duration_seconds?: number
          error?: string | null
          id?: string
          operation_name?: string | null
          role: string
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          aspect_ratio?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          duration_seconds?: number
          error?: string | null
          id?: string
          operation_name?: string | null
          role?: string
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_veo_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "flow_veo_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      grok_project_files: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          name: string
          project_id: string
          size: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          project_id: string
          size?: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          project_id?: string
          size?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grok_project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "grok_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      grok_projects: {
        Row: {
          created_at: string
          id: string
          instructions: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      library_files: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string
          size: number
          source: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size?: number
          source?: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          size?: number
          source?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "library_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      library_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "library_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      nano_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      nano_images: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nano_images_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "nano_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_payment_at: string | null
          plan: string
          renewal_at: string | null
          status: string
          subscription_expires_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_payment_at?: string | null
          plan?: string
          renewal_at?: string | null
          status?: string
          subscription_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_payment_at?: string | null
          plan?: string
          renewal_at?: string | null
          status?: string
          subscription_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      serial_batches: {
        Row: {
          created_at: string
          created_by: string | null
          duration_days: number
          id: string
          name: string
          plan: string
          total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_days: number
          id?: string
          name: string
          plan?: string
          total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_days?: number
          id?: string
          name?: string
          plan?: string
          total?: number
        }
        Relationships: []
      }
      serial_keys: {
        Row: {
          batch_id: string | null
          batch_name: string | null
          cakto_ref_id: string | null
          code: string
          created_at: string
          created_by: string | null
          duration_days: number
          email_sent_at: string | null
          expires_at: string | null
          id: string
          note: string | null
          plan: string
          redeemed_at: string | null
          redeemed_by: string | null
          sent_to_email: string | null
          source: string
        }
        Insert: {
          batch_id?: string | null
          batch_name?: string | null
          cakto_ref_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          duration_days: number
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          note?: string | null
          plan?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          sent_to_email?: string | null
          source?: string
        }
        Update: {
          batch_id?: string | null
          batch_name?: string | null
          cakto_ref_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          duration_days?: number
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          note?: string | null
          plan?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          sent_to_email?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "serial_keys_batch_fk"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "serial_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serial_keys_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tool_maintenance: {
        Row: {
          in_maintenance: boolean
          tool_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          in_maintenance?: boolean
          tool_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          in_maintenance?: boolean
          tool_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tool_models: {
        Row: {
          category: string
          label: string
          model_id: string
          tool_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          label: string
          model_id: string
          tool_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          label?: string
          model_id?: string
          tool_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tool_ratings: {
        Row: {
          created_at: string
          id: string
          message_id: string
          rating: number
          tool_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          rating: number
          tool_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          rating?: number
          tool_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_sessions: {
        Row: {
          last_seen_at: string
          tab_id: string
          tool_id: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          tab_id: string
          tool_id: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          tab_id?: string
          tool_id?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_versions: {
        Row: {
          created_at: string
          id: string
          instruction: string
          is_default: boolean
          name: string
          sort_order: number
          tool_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instruction: string
          is_default?: boolean
          name: string
          sort_order?: number
          tool_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instruction?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          tool_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_limits: {
        Row: {
          brl_limit_override: number | null
          deepseek_token_limit_override: number | null
          deepseek_token_rank: Database["public"]["Enums"]["limit_rank"]
          gemini_token_limit_override: number | null
          gemini_token_rank: Database["public"]["Enums"]["limit_rank"]
          image_limit_override: number | null
          is_team: boolean
          plan_tier: string | null
          token_limit_override: number | null
          token_rank: Database["public"]["Enums"]["limit_rank"]
          updated_at: string
          user_id: string
          video_limit_override: number | null
        }
        Insert: {
          brl_limit_override?: number | null
          deepseek_token_limit_override?: number | null
          deepseek_token_rank?: Database["public"]["Enums"]["limit_rank"]
          gemini_token_limit_override?: number | null
          gemini_token_rank?: Database["public"]["Enums"]["limit_rank"]
          image_limit_override?: number | null
          is_team?: boolean
          plan_tier?: string | null
          token_limit_override?: number | null
          token_rank?: Database["public"]["Enums"]["limit_rank"]
          updated_at?: string
          user_id: string
          video_limit_override?: number | null
        }
        Update: {
          brl_limit_override?: number | null
          deepseek_token_limit_override?: number | null
          deepseek_token_rank?: Database["public"]["Enums"]["limit_rank"]
          gemini_token_limit_override?: number | null
          gemini_token_rank?: Database["public"]["Enums"]["limit_rank"]
          image_limit_override?: number | null
          is_team?: boolean
          plan_tier?: string | null
          token_limit_override?: number | null
          token_rank?: Database["public"]["Enums"]["limit_rank"]
          updated_at?: string
          user_id?: string
          video_limit_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      user_usage: {
        Row: {
          cost_brl_used: number
          cycle_end: string
          cycle_start: string
          images_used: number
          tokens_used: number
          tokens_used_deepseek: number
          tokens_used_gemini: number
          updated_at: string
          user_id: string
          videos_used: number
        }
        Insert: {
          cost_brl_used?: number
          cycle_end?: string
          cycle_start?: string
          images_used?: number
          tokens_used?: number
          tokens_used_deepseek?: number
          tokens_used_gemini?: number
          updated_at?: string
          user_id: string
          videos_used?: number
        }
        Update: {
          cost_brl_used?: number
          cycle_end?: string
          cycle_start?: string
          images_used?: number
          tokens_used?: number
          tokens_used_deepseek?: number
          tokens_used_gemini?: number
          updated_at?: string
          user_id?: string
          videos_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _ensure_usage_row: { Args: { _user_id: string }; Returns: undefined }
      check_brl_available: { Args: { _user_id: string }; Returns: Json }
      consume_brl: {
        Args: { _cost_brl: number; _user_id: string }
        Returns: Json
      }
      consume_image: { Args: { _user_id: string }; Returns: Json }
      consume_tokens:
        | { Args: { _amount: number; _user_id: string }; Returns: Json }
        | {
            Args: { _amount: number; _provider: string; _user_id: string }
            Returns: Json
          }
      consume_video: { Args: { _user_id: string }; Returns: Json }
      get_user_effective_brl_limit: {
        Args: { _user_id: string }
        Returns: number
      }
      get_user_effective_limits: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tool_access: {
        Args: { _tool_key: string; _user_id: string }
        Returns: boolean
      }
      is_subscription_active: { Args: { _user_id: string }; Returns: boolean }
      redeem_serial_key: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
      limit_rank: "padrao" | "avancado" | "maximo"
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
      app_role: ["admin", "user"],
      limit_rank: ["padrao", "avancado", "maximo"],
    },
  },
} as const

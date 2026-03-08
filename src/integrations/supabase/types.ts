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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          contact_id: string
          created_at: string
          expires_at: string
          id: string
          session_token: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          expires_at?: string
          id?: string
          session_token: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          auth_user_id: string | null
          birthday: string | null
          blood_group: string | null
          category: string
          created_at: string
          custom_category: string | null
          email: string | null
          id: string
          imo: string | null
          is_admin: boolean
          name: string
          note: string | null
          phone: string
          photo_url: string | null
          secret_code: string | null
          secret_code_hash: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          birthday?: string | null
          blood_group?: string | null
          category?: string
          created_at?: string
          custom_category?: string | null
          email?: string | null
          id?: string
          imo?: string | null
          is_admin?: boolean
          name: string
          note?: string | null
          phone: string
          photo_url?: string | null
          secret_code?: string | null
          secret_code_hash?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          birthday?: string | null
          blood_group?: string | null
          category?: string
          created_at?: string
          custom_category?: string | null
          email?: string | null
          id?: string
          imo?: string | null
          is_admin?: boolean
          name?: string
          note?: string | null
          phone?: string
          photo_url?: string | null
          secret_code?: string | null
          secret_code_hash?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "contacts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "contacts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          phone: string
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          phone: string
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          phone?: string
          used?: boolean | null
        }
        Relationships: []
      }
      rate_limit_attempts: {
        Row: {
          action_type: string
          attempted_at: string
          id: string
          key: string
        }
        Insert: {
          action_type: string
          attempted_at?: string
          id?: string
          key: string
        }
        Update: {
          action_type?: string
          attempted_at?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
    }
    Views: {
      contacts_public: {
        Row: {
          address: string | null
          birthday: string | null
          blood_group: string | null
          category: string | null
          created_at: string | null
          custom_category: string | null
          email: string | null
          id: string | null
          imo: string | null
          name: string | null
          note: string | null
          phone: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          blood_group?: string | null
          category?: string | null
          created_at?: string | null
          custom_category?: string | null
          email?: string | null
          id?: string | null
          imo?: string | null
          name?: string | null
          note?: string | null
          phone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          birthday?: string | null
          blood_group?: string | null
          category?: string | null
          created_at?: string | null
          custom_category?: string | null
          email?: string | null
          id?: string | null
          imo?: string | null
          name?: string | null
          note?: string | null
          phone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: { p_action_type: string; p_key: string }
        Returns: boolean
      }
      create_chat_session: {
        Args: { p_phone: string; p_secret_code: string }
        Returns: Json
      }
      generate_otp: { Args: { p_phone: string }; Returns: string }
      get_admin_chat_users: {
        Args: never
        Returns: {
          id: string
          last_message_at: string
          name: string
          phone: string
          photo_url: string
        }[]
      }
      get_admin_contact_id: { Args: never; Returns: string }
      get_admin_messages: {
        Args: { p_other_id: string }
        Returns: {
          content: string
          created_at: string
          id: string
          image_url: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }[]
      }
      get_admin_unread_counts: {
        Args: never
        Returns: {
          sender_id: string
          unread_count: number
        }[]
      }
      get_chat_contacts: {
        Args: { p_token: string }
        Returns: {
          id: string
          name: string
          phone: string
          photo_url: string
        }[]
      }
      get_messages: {
        Args: { p_other_id: string; p_token: string }
        Returns: {
          content: string
          created_at: string
          id: string
          image_url: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }[]
      }
      get_unread_counts: {
        Args: { p_token: string }
        Returns: {
          sender_id: string
          unread_count: number
        }[]
      }
      reset_rate_limit: {
        Args: { p_action_type: string; p_key: string }
        Returns: undefined
      }
      save_contact_with_hash:
        | {
            Args: {
              p_address?: string
              p_birthday?: string
              p_blood_group?: string
              p_category?: string
              p_custom_category?: string
              p_email?: string
              p_imo?: string
              p_name: string
              p_note?: string
              p_phone: string
              p_secret_code?: string
              p_whatsapp?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_address?: string
              p_birthday?: string
              p_blood_group?: string
              p_category?: string
              p_custom_category?: string
              p_email?: string
              p_imo?: string
              p_name: string
              p_note?: string
              p_phone: string
              p_photo_url?: string
              p_secret_code?: string
              p_whatsapp?: string
            }
            Returns: string
          }
      send_admin_message: {
        Args: {
          p_content?: string
          p_image_url?: string
          p_receiver_id: string
        }
        Returns: string
      }
      send_message: {
        Args: {
          p_content?: string
          p_image_url?: string
          p_receiver_id: string
          p_token: string
        }
        Returns: string
      }
      setup_admin_contact: {
        Args: { p_name: string; p_phone?: string }
        Returns: string
      }
      update_verified_contact: {
        Args: {
          p_address?: string
          p_birthday?: string
          p_blood_group?: string
          p_category?: string
          p_custom_category?: string
          p_email?: string
          p_imo?: string
          p_name?: string
          p_note?: string
          p_phone: string
          p_secret_code: string
          p_whatsapp?: string
        }
        Returns: boolean
      }
      validate_chat_session: { Args: { p_token: string }; Returns: string }
      verify_and_get_contact: {
        Args: { p_phone: string; p_secret_code: string }
        Returns: {
          address: string
          birthday: string
          blood_group: string
          category: string
          created_at: string
          custom_category: string
          email: string
          id: string
          imo: string
          name: string
          note: string
          phone: string
          photo_url: string
          rate_limited: boolean
          updated_at: string
          whatsapp: string
        }[]
      }
      verify_contact_by_phone: {
        Args: { p_phone: string }
        Returns: {
          has_secret_code: boolean
          id: string
          rate_limited: boolean
        }[]
      }
      verify_otp: {
        Args: { p_code: string; p_phone: string }
        Returns: boolean
      }
      verify_secret_code: {
        Args: { p_secret_code: string }
        Returns: {
          id: string
          masked_phone: string
          rate_limited: boolean
        }[]
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
    Enums: {},
  },
} as const

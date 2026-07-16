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
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_user_id: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action_type: string
          admin_user_id?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
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
          added_by: string
          address: string | null
          auth_user_id: string | null
          birthday: string | null
          blood_group: string | null
          category: string
          created_at: string
          custom_category: string | null
          email: string | null
          facebook: string | null
          id: string
          imo: string | null
          is_admin: boolean
          name: string
          note: string | null
          phone: string
          photo_url: string | null
          secret_code_hash: string | null
          telegram: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          added_by?: string
          address?: string | null
          auth_user_id?: string | null
          birthday?: string | null
          blood_group?: string | null
          category?: string
          created_at?: string
          custom_category?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          imo?: string | null
          is_admin?: boolean
          name: string
          note?: string | null
          phone: string
          photo_url?: string | null
          secret_code_hash?: string | null
          telegram?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          added_by?: string
          address?: string | null
          auth_user_id?: string | null
          birthday?: string | null
          blood_group?: string | null
          category?: string
          created_at?: string
          custom_category?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          imo?: string | null
          is_admin?: boolean
          name?: string
          note?: string | null
          phone?: string
          photo_url?: string | null
          secret_code_hash?: string | null
          telegram?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      message_edit_history: {
        Row: {
          edited_at: string
          id: string
          message_id: string
          previous_content: string
        }
        Insert: {
          edited_at?: string
          id?: string
          message_id: string
          previous_content: string
        }
        Update: {
          edited_at?: string
          id?: string
          message_id?: string
          previous_content?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          reactor_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          reactor_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          reactor_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          deleted_by_sender: boolean
          deleted_for: string[]
          delivered_at: string | null
          edited_at: string | null
          id: string
          image_url: string | null
          is_pinned: boolean
          is_read: boolean
          original_content: string | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
          unsent_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          deleted_by_sender?: boolean
          deleted_for?: string[]
          delivered_at?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          is_read?: boolean
          original_content?: string | null
          receiver_id: string
          reply_to_id?: string | null
          sender_id: string
          unsent_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          deleted_by_sender?: boolean
          deleted_for?: string[]
          delivered_at?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          is_read?: boolean
          original_content?: string | null
          receiver_id?: string
          reply_to_id?: string | null
          sender_id?: string
          unsent_at?: string | null
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
      otp_edit_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          phone: string
          session_token: string
          used: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          session_token: string
          used?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          session_token?: string
          used?: boolean
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
      user_presence: {
        Row: {
          contact_id: string
          is_online: boolean
          last_seen_at: string
        }
        Insert: {
          contact_id: string
          is_online?: boolean
          last_seen_at?: string
        }
        Update: {
          contact_id?: string
          is_online?: boolean
          last_seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_presence_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts_public"
            referencedColumns: ["id"]
          },
        ]
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
          facebook: string | null
          id: string | null
          imo: string | null
          name: string | null
          note: string | null
          phone: string | null
          telegram: string | null
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
          facebook?: string | null
          id?: string | null
          imo?: string | null
          name?: string | null
          note?: string | null
          phone?: string | null
          telegram?: string | null
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
          facebook?: string | null
          id?: string | null
          imo?: string | null
          name?: string | null
          note?: string | null
          phone?: string | null
          telegram?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _broadcast_msg_update: {
        Args: {
          p_event: string
          p_msg_id: string
          p_receiver: string
          p_sender: string
        }
        Returns: undefined
      }
      check_rate_limit: {
        Args: { p_action_type: string; p_key: string }
        Returns: boolean
      }
      create_chat_session: {
        Args: { p_phone: string; p_secret_code: string }
        Returns: Json
      }
      current_chat_session_contact: { Args: never; Returns: string }
      delete_admin_message: { Args: { p_message_id: string }; Returns: boolean }
      delete_message: {
        Args: { p_message_id: string; p_token: string }
        Returns: boolean
      }
      edit_admin_message: {
        Args: { p_message_id: string; p_new_content: string }
        Returns: boolean
      }
      edit_message: {
        Args: { p_message_id: string; p_new_content: string; p_token: string }
        Returns: boolean
      }
      generate_otp: { Args: { p_phone: string }; Returns: string }
      get_admin_activity_logs: {
        Args: { p_action_type?: string; p_limit?: number; p_offset?: number }
        Returns: {
          action_type: string
          created_at: string
          description: string
          id: string
          metadata: Json
          target_id: string
          target_type: string
        }[]
      }
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
          deleted_by_sender: boolean
          delivered_at: string
          edited_at: string
          has_edit_history: boolean
          id: string
          image_url: string
          is_pinned: boolean
          is_read: boolean
          original_content: string
          reactions: Json
          receiver_id: string
          reply_content: string
          reply_sender_id: string
          reply_to_id: string
          sender_id: string
          unsent_at: string
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
      get_message_edit_history: {
        Args: { p_message_id: string; p_token: string }
        Returns: {
          edited_at: string
          previous_content: string
        }[]
      }
      get_message_edit_history_admin: {
        Args: { p_message_id: string }
        Returns: {
          edited_at: string
          previous_content: string
        }[]
      }
      get_messages: {
        Args: { p_other_id: string; p_token: string }
        Returns: {
          content: string
          created_at: string
          delivered_at: string
          edited_at: string
          has_edit_history: boolean
          id: string
          image_url: string
          is_pinned: boolean
          is_read: boolean
          original_content: string
          reactions: Json
          receiver_id: string
          reply_content: string
          reply_sender_id: string
          reply_to_id: string
          sender_id: string
          unsent_at: string
        }[]
      }
      get_unread_counts: {
        Args: { p_token: string }
        Returns: {
          sender_id: string
          unread_count: number
        }[]
      }
      get_user_presence: {
        Args: { p_contact_ids: string[] }
        Returns: {
          contact_id: string
          is_online: boolean
          last_seen_at: string
        }[]
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      log_admin_activity: {
        Args: {
          p_action_type: string
          p_description: string
          p_metadata?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: string
      }
      mark_conversation_delivered: {
        Args: { p_other_id: string; p_token: string }
        Returns: number
      }
      mark_conversation_delivered_admin: {
        Args: { p_other_id: string }
        Returns: number
      }
      react_to_message: {
        Args: { p_emoji: string; p_message_id: string; p_token: string }
        Returns: boolean
      }
      react_to_message_admin: {
        Args: { p_emoji: string; p_message_id: string }
        Returns: boolean
      }
      remove_message_for_me: {
        Args: { p_message_id: string; p_token: string }
        Returns: boolean
      }
      remove_message_for_me_admin: {
        Args: { p_message_id: string }
        Returns: boolean
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
              p_facebook?: string
              p_imo?: string
              p_name: string
              p_note?: string
              p_phone: string
              p_photo_url?: string
              p_secret_code?: string
              p_telegram?: string
              p_whatsapp?: string
            }
            Returns: string
          }
      send_admin_message:
        | {
            Args: {
              p_content?: string
              p_image_url?: string
              p_receiver_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_content?: string
              p_image_url?: string
              p_receiver_id: string
              p_reply_to_id?: string
            }
            Returns: string
          }
      send_message:
        | {
            Args: {
              p_content?: string
              p_image_url?: string
              p_receiver_id: string
              p_token: string
            }
            Returns: string
          }
        | {
            Args: {
              p_content?: string
              p_image_url?: string
              p_receiver_id: string
              p_reply_to_id?: string
              p_token: string
            }
            Returns: string
          }
      setup_admin_contact: {
        Args: { p_name: string; p_phone?: string }
        Returns: string
      }
      start_otp_edit_session: {
        Args: { p_code: string; p_phone: string }
        Returns: Json
      }
      toggle_pin_message: { Args: { p_message_id: string }; Returns: boolean }
      unsend_message: {
        Args: { p_message_id: string; p_token: string }
        Returns: boolean
      }
      unsend_message_admin: { Args: { p_message_id: string }; Returns: boolean }
      update_admin_presence: { Args: never; Returns: undefined }
      update_contact_via_otp_session: {
        Args: {
          p_address?: string
          p_birthday?: string
          p_blood_group?: string
          p_category?: string
          p_custom_category?: string
          p_email?: string
          p_facebook?: string
          p_imo?: string
          p_name?: string
          p_note?: string
          p_photo_url?: string
          p_session_token: string
          p_telegram?: string
          p_whatsapp?: string
        }
        Returns: boolean
      }
      update_presence: {
        Args: { p_contact_id: string; p_token: string }
        Returns: undefined
      }
      update_verified_contact:
        | {
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
        | {
            Args: {
              p_address?: string
              p_birthday?: string
              p_blood_group?: string
              p_category?: string
              p_custom_category?: string
              p_email?: string
              p_facebook?: string
              p_imo?: string
              p_name?: string
              p_note?: string
              p_phone: string
              p_secret_code: string
              p_telegram?: string
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
          facebook: string
          id: string
          imo: string
          name: string
          note: string
          phone: string
          photo_url: string
          rate_limited: boolean
          telegram: string
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

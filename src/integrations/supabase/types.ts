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
      contacts: {
        Row: {
          address: string | null
          birthday: string | null
          blood_group: string | null
          category: string
          created_at: string
          custom_category: string | null
          email: string | null
          id: string
          imo: string | null
          name: string
          note: string | null
          phone: string
          photo_url: string | null
          secret_code: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          blood_group?: string | null
          category?: string
          created_at?: string
          custom_category?: string | null
          email?: string | null
          id?: string
          imo?: string | null
          name: string
          note?: string | null
          phone: string
          photo_url?: string | null
          secret_code?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          birthday?: string | null
          blood_group?: string | null
          category?: string
          created_at?: string
          custom_category?: string | null
          email?: string | null
          id?: string
          imo?: string | null
          name?: string
          note?: string | null
          phone?: string
          photo_url?: string | null
          secret_code?: string | null
          updated_at?: string
          whatsapp?: string | null
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
      generate_otp: { Args: { p_phone: string }; Returns: string }
      save_contact_with_hash: {
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

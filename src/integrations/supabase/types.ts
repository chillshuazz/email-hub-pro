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
      campaign_sends: {
        Row: {
          campaign_id: string
          created_at: string
          email: string
          error: string | null
          id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["send_status"]
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email: string
          error?: string | null
          id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["send_status"]
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email?: string
          error?: string | null
          id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["send_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          body: string
          created_at: string
          failed_count: number
          finished_at: string | null
          id: string
          is_html: boolean
          list_id: string
          name: string
          rate_per_minute: number
          sent_count: number
          smtp_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          subject: string
          total_recipients: number
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          failed_count?: number
          finished_at?: string | null
          id?: string
          is_html?: boolean
          list_id: string
          name: string
          rate_per_minute?: number
          sent_count?: number
          smtp_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          subject: string
          total_recipients?: number
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          failed_count?: number
          finished_at?: string | null
          id?: string
          is_html?: boolean
          list_id?: string
          name?: string
          rate_per_minute?: number
          sent_count?: number
          smtp_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string
          total_recipients?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_smtp_id_fkey"
            columns: ["smtp_id"]
            isOneToOne: false
            referencedRelation: "smtp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
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
      contacts: {
        Row: {
          created_at: string
          email: string
          extra: Json | null
          id: string
          list_id: string
          name: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          extra?: Json | null
          id?: string
          list_id: string
          name?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          extra?: Json | null
          id?: string
          list_id?: string
          name?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_accounts: {
        Row: {
          created_at: string
          from_email: string
          from_name: string | null
          host: string
          id: string
          label: string
          last_checked: string | null
          last_error: string | null
          password: string
          port: number
          secure: boolean
          status: Database["public"]["Enums"]["smtp_status"]
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name?: string | null
          host: string
          id?: string
          label: string
          last_checked?: string | null
          last_error?: string | null
          password: string
          port: number
          secure?: boolean
          status?: Database["public"]["Enums"]["smtp_status"]
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string | null
          host?: string
          id?: string
          label?: string
          last_checked?: string | null
          last_error?: string | null
          password?: string
          port?: number
          secure?: boolean
          status?: Database["public"]["Enums"]["smtp_status"]
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      smtp_detect_jobs: {
        Row: {
          created_at: string
          email: string
          id: string
          result: Json | null
          smtp_account_id: string | null
          status: string
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          result?: Json | null
          smtp_account_id?: string | null
          status?: string
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          result?: Json | null
          smtp_account_id?: string | null
          status?: string
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smtp_detect_jobs_smtp_account_id_fkey"
            columns: ["smtp_account_id"]
            isOneToOne: false
            referencedRelation: "smtp_accounts"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "user"
      campaign_status: "draft" | "sending" | "sent" | "failed"
      send_status: "pending" | "sent" | "failed"
      smtp_status: "unknown" | "checking" | "ok" | "error"
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
      campaign_status: ["draft", "sending", "sent", "failed"],
      send_status: ["pending", "sent", "failed"],
      smtp_status: ["unknown", "checking", "ok", "error"],
    },
  },
} as const

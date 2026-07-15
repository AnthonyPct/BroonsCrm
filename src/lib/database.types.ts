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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      helloasso_orders: {
        Row: {
          amount_total: number
          created_at: string
          form_slug: string | null
          ha_order_id: string
          id: string
          items: Json
          match_status: Database["public"]["Enums"]["ha_match_status"]
          matched_license_id: string | null
          order_date: string | null
          payer_email: string | null
          payer_first_name: string | null
          payer_last_name: string | null
          raw: Json | null
          updated_at: string
        }
        Insert: {
          amount_total?: number
          created_at?: string
          form_slug?: string | null
          ha_order_id: string
          id?: string
          items?: Json
          match_status?: Database["public"]["Enums"]["ha_match_status"]
          matched_license_id?: string | null
          order_date?: string | null
          payer_email?: string | null
          payer_first_name?: string | null
          payer_last_name?: string | null
          raw?: Json | null
          updated_at?: string
        }
        Update: {
          amount_total?: number
          created_at?: string
          form_slug?: string | null
          ha_order_id?: string
          id?: string
          items?: Json
          match_status?: Database["public"]["Enums"]["ha_match_status"]
          matched_license_id?: string | null
          order_date?: string | null
          payer_email?: string | null
          payer_first_name?: string | null
          payer_last_name?: string | null
          raw?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "helloasso_orders_matched_license_id_fkey"
            columns: ["matched_license_id"]
            isOneToOne: false
            referencedRelation: "license_financials"
            referencedColumns: ["license_id"]
          },
          {
            foreignKeyName: "helloasso_orders_matched_license_id_fkey"
            columns: ["matched_license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      helloasso_payments: {
        Row: {
          amount: number
          created_at: string
          ha_order_id: string
          ha_payment_id: string
          id: string
          payment_date: string | null
          raw: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          ha_order_id: string
          ha_payment_id: string
          id?: string
          payment_date?: string | null
          raw?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          ha_order_id?: string
          ha_payment_id?: string
          id?: string
          payment_date?: string | null
          raw?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          created_at: string
          id: string
          is_mutation: boolean
          member_id: string
          notes: string | null
          qualified_at: string | null
          registered_at: string
          season_id: string
          status: Database["public"]["Enums"]["license_status"]
          tariff_id: string | null
          team: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_mutation?: boolean
          member_id: string
          notes?: string | null
          qualified_at?: string | null
          registered_at?: string
          season_id: string
          status?: Database["public"]["Enums"]["license_status"]
          tariff_id?: string | null
          team?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_mutation?: boolean
          member_id?: string
          notes?: string | null
          qualified_at?: string | null
          registered_at?: string
          season_id?: string
          status?: Database["public"]["Enums"]["license_status"]
          tariff_id?: string | null
          team?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licenses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariff_grid"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_assignments: {
        Row: {
          created_at: string
          id: string
          match_id: string
          member_id: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          member_id: string
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          member_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_assignments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matchday_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      matchday_matches: {
        Row: {
          created_at: string
          id: string
          matchday_id: string
          opponent: string
          scheduled_at: string | null
          sort_order: number
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          matchday_id: string
          opponent?: string
          scheduled_at?: string | null
          sort_order?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          matchday_id?: string
          opponent?: string
          scheduled_at?: string | null
          sort_order?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchday_matches_matchday_id_fkey"
            columns: ["matchday_id"]
            isOneToOne: false
            referencedRelation: "matchdays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchday_matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matchdays: {
        Row: {
          created_at: string
          date: string
          hall_manager_id: string | null
          id: string
          notes: string | null
          season_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          hall_manager_id?: string | null
          id?: string
          notes?: string | null
          season_id: string
          start_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          hall_manager_id?: string | null
          id?: string
          notes?: string | null
          season_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchdays_hall_manager_id_fkey"
            columns: ["hall_manager_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchdays_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          birth_date: string | null
          can_hall_manager: boolean
          can_referee: boolean
          can_table: boolean
          city: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_board: boolean
          last_name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          sex: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          can_hall_manager?: boolean
          can_referee?: boolean
          can_table?: boolean
          city?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_board?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          sex?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          can_hall_manager?: boolean
          can_referee?: boolean
          can_table?: boolean
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_board?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          sex?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          aid_status: string | null
          amount: number
          created_at: string
          helloasso_payment_id: string | null
          id: string
          license_id: string
          notes: string | null
          paid_at: string
          reference: string | null
          source: Database["public"]["Enums"]["payment_source"]
        }
        Insert: {
          aid_status?: string | null
          amount: number
          created_at?: string
          helloasso_payment_id?: string | null
          id?: string
          license_id: string
          notes?: string | null
          paid_at?: string
          reference?: string | null
          source: Database["public"]["Enums"]["payment_source"]
        }
        Update: {
          aid_status?: string | null
          amount?: number
          created_at?: string
          helloasso_payment_id?: string | null
          id?: string
          license_id?: string
          notes?: string | null
          paid_at?: string
          reference?: string | null
          source?: Database["public"]["Enums"]["payment_source"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "license_financials"
            referencedColumns: ["license_id"]
          },
          {
            foreignKeyName: "payments_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          discount_deadline: string
          discount_rate: number
          end_date: string
          id: string
          is_current: boolean
          label: string
          start_date: string
        }
        Insert: {
          created_at?: string
          discount_deadline: string
          discount_rate?: number
          end_date: string
          id?: string
          is_current?: boolean
          label: string
          start_date: string
        }
        Update: {
          created_at?: string
          discount_deadline?: string
          discount_rate?: number
          end_date?: string
          id?: string
          is_current?: boolean
          label?: string
          start_date?: string
        }
        Relationships: []
      }
      tariff_grid: {
        Row: {
          birth_year_max: number | null
          birth_year_min: number | null
          category: string
          created_at: string
          id: string
          part_ffhb: number
          part_hbc: number
          part_lbhb: number
          season_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          birth_year_max?: number | null
          birth_year_min?: number | null
          category: string
          created_at?: string
          id?: string
          part_ffhb?: number
          part_hbc?: number
          part_lbhb?: number
          season_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          birth_year_max?: number | null
          birth_year_min?: number | null
          category?: string
          created_at?: string
          id?: string
          part_ffhb?: number
          part_hbc?: number
          part_lbhb?: number
          season_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tariff_grid_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          birth_year_max: number | null
          birth_year_min: number | null
          created_at: string
          gender: string | null
          id: string
          is_youth: boolean
          match_duration_minutes: number
          name: string
          season_id: string
          sort_order: number
          updated_at: string
          warmup_minutes: number
        }
        Insert: {
          birth_year_max?: number | null
          birth_year_min?: number | null
          created_at?: string
          gender?: string | null
          id?: string
          is_youth?: boolean
          match_duration_minutes?: number
          name: string
          season_id: string
          sort_order?: number
          updated_at?: string
          warmup_minutes?: number
        }
        Update: {
          birth_year_max?: number | null
          birth_year_min?: number | null
          created_at?: string
          gender?: string | null
          id?: string
          is_youth?: boolean
          match_duration_minutes?: number
          name?: string
          season_id?: string
          sort_order?: number
          updated_at?: string
          warmup_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      license_financials: {
        Row: {
          balance: number | null
          category: string | null
          discount_rate: number | null
          due_league: number | null
          license_id: string | null
          member_id: string | null
          part_ffhb: number | null
          part_hbc: number | null
          part_lbhb: number | null
          part_lbhb_effective: number | null
          payment_status: string | null
          season_id: string | null
          total_due: number | null
          total_offered: number | null
          total_paid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_ha_match: {
        Args: { p_license_id: string; p_order_id: string }
        Returns: undefined
      }
      find_license_for_ha_order: {
        Args: { p_order_id: string }
        Returns: string
      }
      get_public_matchdays: { Args: never; Returns: Json }
      norm_text: { Args: { t: string }; Returns: string }
      reconcile_all_ha_orders: { Args: never; Returns: Json }
      try_match_ha_order: { Args: { p_order_id: string }; Returns: boolean }
    }
    Enums: {
      ha_match_status: "pending" | "matched" | "ignored"
      license_status: "a_saisir" | "attente_paiement" | "payee" | "qualifiee"
      payment_source:
        | "helloasso"
        | "passsport"
        | "cheque"
        | "espece"
        | "ancv"
        | "caf"
        | "offert"
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
      ha_match_status: ["pending", "matched", "ignored"],
      license_status: ["a_saisir", "attente_paiement", "payee", "qualifiee"],
      payment_source: [
        "helloasso",
        "passsport",
        "cheque",
        "espece",
        "ancv",
        "caf",
        "offert",
      ],
    },
  },
} as const

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
      admin_payment_accounts: {
        Row: {
          account_name: string
          account_number: string
          created_at: string
          id: string
          instructions: string | null
          is_active: boolean
          label: string
          method_type: Database["public"]["Enums"]["payment_method_type"]
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          label: string
          method_type: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          label?: string
          method_type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_account_id: string | null
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method_type: Database["public"]["Enums"]["payment_method_type"]
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["txn_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_account_id?: string | null
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method_type: Database["public"]["Enums"]["payment_method_type"]
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_account_id?: string | null
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method_type?: Database["public"]["Enums"]["payment_method_type"]
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_admin_account_id_fkey"
            columns: ["admin_account_id"]
            isOneToOne: false
            referencedRelation: "admin_payment_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_holder_name: string
          account_number: string | null
          created_at: string
          id: string
          is_default: boolean
          method_type: Database["public"]["Enums"]["payment_method_type"]
          paypal_email: string | null
          provider_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder_name: string
          account_number?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          method_type: Database["public"]["Enums"]["payment_method_type"]
          paypal_email?: string | null
          provider_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder_name?: string
          account_number?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          method_type?: Database["public"]["Enums"]["payment_method_type"]
          paypal_email?: string | null
          provider_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      privacy_content: {
        Row: {
          body: string
          id: number
          updated_at: string
        }
        Insert: {
          body?: string
          id?: number
          updated_at?: string
        }
        Update: {
          body?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          expected_return_pct: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expected_return_pct?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expected_return_pct?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country_code: string | null
          country_name: string | null
          created_at: string
          currency: string
          currency_locked_until: string
          earned: number
          email: string | null
          full_name: string | null
          id: string
          invested: number
          payment_edit_locked: boolean
          theme: string
          updated_at: string
          user_id: string
          withdrawn: number
        }
        Insert: {
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          currency?: string
          currency_locked_until?: string
          earned?: number
          email?: string | null
          full_name?: string | null
          id?: string
          invested?: number
          payment_edit_locked?: boolean
          theme?: string
          updated_at?: string
          user_id: string
          withdrawn?: number
        }
        Update: {
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          currency?: string
          currency_locked_until?: string
          earned?: number
          email?: string | null
          full_name?: string | null
          id?: string
          invested?: number
          payment_edit_locked?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
          withdrawn?: number
        }
        Relationships: []
      }
      support_content: {
        Row: {
          body: string
          id: number
          updated_at: string
        }
        Insert: {
          body?: string
          id?: number
          updated_at?: string
        }
        Update: {
          body?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_products: {
        Row: {
          id: string
          product_id: string
          purchase_price: number
          purchased_at: string
          sale_price: number | null
          sold_at: string | null
          status: Database["public"]["Enums"]["user_product_status"]
          user_id: string
        }
        Insert: {
          id?: string
          product_id: string
          purchase_price: number
          purchased_at?: string
          sale_price?: number | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["user_product_status"]
          user_id: string
        }
        Update: {
          id?: string
          product_id?: string
          purchase_price?: number
          purchased_at?: string
          sale_price?: number | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["user_product_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          payment_method_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["txn_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["txn_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
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
      payment_method_type: "mobile_money" | "bank" | "paypal"
      txn_status: "pending" | "approved" | "rejected" | "cancelled"
      user_product_status: "owned" | "sold"
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
      payment_method_type: ["mobile_money", "bank", "paypal"],
      txn_status: ["pending", "approved", "rejected", "cancelled"],
      user_product_status: ["owned", "sold"],
    },
  },
} as const

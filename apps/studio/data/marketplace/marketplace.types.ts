export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      categories: {
        Row: {
          description: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          description?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          description?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          categories: Json | null
          content: string | null
          description: string | null
          documentation_url: string | null
          featured: boolean | null
          images: string[] | null
          installation_url: string | null
          partner_logo: string | null
          partner_name: string | null
          partner_slug: string | null
          slug: string | null
          title: string | null
          website_url: string | null
          youtube_id: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          description: string | null
          logo: string | null
          name: string | null
          slug: string | null
          website: string | null
        }
        Insert: {
          description?: string | null
          logo?: string | null
          name?: string | null
          slug?: string | null
          website?: string | null
        }
        Update: {
          description?: string | null
          logo?: string | null
          name?: string | null
          slug?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_partner_member: {
        Args: { p_partner_id: string; p_user_id: string }
        Returns: undefined
      }
      approve_and_publish_revision: {
        Args: {
          p_listing_id: string
          p_review_notes?: string
          p_revision_id: string
        }
        Returns: undefined
      }
      assign_category_to_revision: {
        Args: { p_category_id: string; p_revision_id: string }
        Returns: undefined
      }
      clear_live_revision: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      create_category: {
        Args: { p_description: string; p_name: string; p_slug: string }
        Returns: string
      }
      create_listing: {
        Args: { p_featured?: boolean; p_partner_id: string; p_slug: string }
        Returns: string
      }
      create_partner: {
        Args: {
          p_description: string
          p_logo: string
          p_name: string
          p_slug: string
          p_website: string
        }
        Returns: string
      }
      delete_category: { Args: { p_category_id: string }; Returns: undefined }
      delete_listing: { Args: { p_listing_id: string }; Returns: undefined }
      delete_partner: { Args: { p_partner_id: string }; Returns: undefined }
      delete_revision: { Args: { p_revision_id: string }; Returns: undefined }
      get_listing_revisions: {
        Args: { p_listing_id: string }
        Returns: {
          content: string
          created_at: string
          description: string
          documentation_url: string
          revision_id: string
          title: string
          website_url: string
        }[]
      }
      get_listing_revisions_reviews: {
        Args: { p_listing_id: string }
        Returns: {
          listing_revision_id: string
          review_notes: string
          reviewed_by: string
          status: string
        }[]
      }
      get_my_memberships: {
        Args: never
        Returns: {
          created_at: string
          partner_id: string
          user_id: string
        }[]
      }
      get_revision_categories: {
        Args: { p_revision_id: string }
        Returns: {
          category_id: string
          category_name: string
          category_slug: string
        }[]
      }
      get_users: {
        Args: never
        Returns: {
          created_at: string
          id: string
          role: string
        }[]
      }
      remove_category_from_revision: {
        Args: { p_category_id: string; p_revision_id: string }
        Returns: undefined
      }
      remove_partner_member: {
        Args: { p_partner_id: string; p_user_id: string }
        Returns: undefined
      }
      review_listing_revision: {
        Args: {
          p_review_notes?: string
          p_revision_id: string
          p_status: "draft" | "pending" | "approved" | "rejected"
        }
        Returns: undefined
      }
      set_live_revision: {
        Args: { p_listing_id: string; p_revision_id: string }
        Returns: undefined
      }
      submit_revision: {
        Args: {
          p_category_ids?: string[]
          p_content: string
          p_description: string
          p_documentation_url: string
          p_images?: string[]
          p_installation_url?: string
          p_listing_id: string
          p_title: string
          p_website_url: string
          p_youtube_id?: string
        }
        Returns: string
      }
      update_category: {
        Args: {
          p_category_id: string
          p_description?: string
          p_name?: string
          p_slug?: string
        }
        Returns: undefined
      }
      update_listing: {
        Args: {
          p_featured?: boolean
          p_listing_id: string
          p_partner_id?: string
          p_slug?: string
        }
        Returns: undefined
      }
      update_partner: {
        Args: {
          p_description?: string
          p_logo?: string
          p_name?: string
          p_partner_id: string
          p_slug?: string
          p_website?: string
        }
        Returns: undefined
      }
      update_revision: {
        Args: {
          p_category_ids?: string[]
          p_content?: string
          p_description?: string
          p_documentation_url?: string
          p_images?: string[]
          p_installation_url?: string
          p_revision_id: string
          p_title?: string
          p_website_url?: string
          p_youtube_id?: string
        }
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


export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_listings: {
        Row: {
          category_id: number
          created_at: string
          listing_id: number
        }
        Insert: {
          category_id: number
          created_at?: string
          listing_id: number
        }
        Update: {
          category_id?: number
          created_at?: string
          listing_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'category_listings_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'category_listings_listing_id_fkey'
            columns: ['listing_id']
            isOneToOne: false
            referencedRelation: 'listings'
            referencedColumns: ['id']
          },
        ]
      }
      listing_initiation_configs: {
        Row: {
          listing_id: number
          signing_key_pem: string
          key_id: string
          audience: string
          issuer: string
          created_at: string
          updated_at: string
        }
        Insert: {
          listing_id: number
          signing_key_pem: string
          key_id: string
          audience: string
          issuer: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          listing_id?: number
          signing_key_pem?: string
          key_id?: string
          audience?: string
          issuer?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'listing_initiation_configs_listing_id_fkey'
            columns: ['listing_id']
            isOneToOne: true
            referencedRelation: 'listings'
            referencedColumns: ['id']
          },
        ]
      }
      listing_reviews: {
        Row: {
          created_at: string
          featured: boolean
          listing_id: number
          published_at: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database['public']['Enums']['marketplace_review_status']
          updated_at: string
        }
        Insert: {
          created_at?: string
          featured?: boolean
          listing_id: number
          published_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database['public']['Enums']['marketplace_review_status']
          updated_at?: string
        }
        Update: {
          created_at?: string
          featured?: boolean
          listing_id?: number
          published_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database['public']['Enums']['marketplace_review_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'listing_reviews_listing_id_fkey'
            columns: ['listing_id']
            isOneToOne: true
            referencedRelation: 'listings'
            referencedColumns: ['id']
          },
        ]
      }
      listings: {
        Row: {
          content: string | null
          created_at: string
          documentation_url: string | null
          files: string[]
          id: number
          initiation_action_method:
            | Database['public']['Enums']['marketplace_initiation_method']
            | null
          initiation_action_url: string | null
          partner_id: number
          published: boolean
          registry_listing_url: string | null
          slug: string
          submitted_by: string | null
          summary: string | null
          title: string
          type: Database['public']['Enums']['marketplace_listing_type']
          updated_at: string
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          documentation_url?: string | null
          files?: string[]
          id?: never
          initiation_action_method?:
            | Database['public']['Enums']['marketplace_initiation_method']
            | null
          initiation_action_url?: string | null
          partner_id: number
          published?: boolean
          registry_listing_url?: string | null
          slug: string
          submitted_by?: string | null
          summary?: string | null
          title: string
          type: Database['public']['Enums']['marketplace_listing_type']
          updated_at?: string
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          documentation_url?: string | null
          files?: string[]
          id?: never
          initiation_action_method?:
            | Database['public']['Enums']['marketplace_initiation_method']
            | null
          initiation_action_url?: string | null
          partner_id?: number
          published?: boolean
          registry_listing_url?: string | null
          slug?: string
          submitted_by?: string | null
          summary?: string | null
          title?: string
          type?: Database['public']['Enums']['marketplace_listing_type']
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'listings_partner_id_fkey'
            columns: ['partner_id']
            isOneToOne: false
            referencedRelation: 'partners'
            referencedColumns: ['id']
          },
        ]
      }
      partner_members: {
        Row: {
          created_at: string
          partner_id: number
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          partner_id: number
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          partner_id?: number
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'partner_members_partner_id_fkey'
            columns: ['partner_id']
            isOneToOne: false
            referencedRelation: 'partners'
            referencedColumns: ['id']
          },
        ]
      }
      partners: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: number
          logo_url: string | null
          role: Database['public']['Enums']['marketplace_partner_role']
          slug: string
          title: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: never
          logo_url?: string | null
          role?: Database['public']['Enums']['marketplace_partner_role']
          slug: string
          title: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: never
          logo_url?: string | null
          role?: Database['public']['Enums']['marketplace_partner_role']
          slug?: string
          title?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_partner_member: {
        Args: {
          target_email: string
          target_partner_id: number
          target_role?: string
        }
        Returns: {
          created_at: string
          partner_id: number
          role: string
          user_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'partner_members'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      before_user_created_hook: { Args: { event: Json }; Returns: Json }
      is_admin_member: { Args: never; Returns: boolean }
      is_partner_admin: {
        Args: { target_partner_id: number }
        Returns: boolean
      }
      is_partner_member: {
        Args: { target_partner_id: number }
        Returns: boolean
      }
      is_review_manager_member: { Args: never; Returns: boolean }
      is_reviewer_member: { Args: never; Returns: boolean }
      listing_latest_review_is_approved: {
        Args: { target_listing_id: number }
        Returns: boolean
      }
      storage_object_listing_id: {
        Args: { object_name: string }
        Returns: number
      }
      storage_object_partner_id: {
        Args: { object_name: string }
        Returns: number
      }
    }
    Enums: {
      marketplace_initiation_method: 'POST' | 'GET'
      marketplace_listing_type: 'oauth' | 'template'
      marketplace_partner_role: 'partner' | 'reviewer' | 'admin'
      marketplace_review_status: 'draft' | 'pending_review' | 'approved' | 'rejected'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      marketplace_initiation_method: ['POST', 'GET'],
      marketplace_listing_type: ['oauth', 'template'],
      marketplace_partner_role: ['partner', 'reviewer', 'admin'],
      marketplace_review_status: ['draft', 'pending_review', 'approved', 'rejected'],
    },
  },
} as const

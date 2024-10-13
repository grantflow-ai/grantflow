export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      app_users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      application_drafts: {
        Row: {
          cfp_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_resubmission: boolean
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cfp_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_resubmission?: boolean
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cfp_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_resubmission?: boolean
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_drafts_cfp_id_fkey"
            columns: ["cfp_id"]
            isOneToOne: false
            referencedRelation: "grant_cfps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_drafts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_application_answers: {
        Row: {
          created_at: string
          deleted_at: string | null
          draft_id: string
          file_urls: string[] | null
          id: string
          question_id: string
          question_type: Database["public"]["Enums"]["question_type"]
          research_aim_id: string | null
          task_id: string | null
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          draft_id: string
          file_urls?: string[] | null
          id?: string
          question_id: string
          question_type: Database["public"]["Enums"]["question_type"]
          research_aim_id?: string | null
          task_id?: string | null
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          draft_id?: string
          file_urls?: string[] | null
          id?: string
          question_id?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          research_aim_id?: string | null
          task_id?: string | null
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "grant_application_answers_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "application_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_application_answers_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "application_drafts_completion"
            referencedColumns: ["draft_id"]
          },
          {
            foreignKeyName: "grant_application_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "grant_application_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_application_answers_research_aim_id_fkey"
            columns: ["research_aim_id"]
            isOneToOne: false
            referencedRelation: "research_aims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_application_answers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "research_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_application_questions: {
        Row: {
          created_at: string
          deleted_at: string | null
          depends_on: string[] | null
          external_links: string[] | null
          file_upload: boolean
          help_text: string | null
          id: string
          input_type: Database["public"]["Enums"]["wizard_input_type"]
          max_length: number | null
          ordering: number
          question_type: Database["public"]["Enums"]["question_type"]
          required: boolean
          section_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          depends_on?: string[] | null
          external_links?: string[] | null
          file_upload?: boolean
          help_text?: string | null
          id?: string
          input_type?: Database["public"]["Enums"]["wizard_input_type"]
          max_length?: number | null
          ordering: number
          question_type?: Database["public"]["Enums"]["question_type"]
          required?: boolean
          section_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          depends_on?: string[] | null
          external_links?: string[] | null
          file_upload?: boolean
          help_text?: string | null
          id?: string
          input_type?: Database["public"]["Enums"]["wizard_input_type"]
          max_length?: number | null
          ordering?: number
          question_type?: Database["public"]["Enums"]["question_type"]
          required?: boolean
          section_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_application_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "grant_wizard_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_cfps: {
        Row: {
          allow_clinical_trials: boolean
          allow_resubmissions: boolean
          created_at: string
          deleted_at: string | null
          funding_organization_id: string
          grant_identifier: string
          id: string
          max_research_aims: number
          max_tasks: number
          text: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          allow_clinical_trials?: boolean
          allow_resubmissions?: boolean
          created_at?: string
          deleted_at?: string | null
          funding_organization_id: string
          grant_identifier: string
          id?: string
          max_research_aims?: number
          max_tasks?: number
          text?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          allow_clinical_trials?: boolean
          allow_resubmissions?: boolean
          created_at?: string
          deleted_at?: string | null
          funding_organization_id?: string
          grant_identifier?: string
          id?: string
          max_research_aims?: number
          max_tasks?: number
          text?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grant_cfps_funding_organization_id_fkey"
            columns: ["funding_organization_id"]
            isOneToOne: false
            referencedRelation: "grant_funding_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_funding_organization: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      grant_wizard_sections: {
        Row: {
          cfp_id: string
          clinical_trials_only: boolean
          created_at: string
          deleted_at: string | null
          help_text: string | null
          id: string
          is_research_plan_section: boolean
          ordering: number
          resubmission_only: boolean
          title: string
          updated_at: string
        }
        Insert: {
          cfp_id: string
          clinical_trials_only?: boolean
          created_at?: string
          deleted_at?: string | null
          help_text?: string | null
          id?: string
          is_research_plan_section?: boolean
          ordering: number
          resubmission_only?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          cfp_id?: string
          clinical_trials_only?: boolean
          created_at?: string
          deleted_at?: string | null
          help_text?: string | null
          id?: string
          is_research_plan_section?: boolean
          ordering?: number
          resubmission_only?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_wizard_sections_cfp_id_fkey"
            columns: ["cfp_id"]
            isOneToOne: false
            referencedRelation: "grant_cfps"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          declined_at: string | null
          deleted_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          declined_at?: string | null
          deleted_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          declined_at?: string | null
          deleted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mailing_list: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          link: string | null
          read: boolean | null
          title: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          link?: string | null
          read?: boolean | null
          title?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      research_aims: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          draft_id: string
          file_urls: string[] | null
          id: string
          includes_clinical_trials: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          draft_id: string
          file_urls?: string[] | null
          id?: string
          includes_clinical_trials?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          draft_id?: string
          file_urls?: string[] | null
          id?: string
          includes_clinical_trials?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_aims_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "application_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_aims_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "application_drafts_completion"
            referencedColumns: ["draft_id"]
          },
        ]
      }
      research_tasks: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          file_urls: string[] | null
          id: string
          research_aim_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          file_urls?: string[] | null
          id?: string
          research_aim_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          file_urls?: string[] | null
          id?: string
          research_aim_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_tasks_research_aim_id_fkey"
            columns: ["research_aim_id"]
            isOneToOne: false
            referencedRelation: "research_aims"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_users: {
        Row: {
          created_at: string
          deleted_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_users_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      application_drafts_completion: {
        Row: {
          completion_percentage: number | null
          draft_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_completion_percentage: {
        Args: {
          application_draft_id: string
        }
        Returns: number
      }
    }
    Enums: {
      invitation_status: "pending" | "accepted" | "declined"
      notification_type: "invitation" | "message" | "alert"
      question_type: "per-section" | "per-research-aim" | "per-research-task"
      user_role: "owner" | "admin" | "member"
      wizard_input_type: "text" | "boolean" | "date" | "date-range"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never


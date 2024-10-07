export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					operationName?: string;
					query?: string;
					variables?: Json;
					extensions?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			app_users: {
				Row: {
					avatar_url: string | null;
					created_at: string;
					email: string;
					first_name: string;
					id: string;
					last_name: string;
					updated_at: string;
				};
				Insert: {
					avatar_url?: string | null;
					created_at?: string;
					email: string;
					first_name: string;
					id: string;
					last_name: string;
					updated_at?: string;
				};
				Update: {
					avatar_url?: string | null;
					created_at?: string;
					email?: string;
					first_name?: string;
					id?: string;
					last_name?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "app_users_id_fkey";
						columns: ["id"];
						isOneToOne: true;
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
				];
			};
			application_drafts: {
				Row: {
					cfp_id: string;
					created_at: string;
					deleted_at: string | null;
					id: string;
					updated_at: string;
				};
				Insert: {
					cfp_id: string;
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					updated_at?: string;
				};
				Update: {
					cfp_id?: string;
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "application_drafts_cfp_id_fkey";
						columns: ["cfp_id"];
						isOneToOne: false;
						referencedRelation: "grant_cfps";
						referencedColumns: ["id"];
					},
				];
			};
			application_questions: {
				Row: {
					allow_file_upload: boolean;
					created_at: string;
					deleted_at: string | null;
					grant_application_section_id: string;
					id: string;
					input_type: Database["public"]["Enums"]["question_input_type"];
					max_length: number | null;
					parent_id: string | null;
					position: number;
					required: boolean;
					text: string;
					updated_at: string;
				};
				Insert: {
					allow_file_upload?: boolean;
					created_at?: string;
					deleted_at?: string | null;
					grant_application_section_id: string;
					id?: string;
					input_type: Database["public"]["Enums"]["question_input_type"];
					max_length?: number | null;
					parent_id?: string | null;
					position: number;
					required: boolean;
					text: string;
					updated_at?: string;
				};
				Update: {
					allow_file_upload?: boolean;
					created_at?: string;
					deleted_at?: string | null;
					grant_application_section_id?: string;
					id?: string;
					input_type?: Database["public"]["Enums"]["question_input_type"];
					max_length?: number | null;
					parent_id?: string | null;
					position?: number;
					required?: boolean;
					text?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "application_questions_grant_application_section_id_fkey";
						columns: ["grant_application_section_id"];
						isOneToOne: false;
						referencedRelation: "application_sections";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "application_questions_parent_id_fkey";
						columns: ["parent_id"];
						isOneToOne: false;
						referencedRelation: "application_questions";
						referencedColumns: ["id"];
					},
				];
			};
			application_sections: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					description: string;
					grant_cfp_id: string;
					id: string;
					position: number;
					title: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					description: string;
					grant_cfp_id: string;
					id?: string;
					position: number;
					title: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					description?: string;
					grant_cfp_id?: string;
					id?: string;
					position?: number;
					title?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "application_sections_grant_cfp_id_fkey";
						columns: ["grant_cfp_id"];
						isOneToOne: false;
						referencedRelation: "grant_cfps";
						referencedColumns: ["id"];
					},
				];
			};
			grant_application_answers: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					draft_id: string;
					file_urls: string[] | null;
					id: string;
					question_id: string;
					research_aim_id: string | null;
					task_id: string | null;
					updated_at: string;
					value: Json;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					draft_id: string;
					file_urls?: string[] | null;
					id?: string;
					question_id: string;
					research_aim_id?: string | null;
					task_id?: string | null;
					updated_at?: string;
					value: Json;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					draft_id?: string;
					file_urls?: string[] | null;
					id?: string;
					question_id?: string;
					research_aim_id?: string | null;
					task_id?: string | null;
					updated_at?: string;
					value?: Json;
				};
				Relationships: [
					{
						foreignKeyName: "grant_application_answers_draft_id_fkey";
						columns: ["draft_id"];
						isOneToOne: false;
						referencedRelation: "application_drafts";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "grant_application_answers_question_id_fkey";
						columns: ["question_id"];
						isOneToOne: false;
						referencedRelation: "application_questions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "grant_application_answers_research_aim_id_fkey";
						columns: ["research_aim_id"];
						isOneToOne: false;
						referencedRelation: "research_aims";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "grant_application_answers_task_id_fkey";
						columns: ["task_id"];
						isOneToOne: false;
						referencedRelation: "tasks";
						referencedColumns: ["id"];
					},
				];
			};
			grant_cfps: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					funding_organization: string;
					id: string;
					identifier: string;
					text: string | null;
					updated_at: string;
					url: string | null;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					funding_organization: string;
					id?: string;
					identifier: string;
					text?: string | null;
					updated_at?: string;
					url?: string | null;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					funding_organization?: string;
					id?: string;
					identifier?: string;
					text?: string | null;
					updated_at?: string;
					url?: string | null;
				};
				Relationships: [];
			};
			invitations: {
				Row: {
					accepted_at: string | null;
					created_at: string;
					declined_at: string | null;
					deleted_at: string | null;
					email: string;
					expires_at: string;
					id: string;
					invited_by: string;
					organization_id: string;
					role: "owner" | "admin" | "member";
					status: "pending" | "accepted" | "declined";
					token: string;
				};
				Insert: {
					accepted_at?: string | null;
					created_at?: string;
					declined_at?: string | null;
					deleted_at?: string | null;
					email: string;
					expires_at?: string;
					id?: string;
					invited_by: string;
					organization_id: string;
					role: "owner" | "admin" | "member";
					status?: "pending" | "accepted" | "declined";
					token?: string;
				};
				Update: {
					accepted_at?: string | null;
					created_at?: string;
					declined_at?: string | null;
					deleted_at?: string | null;
					email?: string;
					expires_at?: string;
					id?: string;
					invited_by?: string;
					organization_id?: string;
					role?: "owner" | "admin" | "member";
					status?: "pending" | "accepted" | "declined";
					token?: string;
				};
				Relationships: [
					{
						foreignKeyName: "invitations_invited_by_fkey";
						columns: ["invited_by"];
						isOneToOne: false;
						referencedRelation: "app_users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "invitations_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			mailing_list: {
				Row: {
					created_at: string;
					email: string;
					id: string;
				};
				Insert: {
					created_at?: string;
					email: string;
					id?: string;
				};
				Update: {
					created_at?: string;
					email?: string;
					id?: string;
				};
				Relationships: [];
			};
			notifications: {
				Row: {
					content: string;
					created_at: string;
					deleted_at: string | null;
					id: string;
					link: string | null;
					read: boolean | null;
					title: string | null;
					type: "invitation" | "message" | "alert";
					user_id: string;
				};
				Insert: {
					content: string;
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					link?: string | null;
					read?: boolean | null;
					title?: string | null;
					type?: "invitation" | "message" | "alert";
					user_id: string;
				};
				Update: {
					content?: string;
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					link?: string | null;
					read?: boolean | null;
					title?: string | null;
					type?: "invitation" | "message" | "alert";
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "notifications_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "app_users";
						referencedColumns: ["id"];
					},
				];
			};
			organization_users: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					organization_id: string;
					role: "owner" | "admin" | "member";
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					organization_id: string;
					role: "owner" | "admin" | "member";
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					organization_id?: string;
					role?: "owner" | "admin" | "member";
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "organization_users_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "organization_users_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "app_users";
						referencedColumns: ["id"];
					},
				];
			};
			organizations: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					id: string;
					logo: string | null;
					name: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					logo?: string | null;
					name: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					logo?: string | null;
					name?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			question_dependencies: {
				Row: {
					condition: Json | null;
					depends_on_question_id: string;
					question_id: string;
				};
				Insert: {
					condition?: Json | null;
					depends_on_question_id: string;
					question_id: string;
				};
				Update: {
					condition?: Json | null;
					depends_on_question_id?: string;
					question_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "question_dependencies_depends_on_question_id_fkey";
						columns: ["depends_on_question_id"];
						isOneToOne: false;
						referencedRelation: "application_questions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "question_dependencies_question_id_fkey";
						columns: ["question_id"];
						isOneToOne: false;
						referencedRelation: "application_questions";
						referencedColumns: ["id"];
					},
				];
			};
			research_aims: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					description: string | null;
					draft_id: string;
					file_urls: string[] | null;
					id: string;
					question_id: string;
					title: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					draft_id: string;
					file_urls?: string[] | null;
					id?: string;
					question_id: string;
					title: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					draft_id?: string;
					file_urls?: string[] | null;
					id?: string;
					question_id?: string;
					title?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "research_aims_draft_id_fkey";
						columns: ["draft_id"];
						isOneToOne: false;
						referencedRelation: "application_drafts";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "research_aims_question_id_fkey";
						columns: ["question_id"];
						isOneToOne: false;
						referencedRelation: "application_questions";
						referencedColumns: ["id"];
					},
				];
			};
			tasks: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					description: string | null;
					file_urls: string[] | null;
					id: string;
					research_aim_id: string;
					title: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					file_urls?: string[] | null;
					id?: string;
					research_aim_id: string;
					title: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					file_urls?: string[] | null;
					id?: string;
					research_aim_id?: string;
					title?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "tasks_research_aim_id_fkey";
						columns: ["research_aim_id"];
						isOneToOne: false;
						referencedRelation: "research_aims";
						referencedColumns: ["id"];
					},
				];
			};
			workspace_users: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					role: "owner" | "admin" | "member";
					updated_at: string;
					user_id: string;
					workspace_id: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					role: "owner" | "admin" | "member";
					updated_at?: string;
					user_id: string;
					workspace_id: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					role?: "owner" | "admin" | "member";
					updated_at?: string;
					user_id?: string;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "workspace_users_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "app_users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "workspace_users_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			workspaces: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					description: string | null;
					id: string;
					name: string;
					organization_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					id?: string;
					name: string;
					organization_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					id?: string;
					name?: string;
					organization_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "workspaces_organization_id_fkey";
						columns: ["organization_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			invitation_status: "pending" | "accepted" | "declined";
			notification_type: "invitation" | "message" | "alert";
			question_input_type: "text" | "boolean" | "date" | "date-range" | "for-each-item";
			question_item_type: "aim" | "task";
			user_role: "owner" | "admin" | "member";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
	PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"]) | { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
				Database[PublicTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
			Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
		? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
		? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
		? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	PublicEnumNameOrOptions extends keyof PublicSchema["Enums"] | { schema: keyof Database },
	EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
	? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
		? PublicSchema["Enums"][PublicEnumNameOrOptions]
		: never;

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
					id: string;
					name: string | null;
					updated_at: string;
				};
				Insert: {
					avatar_url?: string | null;
					created_at?: string;
					email: string;
					id: string;
					name?: string | null;
					updated_at?: string;
				};
				Update: {
					avatar_url?: string | null;
					created_at?: string;
					email?: string;
					id?: string;
					name?: string | null;
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
			funding_organizations: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					id: string;
					logo_url: string | null;
					name: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					logo_url?: string | null;
					name: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					logo_url?: string | null;
					name?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			grant_applications: {
				Row: {
					cfp_id: string;
					created_at: string;
					deleted_at: string | null;
					id: string;
					innovation: string;
					is_resubmission: boolean;
					significance: string;
					title: string;
					updated_at: string;
					workspace_id: string;
				};
				Insert: {
					cfp_id: string;
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					innovation: string;
					is_resubmission?: boolean;
					significance: string;
					title: string;
					updated_at?: string;
					workspace_id: string;
				};
				Update: {
					cfp_id?: string;
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					innovation?: string;
					is_resubmission?: boolean;
					significance?: string;
					title?: string;
					updated_at?: string;
					workspace_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "grant_applications_cfp_id_fkey";
						columns: ["cfp_id"];
						isOneToOne: false;
						referencedRelation: "grant_cfps";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "grant_applications_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			grant_cfps: {
				Row: {
					allow_clinical_trials: boolean;
					allow_resubmissions: boolean;
					category: string | null;
					code: string;
					created_at: string;
					deleted_at: string | null;
					description: string | null;
					funding_organization_id: string;
					id: string;
					title: string;
					updated_at: string;
					url: string | null;
				};
				Insert: {
					allow_clinical_trials?: boolean;
					allow_resubmissions?: boolean;
					category?: string | null;
					code: string;
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					funding_organization_id: string;
					id?: string;
					title: string;
					updated_at?: string;
					url?: string | null;
				};
				Update: {
					allow_clinical_trials?: boolean;
					allow_resubmissions?: boolean;
					category?: string | null;
					code?: string;
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					funding_organization_id?: string;
					id?: string;
					title?: string;
					updated_at?: string;
					url?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "grant_cfps_funding_organization_id_fkey";
						columns: ["funding_organization_id"];
						isOneToOne: false;
						referencedRelation: "funding_organizations";
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
			research_aims: {
				Row: {
					application_id: string;
					created_at: string;
					deleted_at: string | null;
					description: string;
					file_urls: string[] | null;
					id: string;
					required_clinical_trials: boolean;
					title: string;
					updated_at: string;
				};
				Insert: {
					application_id: string;
					created_at?: string;
					deleted_at?: string | null;
					description: string;
					file_urls?: string[] | null;
					id?: string;
					required_clinical_trials?: boolean;
					title: string;
					updated_at?: string;
				};
				Update: {
					application_id?: string;
					created_at?: string;
					deleted_at?: string | null;
					description?: string;
					file_urls?: string[] | null;
					id?: string;
					required_clinical_trials?: boolean;
					title?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "research_aims_application_id_fkey";
						columns: ["application_id"];
						isOneToOne: false;
						referencedRelation: "grant_applications";
						referencedColumns: ["id"];
					},
				];
			};
			research_tasks: {
				Row: {
					aim_id: string;
					created_at: string;
					deleted_at: string | null;
					description: string;
					file_urls: string[] | null;
					id: string;
					title: string;
					updated_at: string;
				};
				Insert: {
					aim_id: string;
					created_at?: string;
					deleted_at?: string | null;
					description: string;
					file_urls?: string[] | null;
					id?: string;
					title: string;
					updated_at?: string;
				};
				Update: {
					aim_id?: string;
					created_at?: string;
					deleted_at?: string | null;
					description?: string;
					file_urls?: string[] | null;
					id?: string;
					title?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "research_tasks_aim_id_fkey";
						columns: ["aim_id"];
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
					logo_url: string | null;
					name: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					id?: string;
					logo_url?: string | null;
					name: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					id?: string;
					logo_url?: string | null;
					name?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			user_role: "owner" | "admin" | "member";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type PublicSchema = Database[Extract<keyof Database, "public">];

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

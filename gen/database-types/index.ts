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
			invitations: {
				Row: {
					accepted_at: string | null;
					created_at: string;
					declined_at: string | null;
					deleted_at: string | null;
					email: string;
					id: string;
					invited_by: string;
					status: Database["public"]["Enums"]["invitation_status"];
					workspace_id: string;
				};
				Insert: {
					accepted_at?: string | null;
					created_at?: string;
					declined_at?: string | null;
					deleted_at?: string | null;
					email: string;
					id: string;
					invited_by: string;
					status?: Database["public"]["Enums"]["invitation_status"];
					workspace_id: string;
				};
				Update: {
					accepted_at?: string | null;
					created_at?: string;
					declined_at?: string | null;
					deleted_at?: string | null;
					email?: string;
					id?: string;
					invited_by?: string;
					status?: Database["public"]["Enums"]["invitation_status"];
					workspace_id?: string;
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
						foreignKeyName: "invitations_workspace_id_fkey";
						columns: ["workspace_id"];
						isOneToOne: false;
						referencedRelation: "workspaces";
						referencedColumns: ["id"];
					},
				];
			};
			notifications: {
				Row: {
					content: string;
					created_at: string;
					deleted_at: string | null;
					id: string;
					read: boolean | null;
					user_id: string;
				};
				Insert: {
					content: string;
					created_at?: string;
					deleted_at?: string | null;
					id: string;
					read?: boolean | null;
					user_id: string;
				};
				Update: {
					content?: string;
					created_at?: string;
					deleted_at?: string | null;
					id?: string;
					read?: boolean | null;
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
			workspace_users: {
				Row: {
					deleted_at: string | null;
					role: Database["public"]["Enums"]["workspace_role"];
					user_id: string;
					workspace_id: string;
				};
				Insert: {
					deleted_at?: string | null;
					role: Database["public"]["Enums"]["workspace_role"];
					user_id: string;
					workspace_id: string;
				};
				Update: {
					deleted_at?: string | null;
					role?: Database["public"]["Enums"]["workspace_role"];
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
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					id: string;
					name: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					id?: string;
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
			invitation_status: "pending" | "accepted" | "declined";
			workspace_role: "owner" | "admin" | "viewer";
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

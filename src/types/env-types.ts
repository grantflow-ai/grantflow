export interface Env {
	// Server only
	AZURE_STORAGE_ACCOUNT_NAME: string;
	AZURE_STORAGE_ACCOUNT_KEY: string;
	AZURE_STORAGE_CONTAINER_NAME: string;

	// Client only
	NEXT_PUBLIC_SITE_URL: string;
	NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
	NEXT_PUBLIC_SUPABASE_URL: string;

	// Shared
	NEXT_PUBLIC_DEBUG?: boolean;
	NEXT_PUBLIC_IS_DEVELOPMENT?: boolean;
}

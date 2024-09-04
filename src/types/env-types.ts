export interface Env {
	// Server only
	AWS_ACCESS_KEY_ID: string;
	AWS_SECRET_ACCESS_KEY: string;
	// Client only
	NEXT_PUBLIC_SITE_URL: string;
	NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
	NEXT_PUBLIC_SUPABASE_URL: string;

	// Shared
	NEXT_PUBLIC_DEBUG?: boolean;
}

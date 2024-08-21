export interface Env {
	// Client only
	NEXT_PUBLIC_SITE_URL: string;
	NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
	NEXT_PUBLIC_SUPABASE_URL: string;

	// Shared
	NEXT_PUBLIC_DEBUG?: boolean;
}

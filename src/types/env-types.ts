export interface Env {
	// client only
	NEXT_PUBLIC_SITE_URL: string;
	NEXT_PUBLIC_FIREBASE_API_KEY: string;
	NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;

	// shared
	NEXT_PUBLIC_BACKEND_API_BASE_URL: string;
	NEXT_PUBLIC_DEBUG?: boolean;
}

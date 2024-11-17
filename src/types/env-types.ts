export interface Env {
	// Server only
	BACKEND_API_BASE_URL: string;
	BACKEND_API_TOKEN: string;
	AZURE_STORAGE_ACCOUNT_KEY: string;
	AZURE_STORAGE_ACCOUNT_NAME: string;
	AZURE_STORAGE_CONTAINER_NAME: string;
	DATABASE_CONNECTION_STRING: string;
	AUTH_GOOGLE_ID: string;
	AUTH_GOOGLE_SECRET: string;
	AUTH_SECRET: string;
	AUTH_RESEND_KEY: string;

	// Client only
	NEXT_PUBLIC_SITE_URL: string;

	// Shared
	NEXT_PUBLIC_DEBUG?: boolean;
	NEXT_PUBLIC_IS_DEVELOPMENT?: boolean;
}

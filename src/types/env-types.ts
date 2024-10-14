export interface Env {
	// Server only
	AZURE_STORAGE_ACCOUNT_KEY: string;
	AZURE_STORAGE_ACCOUNT_NAME: string;
	AZURE_STORAGE_CONTAINER_NAME: string;
	DATABASE_CONNECTION_STRING: string;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_SECRET: string;

	// Client only
	NEXT_PUBLIC_SITE_URL: string;

	// Shared
	NEXT_PUBLIC_DEBUG?: boolean;
	NEXT_PUBLIC_IS_DEVELOPMENT?: boolean;
}

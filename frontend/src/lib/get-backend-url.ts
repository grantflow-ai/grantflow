import { getEnv } from "@/utils/env";

// Helper to construct full API URLs
export function getApiUrl(path: string): string {
	const baseUrl = getBackendUrl();
	// Ensure no double slashes
	const cleanPath = path.startsWith("/") ? path : `/${path}`;
	return `${baseUrl}${cleanPath}`;
}

export function getBackendUrl(): string {
	// In production, this would come from environment variable
	return getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL;
}

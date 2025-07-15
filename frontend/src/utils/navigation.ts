import { PagePath } from "@/enums";

interface BaseNavigationParams {
	query?: Record<string, string>;
}

/**
 * Clean navigation routes without URL parameters or exposed IDs
 *
 * - All routes are static (e.g., /project, /application/editor)
 * - Entity context is managed through the navigation store
 * - UUIDs are used for API calls but never in URLs
 */
export const routes = {
	acceptInvitation: ({ query }: BaseNavigationParams = {}) => {
		const params = new URLSearchParams(query);
		const queryString = params.toString();
		return queryString ? `/accept-invitation?${queryString}` : "/accept-invitation";
	},

	// Application routes (context from store)
	application: {
		detail: () => "/application",
		editor: () => "/application/editor",
		wizard: () => "/application/wizard",
	},
	// Public routes
	home: () => "/",
	login: () => PagePath.LOGIN,

	// API routes
	notifications: {
		dismiss: (notificationId: string) => `/api/notifications/${notificationId}/dismiss`,
	},

	// Project routes (context from store)
	project: {
		applications: {
			list: () => "/project/applications",
			new: () => "/project/applications/new",
		},
		detail: () => "/project",
		settings: {
			account: () => "/project/settings/account",
			billing: () => "/project/settings/billing",
			members: () => "/project/settings/members",
			notifications: () => "/project/settings/notifications",
		},
	},

	// Dashboard
	projects: () => PagePath.PROJECTS,
};

export interface NavigationOptions {
	replace?: boolean;
	scroll?: boolean;
}

export function buildUrl(path: string, query?: Record<string, string>): string {
	if (!query || Object.keys(query).length === 0) {
		return path;
	}

	const params = new URLSearchParams(query);
	return `${path}?${params.toString()}`;
}

export function navigateTo(
	router: { push: (url: string) => void; replace: (url: string) => void },
	path: string,
	options: NavigationOptions = {},
): void {
	const { replace = false } = options;

	if (replace) {
		router.replace(path);
	} else {
		router.push(path);
	}
}

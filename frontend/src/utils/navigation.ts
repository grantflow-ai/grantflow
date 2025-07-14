import { PagePath } from "@/enums";

interface BaseNavigationParams {
	query?: Record<string, string>;
}

/**
 * Navigation routes without URL parameters
 * All entity selection is handled through the navigation store
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

export function createApplicationSlug(applicationId: string, applicationTitle: string): string {
	const shortId = applicationId.slice(0, 8);
	const sanitizedTitle = applicationTitle
		.toLowerCase()
		.replaceAll(/[^a-z0-9]/g, "-")
		.replaceAll(/-+/g, "-")
		.replaceAll(/(^-)|(-$)/g, "");
	return `${sanitizedTitle}-${shortId}`;
}

// Slug utilities
export function createProjectSlug(projectId: string, projectName: string): string {
	const shortId = projectId.slice(0, 8);
	const sanitizedName = projectName
		.toLowerCase()
		.replaceAll(/[^a-z0-9]/g, "-")
		.replaceAll(/-+/g, "-")
		.replaceAll(/(^-)|(-$)/g, "");
	return `${sanitizedName}-${shortId}`;
}

export function extractIdFromSlug(slug: string): null | string {
	// Extract the last segment after the final hyphen
	const parts = slug.split("-");
	const shortId = parts.at(-1);

	// Validate it looks like a short UUID (8 hex characters)
	if (shortId && /^[a-f0-9]{8}$/i.test(shortId)) {
		return shortId;
	}

	return null;
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

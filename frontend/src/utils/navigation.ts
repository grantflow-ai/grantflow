import { PagePath } from "@/enums";

import { slugStore } from "./slug-store";

interface ApplicationNavigationParams extends ProjectNavigationParams {
	applicationId: string;
	applicationTitle: string;
}

interface BaseNavigationParams {
	query?: Record<string, string>;
}

interface NotificationNavigationParams extends BaseNavigationParams {
	notificationId: string;
}

interface ProjectNavigationParams extends BaseNavigationParams {
	projectId: string;
	projectName: string;
}

export const routes = {
	acceptInvitation: ({ query }: BaseNavigationParams = {}) => {
		const params = new URLSearchParams(query);
		const queryString = params.toString();
		return queryString ? `/accept-invitation?${queryString}` : "/accept-invitation";
	},

	application: {
		create: ({ projectId, projectName }: ProjectNavigationParams) => {
			const slug = slugStore.registerProject(projectId, projectName);
			return `/projects/${slug}/applications/new`;
		},
		detail: ({ applicationId, applicationTitle, projectId, projectName }: ApplicationNavigationParams) => {
			const projectSlug = slugStore.registerProject(projectId, projectName);
			const applicationSlug = slugStore.registerApplication(applicationId, applicationTitle);
			return `/projects/${projectSlug}/applications/${applicationSlug}`;
		},
		editor: ({ applicationId, applicationTitle, projectId, projectName }: ApplicationNavigationParams) => {
			const projectSlug = slugStore.registerProject(projectId, projectName);
			const applicationSlug = slugStore.registerApplication(applicationId, applicationTitle);
			return `/projects/${projectSlug}/applications/${applicationSlug}/editor`;
		},
		wizard: ({ applicationId, applicationTitle, projectId, projectName }: ApplicationNavigationParams) => {
			const projectSlug = slugStore.registerProject(projectId, projectName);
			const applicationSlug = slugStore.registerApplication(applicationId, applicationTitle);
			return `/projects/${projectSlug}/applications/${applicationSlug}/wizard`;
		},
	},
	home: () => "/",
	login: () => PagePath.LOGIN,

	notifications: {
		dismiss: ({ notificationId }: NotificationNavigationParams) => `/api/notifications/${notificationId}/dismiss`,
	},

	project: {
		detail: ({ projectId, projectName }: ProjectNavigationParams) => {
			const slug = slugStore.registerProject(projectId, projectName);
			return `/projects/${slug}`;
		},
		list: () => PagePath.PROJECTS,
		settings: {
			account: ({ projectId, projectName }: ProjectNavigationParams) => {
				const slug = slugStore.registerProject(projectId, projectName);
				return `/projects/${slug}/settings/account`;
			},
			billing: ({ projectId, projectName }: ProjectNavigationParams) => {
				const slug = slugStore.registerProject(projectId, projectName);
				return `/projects/${slug}/settings/billing`;
			},
			members: ({ projectId, projectName }: ProjectNavigationParams) => {
				const slug = slugStore.registerProject(projectId, projectName);
				return `/projects/${slug}/settings/members`;
			},
			notifications: ({ projectId, projectName }: ProjectNavigationParams) => {
				const slug = slugStore.registerProject(projectId, projectName);
				return `/projects/${slug}/settings/notifications`;
			},
		},
	},
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

export function createApplicationSlug(title: string, id: string): string {
	const baseSlug = generateSlug(title || "untitled-application");
	const [shortId] = id.split("-");
	return `${baseSlug}-${shortId}`;
}

export function createProjectSlug(name: string, id: string): string {
	const baseSlug = generateSlug(name);
	const [shortId] = id.split("-");
	return `${baseSlug}-${shortId}`;
}

export function extractIdFromSlug(slug: string): null | string {
	// Extract short ID from slug (last part after hyphen)
	const parts = slug.split("-");
	const possibleId = parts.at(-1);

	// Validate it's an 8-character hex string
	if (possibleId && possibleId.length === 8 && /^[0-9a-f]{8}$/i.test(possibleId)) {
		return possibleId;
	}

	return null;
}

export function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replaceAll(/[^a-z0-9\s-]/g, "")
		.replaceAll(/\s+/g, "-")
		.replaceAll(/-+/g, "-")
		.replaceAll(/(^-+|-+$)/g, "")
		.slice(0, 50);
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

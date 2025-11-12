interface BaseNavigationParams {
	query?: Record<string, string>;
}

export const routes = {
	acceptInvitation: ({ query }: BaseNavigationParams = {}) => {
		const params = new URLSearchParams(query);
		const queryString = params.toString();
		return queryString ? `/accept-invitation?${queryString}` : "/accept-invitation";
	},

	admin: {
		grantingInstitutions: {
			detail: (id: string) => `/organization/admin/granting-institutions/${id}`,
			edit: (id: string) => `/organization/admin/granting-institutions/${id}/edit`,
			list: () => "/organization/admin/granting-institutions",
			new: () => "/organization/admin/granting-institutions/new",
			predefinedTemplates: {
				detail: (templateId: string) => `/admin/granting-institutions/predefined-templates/${templateId}`,
				edit: (templateId: string) => `/admin/granting-institutions/predefined-templates/${templateId}/edit`,
				list: () => "/admin/granting-institutions/predefined-templates",
				new: () => "/admin/granting-institutions/predefined-templates/new",
			},
			sources: () => "/organization/admin/granting-institutions/sources",
		},
		root: () => "/admin",
	},
	finishEmailSignin: () => "/signup/email",

	home: () => "/",
	login: () => "/login",

	notifications: {
		dismiss: (notificationId: string) => `/api/notifications/${notificationId}/dismiss`,
	},
	onboarding: () => "/onboarding",

	organization: {
		project: {
			application: {
				detail: () => "/organization/project/application",
				editor: () => "/organization/project/application/editor",
				list: () => "/organization/project/application",
				new: () => "/organization/project/application/new",
				wizard: () => "/organization/project/application/wizard",
			},
			detail: () => "/organization/project",
		},
		root: () => "/organization",
		settings: {
			account: () => "/organization/settings/account",
			billing: () => "/organization/settings/billing",
			members: () => "/organization/settings/members",
			notifications: () => "/organization/settings/notifications",
			personal: () => "/organization/settings/personal",
		},
	},
	signup: () => "/signup",
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

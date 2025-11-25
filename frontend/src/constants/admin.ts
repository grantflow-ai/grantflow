import { routes } from "@/utils/navigation";

export type GrantingInstitutionTab = "settings" | "templates" | "sources";

export const getGrantingInstitutionTabs = (institutionId: string) =>
	[
		{
			href: routes.admin.grantingInstitutions.edit(institutionId),
			key: "settings" as const,
			label: "Settings",
		},
		{
			href: routes.admin.grantingInstitutions.sources(),
			key: "sources" as const,
			label: "Sources",
		},
		{
			href: routes.admin.grantingInstitutions.predefinedTemplates.list(),
			key: "templates" as const,
			label: "Templates",
		},
	] as const;

export const TAB_LABELS: Record<GrantingInstitutionTab, string> = {
	settings: "Settings",
	"templates": "Predefined Templates",
	sources: "Sources",
};

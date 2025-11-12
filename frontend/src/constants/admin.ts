import { routes } from "@/utils/navigation";

export type GrantingInstitutionTab = "edit" | "predefined-templates" | "sources";

export const GRANTING_INSTITUTION_TABS = [
	{
		href: routes.admin.grantingInstitutions.sources(),
		key: "sources" as const,
		label: "Sources",
	},
	{
		href: routes.admin.grantingInstitutions.predefinedTemplates.list(),
		key: "predefined-templates" as const,
		label: "Predefined Templates",
	},
	{
		href: routes.admin.grantingInstitutions.edit(),
		key: "edit" as const,
		label: "Edit",
	},
] as const;

export const TAB_LABELS: Record<GrantingInstitutionTab, string> = {
	edit: "Edit",
	"predefined-templates": "Predefined Templates",
	sources: "Sources",
};

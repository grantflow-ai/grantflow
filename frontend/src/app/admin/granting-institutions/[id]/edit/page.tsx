import { getOrganizations } from "@/actions/organization";
import { getProjects } from "@/actions/project";
import { AdminGrantingInstitutionEditContent } from "@/components/admin/granting-institutions/admin-granting-institution-edit-content";
import { AdminGrantingInstitutionClient } from "@/components/admin/layout/admin-granting-institution-client";
import { getSelectedOrgFromCookies } from "@/utils/organization-context";
import { getProjectTeamMembers } from "@/utils/project";
import type { API } from "@/types/api-types";

export default async function GrantingInstitutionEditPage() {
	const emptyProjects: API.ListProjects.Http200.ResponseBody = [];
	const organizations = await getOrganizations();
	const selectedOrganisationId =
		(await getSelectedOrgFromCookies()) ?? (organizations.at(0)?.id ?? null);

	let initialProjects = emptyProjects;
	if (selectedOrganisationId) {
		try {
			initialProjects = await getProjects(selectedOrganisationId);
		} catch {
			initialProjects = emptyProjects;
		}
	}

	const projectTeamMembers = getProjectTeamMembers(initialProjects);

	return (
		<AdminGrantingInstitutionClient activeTab="settings" projectTeamMembers={projectTeamMembers}>
			<AdminGrantingInstitutionEditContent />
		</AdminGrantingInstitutionClient>
	);
}
import { getOrganizations } from "@/actions/organization";
import { getProjects } from "@/actions/project";
import { DashboardClient } from "@/components/organizations/dashboard/dashboard-client";
import { getSelectedOrgFromCookies } from "@/utils/organization-context";

const EMPTY_PROJECTS: Awaited<ReturnType<typeof getProjects>> = [];

export default async function DashboardPage() {
	const organizations = await getOrganizations();
	const selectedOrganizationId =
		(await getSelectedOrgFromCookies()) ?? (organizations.length > 0 ? organizations[0].id : null);

	let initialProjects = EMPTY_PROJECTS;
	if (selectedOrganizationId) {
		try {
			initialProjects = await getProjects(selectedOrganizationId);
		} catch {
			initialProjects = EMPTY_PROJECTS;
		}
	}

	return <DashboardClient initialOrganizations={organizations} initialProjects={initialProjects} />;
}

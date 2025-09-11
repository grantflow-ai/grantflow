import { getOrganizations } from "@/actions/organization";
import { getProjects } from "@/actions/project";
import { DashboardClient } from "@/components/organizations/dashboard/dashboard-client";
import { getOrganizationId } from "@/utils/organization-context";

export default async function DashboardPage() {
	const organizations = await getOrganizations();

	let selectedOrganizationId = await getOrganizationId();

	if (!selectedOrganizationId && organizations.length > 0) {
		selectedOrganizationId = organizations[0].id;
	}

	const initialProjects = selectedOrganizationId ? await getProjects(selectedOrganizationId) : [];

	return (
		<DashboardClient
			initialOrganizations={organizations}
			initialProjects={initialProjects}
			initialSelectedOrganizationId={selectedOrganizationId}
		/>
	);
}

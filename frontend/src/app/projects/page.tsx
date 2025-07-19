import { getOrganizations } from "@/actions/organization";
import { getProjects } from "@/actions/project";
import { DashboardClient } from "@/components/projects/dashboard/dashboard-client";
import { getOrganizationId } from "@/utils/organization-context";

export default async function DashboardPage() {
	// Get organizations for the user
	const organizations = await getOrganizations();

	// Get the selected organization from cookie
	let selectedOrganizationId = await getOrganizationId();

	// If no organization is selected but user has organizations, select the first one
	if (!selectedOrganizationId && organizations.length > 0) {
		selectedOrganizationId = organizations[0].id;
	}

	// Fetch projects for the selected organization
	const initialProjects = selectedOrganizationId ? await getProjects(selectedOrganizationId) : [];

	return (
		<DashboardClient
			initialOrganizations={organizations}
			initialProjects={initialProjects}
			initialSelectedOrganizationId={selectedOrganizationId}
		/>
	);
}

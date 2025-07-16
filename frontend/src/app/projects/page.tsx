
import { getProjects } from "@/actions/project";
import { DashboardClient } from "@/components/projects/dashboard/dashboard-client";

export default async function DashboardPage() {
	const initialProjects = await getProjects();
	

	return <DashboardClient initialProjects={initialProjects} />;
}

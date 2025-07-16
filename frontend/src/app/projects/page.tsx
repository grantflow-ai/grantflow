import { ProjectListItemFactory } from "::testing/factories";
import { getProjects } from "@/actions/project";
import { DashboardClient } from "@/components/projects/dashboard/dashboard-client";

export default async function DashboardPage() {
	const initialProjects = await getProjects();
	const mockProjects = ProjectListItemFactory.batch(10)

	return <DashboardClient initialProjects={mockProjects} />;
}

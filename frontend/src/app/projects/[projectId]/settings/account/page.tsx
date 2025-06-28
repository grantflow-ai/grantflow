"use server";

import { getProject } from "@/actions/project";
import { ProjectSettingsClient } from "@/components/projects/settings/project-settings-client";

export default async function ProjectSettingsAccountPage({ params }: { params: Promise<{ projectId: string }> }) {
	const { projectId } = await params;

	const project = await getProject(projectId);

	return <ProjectSettingsClient activeTab="account" initialProject={project} />;
}

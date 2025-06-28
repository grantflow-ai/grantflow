"use server";

import { redirect } from "next/navigation";

import { getProject } from "@/actions/project";
import { ProjectSettingsClient } from "@/components/projects/settings/project-settings-client";
import { UserRole } from "@/types/user";

export default async function ProjectSettingsBillingPage({ params }: { params: Promise<{ projectId: string }> }) {
	const { projectId } = await params;

	const project = await getProject(projectId);

	if (project.role === UserRole.MEMBER) {
		redirect(`/projects/${projectId}/settings/account`);
	}

	return <ProjectSettingsClient activeTab="billing" initialProject={project} />;
}

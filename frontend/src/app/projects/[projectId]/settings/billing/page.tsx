"use server";

import { notFound, redirect } from "next/navigation";

import { getProject } from "@/actions/project";
import { ProjectSettingsClient } from "@/components/projects/settings/project-settings-client";
import { UserRole } from "@/types/user";
import { resolveProjectSlug } from "@/utils/slug-resolver";

export default async function ProjectSettingsBillingPage({ params }: { params: Promise<{ projectId: string }> }) {
	const { projectId: projectSlug } = await params;

	const projectId = await resolveProjectSlug(projectSlug);
	if (!projectId) {
		notFound();
	}

	const project = await getProject(projectId);

	if (project.role === UserRole.MEMBER) {
		redirect(`/projects/${projectSlug}/settings/account`);
	}

	return <ProjectSettingsClient activeTab="billing" initialProject={project} />;
}

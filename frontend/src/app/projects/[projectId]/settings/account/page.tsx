"use server";

import { notFound } from "next/navigation";
import { getProject } from "@/actions/project";
import { ProjectSettingsClient } from "@/components/projects/settings/project-settings-client";
import { resolveProjectSlug } from "@/utils/slug-resolver";

export default async function ProjectSettingsAccountPage({ params }: { params: Promise<{ projectId: string }> }) {
	const { projectId: projectSlug } = await params;

	const projectId = await resolveProjectSlug(projectSlug);
	if (!projectId) {
		notFound();
	}

	const project = await getProject(projectId);

	return <ProjectSettingsClient activeTab="account" initialProject={project} />;
}

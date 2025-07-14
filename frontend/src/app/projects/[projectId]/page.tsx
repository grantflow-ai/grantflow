"use server";

import { notFound } from "next/navigation";
import { getProject } from "@/actions/project";
import { ProjectDetailClient } from "@/components/projects/detail/project-detail-client";
import { resolveProjectSlug } from "@/utils/slug-resolver";

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
	const { projectId: projectSlug } = await params;

	const projectId = await resolveProjectSlug(projectSlug);
	if (!projectId) {
		notFound();
	}

	const project = await getProject(projectId);

	return <ProjectDetailClient initialProject={project} />;
}

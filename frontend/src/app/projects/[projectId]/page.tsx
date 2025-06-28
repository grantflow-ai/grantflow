"use server";

import { getProject } from "@/actions/project";
import { ProjectDetailClient } from "@/components/projects/detail/project-detail-client";

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
	const { projectId } = await params;

	const project = await getProject(projectId);

	
	return <ProjectDetailClient initialProject={project} />;
}

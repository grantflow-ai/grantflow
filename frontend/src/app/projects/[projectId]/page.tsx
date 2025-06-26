"use server";

import { getProject } from "@/actions/project";
import { CreateApplicationButton } from "@/components/projects/detail/create-application-button";
import { GrantApplicationCard } from "@/components/projects/detail/grant-application-card";

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
	const { projectId } = await params;

	const project = await getProject(projectId);

	return (
		<div className="mx-auto px-4 py-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">{project.name}</h1>
				<CreateApplicationButton projectId={projectId} />
			</div>
			<div className="bg-card rounded-lg border p-6">
				{project.grant_applications.length > 0 ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{project.grant_applications.map((application) => (
							<GrantApplicationCard
								application={application}
								key={application.id}
								projectId={projectId}
							/>
						))}
					</div>
				) : (
					<div className="py-12 text-center">
						<p className="text-muted-foreground">This project doesn&#39;t have any applications yet.</p>
						<CreateApplicationButton className="mt-4" projectId={projectId} />
					</div>
				)}
			</div>
		</div>
	);
}

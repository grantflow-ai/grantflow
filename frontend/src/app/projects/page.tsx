"use server";
import { getProjects } from "@/actions/project";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { ProjectCard } from "@/components/projects/project-card";

export default async function ProjectsListPage() {
	const projects = await getProjects();

	return (
		<div className="mx-auto px-4 py-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Projects</h1>
				<CreateProjectModal />
			</div>
			<div className="bg-card rounded-lg border p-6">
				{projects.length > 0 ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{projects.map((project) => (
							<ProjectCard key={project.id} project={project} />
						))}
					</div>
				) : (
					<div className="py-12 text-center">
						<p className="text-muted-foreground">You don&#39;t have any projects yet.</p>
						<CreateProjectModal />
					</div>
				)}
			</div>
		</div>
	);
}

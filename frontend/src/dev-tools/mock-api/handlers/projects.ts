import { ApplicationListItemFactory, ProjectFactory, ProjectListItemFactory } from "::testing/factories";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger";

const projectStore = new Map<string, API.GetProject.Http200.ResponseBody>();

export const projectHandlers = {
	createProject: async ({ body }: { body?: any }): Promise<API.CreateProject.Http201.ResponseBody> => {
		const requestBody = body as API.CreateProject.RequestBody;
		log.info("[Mock API] Creating project", {
			hasDescription: !!requestBody.description,
			hasLogoUrl: !!requestBody.logo_url,
			name: requestBody.name,
		});
		const id = crypto.randomUUID();
		const project = ProjectFactory.build({
			description: requestBody.description,
			grant_applications: [],
			id,
			logo_url: requestBody.logo_url,
			name: requestBody.name,
		});
		projectStore.set(id, project);
		log.info("[Mock API] Project created", {
			projectId: id,
			totalProjects: projectStore.size,
		});
		return { id };
	},

	deleteProject: async ({ params }: { params?: Record<string, string> }): Promise<void> => {
		const projectId = params?.project_id;
		if (!projectId) {
			log.error("[Mock API] Project ID required for deletion");
			throw new Error("Project ID required");
		}

		log.info("[Mock API] Deleting project", { projectId });
		projectStore.delete(projectId);
		log.info("[Mock API] Project deleted", {
			projectId,
			remainingProjects: projectStore.size,
		});
	},

	getProject: async ({
		params,
	}: {
		params?: Record<string, string>;
	}): Promise<API.GetProject.Http200.ResponseBody> => {
		const projectId = params?.project_id;
		if (!projectId) {
			log.error("[Mock API] Project ID required for get");
			throw new Error("Project ID required");
		}

		log.info("[Mock API] Getting project", { projectId });

		if (!projectStore.has(projectId)) {
			log.info("[Mock API] Project not found, creating new one", { projectId });
			const project = ProjectFactory.build({
				grant_applications: ApplicationListItemFactory.batch(3),
				id: projectId,
			});
			projectStore.set(projectId, project);
		}

		const project = projectStore.get(projectId)!;
		log.info("[Mock API] Returning project", {
			applicationsCount: project.grant_applications.length,
			name: project.name,
			projectId,
		});
		return project;
	},
	listProjects: async (): Promise<API.ListProjects.Http200.ResponseBody> => {
		log.info("[Mock API] Listing projects");
		const projects = ProjectListItemFactory.batch(5);
		log.info("[Mock API] Returning project list", { count: projects.length });
		return projects;
	},

	updateProject: async ({
		body,
		params,
	}: {
		body?: any;
		params?: Record<string, string>;
	}): Promise<API.UpdateProject.Http200.ResponseBody> => {
		const requestBody = body as API.UpdateProject.RequestBody;
		const projectId = params?.project_id;
		if (!projectId) {
			log.error("[Mock API] Project ID required for update");
			throw new Error("Project ID required");
		}

		log.info("[Mock API] Updating project", {
			projectId,
			updateFields: Object.keys(requestBody),
		});

		const existingProject = projectStore.get(projectId);
		if (!existingProject) {
			log.error("[Mock API] Project not found for update", { projectId });
			throw new Error("Project not found");
		}

		const updatedProject = {
			...existingProject,
			...requestBody,
		};
		projectStore.set(projectId, updatedProject);

		log.info("[Mock API] Project updated", {
			name: updatedProject.name,
			projectId,
		});
		return updatedProject;
	},
};

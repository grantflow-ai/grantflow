import { ApplicationListItemFactory, ProjectFactory, ProjectListItemFactory } from "::testing/factories";
import type { API } from "@/types/api-types";

const projectStore = new Map<string, API.GetProject.Http200.ResponseBody>();

export const projectHandlers = {
	createProject: async ({ body }: { body?: any }): Promise<API.CreateProject.Http201.ResponseBody> => {
		const requestBody = body as API.CreateProject.RequestBody;
		console.log("[Mock API] Creating project:", requestBody.name);
		const id = crypto.randomUUID();
		const project = ProjectFactory.build({
			description: requestBody.description,
			grant_applications: [],
			id,
			logo_url: requestBody.logo_url,
			name: requestBody.name,
		});
		projectStore.set(id, project);
		return { id };
	},

	deleteProject: async ({ params }: { params?: Record<string, string> }): Promise<void> => {
		const projectId = params?.project_id;
		if (!projectId) {
			throw new Error("Project ID required");
		}

		console.log("[Mock API] Deleting project:", projectId);
		projectStore.delete(projectId);
	},

	getProject: async ({
		params,
	}: {
		params?: Record<string, string>;
	}): Promise<API.GetProject.Http200.ResponseBody> => {
		const projectId = params?.project_id;
		if (!projectId) {
			throw new Error("Project ID required");
		}

		console.log("[Mock API] Getting project:", projectId);

		if (!projectStore.has(projectId)) {
			const project = ProjectFactory.build({
				grant_applications: ApplicationListItemFactory.batch(3),
				id: projectId,
			});
			projectStore.set(projectId, project);
		}

		return projectStore.get(projectId)!;
	},
	listProjects: async (): Promise<API.ListProjects.Http200.ResponseBody> => {
		console.log("[Mock API] Listing projects");
		return ProjectListItemFactory.batch(5);
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
			throw new Error("Project ID required");
		}

		console.log("[Mock API] Updating project:", projectId);

		const existingProject = projectStore.get(projectId);
		if (!existingProject) {
			throw new Error("Project not found");
		}

		const updatedProject = {
			...existingProject,
			...requestBody,
		};
		projectStore.set(projectId, updatedProject);

		return updatedProject;
	},
};

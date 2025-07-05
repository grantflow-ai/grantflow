import { ApplicationListItemFactory, ProjectFactory, ProjectListItemFactory } from "::testing/factories";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger";
import { getMockAPIClient } from "../client";
import { getScenario } from "../scenarios";

interface GlobalStore {
	__MOCK_PROJECT_STORE__?: Map<string, API.GetProject.Http200.ResponseBody>;
}
const globalStore = globalThis as unknown as GlobalStore;
if (!globalStore.__MOCK_PROJECT_STORE__) {
	globalStore.__MOCK_PROJECT_STORE__ = new Map<string, API.GetProject.Http200.ResponseBody>();
}
const projectStore: Map<string, API.GetProject.Http200.ResponseBody> = globalStore.__MOCK_PROJECT_STORE__;

function populateStoreFromListItem(projectListItem: API.ListProjects.Http200.ResponseBody[0]): void {
	const fullProject = ProjectFactory.build({
		...projectListItem,
		grant_applications: ApplicationListItemFactory.batch(projectListItem.applications_count),
	});
	projectStore.set(projectListItem.id, fullProject);
}

function toListProjectItem(project: API.GetProject.Http200.ResponseBody): API.ListProjects.Http200.ResponseBody[0] {
	return {
		applications_count: project.grant_applications.length,
		description: project.description,
		id: project.id,
		logo_url: project.logo_url,
		name: project.name,
		role: project.role,
	};
}

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

		const existingProject = projectStore.get(projectId);
		if (existingProject) {
			log.info("[Mock API] Returning project from store", {
				applicationsCount: existingProject.grant_applications.length,
				name: existingProject.name,
				projectId,
			});
			return existingProject;
		}

		const currentScenarioName = getMockAPIClient().getCurrentScenarioName();
		const scenario = getScenario(currentScenarioName);
		const scenarioProject = scenario?.data.projects.find((p) => p.id === projectId);

		if (scenarioProject) {
			log.info("[Mock API] Project not in store, creating from scenario", {
				projectId,
				scenario: currentScenarioName,
			});
			populateStoreFromListItem(scenarioProject);
			const project = projectStore.get(projectId)!;
			log.info("[Mock API] Returning project from scenario", {
				applicationsCount: project.grant_applications.length,
				name: project.name,
				projectId,
			});
			return project;
		}

		log.info("[Mock API] Project not found in store or scenario, creating new one", { projectId });
		const project = ProjectFactory.build({
			grant_applications: ApplicationListItemFactory.batch(3),
			id: projectId,
		});
		projectStore.set(projectId, project);
		log.info("[Mock API] Returning project", {
			applicationsCount: project.grant_applications.length,
			name: project.name,
			projectId,
		});
		return project;
	},

	listProjects: async (): Promise<API.ListProjects.Http200.ResponseBody> => {
		log.info("[Mock API] Listing projects");

		if (projectStore.size > 0) {
			const projects = [...projectStore.values()].map(toListProjectItem);
			log.info("[Mock API] Returning projects from store", { count: projects.length });
			return projects;
		}

		const currentScenarioName = getMockAPIClient().getCurrentScenarioName();
		const scenario = getScenario(currentScenarioName);

		if (scenario?.data.projects && scenario.data.projects.length > 0) {
			log.info("[Mock API] Store empty, populating from scenario", {
				projectCount: scenario.data.projects.length,
				scenario: currentScenarioName,
			});

			scenario.data.projects.forEach(populateStoreFromListItem);
			return scenario.data.projects;
		}

		const projects = ProjectListItemFactory.batch(1);
		log.info("[Mock API] No scenario data, returning factory-generated project list", { count: projects.length });
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

export function clearProjectStore(): void {
	projectStore.clear();
	log.info("[Mock API] Project store cleared");
}

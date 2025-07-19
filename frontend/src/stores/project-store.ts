import { toast } from "sonner";
import { create } from "zustand";

import {
	createProject as handleCreateProject,
	deleteProject as handleDeleteProject,
	duplicateProject as handleDuplicateProject,
	getProject as handleGetProject,
	getProjects as handleGetProjects,
	updateProject as handleUpdateProject,
} from "@/actions/project";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger";

export type ProjectsListType = API.ListProjects.Http200.ResponseBody;
export type ProjectType = API.GetProject.Http200.ResponseBody | null;

interface ProjectState {
	areOperationsInProgress: boolean;
	project: ProjectType;
	projects: ProjectsListType;
}

const initialState: ProjectState = {
	areOperationsInProgress: false,
	project: null,
	projects: [],
};

interface ProjectActions {
	createProject: (organizationId: string, data: API.CreateProject.RequestBody) => Promise<void>;
	deleteProject: (organizationId: string, projectId: string) => Promise<void>;
	duplicateProject: (organizationId: string, projectId: string) => Promise<void>;
	getProject: (organizationId: string, projectId: string) => Promise<void>;
	getProjects: (organizationId: string) => Promise<void>;
	reset: () => void;
	setProject: (project: NonNullable<ProjectType>) => void;
	updateProject: (organizationId: string, projectId: string, data: API.UpdateProject.RequestBody) => Promise<void>;
}

export const useProjectStore = create<ProjectActions & ProjectState>((set, get) => ({
	...initialState,

	createProject: async (organizationId: string, data: API.CreateProject.RequestBody) => {
		set({ areOperationsInProgress: true });
		try {
			const response = await handleCreateProject(organizationId, data);

			const projectsResponse = await handleGetProjects(organizationId);

			set({
				areOperationsInProgress: false,
				projects: projectsResponse,
			});

			toast.success("Project created successfully");

			log.info("project-store.ts: createProject: ", {
				message: "Project created successfully",
				projectId: response.id,
			});
		} catch (error: unknown) {
			log.error("createProject", error);
			toast.error("Failed to create project");
			set({ areOperationsInProgress: false });
		}
	},

	deleteProject: async (organizationId: string, projectId: string) => {
		set({ areOperationsInProgress: true });
		try {
			await handleDeleteProject(organizationId, projectId);
			set((state) => ({
				areOperationsInProgress: false,
				project: state.project?.id === projectId ? null : state.project,
				projects: state.projects.filter((p) => p.id !== projectId),
			}));

			toast.success("Project deleted successfully");
		} catch (error: unknown) {
			log.error("deleteProject", error);
			toast.error("Failed to delete project");
			set({ areOperationsInProgress: false });
		}
	},

	duplicateProject: async (organizationId: string, projectId: string) => {
		set({ areOperationsInProgress: true });
		try {
			await handleDuplicateProject(organizationId, projectId);
			const projectsResponse = await handleGetProjects(organizationId);

			set({
				areOperationsInProgress: false,
				projects: projectsResponse,
			});

			toast.success("Project duplicated successfully");
		} catch (error: unknown) {
			log.error("duplicateProject", error);
			toast.error("Failed to duplicate project");
			set({ areOperationsInProgress: false });
		}
	},

	getProject: async (organizationId: string, projectId: string) => {
		set({ areOperationsInProgress: true });
		try {
			const response = await handleGetProject(organizationId, projectId);
			set({
				areOperationsInProgress: false,
				project: response,
			});
			log.info("project-store.ts: getProject: ", {
				message: "Project retrieved successfully",
				project: response,
			});
		} catch (error: unknown) {
			log.error("getProject", error);
			toast.error("Failed to retrieve project");
			set({ areOperationsInProgress: false });
		}
	},

	getProjects: async (organizationId: string) => {
		set({ areOperationsInProgress: true });
		try {
			const response = await handleGetProjects(organizationId);
			set({
				areOperationsInProgress: false,
				projects: response,
			});
			log.info("project-store.ts: getProjects: ", {
				message: "Projects retrieved successfully",
				projects: response,
			});
		} catch (error: unknown) {
			log.error("getProjects", error);
			toast.error("Failed to retrieve projects");
			set({ areOperationsInProgress: false });
		}
	},

	reset: () => {
		set(structuredClone(initialState));
	},

	setProject: (project: NonNullable<ProjectType>) => {
		set({ project });
	},

	updateProject: async (organizationId: string, projectId: string, data: API.UpdateProject.RequestBody) => {
		const { project, projects } = get();
		const previousProject = project;
		const previousProjects = projects;

		set({ areOperationsInProgress: true });

		try {
			await handleUpdateProject(organizationId, projectId, data);

			const updatedProject = await handleGetProject(organizationId, projectId);
			const projectsResponse = await handleGetProjects(organizationId);

			set({
				areOperationsInProgress: false,
				project: project?.id === projectId ? updatedProject : project,
				projects: projectsResponse,
			});

			toast.success("Project updated successfully");
		} catch (error: unknown) {
			set({
				areOperationsInProgress: false,
				project: previousProject,
				projects: previousProjects,
			});
			log.error("updateProject", error);
			toast.error("Failed to update project");
		}
	},
}));

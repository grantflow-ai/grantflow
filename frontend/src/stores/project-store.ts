import { toast } from "sonner";
import { mutate } from "swr";
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
import { logError } from "@/utils/logging";

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
	createProject: (data: API.CreateProject.RequestBody) => Promise<void>;
	deleteProject: (projectId: string) => Promise<void>;
	duplicateProject: (projectId: string) => Promise<void>;
	getProject: (projectId: string) => Promise<void>;
	getProjects: () => Promise<void>;
	reset: () => void;
	setProject: (project: NonNullable<ProjectType>) => void;
	updateProject: (projectId: string, data: API.UpdateProject.RequestBody) => Promise<void>;
}

export const useProjectStore = create<ProjectActions & ProjectState>((set, get) => ({
	...initialState,

	createProject: async (data: API.CreateProject.RequestBody) => {
		set({ areOperationsInProgress: true });
		try {
			const response = await handleCreateProject(data);
			// After creating, fetch the full project details
			await get().getProject(response.id);
			// Invalidate projects list to trigger refetch
			await mutate("projects");
			toast.success("Project created successfully");
		} catch (error: unknown) {
			logError({ error, identifier: "createProject" });
			toast.error("Failed to create project");
			set({ areOperationsInProgress: false });
		}
	},

	deleteProject: async (projectId: string) => {
		set({ areOperationsInProgress: true });
		try {
			await handleDeleteProject(projectId);
			set((state) => ({
				areOperationsInProgress: false,
				project: state.project?.id === projectId ? null : state.project,
				projects: state.projects.filter((p) => p.id !== projectId),
			}));
			// Invalidate projects list to trigger refetch
			await mutate("projects");
			toast.success("Project deleted successfully");
		} catch (error: unknown) {
			logError({ error, identifier: "deleteProject" });
			toast.error("Failed to delete project");
			set({ areOperationsInProgress: false });
		}
	},

	duplicateProject: async (projectId: string) => {
		set({ areOperationsInProgress: true });
		try {
			await handleDuplicateProject(projectId);
			// Invalidate projects list to trigger refetch
			await mutate("projects");
			toast.success("Project duplicated successfully");
			set({ areOperationsInProgress: false });
		} catch (error: unknown) {
			logError({ error, identifier: "duplicateProject" });
			toast.error("Failed to duplicate project");
			set({ areOperationsInProgress: false });
		}
	},

	getProject: async (projectId: string) => {
		set({ areOperationsInProgress: true });
		try {
			const response = await handleGetProject(projectId);
			set({
				areOperationsInProgress: false,
				project: response,
			});
		} catch (error: unknown) {
			logError({ error, identifier: "getProject" });
			toast.error("Failed to retrieve project");
			set({ areOperationsInProgress: false });
		}
	},

	getProjects: async () => {
		set({ areOperationsInProgress: true });
		try {
			const response = await handleGetProjects();
			set({
				areOperationsInProgress: false,
				projects: response,
			});
		} catch (error: unknown) {
			logError({ error, identifier: "getProjects" });
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

	updateProject: async (projectId: string, data: API.UpdateProject.RequestBody) => {
		const { project, projects } = get();
		const previousProject = project;
		const previousProjects = projects;

		set({ areOperationsInProgress: true });

		try {
			await handleUpdateProject(projectId, data);
			// After updating, fetch the full project details to ensure we have complete data
			await get().getProject(projectId);
			// Invalidate projects list to trigger refetch
			await mutate("projects");
			toast.success("Project updated successfully");
		} catch (error: unknown) {
			set({
				areOperationsInProgress: false,
				project: previousProject,
				projects: previousProjects,
			});
			logError({ error, identifier: "updateProject" });
			toast.error("Failed to update project");
		}
	},
}));

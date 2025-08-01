import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ProjectFactory, ProjectListItemFactory } from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProject, deleteProject, getProject, getProjects, updateProject } from "@/actions/project";
import { log } from "@/utils/logger";

import { useProjectStore } from "./project-store";

vi.mock("@/actions/project");
vi.mock("sonner", () => ({
	toast: {
		dismiss: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(() => "mock-toast-id"),
		success: vi.fn(),
	},
}));
vi.mock("@/stores/organization-store", () => ({
	useOrganizationStore: {
		getState: vi.fn(() => ({
			selectedOrganizationId: "mock-org-id",
		})),
	},
}));
vi.mock("@/utils/logger", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe("Project Store", () => {
	beforeEach(() => {
		useProjectStore.setState({
			areOperationsInProgress: false,
			project: null,
			projects: [],
		});

		vi.clearAllMocks();
		setupAuthenticatedTest();
	});

	describe("state management", () => {
		it("should initialize with default state", () => {
			const state = useProjectStore.getState();
			expect(state.project).toBeNull();
			expect(state.projects).toEqual([]);
			expect(state.areOperationsInProgress).toBe(false);
		});

		it("should set project", () => {
			const project = ProjectFactory.build();
			useProjectStore.getState().setProject(project);
			expect(useProjectStore.getState().project).toEqual(project);
		});

		it("should reset to initial state", () => {
			const project = ProjectFactory.build();
			const projectListItem = ProjectListItemFactory.build();
			useProjectStore.setState({
				areOperationsInProgress: true,
				project,
				projects: [projectListItem],
			});

			useProjectStore.getState().reset();

			const state = useProjectStore.getState();
			expect(state.project).toBeNull();
			expect(state.projects).toEqual([]);
			expect(state.areOperationsInProgress).toBe(false);
		});
	});

	describe("createProject", () => {
		it("should create project and fetch full details", async () => {
			const projectId = "test-project-id";
			const projectData = { description: "Test description", logo_url: null, name: "Test Project" };
			const createdProject = { id: projectId };
			const projectsList = [ProjectListItemFactory.build({ id: projectId, name: "Test Project" })];

			vi.mocked(createProject).mockResolvedValue(createdProject);
			vi.mocked(getProjects).mockResolvedValue(projectsList);

			await useProjectStore.getState().createProject("mock-org-id", projectData);

			expect(createProject).toHaveBeenCalledWith("mock-org-id", projectData);
			expect(getProjects).toHaveBeenCalledWith("mock-org-id");
			expect(useProjectStore.getState().projects).toEqual(projectsList);
			expect(useProjectStore.getState().areOperationsInProgress).toBe(false);
		});

		it("should handle creation error", async () => {
			const projectData = { description: "Test description", logo_url: null, name: "Test Project" };
			const error = new Error("Creation failed");

			vi.mocked(createProject).mockRejectedValue(error);

			await useProjectStore.getState().createProject("mock-org-id", projectData);

			expect(useProjectStore.getState().areOperationsInProgress).toBe(false);
			expect(useProjectStore.getState().project).toBeNull();
			expect(log.error).toHaveBeenCalledWith("createProject", error);
		});
	});

	describe("getProject", () => {
		it("should fetch project successfully", async () => {
			const project = ProjectFactory.build();
			vi.mocked(getProject).mockResolvedValue(project);

			await useProjectStore.getState().getProject("mock-org-id", project.id);

			expect(getProject).toHaveBeenCalledWith("mock-org-id", project.id);
			expect(useProjectStore.getState().project).toEqual(project);
			expect(useProjectStore.getState().areOperationsInProgress).toBe(false);
		});

		it("should handle fetch error", async () => {
			const projectId = "test-id";
			const error = new Error("Fetch failed");

			vi.mocked(getProject).mockRejectedValue(error);

			await useProjectStore.getState().getProject("mock-org-id", projectId);

			expect(useProjectStore.getState().areOperationsInProgress).toBe(false);
			expect(log.error).toHaveBeenCalledWith("getProject", error);
		});
	});

	describe("getProjects", () => {
		it("should fetch projects list successfully", async () => {
			const projects = [ProjectListItemFactory.build(), ProjectListItemFactory.build()];
			vi.mocked(getProjects).mockResolvedValue(projects);

			await useProjectStore.getState().getProjects("mock-org-id");

			expect(getProjects).toHaveBeenCalledWith("mock-org-id");
			expect(useProjectStore.getState().projects).toEqual(projects);
			expect(useProjectStore.getState().areOperationsInProgress).toBe(false);
		});

		it("should handle fetch error", async () => {
			const error = new Error("Fetch failed");
			vi.mocked(getProjects).mockRejectedValue(error);

			await useProjectStore.getState().getProjects("mock-org-id");

			expect(useProjectStore.getState().areOperationsInProgress).toBe(false);
			expect(useProjectStore.getState().projects).toEqual([]);
			expect(log.error).toHaveBeenCalledWith("getProjects", error);
		});
	});

	describe("updateProject", () => {
		it("should update project and refresh data", async () => {
			const project = ProjectFactory.build();
			const projectListItem = ProjectListItemFactory.build({ id: project.id, name: project.name });
			const updatedProject = ProjectFactory.build({ id: project.id, name: "Updated Name" });
			const updatedProjectListItem = ProjectListItemFactory.build({ id: project.id, name: "Updated Name" });
			const updateData = { description: null, logo_url: null, name: "Updated Name" };

			useProjectStore.setState({ project, projects: [projectListItem] });

			vi.mocked(updateProject).mockResolvedValue({
				description: null,
				id: project.id,
				logo_url: null,
				name: "Updated Name",
			});
			vi.mocked(getProject).mockResolvedValue(updatedProject);
			vi.mocked(getProjects).mockResolvedValue([updatedProjectListItem]);

			await useProjectStore.getState().updateProject("mock-org-id", project.id, updateData);

			expect(updateProject).toHaveBeenCalledWith("mock-org-id", project.id, updateData);
			expect(getProject).toHaveBeenCalledWith("mock-org-id", project.id);
			expect(getProjects).toHaveBeenCalledWith("mock-org-id");
		});

		it("should handle update error and restore previous state", async () => {
			const project = ProjectFactory.build();
			const projectListItem = ProjectListItemFactory.build({ id: project.id, name: project.name });
			const updateData = { description: null, logo_url: null, name: "Updated Name" };
			const error = new Error("Update failed");

			useProjectStore.setState({ project, projects: [projectListItem] });

			vi.mocked(updateProject).mockRejectedValue(error);

			await useProjectStore.getState().updateProject("mock-org-id", project.id, updateData);

			expect(useProjectStore.getState().project).toEqual(project);
			expect(useProjectStore.getState().projects).toEqual([projectListItem]);
			expect(useProjectStore.getState().areOperationsInProgress).toBe(false);
			expect(log.error).toHaveBeenCalledWith("updateProject", error);
		});
	});

	describe("deleteProject", () => {
		it("should delete project and update state", async () => {
			const project1 = ProjectFactory.build();
			const project2 = ProjectFactory.build();
			const projectListItem1 = ProjectListItemFactory.build({ id: project1.id, name: project1.name });
			const projectListItem2 = ProjectListItemFactory.build({ id: project2.id, name: project2.name });
			const projects = [projectListItem1, projectListItem2];

			useProjectStore.setState({ project: project1, projects });

			vi.mocked(deleteProject).mockResolvedValue(undefined);

			await useProjectStore.getState().deleteProject("mock-org-id", project1.id);

			expect(deleteProject).toHaveBeenCalledWith("mock-org-id", project1.id);
			expect(useProjectStore.getState().project).toBeNull();
			expect(useProjectStore.getState().projects).toEqual([projectListItem2]);
			expect(useProjectStore.getState().areOperationsInProgress).toBe(false);
		});

		it("should handle delete error", async () => {
			const project = ProjectFactory.build();
			const projectListItem = ProjectListItemFactory.build({ id: project.id, name: project.name });
			const error = new Error("Delete failed");

			useProjectStore.setState({ project, projects: [projectListItem] });

			vi.mocked(deleteProject).mockRejectedValue(error);

			await useProjectStore.getState().deleteProject("mock-org-id", project.id);

			expect(useProjectStore.getState().areOperationsInProgress).toBe(false);
			expect(useProjectStore.getState().project).toEqual(project);
			expect(useProjectStore.getState().projects).toEqual([projectListItem]);
			expect(log.error).toHaveBeenCalledWith("deleteProject", error);
		});
	});
});

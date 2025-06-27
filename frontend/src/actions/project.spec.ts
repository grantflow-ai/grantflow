import {
	CreateProjectRequestFactory,
	IdResponseFactory,
	ProjectFactory,
	ProjectListItemFactory,
	UpdateProjectRequestFactory,
} from "::testing/factories";
import { mockRedirect } from "::testing/global-mocks";
import { HTTPError } from "ky";
import { createProject, deleteProject, getProject, getProjects, updateProject } from "./project";

const mockPost = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockPatch = vi.fn();
const mockCreateAuthHeaders = vi.fn();
const mockWithAuthRedirect = vi.fn();

vi.mock("@/utils/api", async () => {
	const actual = await vi.importActual("@/utils/api");
	return {
		...actual,
		getClient: () => ({
			delete: mockDelete,
			get: mockGet,
			patch: mockPatch,
			post: mockPost,
		}),
	};
});

vi.mock("@/utils/server-side", async () => {
	const actual = await vi.importActual("@/utils/server-side");
	return {
		...actual,
		createAuthHeaders: () => mockCreateAuthHeaders(),
		withAuthRedirect: (promise: Promise<any>) => mockWithAuthRedirect(promise),
	};
});

const mockProjectId = "mock-project-id";
const mockAuthHeaders = { Authorization: "Bearer mock-token" };

const mockCreateProjectResponse = IdResponseFactory.build({
	id: mockProjectId,
});

const mockGetProjectResponse = ProjectFactory.build({
	description: "Test Description",
	grant_applications: [
		{
			completed_at: null,
			id: "app-1",
			title: "Application 1",
		},
	],
	id: mockProjectId,
	logo_url: "https://example.com/logo.png",
	name: "Test Project",
	role: "OWNER",
});

const mockGetProjectsResponse = [
	ProjectListItemFactory.build({
		description: "Test Description",
		id: mockProjectId,
		logo_url: "https://example.com/logo.png",
		name: "Test Project",
		role: "OWNER",
	}),
	ProjectListItemFactory.build({
		description: null,
		id: "project-2",
		logo_url: null,
		name: "Another Project",
		role: "MEMBER",
	}),
];

const mockUpdateProjectResponse = ProjectListItemFactory.build({
	description: "Updated Description",
	id: mockProjectId,
	logo_url: "https://example.com/updated-logo.png",
	name: "Updated Project",
	role: "OWNER",
});

beforeEach(() => {
	vi.clearAllMocks();

	mockCreateAuthHeaders.mockResolvedValue(mockAuthHeaders);

	mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

	mockPost.mockReturnValue({
		json: vi.fn().mockResolvedValue(mockCreateProjectResponse),
	});

	mockGet.mockReturnValue({
		json: vi.fn().mockImplementation(() => {
			return Promise.resolve(mockGetProjectResponse);
		}),
	});

	mockPatch.mockReturnValue({
		json: vi.fn().mockResolvedValue(mockUpdateProjectResponse),
	});

	mockDelete.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("Project Actions", () => {
	describe("createProject", () => {
		it("should call the API with correct parameters", async () => {
			const projectData = CreateProjectRequestFactory.build();

			const result = await createProject(projectData);

			expect(mockPost).toHaveBeenCalledWith("projects", {
				headers: mockAuthHeaders,
				json: projectData,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockCreateProjectResponse);
		});
	});

	describe("getProject", () => {
		it("should call the API with correct parameters", async () => {
			const result = await getProject(mockProjectId);

			expect(mockGet).toHaveBeenCalledWith(`projects/${mockProjectId}`, {
				headers: mockAuthHeaders,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockGetProjectResponse);
		});
	});

	describe("getProjects", () => {
		it("should call the API with correct parameters", async () => {
			mockGet.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(mockGetProjectsResponse),
			});

			const result = await getProjects();

			expect(mockGet).toHaveBeenCalledWith("projects", {
				headers: mockAuthHeaders,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockGetProjectsResponse);
		});
	});

	describe("updateProject", () => {
		it("should call the API with correct parameters", async () => {
			const updateData = UpdateProjectRequestFactory.build();

			const result = await updateProject(mockProjectId, updateData);

			expect(mockPatch).toHaveBeenCalledWith(`projects/${mockProjectId}`, {
				headers: mockAuthHeaders,
				json: updateData,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockUpdateProjectResponse);
		});
	});

	describe("deleteProject", () => {
		it("should call the API with correct parameters", async () => {
			await deleteProject(mockProjectId);

			expect(mockDelete).toHaveBeenCalledWith(`projects/${mockProjectId}`, {
				headers: mockAuthHeaders,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});
	});

	describe("error handling", () => {
		it("should handle API errors correctly", async () => {
			const mockError = new Error("API Error");
			mockGet.mockReturnValueOnce({
				json: vi.fn().mockRejectedValue(mockError),
			});

			mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

			await expect(getProject(mockProjectId)).rejects.toThrow("API Error");
		});

		it("should redirect to sign-in page on 401 errors", async () => {
			const mockResponse = new Response(null, { status: 401 });
			const httpError = new HTTPError(mockResponse, { path: "projects" } as any, {} as any);

			mockGet.mockReturnValueOnce({
				json: vi.fn().mockRejectedValue(httpError),
			});

			mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => {
				return promise.catch((error: unknown) => {
					if (error instanceof HTTPError && error.response.status === 401) {
						mockRedirect("/signin");
						return null;
					}
					throw error;
				});
			});

			await getProject(mockProjectId);

			expect(mockRedirect).toHaveBeenCalledWith("/signin");
		});
	});
});

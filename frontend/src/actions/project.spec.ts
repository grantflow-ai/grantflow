import {
	CreateProjectRequestFactory,
	DuplicateProjectResponseFactory,
	IdResponseFactory,
	ProjectFactory,
	ProjectListItemFactory,
	UpdateProjectRequestFactory,
} from "::testing/factories";
import { mockRedirect } from "::testing/global-mocks";
import { HTTPError } from "ky";
import { createProject, deleteProject, duplicateProject, getProject, getProjects, updateProject } from "./project";

const mockPost = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockPatch = vi.fn();
const mockCreateAuthHeaders = vi.fn();
const mockWithAuthRedirect = vi.fn();

vi.mock("@/utils/api/server", async () => {
	const actual = await vi.importActual("@/utils/api/server");
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

const mockOrganizationId = "mock-organization-id";
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
});

const mockGetProjectsResponse = [
	ProjectListItemFactory.build({
		description: "Test Description",
		id: mockProjectId,
		logo_url: "https://example.com/logo.png",
		name: "Test Project",
	}),
	ProjectListItemFactory.build({
		description: null,
		id: "project-2",
		logo_url: null,
		name: "Another Project",
	}),
];

const mockUpdateProjectResponse = ProjectListItemFactory.build({
	description: "Updated Description",
	id: mockProjectId,
	logo_url: "https://example.com/updated-logo.png",
	name: "Updated Project",
});

const mockDuplicateProjectResponse = DuplicateProjectResponseFactory.build({
	description: "Test Description",
	grant_applications: [
		{
			completed_at: null,
			id: "duplicated-app-1",
			title: "Application 1",
		},
	],
	id: "duplicated-project-id",
	logo_url: "https://example.com/logo.png",
	members: [
		{
			display_name: "Test User",
			email: "test@example.com",
			firebase_uid: "test-uid",
			photo_url: "https://example.com/photo.png",
			role: "OWNER",
		},
	],
	name: "Copy of Test Project",
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

			const result = await createProject(mockOrganizationId, projectData);

			expect(mockPost).toHaveBeenCalledWith(`organizations/${mockOrganizationId}/projects`, {
				headers: mockAuthHeaders,
				json: projectData,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockCreateProjectResponse);
		});
	});

	describe("getProject", () => {
		it("should call the API with correct parameters", async () => {
			const result = await getProject(mockOrganizationId, mockProjectId);

			expect(mockGet).toHaveBeenCalledWith(`organizations/${mockOrganizationId}/projects/${mockProjectId}`, {
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

			const result = await getProjects(mockOrganizationId);

			expect(mockGet).toHaveBeenCalledWith(`organizations/${mockOrganizationId}/projects`, {
				headers: mockAuthHeaders,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockGetProjectsResponse);
		});
	});

	describe("updateProject", () => {
		it("should call the API with correct parameters", async () => {
			const updateData = UpdateProjectRequestFactory.build();

			const result = await updateProject(mockOrganizationId, mockProjectId, updateData);

			expect(mockPatch).toHaveBeenCalledWith(`organizations/${mockOrganizationId}/projects/${mockProjectId}`, {
				headers: mockAuthHeaders,
				json: updateData,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockUpdateProjectResponse);
		});
	});

	describe("deleteProject", () => {
		it("should call the API with correct parameters", async () => {
			await deleteProject(mockOrganizationId, mockProjectId);

			expect(mockDelete).toHaveBeenCalledWith(`organizations/${mockOrganizationId}/projects/${mockProjectId}`, {
				headers: mockAuthHeaders,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});
	});

	describe("duplicateProject", () => {
		it("should call the API with correct parameters", async () => {
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(mockDuplicateProjectResponse),
			});

			const result = await duplicateProject(mockOrganizationId, mockProjectId);

			expect(mockPost).toHaveBeenCalledWith(
				`organizations/${mockOrganizationId}/projects/${mockProjectId}/duplicate`,
				{
					headers: mockAuthHeaders,
					json: {},
				},
			);

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockDuplicateProjectResponse);
		});

		it("should return a project with copied name", async () => {
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(mockDuplicateProjectResponse),
			});

			const result = await duplicateProject(mockOrganizationId, mockProjectId);

			expect(result.name).toBe("Copy of Test Project");
		});

		it("should preserve all grant applications", async () => {
			const responseWithMultipleApps = DuplicateProjectResponseFactory.build({
				...mockDuplicateProjectResponse,
				grant_applications: [
					{
						completed_at: null,
						id: "duplicated-app-1",
						title: "Application 1",
					},
					{
						completed_at: "2024-01-01T00:00:00Z",
						id: "duplicated-app-2",
						title: "Application 2",
					},
				],
			});

			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(responseWithMultipleApps),
			});

			const result = await duplicateProject(mockOrganizationId, mockProjectId);

			expect(result.grant_applications).toHaveLength(2);
			expect(result.grant_applications[0].title).toBe("Application 1");
			expect(result.grant_applications[1].title).toBe("Application 2");
		});
	});

	describe("error handling", () => {
		it("should handle API errors correctly", async () => {
			const mockError = new Error("API Error");
			mockGet.mockReturnValueOnce({
				json: vi.fn().mockRejectedValue(mockError),
			});

			mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

			await expect(getProject(mockOrganizationId, mockProjectId)).rejects.toThrow("API Error");
		});

		it("should redirect to sign-in page on 401 errors", async () => {
			const mockResponse = new Response(null, { status: 401 });
			const httpError = new HTTPError(
				mockResponse,
				{ path: `organizations/${mockOrganizationId}/projects` } as any,
				{} as any,
			);

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

			await getProject(mockOrganizationId, mockProjectId);

			expect(mockRedirect).toHaveBeenCalledWith("/signin");
		});
	});
});

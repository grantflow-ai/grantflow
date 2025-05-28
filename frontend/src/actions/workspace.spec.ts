import { HTTPError } from "ky";

import { mockRedirect } from "::testing/global-mocks";
import { API } from "@/types/api-types";

import { createWorkspace, deleteWorkspace, getWorkspace, getWorkspaces, updateWorkspace } from "./workspace";

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

const mockWorkspaceId = "mock-workspace-id";
const mockAuthHeaders = { Authorization: "Bearer mock-token" };

const mockCreateWorkspaceResponse: API.CreateWorkspace.Http201.ResponseBody = {
	id: mockWorkspaceId,
};

const mockGetWorkspaceResponse: API.GetWorkspace.Http200.ResponseBody = {
	description: "Test Description",
	grant_applications: [
		{
			completed_at: null,
			id: "app-1",
			title: "Application 1",
		},
	],
	id: mockWorkspaceId,
	logo_url: "https://example.com/logo.png",
	name: "Test Workspace",
	role: "OWNER",
};

const mockGetWorkspacesResponse: API.ListWorkspaces.Http200.ResponseBody = [
	{
		description: "Test Description",
		id: mockWorkspaceId,
		logo_url: "https://example.com/logo.png",
		name: "Test Workspace",
		role: "OWNER",
	},
	{
		description: null,
		id: "workspace-2",
		logo_url: null,
		name: "Another Workspace",
		role: "MEMBER",
	},
];

const mockUpdateWorkspaceResponse: API.UpdateWorkspace.Http200.ResponseBody = {
	description: "Updated Description",
	id: mockWorkspaceId,
	logo_url: "https://example.com/updated-logo.png",
	name: "Updated Workspace",
	role: "OWNER",
};

beforeEach(() => {
	vi.clearAllMocks();

	mockCreateAuthHeaders.mockResolvedValue(mockAuthHeaders);

	mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

	mockPost.mockReturnValue({
		json: vi.fn().mockResolvedValue(mockCreateWorkspaceResponse),
	});

	mockGet.mockReturnValue({
		json: vi.fn().mockImplementation(() => {
			return Promise.resolve(mockGetWorkspaceResponse);
		}),
	});

	mockPatch.mockReturnValue({
		json: vi.fn().mockResolvedValue(mockUpdateWorkspaceResponse),
	});

	mockDelete.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("Workspace Actions", () => {
	describe("createWorkspace", () => {
		it("should call the API with correct parameters", async () => {
			const workspaceData: API.CreateWorkspace.RequestBody = {
				description: "New Description",
				logo_url: "https://example.com/logo.png",
				name: "New Workspace",
			};

			const result = await createWorkspace(workspaceData);

			expect(mockPost).toHaveBeenCalledWith("workspaces", {
				headers: mockAuthHeaders,
				json: workspaceData,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockCreateWorkspaceResponse);
		});
	});

	describe("getWorkspace", () => {
		it("should call the API with correct parameters", async () => {
			const result = await getWorkspace(mockWorkspaceId);

			expect(mockGet).toHaveBeenCalledWith(`workspaces/${mockWorkspaceId}`, {
				headers: mockAuthHeaders,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockGetWorkspaceResponse);
		});
	});

	describe("getWorkspaces", () => {
		it("should call the API with correct parameters", async () => {
			mockGet.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(mockGetWorkspacesResponse),
			});

			const result = await getWorkspaces();

			expect(mockGet).toHaveBeenCalledWith("workspaces", {
				headers: mockAuthHeaders,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockGetWorkspacesResponse);
		});
	});

	describe("updateWorkspace", () => {
		it("should call the API with correct parameters", async () => {
			const updateData: API.UpdateWorkspace.RequestBody = {
				description: "Updated Description",
				logo_url: "https://example.com/updated-logo.png",
				name: "Updated Workspace",
			};

			const result = await updateWorkspace(mockWorkspaceId, updateData);

			expect(mockPatch).toHaveBeenCalledWith(`workspaces/${mockWorkspaceId}`, {
				headers: mockAuthHeaders,
				json: updateData,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockUpdateWorkspaceResponse);
		});
	});

	describe("deleteWorkspace", () => {
		it("should call the API with correct parameters", async () => {
			await deleteWorkspace(mockWorkspaceId);

			expect(mockDelete).toHaveBeenCalledWith(`workspaces/${mockWorkspaceId}`, {
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

			await expect(getWorkspace(mockWorkspaceId)).rejects.toThrow("API Error");
		});

		it("should redirect to sign-in page on 401 errors", async () => {
			const mockResponse = new Response(null, { status: 401 });
			const httpError = new HTTPError(mockResponse, { path: "workspaces" } as any, {} as any);

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

			await getWorkspace(mockWorkspaceId);

			expect(mockRedirect).toHaveBeenCalledWith("/signin");
		});
	});
});

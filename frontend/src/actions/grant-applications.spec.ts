import { HTTPError } from "ky";

import { ApplicationFactory } from "::testing/factories";
import { mockRedirect } from "::testing/global-mocks";
import { API } from "@/types/api-types";

import {
	createApplication,
	deleteApplication,
	generateApplication,
	retrieveApplication,
	updateApplication,
} from "./grant-applications";
import { updateGrantTemplate } from "./grant-template";

const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
const mockGet = vi.fn();
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
const mockApplicationId = "mock-application-id";
const mockTemplateId = "mock-template-id";
const mockAuthHeaders = { Authorization: "Bearer mock-token" };

const mockCreateApplicationResponse: API.CreateApplication.Http201.ResponseBody = ApplicationFactory.build({
	id: mockApplicationId,
});

const mockRetrieveApplicationResponse: API.RetrieveApplication.Http200.ResponseBody = {
	created_at: "2024-01-01T00:00:00Z",
	grant_template: {
		created_at: "2024-01-01T00:00:00Z",
		funding_organization: {
			abbreviation: "NIH",
			created_at: "2024-01-01T00:00:00Z",
			full_name: "National Institutes of Health",
			id: "org-1",
			updated_at: "2024-01-01T00:00:00Z",
		},
		funding_organization_id: "org-1",
		grant_application_id: mockApplicationId,
		grant_sections: [
			{
				depends_on: [],
				generation_instructions: "Write an introduction",
				id: "section-1",
				is_clinical_trial: false,
				is_detailed_workplan: false,
				keywords: ["intro", "background"],
				max_words: 500,
				order: 1,
				parent_id: null,
				search_queries: ["introduction research"],
				title: "Introduction",
				topics: ["research background"],
			},
			{
				id: "section-2",
				order: 2,
				parent_id: "section-1",
				title: "Sub-section",
			},
		],
		id: mockTemplateId,
		rag_sources: [
			{
				filename: "template-doc.pdf",
				sourceId: "template-source-1",
				status: "FINISHED",
			},
		],
		submission_date: "2024-12-31",
		updated_at: "2024-01-01T00:00:00Z",
	},
	id: mockApplicationId,
	rag_sources: [
		{
			filename: "example.pdf",
			sourceId: "source-1",
			status: "FINISHED",
			url: "https://example.com",
		},
	],
	research_objectives: [
		{
			description: "Description of objective 1",
			number: 1,
			research_tasks: [
				{
					description: "Task description",
					number: 1,
					title: "Research Task 1",
				},
			],
			title: "Research Objective 1",
		},
	],
	status: "DRAFT",
	title: "Test Application",
	updated_at: "2024-01-01T00:00:00Z",
	workspace_id: mockWorkspaceId,
};

beforeEach(() => {
	vi.clearAllMocks();

	mockCreateAuthHeaders.mockResolvedValue(mockAuthHeaders);
	mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

	mockPost.mockReturnValue({
		json: vi.fn().mockResolvedValue(mockCreateApplicationResponse),
	});

	mockGet.mockReturnValue({
		json: vi.fn().mockResolvedValue(mockRetrieveApplicationResponse),
	});

	mockPatch.mockResolvedValue(undefined);
	mockDelete.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("Grant Application Actions", () => {
	describe("createApplication", () => {
		it("should call the API with correct parameters", async () => {
			const applicationData: API.CreateApplication.RequestBody = {
				title: "New Grant Application",
			};

			const result = await createApplication(mockWorkspaceId, applicationData);

			expect(mockPost).toHaveBeenCalledWith(`workspaces/${mockWorkspaceId}/applications`, {
				headers: mockAuthHeaders,
				json: applicationData,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockCreateApplicationResponse);
		});
	});

	describe("retrieveApplication", () => {
		it("should call the API with correct parameters", async () => {
			const result = await retrieveApplication(mockWorkspaceId, mockApplicationId);

			expect(mockGet).toHaveBeenCalledWith(`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}`, {
				headers: mockAuthHeaders,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockRetrieveApplicationResponse);
		});

		it("should handle API errors", async () => {
			const mockResponse = new Response();
			const mockError = new HTTPError(
				mockResponse,
				{
					path: `workspaces/${mockWorkspaceId}/applications/${mockApplicationId}`,
				} as never,
				{} as never,
			);

			mockGet.mockReturnValue({
				json: vi.fn().mockRejectedValue(mockError),
			});
			mockWithAuthRedirect.mockRejectedValue(mockError);

			await expect(retrieveApplication(mockWorkspaceId, mockApplicationId)).rejects.toThrow();
			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});

		it("should handle 404 not found errors", async () => {
			const mockResponse = new Response(
				JSON.stringify({
					detail: "Application not found",
				}),
				{
					headers: { "Content-Type": "application/json" },
					status: 404,
				},
			);
			const httpError = new HTTPError(mockResponse, { path: "workspaces/applications" } as any, {} as any);

			mockGet.mockReturnValue({
				json: vi.fn().mockRejectedValue(httpError),
			});

			await expect(retrieveApplication(mockWorkspaceId, mockApplicationId)).rejects.toThrow(HTTPError);
		});
	});

	describe("updateApplication", () => {
		it("should call the API with correct parameters", async () => {
			const updateData: API.UpdateApplication.RequestBody = {
				form_inputs: {
					field1: "value1",
					field2: "value2",
				},
				research_objectives: [
					{
						description: "Description 1",
						number: 1,
						research_tasks: [
							{
								description: "Task Description",
								number: 1,
								title: "Task 1",
							},
						],
						title: "Objective 1",
					},
				],
				status: "IN_PROGRESS",
				title: "Updated Title",
			};

			await updateApplication(mockWorkspaceId, mockApplicationId, updateData);

			expect(mockPatch).toHaveBeenCalledWith(`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}`, {
				headers: mockAuthHeaders,
				json: updateData,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});

		it("should handle partial updates", async () => {
			const partialUpdateData = {
				title: "Updated Title Only",
			} as API.UpdateApplication.RequestBody;

			await updateApplication(mockWorkspaceId, mockApplicationId, partialUpdateData);

			expect(mockPatch).toHaveBeenCalledWith(`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}`, {
				headers: mockAuthHeaders,
				json: partialUpdateData,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});
	});

	describe("updateGrantTemplate", () => {
		it("should call the API with correct parameters", async () => {
			const updateData: API.UpdateGrantTemplate.RequestBody = {
				grant_sections: [
					{
						depends_on: [],
						generation_instructions: "Write an introduction",
						id: "section1",
						is_clinical_trial: false,
						is_detailed_workplan: false,
						keywords: ["intro", "background"],
						max_words: 500,
						order: 1,
						parent_id: null,
						search_queries: ["introduction research"],
						title: "Introduction",
						topics: ["research background"],
					},
				],
				submission_date: "2024-12-31",
			};

			await updateGrantTemplate(mockWorkspaceId, mockApplicationId, mockTemplateId, updateData);

			expect(mockPatch).toHaveBeenCalledWith(
				`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/grant-template/${mockTemplateId}`,
				{
					headers: mockAuthHeaders,
					json: updateData,
				},
			);

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});

		it("should handle submission date only update", async () => {
			const updateData = {
				submission_date: "2024-12-31",
			} as API.UpdateGrantTemplate.RequestBody;

			await updateGrantTemplate(mockWorkspaceId, mockApplicationId, mockTemplateId, updateData);

			expect(mockPatch).toHaveBeenCalledWith(
				`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/grant-template/${mockTemplateId}`,
				{
					headers: mockAuthHeaders,
					json: updateData,
				},
			);

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});
	});

	describe("generateApplication", () => {
		it("should call the API with correct parameters", async () => {
			await generateApplication(mockWorkspaceId, mockApplicationId);

			expect(mockPost).toHaveBeenCalledWith(`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}`, {
				headers: mockAuthHeaders,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});

		it("should handle API errors", async () => {
			const mockResponse = new Response();
			const mockError = new HTTPError(
				mockResponse,
				{
					path: `workspaces/${mockWorkspaceId}/applications/${mockApplicationId}`,
				} as never,
				{} as never,
			);

			mockPost.mockRejectedValue(mockError);
			mockWithAuthRedirect.mockRejectedValue(mockError);

			await expect(generateApplication(mockWorkspaceId, mockApplicationId)).rejects.toThrow();
			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});
	});

	describe("deleteApplication", () => {
		it("should call the API with correct parameters", async () => {
			await deleteApplication(mockWorkspaceId, mockApplicationId);

			expect(mockDelete).toHaveBeenCalledWith(`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}`, {
				headers: mockAuthHeaders,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});
	});

	describe("error handling", () => {
		it("should handle API errors correctly", async () => {
			const mockError = new Error("API Error");
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockRejectedValue(mockError),
			});

			mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

			await expect(createApplication(mockWorkspaceId, { title: "Test" })).rejects.toThrow("API Error");
		});

		it("should redirect to sign-in page on 401 errors", async () => {
			const mockResponse = new Response(null, { status: 401 });
			const httpError = new HTTPError(mockResponse, { path: "workspaces/applications" } as any, {} as any);

			mockPost.mockReturnValueOnce({
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

			await createApplication(mockWorkspaceId, { title: "Test" });

			expect(mockRedirect).toHaveBeenCalledWith("/signin");
		});

		it("should handle 400 validation errors", async () => {
			const mockResponse = new Response(
				JSON.stringify({
					detail: "Validation error",
					extra: { title: ["Title cannot be empty"] },
				}),
				{
					headers: { "Content-Type": "application/json" },
					status: 400,
				},
			);
			const httpError = new HTTPError(mockResponse, { path: "workspaces/applications" } as any, {} as any);

			mockPost.mockReturnValueOnce({
				json: vi.fn().mockRejectedValue(httpError),
			});

			await expect(createApplication(mockWorkspaceId, { title: "" })).rejects.toThrow(HTTPError);
		});

		it("should handle 403 forbidden errors", async () => {
			const mockResponse = new Response(JSON.stringify({ detail: "Insufficient permissions" }), {
				headers: { "Content-Type": "application/json" },
				status: 403,
			});
			const httpError = new HTTPError(mockResponse, { path: "workspaces/applications" } as any, {} as any);

			mockDelete.mockRejectedValueOnce(httpError);

			await expect(deleteApplication(mockWorkspaceId, mockApplicationId)).rejects.toThrow(HTTPError);
		});
	});

	describe("auth header handling", () => {
		it("should handle auth header generation failure", async () => {
			mockCreateAuthHeaders.mockRejectedValueOnce(new Error("Failed to get auth token"));
			mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

			await expect(createApplication(mockWorkspaceId, { title: "Test" })).rejects.toThrow(
				"Failed to get auth token",
			);
		});

		it("should handle null auth headers", async () => {
			mockCreateAuthHeaders.mockResolvedValueOnce(null);
			mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({ id: mockApplicationId }),
			});

			await createApplication(mockWorkspaceId, { title: "Test" });

			expect(mockPost).toHaveBeenCalledWith(`workspaces/${mockWorkspaceId}/applications`, {
				headers: null,
				json: { title: "Test" },
			});
		});

		it("should handle empty auth headers", async () => {
			mockCreateAuthHeaders.mockResolvedValueOnce({});
			mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

			mockPatch.mockResolvedValueOnce(undefined);

			await updateApplication(mockWorkspaceId, mockApplicationId, { title: "Updated" } as any);

			expect(mockPatch).toHaveBeenCalledWith(`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}`, {
				headers: {},
				json: { title: "Updated" },
			});
		});
	});

	describe("auth redirect behavior", () => {
		it("should pass through the promise when withAuthRedirect doesn't modify it", async () => {
			const expectedResponse = { id: "new-app-id" };
			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(expectedResponse),
			});

			const result = await createApplication(mockWorkspaceId, { title: "Test App" });

			expect(result).toEqual(expectedResponse);
			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});

		it("should handle withAuthRedirect returning undefined for void functions", async () => {
			mockWithAuthRedirect.mockResolvedValueOnce(undefined);

			mockPatch.mockResolvedValueOnce(undefined);

			const result = await updateGrantTemplate(mockWorkspaceId, mockApplicationId, mockTemplateId, {
				submission_date: "2024-12-31",
			} as any);

			expect(result).toBeUndefined();
		});
	});
});

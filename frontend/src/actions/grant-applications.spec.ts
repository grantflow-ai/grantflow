import {
	ApplicationFactory,
	CreateApplicationRequestFactory,
	GrantTemplateFactory,
	UpdateApplicationRequestFactory,
} from "::testing/factories";
import { mockRedirect } from "::testing/global-mocks";
import { HTTPError } from "ky";
import type { API } from "@/types/api-types";
import {
	createApplication,
	deleteApplication,
	generateApplication,
	retrieveApplication,
	updateApplication,
} from "./grant-applications";
import { updateGrantTemplate } from "./grant-template";

const mockPost = vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
const mockPatch = vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
const mockDelete = vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
const mockGet = vi.fn().mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
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
const mockApplicationId = "mock-application-id";
const mockTemplateId = "mock-template-id";
const mockAuthHeaders = { Authorization: "Bearer mock-token" };

const mockCreateApplicationResponse = ApplicationFactory.build({
	id: mockApplicationId,
});

const fundingOrg: NonNullable<API.RetrieveApplication.Http200.ResponseBody["grant_template"]>["funding_organization"] =
	{
		abbreviation: "NIH",
		created_at: "2024-01-01T00:00:00Z",
		full_name: "National Institutes of Health",
		id: "org-1",
		updated_at: "2024-01-01T00:00:00Z",
	};

const grantTemplate: NonNullable<API.RetrieveApplication.Http200.ResponseBody["grant_template"]> = {
	...GrantTemplateFactory.build(),
	created_at: "2024-01-01T00:00:00Z",
	funding_organization: fundingOrg,
	funding_organization_id: "org-1",
	grant_application_id: mockApplicationId,
	id: mockTemplateId,
	updated_at: "2024-01-01T00:00:00Z",
};

const mockRetrieveApplicationResponse = ApplicationFactory.build({
	created_at: "2024-01-01T00:00:00Z",
	grant_template: grantTemplate,
	id: mockApplicationId,
}) as API.RetrieveApplication.Http200.ResponseBody;

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

	mockPatch.mockReturnValue({
		json: vi.fn().mockResolvedValue(mockRetrieveApplicationResponse),
	});
	mockDelete.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("Grant Application Actions", () => {
	describe("createApplication", () => {
		it("should call the API with correct parameters", async () => {
			const applicationData = CreateApplicationRequestFactory.build();

			const result = await createApplication(mockProjectId, applicationData);

			expect(mockPost).toHaveBeenCalledWith(`projects/${mockProjectId}/applications`, {
				headers: mockAuthHeaders,
				json: applicationData,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockCreateApplicationResponse);
		});
	});

	describe("retrieveApplication", () => {
		it("should call the API with correct parameters", async () => {
			const result = await retrieveApplication(mockProjectId, mockApplicationId);

			expect(mockGet).toHaveBeenCalledWith(`projects/${mockProjectId}/applications/${mockApplicationId}`, {
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
					path: `projects/${mockProjectId}/applications/${mockApplicationId}`,
				} as never,
				{} as never,
			);

			mockGet.mockReturnValue({
				json: vi.fn().mockRejectedValue(mockError),
			});
			mockWithAuthRedirect.mockRejectedValue(mockError);

			await expect(retrieveApplication(mockProjectId, mockApplicationId)).rejects.toThrow();
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
			const httpError = new HTTPError(mockResponse, { path: "projects/applications" } as any, {} as any);

			mockGet.mockReturnValue({
				json: vi.fn().mockRejectedValue(httpError),
			});

			await expect(retrieveApplication(mockProjectId, mockApplicationId)).rejects.toThrow(HTTPError);
		});
	});

	describe("updateApplication", () => {
		it("should call the API with correct parameters", async () => {
			const updateData = UpdateApplicationRequestFactory.build();

			await updateApplication(mockProjectId, mockApplicationId, updateData);

			expect(mockPatch).toHaveBeenCalledWith(`projects/${mockProjectId}/applications/${mockApplicationId}`, {
				headers: mockAuthHeaders,
				json: updateData,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});

		it("should handle partial updates", async () => {
			const partialUpdateData = {
				title: "Updated Title Only",
			} as API.UpdateApplication.RequestBody;

			await updateApplication(mockProjectId, mockApplicationId, partialUpdateData);

			expect(mockPatch).toHaveBeenCalledWith(`projects/${mockProjectId}/applications/${mockApplicationId}`, {
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
						is_detailed_research_plan: false,
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

			await updateGrantTemplate(mockProjectId, mockApplicationId, mockTemplateId, updateData);

			expect(mockPatch).toHaveBeenCalledWith(
				`projects/${mockProjectId}/applications/${mockApplicationId}/grant-template/${mockTemplateId}`,
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

			await updateGrantTemplate(mockProjectId, mockApplicationId, mockTemplateId, updateData);

			expect(mockPatch).toHaveBeenCalledWith(
				`projects/${mockProjectId}/applications/${mockApplicationId}/grant-template/${mockTemplateId}`,
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
			await generateApplication(mockProjectId, mockApplicationId);

			expect(mockPost).toHaveBeenCalledWith(`projects/${mockProjectId}/applications/${mockApplicationId}`, {
				headers: mockAuthHeaders,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});

		it("should handle API errors", async () => {
			const mockResponse = new Response();
			const mockError = new HTTPError(
				mockResponse,
				{
					path: `projects/${mockProjectId}/applications/${mockApplicationId}`,
				} as never,
				{} as never,
			);

			mockPost.mockRejectedValue(mockError);
			mockWithAuthRedirect.mockRejectedValue(mockError);

			await expect(generateApplication(mockProjectId, mockApplicationId)).rejects.toThrow();
			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});
	});

	describe("deleteApplication", () => {
		it("should call the API with correct parameters", async () => {
			await deleteApplication(mockProjectId, mockApplicationId);

			expect(mockDelete).toHaveBeenCalledWith(`projects/${mockProjectId}/applications/${mockApplicationId}`, {
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

			await expect(createApplication(mockProjectId, { title: "Test" })).rejects.toThrow("API Error");
		});

		it("should redirect to sign-in page on 401 errors", async () => {
			const mockResponse = new Response(null, { status: 401 });
			const httpError = new HTTPError(mockResponse, { path: "projects/applications" } as any, {} as any);

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

			await createApplication(mockProjectId, { title: "Test" });

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
			const httpError = new HTTPError(mockResponse, { path: "projects/applications" } as any, {} as any);

			mockPost.mockReturnValueOnce({
				json: vi.fn().mockRejectedValue(httpError),
			});

			await expect(createApplication(mockProjectId, { title: "" })).rejects.toThrow(HTTPError);
		});

		it("should handle 403 forbidden errors", async () => {
			const mockResponse = new Response(JSON.stringify({ detail: "Insufficient permissions" }), {
				headers: { "Content-Type": "application/json" },
				status: 403,
			});
			const httpError = new HTTPError(mockResponse, { path: "projects/applications" } as any, {} as any);

			mockDelete.mockRejectedValueOnce(httpError);

			await expect(deleteApplication(mockProjectId, mockApplicationId)).rejects.toThrow(HTTPError);
		});
	});

	describe("auth header handling", () => {
		it("should handle auth header generation failure", async () => {
			mockCreateAuthHeaders.mockRejectedValueOnce(new Error("Failed to get auth token"));
			mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

			await expect(createApplication(mockProjectId, { title: "Test" })).rejects.toThrow(
				"Failed to get auth token",
			);
		});

		it("should handle null auth headers", async () => {
			mockCreateAuthHeaders.mockResolvedValueOnce(null);
			mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

			mockPost.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue({ id: mockApplicationId }),
			});

			await createApplication(mockProjectId, { title: "Test" });

			expect(mockPost).toHaveBeenCalledWith(`projects/${mockProjectId}/applications`, {
				headers: null,
				json: { title: "Test" },
			});
		});

		it("should handle empty auth headers", async () => {
			mockCreateAuthHeaders.mockResolvedValueOnce({});
			mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

			mockPatch.mockReturnValueOnce({
				json: vi.fn().mockResolvedValue(mockRetrieveApplicationResponse),
			});

			await updateApplication(mockProjectId, mockApplicationId, { title: "Updated" });

			expect(mockPatch).toHaveBeenCalledWith(`projects/${mockProjectId}/applications/${mockApplicationId}`, {
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

			const result = await createApplication(mockProjectId, { title: "Test App" });

			expect(result).toEqual(expectedResponse);
			expect(mockWithAuthRedirect).toHaveBeenCalled();
		});

		it("should handle withAuthRedirect returning undefined for void functions", async () => {
			mockWithAuthRedirect.mockResolvedValueOnce(undefined);

			mockPatch.mockResolvedValueOnce(undefined);

			const result = await updateGrantTemplate(mockProjectId, mockApplicationId, mockTemplateId, {
				submission_date: "2024-12-31",
			} as any);

			expect(result).toBeUndefined();
		});
	});
});

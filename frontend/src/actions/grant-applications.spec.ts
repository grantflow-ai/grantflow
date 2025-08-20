import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	CreateApplicationRequestFactory,
	TriggerAutofillRequestFactory,
	UpdateApplicationRequestFactory,
} from "::testing/factories";
import { HTTPError } from "ky";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClient } from "@/utils/api/server";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";
import {
	createApplication,
	deleteApplication,
	duplicateApplication,
	generateApplication,
	getApplication,
	listApplications,
	listOrganizationApplications,
	triggerAutofill,
	updateApplication,
} from "./grant-applications";

vi.mock("@/utils/api/server");
vi.mock("@/utils/server-side");

const mockOrganizationId = "org-123";
const mockProjectId = "proj-456";
const mockApplicationId = "app-789";

describe("grant-applications actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createAuthHeaders).mockResolvedValue({
			Authorization: "Bearer mock-token",
		});
		vi.mocked(withAuthRedirect).mockImplementation((promise) => promise);
	});

	describe("createApplication", () => {
		it("should create an application successfully", async () => {
			const mockData = CreateApplicationRequestFactory.build();
			const mockResponse = ApplicationFactory.build();

			const mockPost = vi.fn().mockReturnValue({
				json: vi.fn().mockResolvedValue(mockResponse),
			});

			vi.mocked(getClient).mockReturnValue({
				post: mockPost,
			} as any);

			const result = await createApplication(mockOrganizationId, mockProjectId, mockData);

			expect(mockPost).toHaveBeenCalledWith(
				`organizations/${mockOrganizationId}/projects/${mockProjectId}/applications`,
				{
					headers: { Authorization: "Bearer mock-token" },
					json: mockData,
				},
			);
			expect(result).toEqual(mockResponse);
		});

		it("should handle errors during creation", async () => {
			const mockData = CreateApplicationRequestFactory.build();
			const mockError = new HTTPError(
				new Response(JSON.stringify({ detail: "Bad request" }), {
					status: 400,
					statusText: "Bad Request",
				}),
				new Request("http://test.com"),
				{
					method: "POST",
					onDownloadProgress: () => {},
					onUploadProgress: () => {},
					prefixUrl: "",
					retry: {
						count: 0,
						delay: 0,
						methods: ["GET", "POST"],
						statusCodes: [408, 413, 429, 500, 502, 503, 504],
					},
				} as any,
			);

			vi.mocked(withAuthRedirect).mockRejectedValue(mockError);

			await expect(createApplication(mockOrganizationId, mockProjectId, mockData)).rejects.toThrow(mockError);
		});
	});

	describe("deleteApplication", () => {
		it("should delete an application successfully", async () => {
			const mockDelete = vi.fn().mockResolvedValue(undefined);

			vi.mocked(getClient).mockReturnValue({
				delete: mockDelete,
			} as any);

			await deleteApplication(mockOrganizationId, mockProjectId, mockApplicationId);

			expect(mockDelete).toHaveBeenCalledWith(
				`organizations/${mockOrganizationId}/projects/${mockProjectId}/applications/${mockApplicationId}`,
				{
					headers: { Authorization: "Bearer mock-token" },
				},
			);
		});
	});

	describe("duplicateApplication", () => {
		it("should duplicate an application successfully", async () => {
			const mockTitle = "Duplicated Application";
			const mockResponse = ApplicationWithTemplateFactory.build();

			const mockPost = vi.fn().mockReturnValue({
				json: vi.fn().mockResolvedValue(mockResponse),
			});

			vi.mocked(getClient).mockReturnValue({
				post: mockPost,
			} as any);

			const result = await duplicateApplication(mockOrganizationId, mockProjectId, mockApplicationId, mockTitle);

			expect(mockPost).toHaveBeenCalledWith(
				`organizations/${mockOrganizationId}/projects/${mockProjectId}/applications/${mockApplicationId}/duplicate`,
				{
					headers: { Authorization: "Bearer mock-token" },
					json: { title: mockTitle },
				},
			);
			expect(result).toEqual(mockResponse);
		});
	});

	describe("generateApplication", () => {
		it("should trigger application generation", async () => {
			const mockPost = vi.fn().mockResolvedValue(undefined);

			vi.mocked(getClient).mockReturnValue({
				post: mockPost,
			} as any);

			await generateApplication(mockOrganizationId, mockProjectId, mockApplicationId);

			expect(mockPost).toHaveBeenCalledWith(
				`organizations/${mockOrganizationId}/projects/${mockProjectId}/applications/${mockApplicationId}`,
				{
					headers: { Authorization: "Bearer mock-token" },
				},
			);
		});
	});

	describe("getApplication", () => {
		it("should retrieve an application successfully", async () => {
			const mockResponse = ApplicationWithTemplateFactory.build();

			const mockGet = vi.fn().mockReturnValue({
				json: vi.fn().mockResolvedValue(mockResponse),
			});

			vi.mocked(getClient).mockReturnValue({
				get: mockGet,
			} as any);

			const result = await getApplication(mockOrganizationId, mockProjectId, mockApplicationId);

			expect(mockGet).toHaveBeenCalledWith(
				`organizations/${mockOrganizationId}/projects/${mockProjectId}/applications/${mockApplicationId}`,
				{
					headers: { Authorization: "Bearer mock-token" },
				},
			);
			expect(result).toEqual(mockResponse);
		});
	});

	describe("listApplications", () => {
		it("should list applications without params", async () => {
			const mockResponse = {
				items: ApplicationFactory.batch(3),
				limit: 10,
				offset: 0,
				total: 3,
			};

			const mockGet = vi.fn().mockReturnValue({
				json: vi.fn().mockResolvedValue(mockResponse),
			});

			vi.mocked(getClient).mockReturnValue({
				get: mockGet,
			} as any);

			const result = await listApplications(mockOrganizationId, mockProjectId);

			expect(mockGet).toHaveBeenCalledWith(
				`organizations/${mockOrganizationId}/projects/${mockProjectId}/applications`,
				{
					headers: { Authorization: "Bearer mock-token" },
				},
			);
			expect(result).toEqual(mockResponse);
		});

		it("should list applications with all params", async () => {
			const params = {
				limit: 20,
				offset: 10,
				order: "desc",
				search: "test",
				sort: "created_at",
				status: "draft",
			};

			const mockResponse = {
				items: ApplicationFactory.batch(2),
				limit: params.limit,
				offset: params.offset,
				total: 2,
			};

			const mockGet = vi.fn().mockReturnValue({
				json: vi.fn().mockResolvedValue(mockResponse),
			});

			vi.mocked(getClient).mockReturnValue({
				get: mockGet,
			} as any);

			const result = await listApplications(mockOrganizationId, mockProjectId, params);

			const expectedUrl = `organizations/${mockOrganizationId}/projects/${mockProjectId}/applications?search=test&status=draft&sort=created_at&order=desc&limit=20&offset=10`;

			expect(mockGet).toHaveBeenCalledWith(expectedUrl, {
				headers: { Authorization: "Bearer mock-token" },
			});
			expect(result).toEqual(mockResponse);
		});

		it("should list applications with partial params", async () => {
			const params = {
				limit: 5,
				search: "grant",
			};

			const mockResponse = {
				items: ApplicationFactory.batch(1),
				limit: params.limit,
				offset: 0,
				total: 1,
			};

			const mockGet = vi.fn().mockReturnValue({
				json: vi.fn().mockResolvedValue(mockResponse),
			});

			vi.mocked(getClient).mockReturnValue({
				get: mockGet,
			} as any);

			const result = await listApplications(mockOrganizationId, mockProjectId, params);

			const expectedUrl = `organizations/${mockOrganizationId}/projects/${mockProjectId}/applications?search=grant&limit=5`;

			expect(mockGet).toHaveBeenCalledWith(expectedUrl, {
				headers: { Authorization: "Bearer mock-token" },
			});
			expect(result).toEqual(mockResponse);
		});
	});

	describe("triggerAutofill", () => {
		it("should trigger autofill successfully", async () => {
			const mockData = TriggerAutofillRequestFactory.build();
			const mockResponse = { job_id: "job-123" };

			const mockPost = vi.fn().mockReturnValue({
				json: vi.fn().mockResolvedValue(mockResponse),
			});

			vi.mocked(getClient).mockReturnValue({
				post: mockPost,
			} as any);

			const result = await triggerAutofill(mockOrganizationId, mockProjectId, mockApplicationId, mockData);

			expect(mockPost).toHaveBeenCalledWith(
				`organizations/${mockOrganizationId}/projects/${mockProjectId}/applications/${mockApplicationId}/autofill`,
				{
					headers: { Authorization: "Bearer mock-token" },
					json: mockData,
				},
			);
			expect(result).toEqual(mockResponse);
		});
	});

	describe("listOrganizationApplications", () => {
		it("should list organization applications without params", async () => {
			const mockResponse = {
				applications: ApplicationFactory.batch(5),
				pagination: {
					has_more: false,
					limit: 5,
					offset: 0,
					total: 5,
				},
			};

			const mockGet = vi.fn().mockReturnValue({
				json: vi.fn().mockResolvedValue(mockResponse),
			});

			vi.mocked(getClient).mockReturnValue({
				get: mockGet,
			} as any);

			const result = await listOrganizationApplications(mockOrganizationId);

			expect(mockGet).toHaveBeenCalledWith(`organizations/${mockOrganizationId}/applications`, {
				headers: { Authorization: "Bearer mock-token" },
			});
			expect(result).toEqual(mockResponse);
		});

		it("should list organization applications with search param", async () => {
			const params = {
				search: "research grant",
			};

			const mockResponse = {
				applications: ApplicationFactory.batch(2),
				pagination: {
					has_more: false,
					limit: 5,
					offset: 0,
					total: 2,
				},
			};

			const mockGet = vi.fn().mockReturnValue({
				json: vi.fn().mockResolvedValue(mockResponse),
			});

			vi.mocked(getClient).mockReturnValue({
				get: mockGet,
			} as any);

			const result = await listOrganizationApplications(mockOrganizationId, params);

			const expectedUrl = `organizations/${mockOrganizationId}/applications?search=research+grant`;

			expect(mockGet).toHaveBeenCalledWith(expectedUrl, {
				headers: { Authorization: "Bearer mock-token" },
			});
			expect(result).toEqual(mockResponse);
		});

		it("should handle empty results", async () => {
			const params = {
				search: "nonexistent",
			};

			const mockResponse = {
				applications: [],
				pagination: {
					has_more: false,
					limit: 5,
					offset: 0,
					total: 0,
				},
			};

			const mockGet = vi.fn().mockReturnValue({
				json: vi.fn().mockResolvedValue(mockResponse),
			});

			vi.mocked(getClient).mockReturnValue({
				get: mockGet,
			} as any);

			const result = await listOrganizationApplications(mockOrganizationId, params);

			expect(result.applications).toHaveLength(0);
			expect(result.pagination.total).toBe(0);
		});

		it("should handle errors when listing organization applications", async () => {
			const mockError = new HTTPError(
				new Response(JSON.stringify({ detail: "Internal server error" }), {
					status: 500,
					statusText: "Internal Server Error",
				}),
				new Request("http://test.com"),
				{
					method: "GET",
					onDownloadProgress: () => {},
					onUploadProgress: () => {},
					prefixUrl: "",
					retry: {
						count: 0,
						delay: 0,
						methods: ["GET", "POST"],
						statusCodes: [408, 413, 429, 500, 502, 503, 504],
					},
				} as any,
			);

			vi.mocked(withAuthRedirect).mockRejectedValue(mockError);

			await expect(listOrganizationApplications(mockOrganizationId)).rejects.toThrow(mockError);
		});
	});

	describe("updateApplication", () => {
		it("should update an application successfully", async () => {
			const mockData = UpdateApplicationRequestFactory.build();
			const mockResponse = ApplicationWithTemplateFactory.build();

			const mockPatch = vi.fn().mockReturnValue({
				json: vi.fn().mockResolvedValue(mockResponse),
			});

			vi.mocked(getClient).mockReturnValue({
				patch: mockPatch,
			} as any);

			const result = await updateApplication(mockOrganizationId, mockProjectId, mockApplicationId, mockData);

			expect(mockPatch).toHaveBeenCalledWith(
				`organizations/${mockOrganizationId}/projects/${mockProjectId}/applications/${mockApplicationId}`,
				{
					headers: { Authorization: "Bearer mock-token" },
					json: mockData,
				},
			);
			expect(result).toEqual(mockResponse);
		});

		it("should update with partial data", async () => {
			const partialData = { title: "Updated Title" };
			const mockResponse = ApplicationWithTemplateFactory.build();

			const mockPatch = vi.fn().mockReturnValue({
				json: vi.fn().mockResolvedValue(mockResponse),
			});

			vi.mocked(getClient).mockReturnValue({
				patch: mockPatch,
			} as any);

			const result = await updateApplication(mockOrganizationId, mockProjectId, mockApplicationId, partialData);

			expect(mockPatch).toHaveBeenCalledWith(
				`organizations/${mockOrganizationId}/projects/${mockProjectId}/applications/${mockApplicationId}`,
				{
					headers: { Authorization: "Bearer mock-token" },
					json: partialData,
				},
			);
			expect(result).toEqual(mockResponse);
		});
	});
});

import {
	ApplicationFactory,
	CreateApplicationRequestFactory,
	ListApplicationsResponseFactory,
	TriggerAutofillRequestFactory,
	TriggerAutofillResponseFactory,
	UpdateApplicationRequestFactory,
} from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";
import {
	createApplication,
	deleteApplication,
	duplicateApplication,
	generateApplication,
	getApplication,
	listApplications,
	triggerAutofill,
	updateApplication,
} from "./grant-applications";

// Mock the dependencies
vi.mock("@/utils/api");
vi.mock("@/utils/server-side");

const mockGetClient = vi.mocked(getClient);
const mockCreateAuthHeaders = vi.mocked(createAuthHeaders);
const mockWithAuthRedirect = vi.mocked(withAuthRedirect);

describe("Grant Applications Actions", () => {
	const organizationId = "org-123";
	const projectId = "project-456";
	const applicationId = "app-789";
	const mockAuthHeaders = { Authorization: "Bearer token" };

	let mockClient: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockClient = {
			delete: vi.fn(),
			get: vi.fn(),
			patch: vi.fn(),
			post: vi.fn(),
		};
		mockGetClient.mockReturnValue(mockClient);
		mockCreateAuthHeaders.mockResolvedValue(mockAuthHeaders);
		mockWithAuthRedirect.mockImplementation((promise) => promise);
	});

	describe("createApplication", () => {
		it("should create application with correct parameters", async () => {
			const requestData = CreateApplicationRequestFactory.build();
			const responseData = ApplicationFactory.build({
				id: applicationId,
				project_id: projectId,
			});

			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await createApplication(organizationId, projectId, requestData);

			expect(mockClient.post).toHaveBeenCalledWith(
				`organizations/${organizationId}/projects/${projectId}/applications`,
				{
					headers: mockAuthHeaders,
					json: requestData,
				},
			);
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const requestData = CreateApplicationRequestFactory.build();

			mockClient.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(createApplication(organizationId, projectId, requestData)).rejects.toThrow("API Error");
		});
	});

	describe("deleteApplication", () => {
		it("should delete application with correct parameters", async () => {
			mockClient.delete.mockResolvedValue(undefined);

			await deleteApplication(organizationId, projectId, applicationId);

			expect(mockClient.delete).toHaveBeenCalledWith(
				`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}`,
				{
					headers: mockAuthHeaders,
				},
			);
		});

		it("should handle API errors correctly", async () => {
			mockClient.delete.mockRejectedValue(new Error("API Error"));

			await expect(deleteApplication(organizationId, projectId, applicationId)).rejects.toThrow("API Error");
		});
	});

	describe("duplicateApplication", () => {
		it("should duplicate application with correct parameters", async () => {
			const title = "Duplicated Application";
			const responseData = ApplicationFactory.build({
				id: "app-duplicate",
				project_id: projectId,
				title,
			});

			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await duplicateApplication(organizationId, projectId, applicationId, title);

			expect(mockClient.post).toHaveBeenCalledWith(
				`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}/duplicate`,
				{
					headers: mockAuthHeaders,
					json: { title },
				},
			);
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const title = "Duplicated Application";
			mockClient.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(duplicateApplication(organizationId, projectId, applicationId, title)).rejects.toThrow(
				"API Error",
			);
		});
	});

	describe("generateApplication", () => {
		it("should generate application with correct parameters", async () => {
			mockClient.post.mockResolvedValue(undefined);

			await generateApplication(organizationId, projectId, applicationId);

			expect(mockClient.post).toHaveBeenCalledWith(
				`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}`,
				{
					headers: mockAuthHeaders,
				},
			);
		});

		it("should handle API errors correctly", async () => {
			mockClient.post.mockRejectedValue(new Error("API Error"));

			await expect(generateApplication(organizationId, projectId, applicationId)).rejects.toThrow("API Error");
		});
	});

	describe("getApplication", () => {
		it("should get application with correct parameters", async () => {
			const responseData = ApplicationFactory.build({
				id: applicationId,
				project_id: projectId,
			});

			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await getApplication(organizationId, projectId, applicationId);

			expect(mockClient.get).toHaveBeenCalledWith(
				`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}`,
				{
					headers: mockAuthHeaders,
				},
			);
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(getApplication(organizationId, projectId, applicationId)).rejects.toThrow("API Error");
		});
	});

	describe("listApplications", () => {
		it("should list applications without parameters", async () => {
			const responseData = ListApplicationsResponseFactory.build();

			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await listApplications(organizationId, projectId);

			expect(mockClient.get).toHaveBeenCalledWith(
				`organizations/${organizationId}/projects/${projectId}/applications`,
				{
					headers: mockAuthHeaders,
				},
			);
			expect(result).toEqual(responseData);
		});

		it("should list applications with all parameters", async () => {
			const params = {
				limit: 20,
				offset: 10,
				order: "asc",
				search: "test",
				sort: "title",
				status: "draft",
			};

			const responseData = ListApplicationsResponseFactory.build({
				pagination: {
					has_more: false,
					limit: 20,
					offset: 10,
					total: 0,
				},
			});

			mockClient.get.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await listApplications(organizationId, projectId, params);

			expect(mockClient.get).toHaveBeenCalledWith(
				`organizations/${organizationId}/projects/${projectId}/applications?search=test&status=draft&sort=title&order=asc&limit=20&offset=10`,
				{
					headers: mockAuthHeaders,
				},
			);
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			mockClient.get.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(listApplications(organizationId, projectId)).rejects.toThrow("API Error");
		});
	});

	describe("triggerAutofill", () => {
		it("should trigger autofill with correct parameters", async () => {
			const requestData = TriggerAutofillRequestFactory.build();
			const responseData = TriggerAutofillResponseFactory.build({
				application_id: applicationId,
			});

			mockClient.post.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await triggerAutofill(organizationId, projectId, applicationId, requestData);

			expect(mockClient.post).toHaveBeenCalledWith(
				`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}/autofill`,
				{
					headers: mockAuthHeaders,
					json: requestData,
				},
			);
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const requestData = TriggerAutofillRequestFactory.build();
			mockClient.post.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(triggerAutofill(organizationId, projectId, applicationId, requestData)).rejects.toThrow(
				"API Error",
			);
		});
	});

	describe("updateApplication", () => {
		it("should update application with correct parameters", async () => {
			const requestData = UpdateApplicationRequestFactory.build();
			const responseData = ApplicationFactory.build({
				id: applicationId,
				project_id: projectId,
				title: "Updated Application",
			});

			mockClient.patch.mockReturnValue({
				json: vi.fn().mockResolvedValue(responseData),
			});

			const result = await updateApplication(organizationId, projectId, applicationId, requestData);

			expect(mockClient.patch).toHaveBeenCalledWith(
				`organizations/${organizationId}/projects/${projectId}/applications/${applicationId}`,
				{
					headers: mockAuthHeaders,
					json: requestData,
				},
			);
			expect(result).toEqual(responseData);
		});

		it("should handle API errors correctly", async () => {
			const requestData = UpdateApplicationRequestFactory.build();
			mockClient.patch.mockReturnValue({
				json: vi.fn().mockRejectedValue(new Error("API Error")),
			});

			await expect(updateApplication(organizationId, projectId, applicationId, requestData)).rejects.toThrow(
				"API Error",
			);
		});
	});

	describe("withAuthRedirect integration", () => {
		it("should call withAuthRedirect for all functions", async () => {
			// Set up success mocks
			mockClient.get.mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
			mockClient.post.mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
			mockClient.patch.mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
			mockClient.delete.mockResolvedValue(undefined);

			await getApplication(organizationId, projectId, applicationId);
			await createApplication(organizationId, projectId, CreateApplicationRequestFactory.build());
			await updateApplication(organizationId, projectId, applicationId, UpdateApplicationRequestFactory.build());
			await deleteApplication(organizationId, projectId, applicationId);
			await generateApplication(organizationId, projectId, applicationId);
			await duplicateApplication(organizationId, projectId, applicationId, "Duplicate");
			await triggerAutofill(organizationId, projectId, applicationId, TriggerAutofillRequestFactory.build());
			await listApplications(organizationId, projectId);

			expect(mockWithAuthRedirect).toHaveBeenCalledTimes(8);
		});
	});

	describe("createAuthHeaders integration", () => {
		it("should call createAuthHeaders for all functions", async () => {
			// Set up success mocks
			mockClient.get.mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
			mockClient.post.mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
			mockClient.patch.mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
			mockClient.delete.mockResolvedValue(undefined);

			await getApplication(organizationId, projectId, applicationId);
			await createApplication(organizationId, projectId, CreateApplicationRequestFactory.build());
			await updateApplication(organizationId, projectId, applicationId, UpdateApplicationRequestFactory.build());
			await deleteApplication(organizationId, projectId, applicationId);
			await generateApplication(organizationId, projectId, applicationId);
			await duplicateApplication(organizationId, projectId, applicationId, "Duplicate");
			await triggerAutofill(organizationId, projectId, applicationId, TriggerAutofillRequestFactory.build());
			await listApplications(organizationId, projectId);

			expect(mockCreateAuthHeaders).toHaveBeenCalledTimes(8);
		});
	});
});

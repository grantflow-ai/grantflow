import { HTTPError } from "ky";

import { IdResponseFactory, MessageResponseFactory, UrlRequestFactory, UrlResponseFactory } from "::testing/factories";
import { mockRedirect } from "::testing/global-mocks";

import {
	crawlApplicationUrl,
	crawlTemplateUrl,
	createApplicationSourceUploadUrl,
	createTemplateSourceUploadUrl,
	deleteApplicationSource,
	deleteTemplateSource,
	getApplicationSources,
	getTemplateSources,
} from "./sources";

const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockPost = vi.fn();
const mockCreateAuthHeaders = vi.fn();
const mockWithAuthRedirect = vi.fn();

vi.mock("@/utils/api", async () => {
	const actual = await vi.importActual("@/utils/api");
	return {
		...actual,
		getClient: () => ({
			delete: mockDelete,
			get: mockGet,
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

describe("Sources Actions", () => {
	const mockWorkspaceId = "mock-workspace-id";
	const mockApplicationId = "mock-application-id";
	const mockTemplateId = "mock-template-id";
	const mockSourceId = "mock-source-id";
	const mockAuthHeaders = { Authorization: "Bearer mock-token" };
	const mockFileName = "mock-file-name";

	const mockSourcesResponse = [
		IdResponseFactory.build({ id: "source-1" }),
		IdResponseFactory.build({ id: "source-2" }),
		IdResponseFactory.build({ id: "source-3" }),
	];
	const mockUploadUrlResponse = UrlResponseFactory.build();

	beforeEach(() => {
		vi.clearAllMocks();

		mockCreateAuthHeaders.mockResolvedValue(mockAuthHeaders);
		mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

		mockGet.mockReturnValue({
			json: vi.fn().mockResolvedValue(mockSourcesResponse),
		});

		mockPost.mockReturnValue({
			json: vi.fn().mockResolvedValue(mockUploadUrlResponse),
		});

		mockDelete.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("Grant Application Sources", () => {
		describe("getApplicationSources", () => {
			it("should call the API with correct parameters", async () => {
				const result = await getApplicationSources(mockWorkspaceId, mockApplicationId);

				expect(mockGet).toHaveBeenCalledWith(
					`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/sources`,
					{
						headers: mockAuthHeaders,
					},
				);

				expect(mockWithAuthRedirect).toHaveBeenCalled();
				expect(result).toEqual(mockSourcesResponse);
			});

			it("should handle API errors correctly", async () => {
				const mockError = new Error("API Error");
				mockGet.mockReturnValueOnce({
					json: vi.fn().mockRejectedValue(mockError),
				});

				mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

				await expect(getApplicationSources(mockWorkspaceId, mockApplicationId)).rejects.toThrow("API Error");
			});

			it("should redirect to sign-in page on 401 errors", async () => {
				const mockResponse = new Response(null, { status: 401 });
				const httpError = new HTTPError(mockResponse, { path: "sources" } as any, {} as any);

				mockGet.mockReturnValueOnce({
					json: vi.fn().mockRejectedValue(httpError),
				});

				mockWithAuthRedirect.mockImplementationOnce(async (promise: Promise<any>) => {
					try {
						return await promise;
					} catch (error) {
						if (error instanceof HTTPError && error.response.status === 401) {
							mockRedirect("/signin");
							return null;
						}
						throw error;
					}
				});

				await getApplicationSources(mockWorkspaceId, mockApplicationId);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});

		describe("deleteApplicationSource", () => {
			it("should call the API with correct parameters", async () => {
				await deleteApplicationSource(mockWorkspaceId, mockApplicationId, mockSourceId);

				expect(mockDelete).toHaveBeenCalledWith(
					`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/sources/${mockSourceId}`,
					{
						headers: mockAuthHeaders,
					},
				);

				expect(mockWithAuthRedirect).toHaveBeenCalled();
			});

			it("should handle API errors correctly", async () => {
				const mockError = new Error("API Error");
				mockDelete.mockRejectedValueOnce(mockError);

				mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

				await expect(deleteApplicationSource(mockWorkspaceId, mockApplicationId, mockSourceId)).rejects.toThrow(
					"API Error",
				);
			});

			it("should redirect to sign-in page on 401 errors", async () => {
				const mockResponse = new Response(null, { status: 401 });
				const httpError = new HTTPError(mockResponse, { path: "sources" } as any, {} as any);

				mockDelete.mockRejectedValueOnce(httpError);

				mockWithAuthRedirect.mockImplementationOnce(async (promise: Promise<any>) => {
					try {
						return await promise;
					} catch (error) {
						if (error instanceof HTTPError && error.response.status === 401) {
							mockRedirect("/signin");
							return null;
						}
						throw error;
					}
				});

				await deleteApplicationSource(mockWorkspaceId, mockApplicationId, mockSourceId);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});

		describe("createApplicationSourceUploadUrl", () => {
			it("should call the API with correct parameters", async () => {
				const result = await createApplicationSourceUploadUrl(mockWorkspaceId, mockApplicationId, mockFileName);

				expect(mockPost).toHaveBeenCalledWith(
					`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/sources/upload-url?blob_name=${mockFileName}`,
					{
						headers: mockAuthHeaders,
					},
				);

				expect(mockWithAuthRedirect).toHaveBeenCalled();
				expect(result).toEqual(mockUploadUrlResponse);
			});

			it("should handle API errors correctly", async () => {
				const mockError = new Error("API Error");
				mockPost.mockReturnValueOnce({
					json: vi.fn().mockRejectedValue(mockError),
				});

				mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

				await expect(
					createApplicationSourceUploadUrl(mockWorkspaceId, mockApplicationId, mockFileName),
				).rejects.toThrow("API Error");
			});

			it("should redirect to sign-in page on 401 errors", async () => {
				const mockResponse = new Response(null, { status: 401 });
				const httpError = new HTTPError(mockResponse, { path: "upload-url" } as any, {} as any);

				mockPost.mockReturnValueOnce({
					json: vi.fn().mockRejectedValue(httpError),
				});

				mockWithAuthRedirect.mockImplementationOnce(async (promise: Promise<any>) => {
					try {
						return await promise;
					} catch (error) {
						if (error instanceof HTTPError && error.response.status === 401) {
							mockRedirect("/signin");
							return null;
						}
						throw error;
					}
				});

				await createApplicationSourceUploadUrl(mockWorkspaceId, mockApplicationId, mockFileName);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});
	});

	describe("Grant Template Sources", () => {
		describe("getTemplateSources", () => {
			it("should call the API with correct parameters", async () => {
				const result = await getTemplateSources(mockWorkspaceId, mockTemplateId);

				expect(mockGet).toHaveBeenCalledWith(
					`workspaces/${mockWorkspaceId}/grant_templates/${mockTemplateId}/sources`,
					{
						headers: mockAuthHeaders,
					},
				);

				expect(mockWithAuthRedirect).toHaveBeenCalled();
				expect(result).toEqual(mockSourcesResponse);
			});

			it("should handle API errors correctly", async () => {
				const mockError = new Error("API Error");
				mockGet.mockReturnValueOnce({
					json: vi.fn().mockRejectedValue(mockError),
				});

				mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

				await expect(getTemplateSources(mockWorkspaceId, mockTemplateId)).rejects.toThrow("API Error");
			});

			it("should redirect to sign-in page on 401 errors", async () => {
				const mockResponse = new Response(null, { status: 401 });
				const httpError = new HTTPError(mockResponse, { path: "sources" } as any, {} as any);

				mockGet.mockReturnValueOnce({
					json: vi.fn().mockRejectedValue(httpError),
				});

				mockWithAuthRedirect.mockImplementationOnce(async (promise: Promise<any>) => {
					try {
						return await promise;
					} catch (error) {
						if (error instanceof HTTPError && error.response.status === 401) {
							mockRedirect("/signin");
							return null;
						}
						throw error;
					}
				});

				await getTemplateSources(mockWorkspaceId, mockTemplateId);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});

		describe("deleteTemplateSource", () => {
			it("should call the API with correct parameters", async () => {
				await deleteTemplateSource(mockWorkspaceId, mockTemplateId, mockSourceId);

				expect(mockDelete).toHaveBeenCalledWith(
					`workspaces/${mockWorkspaceId}/grant_templates/${mockTemplateId}/sources/${mockSourceId}`,
					{
						headers: mockAuthHeaders,
					},
				);

				expect(mockWithAuthRedirect).toHaveBeenCalled();
			});

			it("should handle API errors correctly", async () => {
				const mockError = new Error("API Error");
				mockDelete.mockRejectedValueOnce(mockError);

				mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

				await expect(deleteTemplateSource(mockWorkspaceId, mockTemplateId, mockSourceId)).rejects.toThrow(
					"API Error",
				);
			});

			it("should redirect to sign-in page on 401 errors", async () => {
				const mockResponse = new Response(null, { status: 401 });
				const httpError = new HTTPError(mockResponse, { path: "sources" } as any, {} as any);

				mockDelete.mockRejectedValueOnce(httpError);

				mockWithAuthRedirect.mockImplementationOnce(async (promise: Promise<any>) => {
					try {
						return await promise;
					} catch (error) {
						if (error instanceof HTTPError && error.response.status === 401) {
							mockRedirect("/signin");
							return null;
						}
						throw error;
					}
				});

				await deleteTemplateSource(mockWorkspaceId, mockTemplateId, mockSourceId);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});

		describe("createTemplateSourceUploadUrl", () => {
			it("should call the API with correct parameters", async () => {
				const result = await createTemplateSourceUploadUrl(mockWorkspaceId, mockTemplateId, mockFileName);

				expect(mockPost).toHaveBeenCalledWith(
					`workspaces/${mockWorkspaceId}/grant_templates/${mockTemplateId}/sources/upload-url?blob_name=${mockFileName}`,
					{
						headers: mockAuthHeaders,
					},
				);

				expect(mockWithAuthRedirect).toHaveBeenCalled();
				expect(result).toEqual(mockUploadUrlResponse);
			});

			it("should handle API errors correctly", async () => {
				const mockError = new Error("API Error");
				mockPost.mockReturnValueOnce({
					json: vi.fn().mockRejectedValue(mockError),
				});

				mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

				await expect(
					createTemplateSourceUploadUrl(mockWorkspaceId, mockTemplateId, mockFileName),
				).rejects.toThrow("API Error");
			});

			it("should redirect to sign-in page on 401 errors", async () => {
				const mockResponse = new Response(null, { status: 401 });
				const httpError = new HTTPError(mockResponse, { path: "upload-url" } as any, {} as any);

				mockPost.mockReturnValueOnce({
					json: vi.fn().mockRejectedValue(httpError),
				});

				mockWithAuthRedirect.mockImplementationOnce(async (promise: Promise<any>) => {
					try {
						return await promise;
					} catch (error) {
						if (error instanceof HTTPError && error.response.status === 401) {
							mockRedirect("/signin");
							return null;
						}
						throw error;
					}
				});

				await createTemplateSourceUploadUrl(mockWorkspaceId, mockTemplateId, mockFileName);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});

		describe("crawlTemplateUrl", () => {
			const urlRequest = UrlRequestFactory.build();
			const mockCrawlResponse = MessageResponseFactory.build();

			beforeEach(() => {
				mockPost.mockReturnValue({
					json: vi.fn().mockResolvedValue(mockCrawlResponse),
				});
			});

			it("should call the API with correct parameters", async () => {
				const result = await crawlTemplateUrl(mockWorkspaceId, mockTemplateId, urlRequest.url);

				expect(mockPost).toHaveBeenCalledWith(
					`workspaces/${mockWorkspaceId}/grant_templates/${mockTemplateId}/sources/crawl-url`,
					{
						headers: mockAuthHeaders,
						json: { url: urlRequest.url },
					},
				);

				expect(mockWithAuthRedirect).toHaveBeenCalled();
				expect(result).toEqual(mockCrawlResponse);
			});

			it("should handle API errors correctly", async () => {
				const mockError = new Error("API Error");
				mockPost.mockReturnValueOnce({
					json: vi.fn().mockRejectedValue(mockError),
				});

				mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

				await expect(crawlTemplateUrl(mockWorkspaceId, mockTemplateId, urlRequest.url)).rejects.toThrow(
					"API Error",
				);
			});

			it("should redirect to sign-in page on 401 errors", async () => {
				const mockResponse = new Response(null, { status: 401 });
				const httpError = new HTTPError(mockResponse, { path: "crawl-url" } as any, {} as any);

				mockPost.mockReturnValueOnce({
					json: vi.fn().mockRejectedValue(httpError),
				});

				mockWithAuthRedirect.mockImplementationOnce(async (promise: Promise<any>) => {
					try {
						return await promise;
					} catch (error) {
						if (error instanceof HTTPError && error.response.status === 401) {
							mockRedirect("/signin");
							return null;
						}
						throw error;
					}
				});

				await crawlTemplateUrl(mockWorkspaceId, mockTemplateId, urlRequest.url);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});

		describe("crawlApplicationUrl", () => {
			const urlRequest = UrlRequestFactory.build();
			const mockCrawlResponse = MessageResponseFactory.build();

			beforeEach(() => {
				mockPost.mockReturnValue({
					json: vi.fn().mockResolvedValue(mockCrawlResponse),
				});
			});

			it("should call the API with correct parameters", async () => {
				const result = await crawlApplicationUrl(mockWorkspaceId, mockApplicationId, urlRequest.url);

				expect(mockPost).toHaveBeenCalledWith(
					`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/sources/crawl-url`,
					{
						headers: mockAuthHeaders,
						json: { url: urlRequest.url },
					},
				);

				expect(mockWithAuthRedirect).toHaveBeenCalled();
				expect(result).toEqual(mockCrawlResponse);
			});

			it("should handle API errors correctly", async () => {
				const mockError = new Error("API Error");
				mockPost.mockReturnValueOnce({
					json: vi.fn().mockRejectedValue(mockError),
				});

				mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

				await expect(crawlApplicationUrl(mockWorkspaceId, mockApplicationId, urlRequest.url)).rejects.toThrow(
					"API Error",
				);
			});

			it("should redirect to sign-in page on 401 errors", async () => {
				const mockResponse = new Response(null, { status: 401 });
				const httpError = new HTTPError(mockResponse, { path: "crawl-url" } as any, {} as any);

				mockPost.mockReturnValueOnce({
					json: vi.fn().mockRejectedValue(httpError),
				});

				mockWithAuthRedirect.mockImplementationOnce(async (promise: Promise<any>) => {
					try {
						return await promise;
					} catch (error) {
						if (error instanceof HTTPError && error.response.status === 401) {
							mockRedirect("/signin");
							return null;
						}
						throw error;
					}
				});

				await crawlApplicationUrl(mockWorkspaceId, mockApplicationId, urlRequest.url);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});
	});
});

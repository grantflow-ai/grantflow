import { IdResponseFactory, MessageResponseFactory, UrlRequestFactory, UrlResponseFactory } from "::testing/factories";
import { mockRedirect } from "::testing/global-mocks";
import { HTTPError } from "ky";

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
	const mockProjectId = "mock-project-id";
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
				const result = await getApplicationSources(mockProjectId, mockApplicationId);

				expect(mockGet).toHaveBeenCalledWith(
					`projects/${mockProjectId}/applications/${mockApplicationId}/sources`,
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

				await expect(getApplicationSources(mockProjectId, mockApplicationId)).rejects.toThrow("API Error");
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

				await getApplicationSources(mockProjectId, mockApplicationId);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});

		describe("deleteApplicationSource", () => {
			it("should call the API with correct parameters", async () => {
				await deleteApplicationSource(mockProjectId, mockApplicationId, mockSourceId);

				expect(mockDelete).toHaveBeenCalledWith(
					`projects/${mockProjectId}/applications/${mockApplicationId}/sources/${mockSourceId}`,
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

				await expect(deleteApplicationSource(mockProjectId, mockApplicationId, mockSourceId)).rejects.toThrow(
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

				await deleteApplicationSource(mockProjectId, mockApplicationId, mockSourceId);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});

		describe("createApplicationSourceUploadUrl", () => {
			it("should call the API with correct parameters", async () => {
				const result = await createApplicationSourceUploadUrl(mockProjectId, mockApplicationId, mockFileName);

				expect(mockPost).toHaveBeenCalledWith(
					`projects/${mockProjectId}/applications/${mockApplicationId}/sources/upload-url?blob_name=${mockFileName}`,
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
					createApplicationSourceUploadUrl(mockProjectId, mockApplicationId, mockFileName),
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

				await createApplicationSourceUploadUrl(mockProjectId, mockApplicationId, mockFileName);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});
	});

	describe("Grant Template Sources", () => {
		describe("getTemplateSources", () => {
			it("should call the API with correct parameters", async () => {
				const result = await getTemplateSources(mockProjectId, mockTemplateId);

				expect(mockGet).toHaveBeenCalledWith(
					`projects/${mockProjectId}/grant_templates/${mockTemplateId}/sources`,
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

				await expect(getTemplateSources(mockProjectId, mockTemplateId)).rejects.toThrow("API Error");
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

				await getTemplateSources(mockProjectId, mockTemplateId);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});

		describe("deleteTemplateSource", () => {
			it("should call the API with correct parameters", async () => {
				await deleteTemplateSource(mockProjectId, mockTemplateId, mockSourceId);

				expect(mockDelete).toHaveBeenCalledWith(
					`projects/${mockProjectId}/grant_templates/${mockTemplateId}/sources/${mockSourceId}`,
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

				await expect(deleteTemplateSource(mockProjectId, mockTemplateId, mockSourceId)).rejects.toThrow(
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

				await deleteTemplateSource(mockProjectId, mockTemplateId, mockSourceId);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});

		describe("createTemplateSourceUploadUrl", () => {
			it("should call the API with correct parameters", async () => {
				const result = await createTemplateSourceUploadUrl(mockProjectId, mockTemplateId, mockFileName);

				expect(mockPost).toHaveBeenCalledWith(
					`projects/${mockProjectId}/grant_templates/${mockTemplateId}/sources/upload-url?blob_name=${mockFileName}`,
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
					createTemplateSourceUploadUrl(mockProjectId, mockTemplateId, mockFileName),
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

				await createTemplateSourceUploadUrl(mockProjectId, mockTemplateId, mockFileName);

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
				const result = await crawlTemplateUrl(mockProjectId, mockTemplateId, urlRequest.url);

				expect(mockPost).toHaveBeenCalledWith(
					`projects/${mockProjectId}/grant_templates/${mockTemplateId}/sources/crawl-url`,
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

				await expect(crawlTemplateUrl(mockProjectId, mockTemplateId, urlRequest.url)).rejects.toThrow(
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

				await crawlTemplateUrl(mockProjectId, mockTemplateId, urlRequest.url);

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
				const result = await crawlApplicationUrl(mockProjectId, mockApplicationId, urlRequest.url);

				expect(mockPost).toHaveBeenCalledWith(
					`projects/${mockProjectId}/applications/${mockApplicationId}/sources/crawl-url`,
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

				await expect(crawlApplicationUrl(mockProjectId, mockApplicationId, urlRequest.url)).rejects.toThrow(
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

				await crawlApplicationUrl(mockProjectId, mockApplicationId, urlRequest.url);

				expect(mockRedirect).toHaveBeenCalledWith("/signin");
			});
		});
	});
});

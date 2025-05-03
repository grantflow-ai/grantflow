import { createUploadUrl, deleteApplicationFile, getApplicationFiles } from "./application-files";
import { mockRedirect } from "::testing/global-mocks";
import { HTTPError } from "ky";

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

describe("Application Files Actions", () => {
	const mockWorkspaceId = "mock-workspace-id";
	const mockApplicationId = "mock-application-id";
	const mockFileId = "mock-file-id";
	const mockAuthHeaders = { Authorization: "Bearer mock-token" };

	const mockApplicationFilesResponse: { id: string }[] = [{ id: "file-1" }, { id: "file-2" }, { id: "file-3" }];

	beforeEach(() => {
		vi.clearAllMocks();

		mockCreateAuthHeaders.mockResolvedValue(mockAuthHeaders);
		mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

		mockGet.mockReturnValue({
			json: vi.fn().mockResolvedValue(mockApplicationFilesResponse),
		});

		mockDelete.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("getApplicationFiles", () => {
		it("should call the API with correct parameters", async () => {
			const result = await getApplicationFiles(mockWorkspaceId, mockApplicationId);

			expect(mockGet).toHaveBeenCalledWith(
				`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/files`,
				{
					headers: mockAuthHeaders,
				},
			);

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockApplicationFilesResponse);
		});

		it("should handle API errors correctly", async () => {
			const mockError = new Error("API Error");
			mockGet.mockReturnValueOnce({
				json: vi.fn().mockRejectedValue(mockError),
			});

			mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

			await expect(getApplicationFiles(mockWorkspaceId, mockApplicationId)).rejects.toThrow("API Error");
		});

		it("should redirect to sign-in page on 401 errors", async () => {
			const mockResponse = new Response(null, { status: 401 });
			const httpError = new HTTPError(mockResponse, { path: "files" } as any, {} as any);

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

			await getApplicationFiles(mockWorkspaceId, mockApplicationId);

			expect(mockRedirect).toHaveBeenCalledWith("/signin");
		});
	});

	describe("deleteApplicationFile", () => {
		it("should call the API with correct parameters", async () => {
			await deleteApplicationFile(mockWorkspaceId, mockApplicationId, mockFileId);

			expect(mockDelete).toHaveBeenCalledWith(
				`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/files/${mockFileId}`,
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

			await expect(deleteApplicationFile(mockWorkspaceId, mockApplicationId, mockFileId)).rejects.toThrow(
				"API Error",
			);
		});

		it("should redirect to sign-in page on 401 errors", async () => {
			const mockResponse = new Response(null, { status: 401 });
			const httpError = new HTTPError(mockResponse, { path: "files" } as any, {} as any);

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

			await deleteApplicationFile(mockWorkspaceId, mockApplicationId, mockFileId);

			expect(mockRedirect).toHaveBeenCalledWith("/signin");
		});
	});

	describe("createUploadUrl", () => {
		const mockWorkspaceId = "mock-workspace-id";
		const mockApplicationId = "mock-application-id";
		const mockFileName = "mock-file-name";
		const mockAuthHeaders = { Authorization: "Bearer mock-token" };

		const mockUploadUrlResponse = { uploadUrl: "https://example.com/upload" };

		beforeEach(() => {
			vi.clearAllMocks();

			mockCreateAuthHeaders.mockResolvedValue(mockAuthHeaders);
			mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

			mockPost.mockReturnValue({
				json: vi.fn().mockResolvedValue(mockUploadUrlResponse),
			});
		});

		afterEach(() => {
			vi.resetAllMocks();
		});

		it("should call the API with correct parameters", async () => {
			const result = await createUploadUrl(mockWorkspaceId, mockApplicationId, mockFileName);

			expect(mockPost).toHaveBeenCalledWith(
				`workspaces/${mockWorkspaceId}/applications/${mockApplicationId}/files/upload-url?blob_name=${mockFileName}`,
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

			await expect(createUploadUrl(mockWorkspaceId, mockApplicationId, mockFileName)).rejects.toThrow(
				"API Error",
			);
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

			await createUploadUrl(mockWorkspaceId, mockApplicationId, mockFileName);

			expect(mockRedirect).toHaveBeenCalledWith("/signin");
		});
	});
});

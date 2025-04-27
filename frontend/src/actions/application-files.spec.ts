import { deleteApplicationFile, getApplicationFiles } from "./application-files";
import { mockRedirect } from "::testing/global-mocks";
import { HTTPError } from "ky";

const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockCreateAuthHeaders = vi.fn();
const mockWithAuthRedirect = vi.fn();

vi.mock("@/utils/api", async () => {
	const actual = await vi.importActual("@/utils/api");
	return {
		...actual,
		createAuthHeaders: () => mockCreateAuthHeaders(),
		getClient: () => ({
			delete: mockDelete,
			get: mockGet,
		}),
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

			mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => {
				return promise.catch((error: unknown) => {
					if (error instanceof HTTPError && error.response.status === 401) {
						mockRedirect("/signin");
						return null;
					}
					throw error;
				});
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

			mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => {
				return promise.catch((error: unknown) => {
					if (error instanceof HTTPError && error.response.status === 401) {
						mockRedirect("/signin");
						return null;
					}
					throw error;
				});
			});

			await deleteApplicationFile(mockWorkspaceId, mockApplicationId, mockFileId);

			expect(mockRedirect).toHaveBeenCalledWith("/signin");
		});
	});
});

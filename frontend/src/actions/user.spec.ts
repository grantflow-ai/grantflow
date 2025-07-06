import { getClient } from "@/utils/api";
import { createAuthHeaders, withAuthRedirect } from "@/utils/server-side";
import { deleteAccount, getSoleOwnedProjects, restoreAccount } from "./user";

vi.mock("@/utils/api", () => ({
	getClient: vi.fn(() => ({
		delete: vi.fn(),
		get: vi.fn(),
		post: vi.fn(),
	})),
}));

vi.mock("@/utils/server-side", () => ({
	createAuthHeaders: vi.fn(),
	withAuthRedirect: vi.fn((promise) => promise),
}));

describe("User Actions", () => {
	const mockClient = {
		delete: vi.fn(),
		get: vi.fn(),
		post: vi.fn(),
	};

	const mockCreateAuthHeaders = vi.mocked(createAuthHeaders);
	const mockWithAuthRedirect = vi.mocked(withAuthRedirect);
	const mockGetClient = vi.mocked(getClient);

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetClient.mockReturnValue(mockClient as any);
		mockCreateAuthHeaders.mockResolvedValue({ Authorization: "Bearer mock-token" });
		mockWithAuthRedirect.mockImplementation((promise) => promise);
	});

	describe("deleteAccount", () => {
		it("should call the correct API endpoint with auth headers", async () => {
			const mockResponse = {
				grace_period_days: 30,
				message: "Account scheduled for deletion. You will be removed from all projects immediately.",
				restoration_info: "Contact support within 30 days to restore your account",
				scheduled_deletion_date: "2025-08-05T10:00:00Z",
			};
			const mockJson = vi.fn().mockResolvedValue(mockResponse);
			const mockDelete = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.delete = mockDelete;

			const result = await deleteAccount();

			expect(mockGetClient).toHaveBeenCalledOnce();
			expect(mockCreateAuthHeaders).toHaveBeenCalledOnce();
			expect(mockDelete).toHaveBeenCalledWith("user", {
				headers: { Authorization: "Bearer mock-token" },
			});
			expect(mockJson).toHaveBeenCalledOnce();
			expect(mockWithAuthRedirect).toHaveBeenCalledOnce();
			expect(result).toEqual(mockResponse);
		});

		it("should handle API errors correctly", async () => {
			const mockError = new Error("API Error");
			const mockJson = vi.fn().mockRejectedValue(mockError);
			const mockDelete = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.delete = mockDelete;

			await expect(deleteAccount()).rejects.toThrow("API Error");

			expect(mockGetClient).toHaveBeenCalledOnce();
			expect(mockCreateAuthHeaders).toHaveBeenCalledOnce();
			expect(mockDelete).toHaveBeenCalledWith("user", {
				headers: { Authorization: "Bearer mock-token" },
			});
		});

		it("should use withAuthRedirect wrapper", async () => {
			const mockResponse = {
				grace_period_days: 30,
				message: "Account scheduled for deletion. You will be removed from all projects immediately.",
				restoration_info: "Contact support within 30 days to restore your account",
				scheduled_deletion_date: "2025-08-05T10:00:00Z",
			};
			const mockJson = vi.fn().mockResolvedValue(mockResponse);
			const mockDelete = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.delete = mockDelete;

			await deleteAccount();

			expect(mockWithAuthRedirect).toHaveBeenCalledOnce();
			const [[wrappedPromise]] = mockWithAuthRedirect.mock.calls;
			expect(wrappedPromise).toBeDefined();
		});
	});

	describe("getSoleOwnedProjects", () => {
		it("should call the correct API endpoint with auth headers", async () => {
			const mockResponse = {
				count: 2,
				projects: [
					{ id: "project-1", name: "Project One" },
					{ id: "project-2", name: "Project Two" },
				],
			};
			const mockJson = vi.fn().mockResolvedValue(mockResponse);
			const mockGet = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.get = mockGet;

			const result = await getSoleOwnedProjects();

			expect(mockGetClient).toHaveBeenCalledOnce();
			expect(mockCreateAuthHeaders).toHaveBeenCalledOnce();
			expect(mockGet).toHaveBeenCalledWith("user/sole-owned-projects", {
				headers: { Authorization: "Bearer mock-token" },
			});
			expect(mockJson).toHaveBeenCalledOnce();
			expect(mockWithAuthRedirect).toHaveBeenCalledOnce();
			expect(result).toEqual(mockResponse);
		});

		it("should return empty array when user has no sole-owned projects", async () => {
			const mockResponse = {
				count: 0,
				projects: [],
			};
			const mockJson = vi.fn().mockResolvedValue(mockResponse);
			const mockGet = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.get = mockGet;

			const result = await getSoleOwnedProjects();

			expect(result).toEqual(mockResponse);
			expect(result.projects).toHaveLength(0);
			expect(result.count).toBe(0);
		});

		it("should handle API errors correctly", async () => {
			const mockError = new Error("API Error");
			const mockJson = vi.fn().mockRejectedValue(mockError);
			const mockGet = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.get = mockGet;

			await expect(getSoleOwnedProjects()).rejects.toThrow("API Error");

			expect(mockGetClient).toHaveBeenCalledOnce();
			expect(mockCreateAuthHeaders).toHaveBeenCalledOnce();
			expect(mockGet).toHaveBeenCalledWith("user/sole-owned-projects", {
				headers: { Authorization: "Bearer mock-token" },
			});
		});

		it("should use withAuthRedirect wrapper", async () => {
			const mockResponse = {
				count: 0,
				projects: [],
			};
			const mockJson = vi.fn().mockResolvedValue(mockResponse);
			const mockGet = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.get = mockGet;

			await getSoleOwnedProjects();

			expect(mockWithAuthRedirect).toHaveBeenCalledOnce();
			const [[wrappedPromise]] = mockWithAuthRedirect.mock.calls;
			expect(wrappedPromise).toBeDefined();
		});
	});

	describe("restoreAccount", () => {
		const mockToken = "restore-token-123";

		it("should call the correct API endpoint with token and auth headers", async () => {
			const mockResponse = { message: "Account restored successfully" };
			const mockJson = vi.fn().mockResolvedValue(mockResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;

			const result = await restoreAccount(mockToken);

			expect(mockGetClient).toHaveBeenCalledOnce();
			expect(mockCreateAuthHeaders).toHaveBeenCalledOnce();
			expect(mockPost).toHaveBeenCalledWith("user/restore", {
				headers: { Authorization: "Bearer mock-token" },
				json: { token: mockToken },
			});
			expect(mockJson).toHaveBeenCalledOnce();
			expect(mockWithAuthRedirect).toHaveBeenCalledOnce();
			expect(result).toEqual(mockResponse);
		});

		it("should handle API errors correctly", async () => {
			const mockError = new Error("Invalid token");
			const mockJson = vi.fn().mockRejectedValue(mockError);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;

			await expect(restoreAccount(mockToken)).rejects.toThrow("Invalid token");

			expect(mockGetClient).toHaveBeenCalledOnce();
			expect(mockCreateAuthHeaders).toHaveBeenCalledOnce();
			expect(mockPost).toHaveBeenCalledWith("user/restore", {
				headers: { Authorization: "Bearer mock-token" },
				json: { token: mockToken },
			});
		});

		it("should pass token in request body", async () => {
			const mockResponse = { message: "Restored" };
			const mockJson = vi.fn().mockResolvedValue(mockResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;

			await restoreAccount(mockToken);

			expect(mockPost).toHaveBeenCalledWith("user/restore", {
				headers: { Authorization: "Bearer mock-token" },
				json: { token: mockToken },
			});
		});

		it("should use withAuthRedirect wrapper", async () => {
			const mockResponse = { message: "Restored" };
			const mockJson = vi.fn().mockResolvedValue(mockResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;

			await restoreAccount(mockToken);

			expect(mockWithAuthRedirect).toHaveBeenCalledOnce();
			const [[wrappedPromise]] = mockWithAuthRedirect.mock.calls;
			expect(wrappedPromise).toBeDefined();
		});

		it("should work with different token formats", async () => {
			const tokens = ["short", "very-long-token-with-dashes-123", "token.with.dots"];
			const mockResponse = { message: "Restored" };
			const mockJson = vi.fn().mockResolvedValue(mockResponse);
			const mockPost = vi.fn().mockReturnValue({ json: mockJson });
			mockClient.post = mockPost;

			for (const token of tokens) {
				vi.clearAllMocks();
				mockGetClient.mockReturnValue(mockClient as any);
				mockCreateAuthHeaders.mockResolvedValue({ Authorization: "Bearer mock-token" });

				await restoreAccount(token);

				expect(mockPost).toHaveBeenCalledWith("user/restore", {
					headers: { Authorization: "Bearer mock-token" },
					json: { token },
				});
			}
		});
	});
});

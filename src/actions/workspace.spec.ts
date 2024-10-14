import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";
import { createWorkspace } from "./workspace";

vi.mock("@/utils/server-side", () => ({
	handleServerError: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
	getServerClient: vi.fn(),
}));

describe("Workspace Management", () => {
	const mockInsert = vi.fn();
	const mockFrom = vi.fn(() => ({ insert: mockInsert }));
	const mockSupabaseClient = { from: mockFrom };

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getServerClient).mockResolvedValue(mockSupabaseClient as any);
	});

	it("should create a workspace with name and organization ID", async () => {
		const mockWorkspace = {
			id: "123",
			name: "Test Workspace",
			organization_id: "org123",
		};
		mockInsert.mockResolvedValueOnce({ data: mockWorkspace, error: null });

		const result = await createWorkspace({
			name: "Test Workspace",
			description: "",
		});

		expect(getServerClient).toHaveBeenCalled();
		expect(mockFrom).toHaveBeenCalledWith("workspaces");
		expect(mockInsert).toHaveBeenCalledWith({
			organization_id: "org123",
			name: "Test Workspace",
			description: undefined,
		});
		expect(result).toEqual({ data: mockWorkspace, error: null });
	});

	it("should create a workspace with name, organization ID, and description", async () => {
		const mockWorkspace = {
			id: "456",
			name: "Another Workspace",
			organization_id: "org456",
			description: "This is a test workspace",
		};
		mockInsert.mockResolvedValueOnce({ data: mockWorkspace, error: null });

		const result = await createWorkspace({
			name: "Another Workspace",
			description: "This is a test workspace",
		});

		expect(getServerClient).toHaveBeenCalled();
		expect(mockFrom).toHaveBeenCalledWith("workspaces");
		expect(mockInsert).toHaveBeenCalledWith({
			organization_id: "org456",
			name: "Another Workspace",
			description: "This is a test workspace",
		});
		expect(result).toEqual({ data: mockWorkspace, error: null });
	});

	it("should handle server errors", async () => {
		const mockError = new Error("Database error");
		mockInsert.mockRejectedValueOnce(mockError);
		vi.mocked(handleServerError).mockReturnValueOnce("Server error occurred");

		const result = await createWorkspace({
			name: "Error Workspace",
			description: "",
		});

		expect(getServerClient).toHaveBeenCalled();
		expect(mockFrom).toHaveBeenCalledWith("workspaces");
		expect(mockInsert).toHaveBeenCalledWith({
			organization_id: "orgError",
			name: "Error Workspace",
			description: undefined,
		});
		expect(handleServerError).toHaveBeenCalledWith(mockError, "Database error");
		expect(result).toBe("Server error occurred");
	});
});

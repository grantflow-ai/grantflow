import { ErrorType } from "@/constants";
import { handleServerError } from "@/utils/server-side";
import { getServerClient } from "@/utils/supabase/server";
import { subscribeToMailingList } from "./mailing-list";

vi.mock("@/utils/server-side", () => ({
	handleServerError: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
	getServerClient: vi.fn(),
}));

describe("Mailing List Subscription", () => {
	const mockInsert = vi.fn();
	const mockFrom = vi.fn(() => ({ insert: mockInsert }));
	const mockSupabaseClient = { from: mockFrom };

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getServerClient).mockResolvedValue(mockSupabaseClient as any);
	});

	it("should subscribe a user with a valid email", async () => {
		mockInsert.mockResolvedValueOnce({ error: null });

		const result = await subscribeToMailingList("test@example.com");

		expect(getServerClient).toHaveBeenCalled();
		expect(mockFrom).toHaveBeenCalledWith("mailing_list");
		expect(mockInsert).toHaveBeenCalledWith({ email: "test@example.com" });
		expect(result).toBeNull();
	});

	it("should return an error for an invalid email", async () => {
		const result = await subscribeToMailingList("invalid-email");

		expect(getServerClient).not.toHaveBeenCalled();
		expect(mockFrom).not.toHaveBeenCalled();
		expect(mockInsert).not.toHaveBeenCalled();
		expect(result).toBe(ErrorType.INVALID_EMAIL);
	});

	it("should handle server errors", async () => {
		const mockError = new Error("Database error");
		mockInsert.mockReturnValueOnce({ error: mockError });
		vi.mocked(handleServerError).mockReturnValueOnce("Server error occurred");

		const result = await subscribeToMailingList("test@example.com");

		expect(getServerClient).toHaveBeenCalled();
		expect(mockFrom).toHaveBeenCalledWith("mailing_list");
		expect(mockInsert).toHaveBeenCalledWith({ email: "test@example.com" });
		expect(handleServerError).toHaveBeenCalledWith(mockError, {
			message: "Failed to subscribe to mailing list",
		});
		expect(result).toBe("Server error occurred");
	});
});

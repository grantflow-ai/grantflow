import { signInWithEmail, signOut } from "./auth";

const { SupabaseSignOutMock, SupabaseSignInWithOtpMock, SupabaseUpdateUserMock } = vi.hoisted(() => ({
	SupabaseSignOutMock: vi.fn().mockResolvedValue({ error: null, data: null }),
	SupabaseSignInWithOtpMock: vi.fn().mockResolvedValue({ error: null, data: null }),
	SupabaseUpdateUserMock: vi.fn().mockResolvedValue({ error: null, data: null }),
}));

vi.mock("@/utils/supabase/server", () => ({
	getServerClient: vi.fn().mockReturnValue({
		auth: {
			signOut: SupabaseSignOutMock,
			updateUser: SupabaseUpdateUserMock,
			signInWithOtp: SupabaseSignInWithOtpMock,
		},
	}),
}));

describe("Auth server actions", () => {
	beforeEach(() => {
		SupabaseSignOutMock.mockReset().mockResolvedValue({ error: null, data: null });
		SupabaseSignInWithOtpMock.mockReset().mockResolvedValue({ error: null, data: null });
		SupabaseUpdateUserMock.mockReset().mockResolvedValue({ error: null, data: null });
	});

	describe("signOut", () => {
		it("should call supabase.auth.signOut and return error message if any", async () => {
			vi.mocked(SupabaseSignOutMock).mockResolvedValueOnce({
				error: { message: "Error signing out" },
			} as any);
			const result = await signOut();
			expect(SupabaseSignOutMock).toHaveBeenCalled();
			expect(result).toBe("Error signing out");
		});

		it("should return undefined if sign out is successful", async () => {
			vi.mocked(SupabaseSignOutMock).mockResolvedValueOnce({ error: null } as any);
			const result = await signOut();
			expect(result).toBeUndefined();
		});
	});

	describe("signInWithEmail", () => {
		it("should call signInWithOtp with correct parameters for magic link", async () => {
			await signInWithEmail("test@example.com");
			expect(SupabaseSignInWithOtpMock).toHaveBeenCalledWith({
				email: "test@example.com",
				options: { emailRedirectTo: "https://example.com/auth/callbacks/email-signin" },
			});
		});
	});
});

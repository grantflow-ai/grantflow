import { EmailSigninType, PhoneSigninType } from "@/config/enums";
import { ErrorType } from "@/constants";
import {
	requestPasswordUpdate,
	signInWithEmail,
	signInWithPassword,
	signInWithPhone,
	signOut,
	signUp,
	updatePassword,
	verifyEmailOTP,
	verifyPhoneOTP,
} from "./auth";

const {
	SupabaseSignOutMock,
	SupabaseSignInWithOtpMock,
	SupabaseVerifyOtpMock,
	SupabaseResetPasswordForEmailMock,
	SupabaseSignInWithPasswordMock,
	SupabaseSignUpMock,
	SupabaseUpdateUserMock,
} = vi.hoisted(() => ({
	SupabaseSignOutMock: vi.fn().mockResolvedValue({ error: null, data: null }),
	SupabaseSignInWithOtpMock: vi.fn().mockResolvedValue({ error: null, data: null }),
	SupabaseVerifyOtpMock: vi.fn().mockResolvedValue({ error: null, data: null }),
	SupabaseResetPasswordForEmailMock: vi.fn().mockResolvedValue({ error: null, data: null }),
	SupabaseSignInWithPasswordMock: vi.fn().mockResolvedValue({ error: null, data: null }),
	SupabaseSignUpMock: vi.fn().mockResolvedValue({ error: null, data: null }),
	SupabaseUpdateUserMock: vi.fn().mockResolvedValue({ error: null, data: null }),
}));

vi.mock("@/utils/supabase/server", () => ({
	getServerClient: vi.fn().mockReturnValue({
		auth: {
			signOut: SupabaseSignOutMock,
			signInWithOtp: SupabaseSignInWithOtpMock,
			verifyOtp: SupabaseVerifyOtpMock,
			resetPasswordForEmail: SupabaseResetPasswordForEmailMock,
			signInWithPassword: SupabaseSignInWithPasswordMock,
			signUp: SupabaseSignUpMock,
			updateUser: SupabaseUpdateUserMock,
		},
	}),
}));

describe("auth.ts", () => {
	beforeEach(() => {
		SupabaseSignOutMock.mockReset().mockResolvedValue({ error: null, data: null });
		SupabaseSignInWithOtpMock.mockReset().mockResolvedValue({ error: null, data: null });
		SupabaseVerifyOtpMock.mockReset().mockResolvedValue({ error: null, data: null });
		SupabaseResetPasswordForEmailMock.mockReset().mockResolvedValue({ error: null, data: null });
		SupabaseSignInWithPasswordMock.mockReset().mockResolvedValue({ error: null, data: null });
		SupabaseSignUpMock.mockReset().mockResolvedValue({ error: null, data: null });
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
		it("should return an error for invalid email", async () => {
			const result = await signInWithEmail("invalid-email", EmailSigninType.OTP);
			expect(result).toBe(ErrorType.INVALID_EMAIL);
		});

		it("should call signInWithOtp with correct parameters for OTP", async () => {
			await signInWithEmail("test@example.com", EmailSigninType.OTP);
			expect(SupabaseSignInWithOtpMock).toHaveBeenCalledWith({
				email: "test@example.com",
				options: undefined,
			});
		});

		it("should call signInWithOtp with correct parameters for magic link", async () => {
			await signInWithEmail("test@example.com", EmailSigninType.MAGIC_LINK);
			expect(SupabaseSignInWithOtpMock).toHaveBeenCalledWith({
				email: "test@example.com",
				options: { emailRedirectTo: "https://example.com/auth/callbacks/openid" },
			});
		});
	});

	describe("verifyEmailOTP", () => {
		it("should return an error for invalid email", async () => {
			const result = await verifyEmailOTP("invalid-email", "123456");
			expect(result).toBe(ErrorType.INVALID_EMAIL);
		});

		it("should call verifyOtp with correct parameters", async () => {
			await verifyEmailOTP("test@example.com", "123456");
			expect(SupabaseVerifyOtpMock).toHaveBeenCalledWith({
				email: "test@example.com",
				token: "123456",
				type: "email",
			});
		});
	});

	describe("signInWithPhone", () => {
		it("should return an error for invalid phone number", async () => {
			const result = await signInWithPhone("invalid-phone", PhoneSigninType.SMS);
			expect(result).toBe(ErrorType.INVALID_PHONE);
		});

		it("should call signInWithOtp with correct parameters for SMS", async () => {
			await signInWithPhone("+49173179980644", PhoneSigninType.SMS);
			expect(SupabaseSignInWithOtpMock).toHaveBeenCalledWith({
				phone: "+49173179980644",
				options: { channel: "sms" },
			});
		});

		it("should call signInWithOtp with correct parameters for WhatsApp", async () => {
			await signInWithPhone("+49173179980644", PhoneSigninType.WHATSAPP);
			expect(SupabaseSignInWithOtpMock).toHaveBeenCalledWith({
				phone: "+49173179980644",
				options: { channel: "whatsapp" },
			});
		});
	});

	describe("verifyPhoneOTP", () => {
		it("should return an error for invalid phone number", async () => {
			const result = await verifyPhoneOTP("invalid-phone", "123456");
			expect(result).toBe(ErrorType.INVALID_PHONE);
		});

		it("should call verifyOtp with correct parameters", async () => {
			await verifyPhoneOTP("+49173179980644", "123456");
			expect(SupabaseVerifyOtpMock).toHaveBeenCalledWith({
				phone: "+49173179980644",
				token: "123456",
				type: "sms",
			});
		});
	});

	describe("requestPasswordUpdate", () => {
		it("should return an error for invalid email", async () => {
			const result = await requestPasswordUpdate("invalid-email");
			expect(result).toBe(ErrorType.INVALID_EMAIL);
		});

		it("should call resetPasswordForEmail with correct parameters", async () => {
			await requestPasswordUpdate("test@example.com");
			expect(SupabaseResetPasswordForEmailMock).toHaveBeenCalledWith("test@example.com", {
				redirectTo: "https://example.com/auth/callbacks/password-reset",
			});
		});
	});

	describe("signInWithPassword", () => {
		it("should call signInWithPassword with correct parameters", async () => {
			await signInWithPassword("test@example.com", "password123");
			expect(SupabaseSignInWithPasswordMock).toHaveBeenCalledWith({
				email: "test@example.com",
				password: "password123",
			});
		});
	});

	describe("signUp", () => {
		it("should return an error for invalid email", async () => {
			const result = await signUp("invalid-email", "password123");
			expect(result).toBe(ErrorType.INVALID_EMAIL);
		});

		it("should call signUp with correct parameters", async () => {
			await signUp("test@example.com", "password123");
			expect(SupabaseSignUpMock).toHaveBeenCalledWith({
				email: "test@example.com",
				password: "password123",
				options: {
					emailRedirectTo: "https://example.com/",
				},
			});
		});
	});

	describe("updatePassword", () => {
		it("should return an error if passwords do not match", async () => {
			const result = await updatePassword("password123", "password456");
			expect(result).toBe(ErrorType.PASSWORD_MISMATCH);
		});

		it("should call updateUser with correct parameters if passwords match", async () => {
			await updatePassword("password123", "password123");
			expect(SupabaseUpdateUserMock).toHaveBeenCalledWith({
				password: "password123",
			});
		});
	});
});

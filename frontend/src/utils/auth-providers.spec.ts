import { FirebaseError } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import * as nextRedirect from "next/dist/client/components/redirect-error";

import * as firebase from "@/utils/firebase";

import { handleGoogleLogin, handleOrcidLogin, handleOrcidSignup } from "./auth-providers";

vi.mock("firebase/auth", () => ({
	GoogleAuthProvider: Object.assign(
		vi.fn(() => ({})),
		{ credentialFromResult: vi.fn().mockReturnValue({ idToken: "google-id-token" }) },
	),
	getAdditionalUserInfo: vi.fn(() => ({
		isNewUser: false,
		profile: null,
		providerId: null,
	})),
	OAuthProvider: vi.fn(() => {
		const provider = {
			setCustomParameters: vi.fn(),
		};
		return provider;
	}),
	signInWithPopup: vi.fn(),
}));

vi.mock("@/utils/firebase", () => ({
	getFirebaseAuth: vi.fn(),
}));

vi.mock("@/utils/logging", () => ({
	logError: vi.fn(),
}));

vi.mock("next/dist/client/components/redirect-error", () => ({
	isRedirectError: vi.fn(),
}));

describe("auth-providers", () => {
	const mockAuth = { currentUser: null };
	const mockUser = { getIdToken: vi.fn().mockResolvedValue("mock-id-token") };
	const mockResult = { user: mockUser };

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(firebase.getFirebaseAuth).mockReturnValue(mockAuth as any);
		vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValue(mockResult as any);
		vi.mocked(firebaseAuth.getAdditionalUserInfo).mockReturnValue({
			isNewUser: false,
			profile: null,
			providerId: null,
		});
		vi.mocked(nextRedirect.isRedirectError).mockReturnValue(false);
	});

	describe("Authentication Flow Tests", () => {
		it("gets idToken directly from user for one of the providers", async () => {
			const result = await handleOrcidLogin();

			expect(mockUser.getIdToken).toHaveBeenCalled();
			expect(result).toEqual({
				idToken: "mock-id-token",
				isNewUser: false,
				user: mockUser,
			});
		});
	});

	describe("User Information Handling", () => {
		it("correctly identifies new users when isNewUser is true", async () => {
			vi.mocked(firebaseAuth.getAdditionalUserInfo).mockReturnValueOnce({
				isNewUser: true,
				profile: null,
				providerId: null,
			});

			const result = await handleGoogleLogin();

			expect(result.isNewUser).toBe(true);
		});

		it("correctly identifies existing users when isNewUser is false", async () => {
			vi.mocked(firebaseAuth.getAdditionalUserInfo).mockReturnValueOnce({
				isNewUser: false,
				profile: null,
				providerId: null,
			});

			const result = await handleOrcidLogin();

			expect(result.isNewUser).toBe(false);
		});

		it("defaults to false when getAdditionalUserInfo returns null", async () => {
			vi.mocked(firebaseAuth.getAdditionalUserInfo).mockReturnValueOnce(null);

			const result = await handleOrcidSignup();

			expect(result.isNewUser).toBe(false);
		});
	});

	describe("Error Handling Tests", () => {
		it("passes through redirect errors", async () => {
			const redirectError = new Error("Redirect error");
			vi.mocked(nextRedirect.isRedirectError).mockReturnValueOnce(true);
			vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValueOnce(redirectError);

			await expect(handleGoogleLogin()).rejects.toBe(redirectError);
		});

		it("handles Firebase errors with appropriate messages", async () => {
			const firebaseError = new FirebaseError(
				"auth/account-exists-with-different-credential",
				"Original message",
			);
			vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValueOnce(firebaseError);

			await expect(handleGoogleLogin()).rejects.toThrow("This email is already associated with another account");
		});
	});

	describe("Error propagation tests", () => {
		it("handles errors from various authentication steps", async () => {
			vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValueOnce(new Error("Sign in error"));
			await expect(handleGoogleLogin()).rejects.toThrow("Sign-in failed. Please try again later");

			vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValue(mockResult as any);

			mockUser.getIdToken.mockRejectedValueOnce(new Error("getIdToken error"));
			await expect(handleOrcidLogin()).rejects.toThrow("Sign-in failed. Please try again later");
		});
	});
});
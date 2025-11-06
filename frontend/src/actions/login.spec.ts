import { JwtResponseFactory, LoginRequestFactory } from "::testing/factories";
import { mockCookies, mockSetCookie } from "::testing/global-mocks";
import { vi } from "vitest";
import { SELECTED_ORGANIZATION_COOKIE, SESSION_COOKIE } from "@/constants";

import { login } from "./login";

const mockPost = vi.fn();
const mockGet = vi.fn();
vi.mock("@/utils/api/server", () => ({
	getClient: () => ({
		get: mockGet,
		post: mockPost,
	}),
}));

const mockGetEnv = vi.fn();
vi.mock("@/utils/env", () => ({
	getEnv: () => mockGetEnv(),
}));

describe("login", () => {
	const loginRequest = LoginRequestFactory.build();
	const jwtResponse = JwtResponseFactory.build();

	beforeEach(() => {
		vi.clearAllMocks();

		mockPost.mockReturnValue({
			json: vi.fn().mockResolvedValue(jwtResponse),
		});

		mockGet.mockReturnValue({
			json: vi.fn().mockResolvedValue([]),
		});

		mockGetEnv.mockReturnValue({
			NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://api.example.com",
			NEXT_PUBLIC_SITE_URL: "https://app.example.com",
		});
	});

	it("should call the backend API with the correct URL and request body", async () => {
		await login(loginRequest.id_token);
		expect(mockPost).toHaveBeenCalledWith(
			expect.any(URL),
			expect.objectContaining({
				json: { id_token: loginRequest.id_token },
			}),
		);
	});

	it("should set the session cookie with correct attributes", async () => {
		await login(loginRequest.id_token);

		expect(mockSetCookie).toHaveBeenCalledWith({
			httpOnly: true,
			maxAge: 60 * 60 * 24 * 7,
			name: SESSION_COOKIE,
			sameSite: "strict",
			secure: true,
			value: jwtResponse.jwt_token,
		});
	});

	it("should return backoffice admin status as false by default", async () => {
		const result = await login(loginRequest.id_token);

		expect(result).toEqual({ is_backoffice_admin: false });
	});

	it("should return backoffice admin status as true when user is admin", async () => {
		mockPost.mockReturnValue({
			json: vi.fn().mockResolvedValue({ ...jwtResponse, is_backoffice_admin: true }),
		});

		const result = await login(loginRequest.id_token);

		expect(result).toEqual({ is_backoffice_admin: true });
	});

	it("should set secure=false when site URL is not HTTPS", async () => {
		mockGetEnv.mockReturnValue({
			NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://api.example.com",
			NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
		});

		await login(loginRequest.id_token);

		expect(mockSetCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				secure: false,
			}),
		);
	});

	it("should verify access by calling organizations endpoint", async () => {
		await login(loginRequest.id_token);

		expect(mockGet).toHaveBeenCalledWith(
			expect.any(URL),
			expect.objectContaining({
				headers: { Authorization: `Bearer ${jwtResponse.jwt_token}` },
			}),
		);
	});

	it("should complete successfully after login and verification", async () => {
		await login(loginRequest.id_token);

		expect(mockGet).toHaveBeenCalled();
	});

	it("should remove session cookies and throw error when verification fails", async () => {
		const mockDeleteCookie = vi.fn();

		vi.mocked(mockCookies).mockResolvedValue({
			delete: mockDeleteCookie,
			get: vi.fn(),
			getAll: vi.fn(),
			has: vi.fn(),
			set: vi.fn(),
		});

		mockGet.mockReturnValue({
			json: vi.fn().mockRejectedValue(new Error("Verification failed")),
		});

		await expect(login(loginRequest.id_token)).rejects.toThrow(
			"Authentication failed. Please try logging in again.",
		);

		expect(mockDeleteCookie).toHaveBeenCalledWith(SESSION_COOKIE);
		expect(mockDeleteCookie).toHaveBeenCalledWith(SELECTED_ORGANIZATION_COOKIE);
		expect(mockDeleteCookie).toHaveBeenCalledTimes(2);
	});

	it("should allow NEXT_REDIRECT errors to bubble up", async () => {
		const redirectError = new Error("NEXT_REDIRECT");
		mockPost.mockReturnValue({
			json: vi.fn().mockRejectedValue(redirectError),
		});

		await expect(login(loginRequest.id_token)).rejects.toThrow(redirectError);
	});

	describe("new user signup flow", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should delay backend call for new users", async () => {
			const loginPromise = login(loginRequest.id_token, true);

			// Should not call backend immediately
			expect(mockPost).not.toHaveBeenCalled();

			// Advance timers by 1.5 seconds
			await vi.advanceTimersByTimeAsync(1500);

			// Wait for login to complete
			await loginPromise;

			// Should call backend after delay
			expect(mockPost).toHaveBeenCalled();
		});

		it("should not delay backend call for existing users", async () => {
			await login(loginRequest.id_token, false);

			// Should call backend immediately
			expect(mockPost).toHaveBeenCalled();
		});

		it("should not delay when isNewUser is not provided", async () => {
			await login(loginRequest.id_token);

			// Should call backend immediately (defaults to false)
			expect(mockPost).toHaveBeenCalled();
		});

		it("should complete successfully after delay for new users", async () => {
			const loginPromise = login(loginRequest.id_token, true);

			// Advance timers
			await vi.advanceTimersByTimeAsync(1500);

			const result = await loginPromise;

			expect(result).toEqual({ is_backoffice_admin: false });
			expect(mockPost).toHaveBeenCalledWith(
				expect.any(URL),
				expect.objectContaining({
					json: { id_token: loginRequest.id_token },
				}),
			);
		});
	});
});

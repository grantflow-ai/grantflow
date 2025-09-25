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
	});

	it("should allow NEXT_REDIRECT errors to bubble up", async () => {
		const redirectError = new Error("NEXT_REDIRECT");
		mockPost.mockReturnValue({
			json: vi.fn().mockRejectedValue(redirectError),
		});

		await expect(login(loginRequest.id_token)).rejects.toThrow(redirectError);
	});
});

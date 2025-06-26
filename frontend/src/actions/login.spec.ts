import { JwtResponseFactory, LoginRequestFactory } from "::testing/factories";
import { mockRedirect, mockSetCookie } from "::testing/global-mocks";
import { vi } from "vitest";
import { SESSION_COOKIE } from "@/constants";
import { PagePath } from "@/enums";

import { login } from "./login";

const mockPost = vi.fn();
vi.mock("@/utils/api", () => ({
	getClient: () => ({
		post: mockPost,
	}),
}));

const mockGetEnv = vi.fn();
vi.mock("../utils/env", () => ({
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

	it("should redirect to projects page after successful login", async () => {
		await login(loginRequest.id_token);

		expect(mockRedirect).toHaveBeenCalledWith(PagePath.PROJECTS);
	});
});

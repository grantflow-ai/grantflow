import { vi } from "vitest";

import { mockRedirect, mockSetCookie } from "::testing/global-mocks";
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
	const mockIdToken = "mock.id.token";
	const mockJwtToken = "mock.jwt.token";

	beforeEach(() => {
		vi.clearAllMocks();

		mockPost.mockReturnValue({
			json: vi.fn().mockResolvedValue({ jwt_token: mockJwtToken }),
		});

		mockGetEnv.mockReturnValue({
			NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://api.example.com",
			NEXT_PUBLIC_SITE_URL: "https://app.example.com",
		});
	});

	it("should call the backend API with the correct URL and request body", async () => {
		await login(mockIdToken);
		expect(mockPost).toHaveBeenCalledWith(
			expect.any(URL),
			expect.objectContaining({
				json: { id_token: mockIdToken },
			}),
		);
	});

	it("should set the session cookie with correct attributes", async () => {
		await login(mockIdToken);

		expect(mockSetCookie).toHaveBeenCalledWith({
			httpOnly: true,
			maxAge: 60 * 60 * 24 * 7,
			name: SESSION_COOKIE,
			sameSite: "strict",
			secure: true,
			value: mockJwtToken,
		});
	});

	it("should set secure=false when site URL is not HTTPS", async () => {
		mockGetEnv.mockReturnValue({
			NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://api.example.com",
			NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
		});

		await login(mockIdToken);

		expect(mockSetCookie).toHaveBeenCalledWith(
			expect.objectContaining({
				secure: false,
			}),
		);
	});

	it("should redirect to workspaces page after successful login", async () => {
		await login(mockIdToken);

		expect(mockRedirect).toHaveBeenCalledWith(PagePath.WORKSPACES);
	});
});

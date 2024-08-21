import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { PagePath } from "@/config/enums";
import { updateSession } from "./middleware";

vi.mock("@supabase/ssr");

describe("updateSession middleware", () => {
	vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
	vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "mock-anon-key");

	const createServerMock = vi.mocked(createServerClient).mockReturnValue({
		auth: {
			getUser: vi.fn(),
		},
	});
	const nextSpy = vi.spyOn(NextResponse, "next").mockReturnValue({
		// @ts-expect-error, this is a mock.
		cookies: {
			set: vi.fn(),
		},
	});
	const redirectSpy = vi.spyOn(NextResponse, "redirect").mockReturnValue({
		// @ts-expect-error, this is a mock.
		cookies: {
			set: vi.fn(),
		},
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should allow access to public routes when user is not authenticated", async () => {
		const mockRequest = {
			nextUrl: {
				pathname: "/",
				clone: vi.fn().mockReturnThis(),
			},
			cookies: {
				getAll: vi.fn().mockReturnValue([]),
				set: vi.fn(),
			},
		} as unknown as NextRequest;

		createServerMock.mockReturnValueOnce({
			auth: {
				getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
			},
		});

		const response = await updateSession(mockRequest);

		expect(nextSpy).toHaveBeenCalledWith({
			request: mockRequest,
		});
		expect(redirectSpy).not.toHaveBeenCalled();
		expect(response).toBeDefined();
	});

	it("should redirect to /auth when accessing protected routes without authentication", async () => {
		const mockRequest = {
			nextUrl: {
				pathname: "/account",
				clone: vi.fn().mockReturnThis(),
			},
			cookies: {
				getAll: vi.fn().mockReturnValue([]),
				set: vi.fn(),
			},
		} as unknown as NextRequest;

		createServerMock.mockReturnValueOnce({
			auth: {
				getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
			},
		});

		await updateSession(mockRequest);

		expect(redirectSpy).toHaveBeenCalled();

		const [[redirectCall]] = redirectSpy.mock.calls;
		expect(redirectCall).toEqual(
			expect.objectContaining({
				pathname: PagePath.AUTH,
			}),
		);
	});

	it("should allow access to protected routes when user is authenticated", async () => {
		const mockRequest = {
			nextUrl: {
				pathname: "/account",
				clone: vi.fn().mockReturnThis(),
			},
			cookies: {
				getAll: vi.fn().mockReturnValue([]),
				set: vi.fn(),
			},
		} as unknown as NextRequest;
		createServerMock.mockReturnValueOnce({
			auth: {
				getUser: vi.fn().mockResolvedValue({ data: { user: { id: "123" } } }),
			},
		});

		const response = await updateSession(mockRequest);

		expect(nextSpy).toHaveBeenCalledWith({
			request: mockRequest,
		});
		expect(redirectSpy).not.toHaveBeenCalled();
		expect(response).toBeDefined();
	});
});

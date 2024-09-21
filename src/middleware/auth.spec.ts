import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { PagePath } from "@/config/enums";
import { updateSession } from "./auth";
import { getEnv } from "@/utils/env";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@supabase/ssr");
vi.mock("@/utils/env");

describe("updateSession middleware", () => {
	vi.mocked(getEnv).mockReturnValue({
		NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-anon-key",
		NEXT_PUBLIC_SITE_URL: "",
	});

	const createServerMock = vi.mocked(createServerClient).mockReturnValue({
		auth: {
			getUser: vi.fn(),
		},
	} as any);

	const nextSpy = vi.spyOn(NextResponse, "next").mockReturnValue({
		cookies: {
			set: vi.fn(),
		},
	} as any);

	const redirectSpy = vi.spyOn(NextResponse, "redirect").mockReturnValue({
		cookies: {
			set: vi.fn(),
		},
	} as any);

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
		} as any);

		const response = await updateSession(mockRequest);

		expect(nextSpy).toHaveBeenCalledWith({ request: mockRequest });
		expect(redirectSpy).not.toHaveBeenCalled();
		expect(response).toBeDefined();
	});

	it("should redirect to /auth when accessing protected routes without authentication", async () => {
		const mockRequest = {
			nextUrl: {
				pathname: "/protected",
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
		} as any);

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
				pathname: "/protected",
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
		} as any);

		const response = await updateSession(mockRequest);

		expect(nextSpy).toHaveBeenCalledWith({ request: mockRequest });
		expect(redirectSpy).not.toHaveBeenCalled();
		expect(response).toBeDefined();
	});
});

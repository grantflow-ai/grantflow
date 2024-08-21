import { PagePath } from "@/config/enums";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { GET } from "./route";

vi.mock("next/server", () => ({
	NextResponse: {
		redirect: vi.fn(),
	},
}));

const { exchangeCodeForSession } = vi.hoisted(() => {
	return {
		exchangeCodeForSession: vi.fn(),
	};
});

vi.mock("@/utils/supabase/server", () => ({
	getServerClient: vi.fn(() => ({
		auth: {
			exchangeCodeForSession,
		},
	})),
}));

describe("GET function", () => {
	beforeEach(() => {
		exchangeCodeForSession.mockReset();
	});

	it("should redirect to update password page when code exchange is successful", async () => {
		exchangeCodeForSession.mockResolvedValueOnce({ error: null });

		await GET({
			url: "https://example.com/auth/reset-password?code=123456",
		} as NextRequest);

		expect(exchangeCodeForSession).toHaveBeenCalledWith("123456");
		expect(vi.mocked(NextResponse.redirect)).toHaveBeenCalledWith(
			expect.stringContaining(PagePath.AUTH_FORGOT_PASSWORD),
		);
	});

	it("should redirect to forgot password page when code exchange fails", async () => {
		const mockError = new Error("Exchange failed");
		exchangeCodeForSession.mockResolvedValueOnce({ error: mockError });

		await GET({
			url: "https://example.com/auth/reset-password?code=123456",
		} as NextRequest);

		expect(exchangeCodeForSession).toHaveBeenCalledWith("123456");
		expect(vi.mocked(NextResponse.redirect)).toHaveBeenCalledWith(
			expect.stringContaining(PagePath.AUTH_FORGOT_PASSWORD),
		);
	});

	it("should redirect to update password page when no code is provided", async () => {
		await GET({
			url: "https://example.com/auth/reset-password",
		} as NextRequest);

		expect(exchangeCodeForSession).not.toHaveBeenCalled();
		expect(vi.mocked(NextResponse.redirect)).toHaveBeenCalledWith(
			expect.stringContaining(PagePath.AUTH_FORGOT_PASSWORD),
		);
	});
});

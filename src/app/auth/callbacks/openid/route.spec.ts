import { type NextRequest, NextResponse } from "next/server";

import { beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("next/server", () => ({
	NextResponse: {
		redirect: vi.fn(),
	},
}));

const mockExchangeCodeForSession = vi.fn();
vi.mock("@/utils/supabase/server", () => ({
	getServerClient: vi.fn(() => ({
		auth: {
			exchangeCodeForSession: mockExchangeCodeForSession,
		},
	})),
}));

describe("GET function", () => {
	beforeEach(() => {
		mockExchangeCodeForSession.mockReset();
	});

	it("should redirect to auth page with error toast when code exchange fails", async () => {
		mockExchangeCodeForSession.mockResolvedValueOnce({
			error: new Error("Exchange failed"),
		});

		const request = {
			url: "https://example.com/auth/openid?code=123456",
		} as NextRequest;

		await GET(request);

		expect(mockExchangeCodeForSession).toHaveBeenCalledWith("123456");
		expect(NextResponse.redirect).toHaveBeenCalledWith(
			"https://example.com/auth?toastTitle=An+unexpected+error+occurred.&toastDescription=Sign+in+failed.+Please+check+your+credentials+and+try+again.&toastType=error",
		);
	});

	it("should redirect to root page with success toast when code exchange succeeds", async () => {
		mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

		const request = {
			url: "https://example.com/auth/openid?code=123456",
		} as NextRequest;

		await GET(request);

		expect(mockExchangeCodeForSession).toHaveBeenCalledWith("123456");
		expect(NextResponse.redirect).toHaveBeenCalledWith(
			"/?toastTitle=Success%21&toastDescription=You+are+now+signed+in.&toastType=status",
		);
	});

	it("should redirect to root page with success toast when no code is provided", async () => {
		const request = {
			url: "https://example.com/callback",
		} as NextRequest;

		await GET(request);

		expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
		expect(NextResponse.redirect).toHaveBeenCalledWith(
			"/?toastTitle=Success%21&toastDescription=You+are+now+signed+in.&toastType=status",
		);
	});
});

import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18nMiddleware } from "./i18n-middleware";

vi.mock("next/server", () => ({
	NextResponse: {
		redirect: vi.fn(),
		next: vi.fn(),
	},
}));

vi.mock("@formatjs/intl-localematcher", () => ({
	match: vi.fn(),
}));

vi.mock("negotiator", () => ({
	default: vi.fn().mockImplementation(() => ({
		languages: vi.fn(),
	})),
}));

describe("i18nMiddleware", () => {
	let createMockRequest: (url: string) => NextRequest;

	beforeEach(() => {
		vi.clearAllMocks();
		createMockRequest = (url: string) =>
			({
				nextUrl: new URL(url),
				url,
				headers: {
					get: vi.fn(),
					forEach: vi.fn(),
					entries: vi.fn().mockReturnValue([]),
				},
			}) as unknown as NextRequest;
	});

	it("should not redirect when pathname already includes a valid locale", () => {
		const mockRequest = createMockRequest("http://localhost:3000/en/some-path");
		vi.mocked(NextResponse.next).mockReturnValue({} as NextResponse);
		const result = i18nMiddleware(mockRequest);
		expect(NextResponse.next).toHaveBeenCalled();
		expect(NextResponse.redirect).not.toHaveBeenCalled();
		expect(result).toBeDefined();
	});

	it("should redirect when pathname is /", () => {
		const mockRequest = createMockRequest("http://localhost:3000/");
		vi.mocked(NextResponse.next).mockReturnValue({} as NextResponse);
		i18nMiddleware(mockRequest);
		expect(NextResponse.redirect).toHaveBeenCalledWith(new URL("http://localhost:3000/en"));
	});

	it("should preserve query string", () => {
		const mockRequest = createMockRequest("http://localhost:3000/?some=query");
		vi.mocked(NextResponse.next).mockReturnValue({} as NextResponse);
		i18nMiddleware(mockRequest);
		expect(NextResponse.redirect).toHaveBeenCalledWith(new URL("http://localhost:3000/en?some=query"));
	});
});

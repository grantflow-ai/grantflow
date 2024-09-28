import { match } from "@formatjs/intl-localematcher";
import { type NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { i18nMiddleware } from "./i18n-middleware";

vi.mock("@/i18n", () => ({
	i18n: {
		defaultLocale: "en",
		locales: ["en", "fr", "es"],
	},
}));

vi.mock("next/server", () => ({
	NextResponse: {
		redirect: vi.fn(),
		next: vi.fn(),
	},
}));

vi.mock("@formatjs/intl-localematcher", () => ({
	match: vi.fn(),
}));

vi.mock("negotiator", () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			languages: vi.fn().mockReturnValue(["en", "fr", "es"]),
		})),
	};
});

describe("i18nMiddleware", () => {
	let createMockRequest: (url: string, headers?: Record<string, string>) => NextRequest;

	beforeEach(() => {
		vi.clearAllMocks();
		createMockRequest = (url: string, headers = {}) =>
			({
				nextUrl: new URL(url),
				url,
				headers: new Map(Object.entries(headers)),
			}) as unknown as NextRequest;
	});

	it("should not redirect when pathname already includes a valid locale", () => {
		const mockRequest = createMockRequest("http://localhost:3000/en/some-path");
		i18nMiddleware(mockRequest);
		expect(NextResponse.redirect).not.toHaveBeenCalled();
		expect(NextResponse.next).toHaveBeenCalled();
	});

	it("should redirect when pathname is missing a locale", () => {
		const mockRequest = createMockRequest("http://localhost:3000/some-path");
		vi.mocked(NextResponse.redirect).mockReturnValue({} as NextResponse);
		vi.mocked(match).mockReturnValue("en");

		const result = i18nMiddleware(mockRequest);

		expect(match).toHaveBeenCalled();
		expect(NextResponse.redirect).toHaveBeenCalledWith(new URL("http://localhost:3000/en/some-path"));
		expect(result).toBeDefined();
	});

	it("should preserve query string when redirecting", () => {
		const mockRequest = createMockRequest("http://localhost:3000/some-path?key=value");
		vi.mocked(NextResponse.redirect).mockReturnValue({} as NextResponse);
		vi.mocked(match).mockReturnValue("en");

		const result = i18nMiddleware(mockRequest);

		expect(match).toHaveBeenCalled();
		expect(NextResponse.redirect).toHaveBeenCalledWith(new URL("http://localhost:3000/en/some-path?key=value"));
		expect(result).toBeDefined();
	});

	it("should use intl-localematcher when multiple locales are available", () => {
		const mockRequest = createMockRequest("http://localhost:3000/", {
			"accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
		});
		vi.mocked(NextResponse.redirect).mockReturnValue({} as NextResponse);
		vi.mocked(match).mockReturnValue("fr");

		const result = i18nMiddleware(mockRequest);

		expect(match).toHaveBeenCalled();
		expect(NextResponse.redirect).toHaveBeenCalledWith(new URL("http://localhost:3000/fr/"));
		expect(result).toBeDefined();
	});
});

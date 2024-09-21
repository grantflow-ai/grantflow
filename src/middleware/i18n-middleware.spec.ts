import { i18n } from "@/i18n";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
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

	it("should redirect to default locale when pathname is missing locale", () => {
		const mockRequest = createMockRequest("http://localhost:3000/");
		vi.mocked(NextResponse.redirect).mockReturnValue({} as NextResponse);
		const result = i18nMiddleware(mockRequest);
		expect(NextResponse.redirect).toHaveBeenCalledWith(new URL(`/${i18n.defaultLocale}/`, mockRequest.url));
		expect(result).toBeDefined();
	});

	it("should not redirect when pathname already includes a valid locale", () => {
		const mockRequest = createMockRequest("http://localhost:3000/en/some-path");
		vi.mocked(NextResponse.next).mockReturnValue({} as NextResponse);
		const result = i18nMiddleware(mockRequest);
		expect(NextResponse.next).toHaveBeenCalled();
		expect(NextResponse.redirect).not.toHaveBeenCalled();
		expect(result).toBeDefined();
	});

	it("should use negotiator to determine locale when not specified in pathname", () => {
		// Mock i18n.locales to have more than one locale
		const originalLocales = i18n.locales;
		Object.defineProperty(i18n, "locales", {
			value: ["en", "fr", "de"],
			writable: true,
		});

		const mockRequest = createMockRequest("http://localhost:3000/");
		vi.mocked(NextResponse.redirect).mockReturnValue({} as NextResponse);
		const mockLanguages = vi.fn().mockReturnValue(["fr", "en", "de"]);
		vi.mocked(Negotiator).mockImplementation(
			() =>
				({
					languages: mockLanguages,
				}) as unknown as Negotiator,
		);
		vi.mocked(matchLocale).mockReturnValue("fr");

		i18nMiddleware(mockRequest);

		expect(mockLanguages).toHaveBeenCalledWith(["en", "fr", "de"]);
		expect(NextResponse.redirect).toHaveBeenCalledWith(expect.any(URL));
		expect((vi.mocked(NextResponse.redirect).mock.calls[0][0] as URL).pathname).toBe("/fr/");

		// Restore original locales
		Object.defineProperty(i18n, "locales", {
			value: originalLocales,
			writable: true,
		});
	});

	it("should handle root path correctly", () => {
		const mockRequest = createMockRequest("http://localhost:3000/");
		vi.mocked(NextResponse.redirect).mockReturnValue({} as NextResponse);
		i18nMiddleware(mockRequest);
		expect(NextResponse.redirect).toHaveBeenCalledWith(new URL(`/${i18n.defaultLocale}/`, mockRequest.url));
	});

	it("should preserve query parameters when redirecting", () => {
		const mockRequest = createMockRequest("http://localhost:3000/some-path?param1=value1&param2=value2");
		vi.mocked(NextResponse.redirect).mockReturnValue({} as NextResponse);
		vi.mocked(matchLocale).mockReturnValue(i18n.defaultLocale);

		i18nMiddleware(mockRequest);

		expect(NextResponse.redirect).toHaveBeenCalledWith(expect.any(URL));
		const redirectUrl = vi.mocked(NextResponse.redirect).mock.calls[0][0] as URL;
		expect(redirectUrl.pathname).toBe(`/${i18n.defaultLocale}/some-path`);
		expect(redirectUrl.search).toBe("?param1=value1&param2=value2");
	});
});

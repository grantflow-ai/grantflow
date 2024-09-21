import { i18n } from "@/i18n";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { type NextRequest, NextResponse } from "next/server";

function getLocale(request: NextRequest): string | undefined {
	const { locales, defaultLocale } = i18n;

	if (locales.length < 2) {
		return defaultLocale;
	}
	const negotiatorHeaders: Record<string, string> = {};
	for (const [key, value] of request.headers.entries()) {
		negotiatorHeaders[key] = value;
	}

	const languages = new Negotiator({ headers: negotiatorHeaders }).languages(locales);

	return matchLocale(languages, locales, i18n.defaultLocale);
}

/**
 * Middleware to redirect to the correct locale.
 * @param request - The incoming request object.
 * @returns The response object.
 */
export function i18nMiddleware(request: NextRequest) {
	const { pathname, search } = request.nextUrl;

	const pathnameIsMissingLocale = i18n.locales.every(
		(locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
	);

	if (pathnameIsMissingLocale) {
		const locale = getLocale(request);
		return NextResponse.redirect(
			new URL(`/${locale}${pathname.startsWith("/") ? "" : "/"}${pathname}${search}`, request.url),
		);
	}

	return NextResponse.next();
}

import { i18n } from "@/i18n";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { type NextRequest, NextResponse } from "next/server";

function getLocaleFromRequest(request: NextRequest): string | undefined {
	const { locales, defaultLocale } = i18n;

	if (locales.length > 1) {
		return match(
			new Negotiator({ headers: Object.fromEntries(request.headers.entries()) }).languages(locales),
			locales,
			i18n.defaultLocale,
		);
	}

	return defaultLocale;
}

/**
 * Middleware to redirect to the correct locale.
 * @param request - The incoming request object.
 * @returns The response object.
 */
export function i18nMiddleware(request: NextRequest) {
	const { pathname, search } = request.nextUrl;

	if (!i18n.locales.some((locale) => pathname.startsWith(`/${locale}/`))) {
		const locale = getLocaleFromRequest(request);

		return NextResponse.redirect(
			new URL(`/${locale}${pathname.startsWith("/") ? "" : "/"}${pathname}${search}`, request.url),
		);
	}

	return NextResponse.next();
}

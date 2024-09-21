import { i18nMiddleware } from "@/middleware/i18n-middleware";
import type { MiddlewareConfig, NextRequest } from "next/server";
import { updateSession } from "@/middleware/auth";

/**
 * The middleware entry point.
 * Add custom logic as required.
 * @param request - The incoming request object.
 * @returns The response object.
 */
export async function middleware(request: NextRequest) {
	const i18nResponse = i18nMiddleware(request);
	if (i18nResponse.status !== 200) {
		return i18nResponse;
	}
	return await updateSession(request);
}

export const config: MiddlewareConfig = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - icon.ico (icon file)
		 * Feel free to modify this pattern to include more paths.
		 */
		"/((?!_next/static|_next/image|icon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};

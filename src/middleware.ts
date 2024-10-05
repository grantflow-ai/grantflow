import { updateSession } from "@/middleware/auth";
import { i18nMiddleware } from "@/middleware/i18n-middleware";
import type { MiddlewareConfig, NextRequest } from "next/server";

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
	matcher: ["/((?!_next/static|_next/image\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

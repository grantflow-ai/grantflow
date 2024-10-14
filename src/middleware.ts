import { i18nMiddleware } from "@/middleware/i18n-middleware";
import type { MiddlewareConfig } from "next/server";

import { auth } from "@/auth";

export const middleware = auth((request) => {
	return i18nMiddleware(request);
});

export const config: MiddlewareConfig = {
	matcher: ["/((?!api|_next/static|_next/image\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

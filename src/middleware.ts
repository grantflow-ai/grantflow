import type { MiddlewareConfig } from "next/server";

import NextAuth from "next-auth";
import { authConfig } from "@/auth/config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config: MiddlewareConfig = {
	matcher: ["/((?!api|_next/static|_next/image\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

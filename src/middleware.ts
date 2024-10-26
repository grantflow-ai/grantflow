import { MiddlewareConfig, NextResponse } from "next/server";
import { PagePath } from "@/enums";
import NextAuth from "next-auth";

const { auth } = NextAuth({ providers: [] });

export const middleware = auth(async (req) => {
	const path = new URL(req.url).pathname;

	const session = await auth();

	const isSigninPage = path === PagePath.SIGNIN.toString();
	const isRootPage = path === PagePath.ROOT.toString();
	const isAPIRoute = path.startsWith("/api");

	if (!session && !(isRootPage || isSigninPage || isAPIRoute)) {
		return NextResponse.redirect(new URL(PagePath.SIGNIN, req.url));
	}

	if (session && isSigninPage) {
		return NextResponse.redirect(new URL(PagePath.WORKSPACES, req.url));
	}
});

export const config: MiddlewareConfig = {
	matcher: ["/((?!api|_next/static|_next/image\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

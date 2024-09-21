import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getEnv } from "@/utils/env";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { PagePath } from "@/config/enums";

const protectedRoutes: string[] = ["protected"];

/**
 * Middleware to update the session.
 * @param request - The incoming request object.
 * @returns The response object.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabase = createServerClient(getEnv().NEXT_PUBLIC_SUPABASE_URL, getEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				for (const { name, value } of cookiesToSet) {
					request.cookies.set(name, value);
				}
				supabaseResponse = NextResponse.next({
					request,
				});
				for (const { name, value, options } of cookiesToSet) {
					supabaseResponse.cookies.set(name, value, options as ResponseCookie);
				}
			},
		},
	});

	// IMPORTANT: Avoid writing any logic between createServerClient and
	// supabase.auth.getUser(). A simple mistake could make it very hard to debug
	// issues with users being randomly logged out.

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { pathname } = request.nextUrl;

	if (
		!(user || pathname.startsWith(PagePath.AUTH)) &&
		protectedRoutes.some((route) => pathname.startsWith(`/${route}`))
	) {
		// no user, potentially respond by redirecting the user to the signin page
		const url = request.nextUrl.clone();
		url.pathname = PagePath.AUTH;
		return NextResponse.redirect(url);
	}

	// IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
	// creating a new response object with NextResponse.next() make sure to:
	// 1. Pass the request in it, like so:
	//    const myNewResponse = NextResponse.next({ request })
	// 2. Copy over the cookies, like so:
	//    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
	// 3. Change the myNewResponse object to fit your needs, but avoid changing
	//    the cookies!
	// 4. Finally:
	//    return myNewResponse
	// If this is not done, you may be causing the browser and server to go out
	// of sync and terminate the user's session prematurely!

	return supabaseResponse;
}

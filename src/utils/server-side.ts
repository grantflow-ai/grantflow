import type { PagePath } from "@/enums";
import type { PostgrestError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Handle an error occurring server side.
 *
 * @param error - The error to handle.
 * @param message - The message to log.
 * @param fallback - The fallback to return.
 * @param redirect - The page to redirect to.
 * @returns returns the fallback
 */
export function handleServerError<T extends ReactNode>(
	error: PostgrestError | Error,
	{
		message = "A server side error occurred",
		fallback,
		redirect: serverRedirect,
	}: {
		message?: string;
		fallback?: T;
		redirect?: PagePath;
	} = {},
): T | null | never {
	// eslint-disable-next-line no-console
	console.error(`${message}:\n${JSON.stringify(error)}`);
	if (serverRedirect) {
		return redirect(serverRedirect);
	}
	return fallback ?? null;
}

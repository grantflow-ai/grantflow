import type { PagePath } from "@/enums";
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
export function handleServerError<T extends ReactNode | string>(
	error: Error,
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

/**
 * Redirect to a URL with toast parameters.
 *
 * @param url The URL to redirect to.
 * @param type The type of toast to show.
 * @param content The content of the toast.
 *
 * Note: "cookies" strategy will cause a reload, but it is necessary when a reload will already happen.
 * @returns A NextResponse object.
 */
export function redirectWithToastParams({
	path,
	type,
	content,
}: {
	path: string;
	type: "error" | "success" | "info";
	content: string;
}) {
	path = `${path}?toastType=${type}&toastContent=${content}`;

	return redirect(path);
}

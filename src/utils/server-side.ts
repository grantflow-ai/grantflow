import { PagePath } from "@/enums";
import { logError } from "@/utils/logging";
import { redirect } from "next/navigation";

/**
 * Redirect to a URL with toast parameters.
 *
 * @param url The URL to redirect to.
 * @param type The type of toast to show.
 * @param content The content of the toast.
 *
 * @throw A NextRedirect error
 */
export function redirectWithToastParams({
	message,
	path,
	type,
}: {
	message: string;
	path: PagePath | string;
	type: "error" | "info" | "success";
}) {
	redirect(`${path}?toastType=${type}&toastContent=${message}`);
}

/**
 * Wraps a promise in a try/catch block that logs an error and redirects to a URL with toast parameters if the promise rejects.
 *
 * @param value The promise to wrap.
 * @param path The URL to redirect to.
 * @param message The message to show in the toast.
 * @param identifier An identifier for the error.
 *
 * @returns The resolved value of the promise.
 */
export async function withErrorToast<T>({
	identifier,
	message,
	path,
	value,
}: {
	identifier: string;
	message: string;
	path: PagePath | string;
	value: Promise<T>;
}): Promise<T> {
	try {
		return await value;
	} catch (error) {
		logError({ error, identifier });
		redirectWithToastParams({ message, path, type: "error" });
		throw error; // this should never happen - the redirect should prevent the function from continuing by throwing
	}
}

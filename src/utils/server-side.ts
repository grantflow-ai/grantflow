import { redirect } from "next/navigation";
import { PagePath } from "@/enums";
import { logError } from "@/utils/logging";

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
	path,
	type,
	message,
}: {
	path: string | PagePath;
	type: "error" | "success" | "info";
	message: string;
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
	value,
	path,
	message,
	identifier,
}: {
	value: Promise<T>;
	path: string | PagePath;
	message: string;
	identifier: string;
}): Promise<T> {
	try {
		return await value;
	} catch (error) {
		logError({ error, identifier });
		redirectWithToastParams({ path, type: "error", message });
		throw error; // this should never happen - the redirect should prevent the function from continuing by throwing
	}
}

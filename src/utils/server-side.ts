import { serverLogger } from "@/utils/logging/server";
import type { PostgrestError } from "@supabase/supabase-js";
import type { ReactNode } from "react";

/**
 * Handle an error occurring server side.
 *
 * @param error - The error to handle.
 * @param fallback - The fallback value to return.
 * @returns returns the fallback
 */
export function handleServerError<T extends ReactNode | null>(error: PostgrestError | Error, fallback: T): T {
	serverLogger.error(`An error occurred ${JSON.stringify(error)}`);
	return fallback;
}

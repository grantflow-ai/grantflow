import { PagePath } from "@/enums";
import { logError } from "@/utils/logging";
import { redirect } from "next/navigation";

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
		throw error;
	}
}

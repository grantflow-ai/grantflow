"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export function ToastListener() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();

	useEffect(() => {
		const toastType = searchParams.get("toastType") as "error" | "success" | "info" | null;
		const content = searchParams.get("toastContent") ?? "";
		if (toastType) {
			toast[toastType](content);

			setTimeout(() => {
				const newSearchParams = new URLSearchParams(searchParams.toString());
				newSearchParams.delete("toastType");
				newSearchParams.delete("toastContent");

				const redirectPath = `${pathname}?${newSearchParams.toString()}`;
				router.replace(redirectPath, { scroll: false });
			}, 3000);
		}
	}, [searchParams]);

	return null;
}

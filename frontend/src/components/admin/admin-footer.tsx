"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppButton } from "@/components/app/buttons/app-button";

export function AdminFooter() {
	const router = useRouter();

	return (
		<footer className="relative flex h-auto w-full items-center justify-start border-t border-app-gray-100 bg-surface-primary py-4 px-6 mt-auto">
			<AppButton
				data-testid="back-button"
				leftIcon={<Image alt="Go back" height={15} src="/icons/go-back.svg" width={15} />}
				onClick={() => {
					router.back();
				}}
				size="lg"
				theme="dark"
				variant="secondary"
			>
				Back
			</AppButton>
		</footer>
	);
}

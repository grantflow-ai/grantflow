"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/app/buttons/app-button";

export function GrantFinderHeader() {
	return (
		<header
			className="h-[73px] w-full flex items-center gap-4 px-6 border-b border-gray-200 bg-white"
			data-testid="grant-finder-header"
		>
			<Link href="/">
				<AppButton
					aria-label="Back to home"
					data-testid="back-button"
					leftIcon={<ArrowLeft />}
					size="md"
					variant="ghost"
				>
					Back
				</AppButton>
			</Link>
			<h1 className="text-xl font-semibold text-gray-900">Find Grants</h1>
		</header>
	);
}

"use client";

import Image from "next/image";
import { toast } from "sonner";
import { AppButton } from "@/components/app/buttons/app-button";
import { OnboardingGradientBackgroundBottom } from "@/components/onboarding/backgrounds";

const handleCopyLink = async () => {
	try {
		const url = globalThis.location.origin;
		await navigator.clipboard.writeText(url);
		toast.success("Link copied to clipboard");
	} catch {
		toast.error("Failed to copy link.");
	}
};
export default function PostLogin() {
	return (
		<section className="text-app-black flex flex-col items-center justify-center w-full">
			<div className="absolute inset-0 z-0">
				<Image
					alt="background"
					aria-hidden="true"
					className="size-full object-cover xl:object-cover"
					height={0}
					priority
					src="/assets/landing-bg-pattern.svg"
					style={{ minHeight: "100%", width: "100%" }}
					width={0}
				/>
			</div>
			<OnboardingGradientBackgroundBottom
				aria-hidden="true"
				className="pointer-events-none absolute bottom-0 left-0"
				data-testid="login-background-gradient"
				height="300"
				width="560"
			/>
			<div className="relative z-10 flex-col items-center justify-center ">
				<main className="w-[279px] flex flex-col gap-2 text-center items-center ">
					<div className=" size-8 mb-[25px]">
						<Image alt="laptop icon" aria-hidden="true" height={32} src="/icons/laptop.svg" width={32} />
					</div>
					<h1 className="font-cabin font-medium text-4xl " data-testid="post-login-heading">
						Desktop Required
					</h1>
					<p
						className="font-sans font-normal text-base text-app-gray-600 mb-[39px]"
						data-testid="post-login-text"
					>
						Creating a new application in GratFlow requires a desktop experience for the best results and
						full functionality.
					</p>
					<AppButton
						className="px-4 py-2 gap-1 "
						data-testid="post-login-copy-button"
						onClick={handleCopyLink}
					>
						<span>
							<Image alt="laptop icon" aria-hidden="true" height={16} src="/icons/copy.svg" width={16} />
						</span>
						Copy link
					</AppButton>
				</main>
			</div>
		</section>
	);
}

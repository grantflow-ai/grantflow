"use client";

import { SearchWizard } from "@/components/grant-finder/search-wizard";

import { NavHeader } from "@/components/landing-page/nav-header";
import Image from "next/image";

export function GrantFinderClient() {
	return (
		<div className="flex h-screen w-full flex-col bg-preview-bg isolate" data-testid="grant-finder-client">
			<NavHeader />

		
			<div className="pointer-events-none  absolute top-1/2 right-[-100px] h-[1000px] w-[1024px] -translate-y-1/2 z-[-1]">
				<Image src="assets/right-gradient.svg" alt="gradient" fill/>
			</div>

			<main className="flex-1 overflow-y-auto">
				<div className="mx-auto w-[1069px] px-4 py-8 sm:px-6 lg:px-8" data-testid="main-content">
					<main className="font-cabin flex flex-col gap-[80px]">
						<div className="flex flex-col gap-3">
							<div className="font-normal text-xs leading-[18px] text-white bg-primary px-2 rounded-[20px] w-fit ">
								Free Service from Vsphera
							</div>
							<h1
								className="font-cabin text-[64px] leading-[74px] font-normal text-app-black"
								data-testid="main-content-title"
							>
								Find the Right NIH Grant,
								<br /> Faster. Smarter. Easier.
							</h1>
						</div>

						<div className="flex flex-col gap-6">
							<div className="flex flex-col gap-3">
								<h5 className="font-medium font-cabin text-4xl text-gray-700 ">
									NIH Grant Matches Sent Straight to Your Inbox
								</h5>

								<p
									className="w-[862px] font-normal font-sans text-base  text-[#636170] leading-5 "
									data-testid="main-content-subtitle"
								>
									Our intelligent NIH Grants Finder helps researchers and labs instantly discover
									funding opportunities tailored to their field, project type, and stage, so you can
									focus on your science, not on searching. Plus, get email alerts the moment a
									matching grant is announced, ensuring you never miss the right opportunity.
								</p>
							</div>
							<SearchWizard />
						</div>
					</main>
				</div>
			</main>
		</div>
	);
}
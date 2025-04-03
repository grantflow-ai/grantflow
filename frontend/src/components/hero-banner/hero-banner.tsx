import { Button } from "@/components/ui/button";
import { CalendarPlus2 } from "lucide-react";
import { HeroPattern } from "./hero-pattern";

export function HeroBanner() {
	return (
		<section className="relative">
			<div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_bottom_right,var(--primary)_0%,transparent_70%)] opacity-70" />
			<HeroPattern
				aria-hidden="true"
				className="absolute right-0 bottom-0 z-20 h-full w-auto"
				role="presentation"
			/>
			<div className="relative z-30 flex flex-col max-w-xl p-10 m-20">
				<h1 className="font-heading text-7xl">Where Research Meets Funding, Seamlessly.</h1>
				<div className="flex mt-8 gap-4">
					<Button>Try for free &gt;</Button>
					<Button variant="outline">
						<CalendarPlus2 className="h-4" />
						Schedule a Demo
					</Button>
				</div>
			</div>
		</section>
	);
}

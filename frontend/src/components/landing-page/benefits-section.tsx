import { LucideIcon, Timer, Users } from "lucide-react";
import { PatternedBackground } from "./patterned-bg";
import { cn } from "@/lib/utils";
import React, { HTMLAttributes } from "react";

const benefitsSectionHeader2 = "font-heading text-stone-800 text-4xl";
const benefitsCardBackground = "bg-stone-50/60";
const benefitsCardBorder = "border-2 border-primary/70 rounded";

interface BenefitsCardProps {
	badge: string;
	badgeIcon: LucideIcon;
	description: string;
	heading: string;
}

export function BenefitsSection() {
	return (
		<section aria-labelledby="benefits-section" className="relative w-full bg-white">
			<PatternedBackground aria-hidden="true" className="absolute inset-0 z-0 w-full h-auto" />
			<div className="relative z-10 flex flex-col items-center text-center pt-20 pb-15 px-30">
				<h2 className={benefitsSectionHeader2} id="benefits-heading">
					Simplify Grant Applications with AI-Powered tools
				</h2>
				<p className="m-3 text-xl text-stone-800" id="benefits-description">
					GrantFlow.ai transforms the complex grant application process into a fast, intelligent workflow.
					From generating polished proposals to managing documents effortlessly, our AI does the heavy
					lifting, so you can focus on your research.
				</p>
				<div className="grid grid-cols-2 gap-6 w-full items-start text-start my-8">
					<BenefitsCard
						badge="Save time!"
						badgeIcon={Timer}
						description="As a PI, you're balancing lab leadership, publishing demands, and the constant pressure to secure funding. The grant writing process is not only time-consuming—it pulls your focus away from advancing groundbreaking research. Add the coordination with students, administrators, and co-investigators, and the complexity multiplies."
						heading="More Time on Grant Writing, Less on Research?"
					/>
					<BenefitsCard
						badge="Collaborate smarter!"
						badgeIcon={Users}
						description="Coordinating with students, administrators, and co-investigators can slow everything down. GrantFlow gives your team a shared workspace to work on proposals efficiently, track progress, and keep everyone aligned without endless email threads or version chaos."
						heading="One Place for Your Entire Grant Team"
					/>
					<HowItWorksCard className="col-span-2" />
				</div>
			</div>
		</section>
	);
}

function BenefitsCard({ badge, badgeIcon: Icon, description, heading }: BenefitsCardProps) {
	return (
		<article className={cn("size-full text-stone-800 py-7 px-5", benefitsCardBackground, benefitsCardBorder)}>
			<div className="inline-flex items-center bg-background rounded-2xl px-2 text-white gap-1">
				<Icon className="size-3" />
				<span className="font-button font-light align-bottom text-sm">{badge}</span>
			</div>
			<h3 className="font-heading font-bold text-2xl my-2">{heading}</h3>
			<p className="leading-tight">{description}</p>
		</article>
	);
}

function HowItWorksCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"w-full h-auto p-10 flex flex-col items-center justify-center",
				className,
				benefitsCardBackground,
				benefitsCardBorder,
			)}
			{...props}
		>
			<h2 className={cn(benefitsSectionHeader2, "font-bold m-4")}>How It Works?</h2>
			<div className="grid grid-cols-4 my-8 p-2 gap-x-20">
				<TimelineStep
					label={
						<>
							Describe Your <br /> Research
						</>
					}
				/>
				<TimelineStep
					label={
						<>
							Upload Your Research <br /> Database
						</>
					}
				/>
				<TimelineStep
					label={
						<>
							Invite Your Colleagues <br /> to Work With You
						</>
					}
				/>
				<TimelineStep
					label={
						<>
							Generate Your <br /> Proposal with AI
						</>
					}
				/>
			</div>
		</div>
	);
}

function StepIndicator() {
	return (
		<div className="inline-flex items-center justify-center rounded-full p-[0.1rem] border-2 border-background">
			<div className="size-5 bg-background rounded-full" />
		</div>
	);
}

function TimelineStep({ label }: { label: React.ReactNode }) {
	return (
		<div className="flex flex-col items-center justify-center">
			<StepIndicator />
			<p className="font-heading font-bold text-background text-center text-2xl mt-6">{label}</p>
		</div>
	);
}

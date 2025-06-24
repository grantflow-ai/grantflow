import Image from "next/image";

import { IconDraft, IconHourglass, IconOrganize, IconRefine } from "@/components/about/icons";
import { BrandPattern } from "@/components/brand-pattern";
import { LegalPageContainer } from "@/components/info-legal-page-components";
import { cn } from "@/lib/utils";

const subHeadingClasses = "font-heading font-medium text-3xl md:text-4xl";

const toolkitItems = [
	{
		icon: IconDraft,
		specification: "Generate draft proposals based on previous documents and lab notes",
	},
	{
		icon: IconOrganize,
		specification: "Organize and structure application components clearly and convincingly",
	},
	{
		icon: IconRefine,
		specification: "Collaborate, review and refine text with the help of an AI assistant",
	},
	{
		icon: IconHourglass,
		specification: "Apply for more funding opportunities without increasing workload",
	},
];

const foundersDetails = [
	{ designation: "Co founder | CEO", displayPicture: "/assets/founder-image-asaf.png", name: "Asaf Ronel" },
	{ designation: "Co-founder | CTO", displayPicture: "/assets/founder-image-naaman.png", name: "Na’aman Hirschfeld" },
	{
		designation: "Co-founder | Product & UX",
		displayPicture: "/assets/founder-image-tirza.png",
		name: "Tirza Shatz",
	},
];

export default function AboutPage() {
	return (
		<LegalPageContainer
			background="dark"
			backgroundStack={
				<>
					<div
						className="pointer-events-none absolute inset-0 z-10 size-full overflow-hidden"
						style={{
							background: "radial-gradient(ellipse at center, var(--primary) 0%, transparent 75%)",
							contain: "strict",
							left: "50%",
							pointerEvents: "none",
							top: "60%",
							transform: "translate(-50%, -50%)",
						}}
					/>
					<BrandPattern
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 z-0 size-full opacity-50"
						role="presentation"
						strokeWidth="0.1"
					/>
				</>
			}
			childrenSpan="parent"
			headingLevel="h1"
			isTextCentered
			textColor="text-white"
			title="About GrantFlow"
		>
			<div className="relative flex min-h-screen w-full flex-col items-center">
				<div className="max-w-198 w-full">
					<p className="mb-20 text-lg leading-tight md:text-base">
						GrantFlow is a tool designed to support researchers through one of the most time-consuming parts
						of their work: applying for grants. Researchers today spend a large part of their time on
						funding-related documentation, most of it could otherwise be invested in research and
						innovation. Our goal is to reduce that burden by automating key steps in the grant writing
						process, starting with draft structuring and generation using existing documents.
					</p>
					<h2 className={cn(subHeadingClasses, "mb-3")}>What We Do?</h2>
					<p>
						<span className="font-semibold">GrantFlow</span> uses AI to help researchers:
					</p>
					<ul className="my-8 grid grid-cols-1 gap-6 md:grid-cols-4">
						{toolkitItems.map((item, index) => (
							<ToolKitItems Icon={item.icon} key={index} specification={item.specification} />
						))}
					</ul>
					<p className="font-semibold">
						Our system is built for research professionals working in academic and applied STEM fields.
					</p>
				</div>
				<div className="max-w-220 w-full py-20">
					<div className="w-full rounded bg-violet-200/15 p-11">
						<h2 className={cn(subHeadingClasses, "mb-3")}>About GrantFlow Team</h2>
						<p className="leading-tight md:px-12 lg:px-16 xl:px-20">
							GrantFlow was founded by a team of professionals with experience in STEM research,
							engineering, and product development:
						</p>
						<div className="py-5.5 mt-11 w-full items-center">
							<ul className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
								{foundersDetails.map((founder, index) => (
									<Founders
										designation={founder.designation}
										displayPicture={founder.displayPicture}
										key={index}
										name={founder.name}
									/>
								))}
							</ul>
							<p>
								We work closely with researchers to build tools that respond to real, day to day
								challenges in the funding process.
							</p>
						</div>
					</div>
				</div>
				<div className="max-w-198 mb-20 w-full">
					<h2 className={cn(subHeadingClasses, "mb-6")}>Why It Matters?</h2>
					<p className="font-normal leading-tight">
						Grants are the most important funding source for STEM research. However, the application process
						is often slow, complex, and resource-intensive.{" "}
					</p>
					<p className="font-normal leading-tight">
						By simplifying the grant writing process, GrantFlow supports researchers in focusing on their
						core work advancing knowledge and innovating.
					</p>
				</div>
				<p className="max-w-198 w-full font-semibold leading-tight">
					GrantFlow is currently in the final stage of development. If you&apos;re interested in early access,
					you&apos;re welcome to join the waitlist and be one of the first to try it when we launch.
				</p>
			</div>
		</LegalPageContainer>
	);
}

function Founders({
	designation,
	displayPicture,
	name,
}: {
	designation: string;
	displayPicture: string;
	name: string;
}) {
	return (
		<li className="flex flex-col items-center space-y-3 p-3">
			<Image
				alt={`${name}'s photo`}
				className="size-24.5 rounded-full"
				height={100}
				src={displayPicture}
				width={100}
			/>
			<p className="font-semibold">{designation}</p>
			<h4 className="font-heading text-2xl font-medium">{name}</h4>
		</li>
	);
}

function ToolKitItems({
	Icon,
	specification,
}: {
	Icon: React.FC<React.SVGProps<SVGSVGElement>>;
	specification: string;
}) {
	return (
		<li className="flex flex-col items-center p-3">
			<Icon className="mb-3" height={24} width={24} />
			<span className="leading-tight">{specification}</span>
		</li>
	);
}

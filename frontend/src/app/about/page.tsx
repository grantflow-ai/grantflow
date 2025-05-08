import { IconDraft, IconHourglass, IconOrganize, IconRefine } from "@/components/about/icons";
import { LegalPageContainer } from "@/components/info-legal-page-components";
import { cn } from "@/lib/utils";
import Image, { StaticImageData } from "next/image";
import Asaf from "@/assets/asaf.png";
import Naaman from "@/assets/na_aman.png";
import Tirza from "@/assets/tirza.png";
import { BrandPattern } from "@/components/brand-pattern";

const subHeadingClasses = "font-heading font-medium text-4xl";

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
	{ designation: "Co founder | CEO", displayPicture: Asaf, name: "Asaf Ronel" },
	{ designation: "Co-founder | CTO", displayPicture: Naaman, name: "Na’aman Hirschfeld" },
	{ designation: "Co-founder | Product & UX", displayPicture: Tirza, name: "Tirza Shatz" },
];

export default function AboutPage() {
	return (
		<LegalPageContainer
			background="dark"
			backgroundStack={
				<>
					<div
						className="absolute z-10 inset-0 size-full overflow-hidden pointer-events-none"
						style={{
							background: `radial-gradient(ellipse at center, var(--primary) 0%, transparent 75%)`,
							contain: "strict",
							left: "50%",
							pointerEvents: "none",
							top: "60%",
							transform: "translate(-50%, -50%)",
						}}
					></div>
					<BrandPattern
						aria-hidden="true"
						className="absolute inset-0 z-0 size-full pointer-events-none"
						role="presentation"
						strokeWidth="0.1"
					/>
				</>
			}
			childrenSpan="parent"
			headingLevel="h1"
			isTextCentered
			textColor="text-white"
			title="About GrantFlow.ai"
		>
			<div className="flex flex-col items-center w-full min-h-screen relative">
				<div className="w-full max-w-198">
					<p className="mb-20 leading-tight">
						GrantFlow.ai is a tool designed to support researchers through one of the most time-consuming
						parts of their work: applying for grants. Researchers today spend a large part of their time on
						funding-related documentation, most of it could otherwise be invested in research and
						innovation. Our goal is to reduce that burden by automating key steps in the grant writing
						process, starting with draft structuring and generation using existing documents.
					</p>
					<h2 className={cn(subHeadingClasses, "mb-3")}>What We Do?</h2>
					<p>
						<span className="font-semibold">GrantFlow.ai</span> uses AI to help researchers:
					</p>
					<ul className="grid grid-cols-1 md:grid-cols-4 gap-6 my-8">
						{toolkitItems.map((item, index) => (
							<ToolKitItems Icon={item.icon} key={index} specification={item.specification} />
						))}
					</ul>
					<p className="font-semibold">
						Our system is built for research professionals working in academic and applied STEM fields.
					</p>
				</div>
				<div className="w-full max-w-220 py-20">
					<div className="w-full rounded bg-violet-200/15 p-11">
						<h2 className={cn(subHeadingClasses, "mb-3")}>About GrantFlow.ai Team</h2>
						<p className="px-20 leading-tight">
							GrantFlow.ai was founded by a team of professionals with experience in STEM research,
							engineering, and product development:
						</p>
						<div className="w-full items-center mt-11 py-5.5">
							<ul className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
				<div className="w-full max-w-198 mb-20">
					<h2 className={cn(subHeadingClasses, "mb-6")}>Why It Matters?</h2>
					<p className="font-normal leading-tight">
						Grants are the most important funding source for STEM research. However, the application process
						is often slow, complex, and resource-intensive.{" "}
					</p>
					<p className="font-normal leading-tight">
						By simplifying the grant writing process, GrantFlow.ai supports researchers in focusing on their
						core work advancing knowledge and innovating.
					</p>
				</div>
				<p className="w-full max-w-198 font-semibold leading-tight">
					GrantFlow.ai is currently in the final stage of development. If you re interested in early access,
					you re welcome to join the waitlist and be one of the first to try it when we launch.
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
	displayPicture: StaticImageData;
	name: string;
}) {
	return (
		<li className="flex flex-col items-center p-3 space-y-3">
			<Image alt={`${name}'s photo`} className="rounded-full size-24.5" src={displayPicture} />
			<p className="font-semibold">{designation}</p>
			<h4 className="font-heading font-medium text-2xl">{name}</h4>
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
			<Icon className="mb-3" height={24} width={24}></Icon>
			<span className="leading-tight">{specification}</span>
		</li>
	);
}

import { GradientBackground } from "@/components/landing-page/backgrounds";
import {
	IconEarlyAccessBenefit1,
	IconEarlyAccessBenefit2,
	IconEarlyAccessBenefit3,
	IconEarlyAccessBenefit4,
} from "@/components/landing-page/icons";
import {
	MotionAside,
	MotionDiv,
	MotionHeading2,
	MotionHeading3,
	MotionListItem,
	MotionParagraph,
	MotionSection,
	MotionUnorderedList,
} from "@/components/landing-page/motion-components";
import { WaitlistForm } from "@/components/landing-page/waitlist-form";

const SECTION_HEADERS = {
	badge: "Early Access Registration Now Open!",
	description:
		"Be among the first to experience GrantFlow. Sign up now to unlock exclusive features, provide valuable feedback, and enjoy priority support.",
	heading: "Save Time, Amplify Your Impact.",
};

const CONTENT_BENEFITS = {
	earlyAccessBenefits: [
		{
			description: "Be the first to explore our most advanced, AI-powered tools.",
			heading: "Exclusive Features",
			icon: IconEarlyAccessBenefit1,
		},
		{
			description: "Your feedback will directly shape how GrantFlow.ai evolves.",
			heading: "Influence the Future",
			icon: IconEarlyAccessBenefit2,
		},
		{
			description: "Get dedicated onboarding and hands-on assistance from our team.",
			heading: "Priority Support",
			icon: IconEarlyAccessBenefit3,
		},
		{
			description: "Create and generate your first full grant application for FREE!",
			heading: "Free Application",
			icon: IconEarlyAccessBenefit4,
		},
	],
	formHeading: "Join GrantFlow Waitlist",
	listHeading: "Exclusive Early Access Benefits:",
};

const sectionVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			duration: 0.3,
			ease: "easeInOut" as const,
			staggerChildren: 0.4,
		},
	},
};

const badgeVariants = {
	hidden: {
		opacity: 0,
		scale: 1.5,
	},
	visible: {
		opacity: 1,
		scale: 1,
		transition: {
			delay: 0.2,
			duration: 0.6,
			ease: "easeInOut" as const,
		},
	},
};

const textVariants = {
	hidden: {
		opacity: 0,
		y: 20,
	},
	visible: {
		opacity: 1,
		transition: {
			duration: 0.4,
			ease: "easeInOut" as const,
		},
		y: 0,
	},
};

const contentContainerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			duration: 0.2,
			ease: "easeInOut" as const,
			staggerChildren: 0.2,
		},
	},
};

const benefitsContainerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

const benefitCardVariants = {
	hidden: {
		opacity: 0,
		y: 20,
	},
	visible: {
		opacity: 1,
		transition: {
			duration: 0.5,
			ease: "easeInOut" as const,
			staggerChildren: 0.3,
		},
		y: 0,
	},
};

const benefitIconVariants = {
	hidden: {
		opacity: 0,
		scale: 0.8,
	},
	visible: {
		opacity: 1,
		scale: 1,
		transition: {
			duration: 0.3,
			ease: "easeInOut" as const,
		},
	},
};

const formContainerVariants = {
	hidden: {
		opacity: 0,
		x: 20,
	},
	visible: {
		opacity: 1,
		transition: {
			duration: 0.4,
			ease: "easeInOut" as const,
			staggerChildren: 0.3,
		},
		x: 0,
	},
};

export function EarlyAccessSection() {
	return (
		<MotionSection
			aria-label="early-access-section"
			className="relative"
			id="waitlist"
			initial="hidden"
			variants={sectionVariants}
			viewport={{ amount: 0.1, once: true }}
			whileInView="visible"
		>
			<GradientBackground className="inset-0 z-0 hidden md:absolute md:block" />
			<GradientBackground className="absolute inset-0 z-0 md:hidden" position="bottom-left" />
			<div className="lg:py-15 xl:px-30 relative z-10 flex flex-col px-4 py-10 md:px-10 md:py-12 lg:px-20 xl:py-20">
				<MotionDiv
					className="text-background max-w-fit rounded-full bg-white px-2 pt-0.5 text-lg md:text-sm"
					id="early-access-badge"
					variants={badgeVariants}
				>
					{SECTION_HEADERS.badge}
				</MotionDiv>
				<MotionHeading2
					className="font-heading leading-14 mt-4 text-5xl md:mt-3 md:text-4xl md:leading-10"
					data-testid="early-access-heading"
					id="early-access-heading"
					variants={textVariants}
				>
					{SECTION_HEADERS.heading}
				</MotionHeading2>
				<MotionParagraph
					className="mt-1 text-xl antialiased md:text-white/80"
					data-testid="early-access-description"
					id="early-access-description"
					variants={textVariants}
				>
					{SECTION_HEADERS.description}
				</MotionParagraph>
				<BenefitsAndWaitlistForm />
			</div>
		</MotionSection>
	);
}

function BenefitsAndWaitlistForm() {
	return (
		<MotionDiv
			className="mt-10 flex flex-col gap-8 rounded bg-violet-200/15 p-7 lg:mt-7 lg:flex-row lg:gap-0 lg:px-11"
			variants={contentContainerVariants}
		>
			<MotionSection
				className="flex-1 justify-start"
				id="early-access-form-and-benefits"
				variants={benefitsContainerVariants}
			>
				<MotionHeading3
					className="font-heading text-[1.5rem] md:text-[1.75rem]"
					id="benefits-list-header"
					variants={textVariants}
				>
					{CONTENT_BENEFITS.listHeading}
				</MotionHeading3>
				<MotionUnorderedList
					className="mt-7 flex flex-wrap justify-start gap-4 gap-y-12 py-3 ps-3 md:gap-12 md:p-3"
					variants={benefitsContainerVariants}
				>
					{CONTENT_BENEFITS.earlyAccessBenefits.map((benefits, index) => (
						<MotionListItem
							className="w-[calc(50%-1rem)] sm:w-[calc(45%-1rem)] md:w-[calc(40%-1rem)] lg:w-[calc(30%-1rem)] xl:w-[calc(20%-1rem)]"
							custom={index}
							key={index}
							variants={benefitCardVariants}
						>
							<EarlyAccessBenefitsCard
								BadgeIcon={benefits.icon}
								description={benefits.description}
								heading={benefits.heading}
							/>
						</MotionListItem>
					))}
				</MotionUnorderedList>
			</MotionSection>
			<MotionAside
				aria-label="waitlist-form"
				className="flex shrink-0 flex-col space-y-2"
				id="waitlist-form-container"
				variants={formContainerVariants}
			>
				<MotionHeading3 className="font-heading text-2xl" variants={textVariants}>
					{CONTENT_BENEFITS.formHeading}
				</MotionHeading3>
				<WaitlistForm />
			</MotionAside>
		</MotionDiv>
	);
}

function EarlyAccessBenefitsCard({
	BadgeIcon,
	description,
	heading,
}: {
	BadgeIcon: React.FC<React.SVGProps<SVGSVGElement>>;
	description: string;
	heading: string;
}) {
	return (
		<article id="early-access-benefits-card">
			<MotionDiv variants={benefitIconVariants}>
				<BadgeIcon className="size-6 md:size-5" />
			</MotionDiv>
			<MotionHeading3 className="font-heading mb-1 mt-4 text-xl md:mt-2 md:text-base" variants={textVariants}>
				{heading}
			</MotionHeading3>
			<MotionParagraph
				className="text-lg leading-tight text-white/80 md:text-sm md:font-light md:text-white"
				variants={textVariants}
			>
				{description}
			</MotionParagraph>
		</article>
	);
}

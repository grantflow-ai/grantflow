import Image from "next/image";

import { MotionArticle, MotionBlockquote, MotionImage } from "@/components/landing-page/motion-components";
import { ScrollFadeElement } from "@/components/landing-page/scroll-fade-element";

const CONTENT = {
	heading: "Why Researchers Join GrantFlow?",
	subtitle: "Inspired by real research challenges",
	testimonials: [
		{
			image: "/assets/user-image-1.png",
			quote: "Balancing research, publishing, and endless grant writing pulls us in too many directions. A tool like GrantFlow could finally give researchers the time to lead, not just apply.",
		},
		{
			image: "/assets/user-image-2.png",
			quote: "Managing collaborators, timelines, and documents across institutions is a constant challenge. A structured platform like GrantFlow is exactly what our field needs.",
		},
		{
			image: "/assets/user-image-3.png",
			quote: "Writing grant proposals from scratch, again and again, isn’t sustainable. The idea of AI support tailored to researchers is long overdue and incredibly promising.",
		},
	],
};

const articleVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.4,
			when: "beforeChildren",
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

const imageVariants = {
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

export function TestimonialsSection() {
	return (
		<section
			aria-labelledby="testimonials-section"
			className="relative w-full bg-gray-100 text-stone-800"
			data-testid="testimonials-section"
		>
			<div className="xl:px-30 flex flex-col space-y-2 px-8 pb-20 pt-8 md:px-10 md:pt-12 lg:px-20 lg:pt-16 xl:pb-4 xl:pt-20">
				<ScrollFadeElement className="mx-auto w-full">
					<h2 className="font-heading text-3xl font-medium md:text-4xl" id="testimonials-heading">
						{CONTENT.heading}
					</h2>
				</ScrollFadeElement>
				<ScrollFadeElement className="mx-auto w-full" delay={0.1}>
					<p className="mx-1 text-xl md:text-lg lg:text-base">{CONTENT.subtitle}</p>
				</ScrollFadeElement>
				<div className="mt-8 grid grid-cols-1 place-items-center gap-12 md:gap-8 lg:grid-cols-3 lg:place-items-start lg:gap-4 xl:m-16 xl:gap-0">
					{CONTENT.testimonials.map((testimonial, i) => (
						<MotionArticle
							className="w-sm lg:w-2xs xl:w-xs flex h-full flex-col items-center px-5 text-center xl:px-0"
							data-testid={"mock-motion-article"}
							initial="hidden"
							key={i}
							variants={articleVariants}
							viewport={{ amount: 0.3, once: true }}
							whileInView="visible"
						>
							<MotionImage
								alt={`${Image.name}'s photo`}
								className="size-24 rounded-full md:size-28 lg:size-32 xl:size-36"
								data-testid="mock-motion-image"
								height={100}
								src={testimonial.image}
								variants={imageVariants}
								width={100}
							/>
							<MotionBlockquote
								className="mt-6 leading-tight"
								data-testid="mock-motion-blockquote"
								variants={textVariants}
							>
								&quot;{testimonial.quote}&quot;
							</MotionBlockquote>
						</MotionArticle>
					))}
				</div>
			</div>
		</section>
	);
}

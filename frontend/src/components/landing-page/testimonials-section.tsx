import Image from "next/image";
import { ScrollFadeElement } from "@/components/landing-page/scroll-fade-element";
import { MotionArticle, MotionBlockquote, MotionImage } from "@/components/landing-page/motion-components";

const CONTENT = {
	heading: "Why Researchers Join GrantFlow.ai?",
	subtitle: "Inspired by real research challenges",
	testimonials: [
		{
			image: "/assets/user-image-1.png",
			quote: "Balancing research, publishing, and endless grant writing pulls us in too many directions. A tool like GrantFlow.ai could finally give researchers the time to lead, not just apply.",
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
			ease: "easeInOut",
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
			ease: "easeInOut",
		},
		y: 0,
	},
};

export function TestimonialsSection() {
	return (
		<section aria-labelledby="testimonials-section" className="relative w-full text-stone-800 bg-gray-100">
			<div className="flex flex-col pt-8 md:pt-12 lg:pt-16 xl:pt-20 pb-20 xl:pb-4 px-8 md:px-10 lg:px-20 xl:px-30 space-y-2">
				<ScrollFadeElement className="w-full mx-auto">
					<h2 className="font-heading text-3xl md:text-4xl font-medium" id="testimonials-heading">
						{CONTENT.heading}
					</h2>
				</ScrollFadeElement>
				<ScrollFadeElement className="w-full mx-auto" delay={0.1}>
					<p className="mx-1 text-xl md:text-lg lg:text-base">{CONTENT.subtitle}</p>
				</ScrollFadeElement>
				<div className="grid grid-cols-1 lg:grid-cols-3 place-items-center lg:place-items-start gap-12 md:gap-8 lg:gap-4 xl:gap-0 mt-8 xl:m-16">
					{CONTENT.testimonials.map((testimonial, i) => (
						<MotionArticle
							className="flex flex-col items-center text-center w-sm lg:w-2xs xl:w-xs h-full px-5 xl:px-0"
							initial="hidden"
							key={i}
							variants={articleVariants}
							viewport={{ amount: 0.3, once: true }}
							whileInView="visible"
						>
							<MotionImage
								alt={`${Image.name}'s photo`}
								className="rounded-full size-24 md:size-28 lg:size-32 xl:size-36"
								height={100}
								src={testimonial.image}
								variants={imageVariants}
								width={100}
							/>
							<MotionBlockquote
								className="mt-6 font-semibold leading-tight text-xl md:text-lg lg:text-base"
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

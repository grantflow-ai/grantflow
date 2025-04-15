import Image from "next/image";

const CONTENT: {
	heading: string;
	subtitle: string;
	testimonials: {
		image: string;
		quote: string;
	}[];
} = {
	heading: "Why Researchers Join GrantFlow.ai?",
	subtitle: "Inspired by real research challenges",
	testimonials: [
		// {
		// 	image: Sarah,
		// 	quote: "Balancing research, publishing, and endless grant writing pulls us in too many directions. A tool like GrantFlow.ai could finally give researchers the time to lead, not just apply.",
		// },
		// {
		// 	image: Michael,
		// 	quote: "Managing collaborators, timelines, and documents across institutions is a constant challenge. A structured platform like GrantFlow is exactly what our field needs.",
		// },
		// {
		// 	image: Jamie,
		// 	quote: "Writing grant proposals from scratch, again and again, isn’t sustainable. The idea of AI support tailored to researchers is long overdue and incredibly promising.",
		// },
	],
};

export function TestimonialsSection() {
	return (
		<section aria-labelledby="testimonials-section" className="relative w-full text-stone-800 bg-gray-100">
			<div className="flex flex-col pt-8 md:pt-12 lg:pt-16 xl:pt-20 pb-20 xl:pb-4 px-8 md:px-10 lg:px-20 xl:px-30 space-y-2">
				<h2 className="font-heading text-3xl md:text-4xl font-medium" id="testimonials-heading">
					{CONTENT.heading}
				</h2>
				<p className="mx-1 text-xl md:text-lg lg:text-base">{CONTENT.subtitle}</p>
				<div className="grid grid-cols-1 lg:grid-cols-3 place-items-center lg:place-items-start gap-12 md:gap-8 lg:gap-0 mt-8 xl:m-16">
					{CONTENT.testimonials.map((testimonial, i) => (
						<article
							className="flex flex-col items-center text-center w-sm lg:w-2xs xl:w-xs h-full"
							key={i}
						>
							<Image
								alt={`${Image.name}'s photo`}
								className="rounded-full size-[6rem] md:size-[7rem] lg:size-[8rem] xl:size-[9rem]"
								src={testimonial.image}
							/>
							<blockquote className="mt-6 font-semibold leading-tight text-xl md:text-lg lg:text-base">
								&quot;{testimonial.quote}&quot;
							</blockquote>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

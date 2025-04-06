import Sarah from "@/assets/placeholders/sarah-chen.png";
import Michael from "@/assets/placeholders/michael.png";
import Jamie from "@/assets/placeholders/jamie.png";
import Image from "next/image";

export function TestimonialsSection() {
	const testimonials = [
		{
			image: Sarah,
			quote: "Balancing research, publishing, and endless grant writing pulls us in too many directions. A tool like GrantFlow.ai could finally give researchers the time to lead, not just apply.",
		},
		{
			image: Michael,
			quote: "Managing collaborators, timelines, and documents across institutions is a constant challenge. A structured platform like GrantFlow is exactly what our field needs.",
		},
		{
			image: Jamie,
			quote: "Writing grant proposals from scratch, again and again, isn’t sustainable. The idea of AI support tailored to researchers is long overdue and incredibly promising.",
		},
	];

	return (
		<section aria-labelledby="testimonials-section" className="relative w-full text-stone-800 bg-gray-100">
			<div className="flex flex-col pt-20 pb-4 px-30">
				<h2 className="font-heading text-4xl font-medium" id="testimonials-heading">
					What Researchers Join GrantFlow.ai?
				</h2>
				<div className="grid grid-cols-3 place-items-center py-4 px-12 m-12">
					{testimonials.map((testimonial, i) => (
						<article className="flex flex-col items-center text-center w-3xs" key={i}>
							<Image
								alt={`${Image.name}'s photo`}
								className="rounded-full size-[8rem] mb-4"
								src={testimonial.image}
							/>
							<blockquote className="mt-6 text-sm">&quot;{testimonial.quote}&quot;</blockquote>
						</article>
					))}
					<article></article>
				</div>
			</div>
		</section>
	);
}

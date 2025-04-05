import Sarah from "@/assets/sarah-chen.png";
import Michael from "@/assets/michael.png";
import Jamie from "@/assets/jamie.png";
import Image from "next/image";

const testimonials = [
	{
		image: Sarah,
		name: "Dr. Sarah Chen",
		quote: "GrantFlow.AI has cut our grant preparation time by 40%, allowing our team to focus more on the research itself.",
		title: "Principal Investigator, Neuroscience",
	},
	{
		image: Michael,
		name: "Prof. Michael Rodriguez",
		quote: "The collaborative features have revolutionized how our lab approaches grant applications. Everyone can contribute efficiently.",
		title: "Department Chair, Bioengineering",
	},
	{
		image: Jamie,
		name: "Dr. James Wilson",
		quote: "The AI assistance helped us refine our proposal language and better align with funding requirements. We secured our NSF grant on the first try.",
		title: "Research Director, Climate Science",
	},
];

export function TestimonialsSection() {
	return (
		<section aria-labelledby="testimonials-section" className="relative w-full text-stone-800 bg-gray-100">
			<div className="flex flex-col pt-20 pb-4 px-30">
				<h2 className="font-heading text-4xl font-medium" id="testimonials-heading">
					What Researchers Say?
				</h2>
				<div className="grid grid-cols-3 place-items-center py-4 px-12 m-12">
					{testimonials.map((testimonial, i) => (
						<article className="flex flex-col items-center text-center w-3xs" key={i}>
							<Image
								alt={`${testimonial.name}'s photo`}
								className="rounded-full size-[8rem] mb-4"
								src={testimonial.image}
							/>
							<p className="font-medium leading-tight">
								{testimonial.name}
								<br />
								{testimonial.title}
							</p>
							<blockquote className="mt-6 text-sm">&quot;{testimonial.quote}&quot;</blockquote>
						</article>
					))}
					<article></article>
				</div>
			</div>
		</section>
	);
}

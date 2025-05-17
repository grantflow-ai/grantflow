import { render, screen } from "@testing-library/react";
import { TestimonialsSection } from "@/components/landing-page/testimonials-section";

vi.mock("next/image", () => ({
	default: vi.fn().mockImplementation(({ alt, className, src }) => (
		// Using img instead of Image to avoid cyclical reference issues in tests
		// eslint-disable-next-line @next/next/no-img-element
		<img alt={alt} className={className} data-testid="mock-next-image" src={src} />
	)),
}));

vi.mock("motion/react", () => {
	return {
		motion: {
			article: vi.fn().mockImplementation(({ children, className, variants, ...props }) => (
				<article
					className={className}
					data-testid="mock-motion-article"
					data-variants={variants ? JSON.stringify(Object.keys(variants)) : undefined}
					{...props}
				>
					{children}
				</article>
			)),
			blockquote: vi.fn().mockImplementation(({ children, className, variants, ...props }) => (
				<blockquote
					className={className}
					data-testid="mock-motion-blockquote"
					data-variants={variants ? JSON.stringify(Object.keys(variants)) : undefined}
					{...props}
				>
					{children}
				</blockquote>
			)),
		},
	};
});

vi.mock("./scroll-fade-element", () => ({
	ScrollFadeElement: vi.fn().mockImplementation(({ children, className, delay }) => (
		<div className={className} data-delay={delay} data-testid="mock-scroll-fade-element">
			{children}
		</div>
	)),
}));

describe("TestimonialsSection", () => {
	it("renders section with correct structure and attributes", () => {
		const { container } = render(<TestimonialsSection />);

		const section = container.querySelector("section");
		expect(section).toBeInTheDocument();
		expect(section).toHaveAttribute("aria-labelledby", "testimonials-section");
		expect(section).toHaveClass("relative w-full text-stone-800 bg-gray-100");

		const mainContainer = section?.querySelector("div");
		expect(mainContainer).toBeInTheDocument();
		expect(mainContainer).toHaveClass("flex flex-col");
	});

	it("renders heading and subtitle with ScrollFadeElement", () => {
		render(<TestimonialsSection />);

		const [headingElement, subtitleElement] = screen.getAllByTestId("mock-scroll-fade-element");

		expect(headingElement).toHaveClass("w-full mx-auto");
		expect(headingElement).not.toHaveAttribute("data-delay");

		const heading = headingElement.querySelector("h2");
		expect(heading).toBeInTheDocument();
		expect(heading).toHaveTextContent("Why Researchers Join GrantFlow.ai?");
		expect(heading).toHaveAttribute("id", "testimonials-heading");
		expect(heading).toHaveClass("font-heading text-3xl md:text-4xl font-medium");

		expect(subtitleElement).toHaveClass("w-full mx-auto");
		expect(subtitleElement).toHaveAttribute("data-delay", "0.1");

		const subtitle = subtitleElement.querySelector("p");
		expect(subtitle).toBeInTheDocument();
		expect(subtitle).toHaveTextContent("Inspired by real research challenges");
		expect(subtitle).toHaveClass("mx-1 text-xl md:text-lg lg:text-base");
	});

	it("renders testimonials grid with correct structure", () => {
		const { container } = render(<TestimonialsSection />);

		const grid = container.querySelector(".grid");
		expect(grid).toBeInTheDocument();
		expect(grid).toHaveClass(
			"grid grid-cols-1 lg:grid-cols-3 place-items-center lg:place-items-start gap-12 md:gap-8 lg:gap-0 mt-8 xl:m-16",
		);

		const testimonialArticles = screen.getAllByTestId("mock-motion-article");
		expect(testimonialArticles.length).toBe(3);
	});

	it("renders each testimonial with correct content and animation setup", () => {
		render(<TestimonialsSection />);

		const testimonialArticles = screen.getAllByTestId("mock-motion-article");

		const expectedQuotes = [
			'"Balancing research, publishing, and endless grant writing pulls us in too many directions. A tool like GrantFlow.ai could finally give researchers the time to lead, not just apply."',
			'"Managing collaborators, timelines, and documents across institutions is a constant challenge. A structured platform like GrantFlow is exactly what our field needs."',
			'"Writing grant proposals from scratch, again and again, isn’t sustainable. The idea of AI support tailored to researchers is long overdue and incredibly promising."',
		];

		testimonialArticles.forEach((article, index) => {
			expect(article).toHaveClass("flex flex-col items-center text-center w-sm lg:w-2xs xl:w-xs h-full");
			expect(article).toHaveAttribute("data-variants", '["hidden","visible"]');

			const image = article.querySelector("img");
			expect(image).toBeInTheDocument();
			expect(image).toHaveAttribute("data-testid", "mock-next-image");
			expect(image).toHaveClass("rounded-full size-24 md:size-28 lg:size-32 xl:size-36");

			const blockquote = article.querySelector("blockquote");
			expect(blockquote).toBeInTheDocument();
			expect(blockquote).toHaveAttribute("data-testid", "mock-motion-blockquote");
			expect(blockquote).toHaveClass("mt-6 font-semibold leading-tight text-xl md:text-lg lg:text-base");
			expect(blockquote).toHaveAttribute("data-variants", '["hidden","visible"]');
			expect(blockquote).toHaveTextContent(expectedQuotes[index]);
		});
	});

	it("applies animation configuration to testimonial components", () => {
		render(<TestimonialsSection />);

		const testimonialArticles = screen.getAllByTestId("mock-motion-article");

		testimonialArticles.forEach((article) => {
			expect(article).toHaveAttribute("data-variants");
			expect(article).toHaveAttribute("initial", "hidden");
			expect(article).toHaveAttribute("whileInView", "visible");

			expect(article.hasAttribute("viewport")).toBe(true);
		});

		const blockquotes = screen.getAllByTestId("mock-motion-blockquote");

		blockquotes.forEach((blockquote) => {
			expect(blockquote).toHaveAttribute("data-variants", '["hidden","visible"]');
		});
	});
});

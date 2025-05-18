import { render, screen } from "@testing-library/react";
import { TestimonialsSection } from "@/components/landing-page/testimonials-section";

vi.mock("@/components/landing-page/motion-components", () => ({
	MotionArticle: vi.fn().mockImplementation(({ children, className, variants, ...props }) => (
		<article
			className={className}
			data-testid="mock-motion-article"
			data-variants={variants ? JSON.stringify(Object.keys(variants)) : undefined}
			{...props}
		>
			{children}
		</article>
	)),
	MotionBlockquote: vi.fn().mockImplementation(({ children, className, variants, ...props }) => (
		<blockquote
			className={className}
			data-testid="mock-motion-blockquote"
			data-variants={variants ? JSON.stringify(Object.keys(variants)) : undefined}
			{...props}
		>
			{children}
		</blockquote>
	)),
	MotionImage: vi.fn().mockImplementation(({ alt, className, height, src, variants, width, ...props }) => (
		<div
			aria-label={alt ?? "Image"}
			className={className}
			data-alt={alt}
			data-height={height}
			data-src={src}
			data-testid="mock-motion-image"
			data-variants={variants ? JSON.stringify(Object.keys(variants)) : undefined}
			data-width={width}
			role="img"
			style={{
				height: height ? `${height}px` : "auto",
				width: width ? `${width}px` : "auto",
			}}
			{...props}
		/>
	)),
}));

vi.mock("@/components/landing-page/scroll-fade-element", () => ({
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
		expect(heading).toHaveAttribute("id", "testimonials-heading");
		expect(heading).toHaveClass("font-heading text-3xl md:text-4xl font-medium");

		expect(subtitleElement).toHaveClass("w-full mx-auto");
		expect(subtitleElement).toHaveAttribute("data-delay", "0.1");

		const subtitle = subtitleElement.querySelector("p");
		expect(subtitle).toBeInTheDocument();
		expect(subtitle).toHaveClass("mx-1 text-xl md:text-lg lg:text-base");
	});

	it("renders testimonials grid with correct structure", () => {
		const { container } = render(<TestimonialsSection />);

		const grid = container.querySelector(".grid");
		expect(grid).toBeInTheDocument();

		const testimonialArticles = screen.getAllByTestId("mock-motion-article");
		expect(testimonialArticles.length).toBe(3);
	});

	it("renders each testimonial with correct content and animation setup", () => {
		render(<TestimonialsSection />);

		const testimonialArticles = screen.getAllByTestId("mock-motion-article");

		testimonialArticles.forEach((article) => {
			expect(article).toHaveClass("flex flex-col items-center text-center w-sm lg:w-2xs xl:w-xs h-full");
			expect(article).toHaveAttribute("data-variants", '["hidden","visible"]');

			const blockquote = article.querySelector("blockquote");
			expect(blockquote).toBeInTheDocument();
			expect(blockquote).toHaveAttribute("data-testid", "mock-motion-blockquote");
			expect(blockquote).toHaveClass("mt-6 font-semibold leading-tight text-xl md:text-lg lg:text-base");
			expect(blockquote).toHaveAttribute("data-variants", '["hidden","visible"]');
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

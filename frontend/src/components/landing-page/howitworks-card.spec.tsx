import { render, screen } from "@testing-library/react";

import { HowItWorksCard } from "@/components/landing-page/howitworks-card";

vi.mock("motion/react", () => {
	return {
		motion: {
			div: vi.fn().mockImplementation(({ children, className, variants, ...props }) => (
				<div
					className={className}
					data-variants={variants ? JSON.stringify(Object.keys(variants)) : undefined}
					{...props}
				>
					{children}
				</div>
			)),
			h2: vi.fn().mockImplementation(({ children, className, variants, ...props }) => (
				<h2
					className={className}
					data-variants={variants ? JSON.stringify(Object.keys(variants)) : undefined}
					{...props}
				>
					{children}
				</h2>
			)),
			p: vi.fn().mockImplementation(({ children, className, variants, ...props }) => (
				<p
					className={className}
					data-variants={variants ? JSON.stringify(Object.keys(variants)) : undefined}
					{...props}
				>
					{children}
				</p>
			)),
		},
	};
});

vi.mock("@/lib/utils", () => ({
	cn: (...inputs: any[]) => inputs.filter(Boolean).join(" "),
}));

describe("HowItWorksCard", () => {
	const defaultProps = {
		className: "custom-class",
		headerStyle: "text-blue-500 text-3xl",
		heading: "Test Heading",
		steps: {
			step1: "Step 1 Content",
			step2: "Step 2 Content",
			step3: "Step 3 Content",
			step4: "Step 4 Content",
		},
	};

	it("renders the card with correct structure and props", () => {
		const { container } = render(<HowItWorksCard {...defaultProps} />);

		const mainContainer = container.firstChild;
		expect(mainContainer).toHaveAttribute("data-variants", '["hidden","visible"]');

		const heading = container.querySelector("h2");
		expect(heading).toBeInTheDocument();
		expect(heading).toHaveAttribute("data-variants", '["hidden","visible"]');

		const timelineContainer = container.querySelector(".grid");
		expect(timelineContainer).toBeInTheDocument();
		expect(timelineContainer).toHaveClass(
			"relative my-8 grid w-full grid-cols-1 gap-y-12 p-2 md:grid-cols-4 md:gap-x-20",
		);

		const verticalTimeline = container.querySelector(".md\\:hidden");
		expect(verticalTimeline).toBeInTheDocument();
		expect(verticalTimeline).toHaveClass(
			"md:hidden border-background/15 h-7/8 absolute bottom-0 left-5 top-4 z-0 border-l-2 border-dashed",
		);

		const horizontalTimeline = container.querySelector(".md\\:block");
		expect(horizontalTimeline).toBeInTheDocument();
		expect(horizontalTimeline).toHaveClass(
			"absolute right-0 z-0 hidden top-5 border-background/15 h-[0.15rem] border-t-2 border-dashed md:block md:left-18 md:w-[calc(100%-9.5rem)] lg:left-25 lg:w-[calc(100%-12.5rem)] xl:left-29 xl:w-[calc(100%-15rem)]",
		);
		expect(horizontalTimeline).toHaveAttribute("data-variants", '["hidden","visible"]');
	});

	it("renders all step components with correct content", () => {
		render(<HowItWorksCard {...defaultProps} />);

		const stepContents = ["Step 1 Content", "Step 2 Content", "Step 3 Content", "Step 4 Content"];

		stepContents.forEach((content) => {
			const stepText = screen.getByText(content);
			expect(stepText).toBeInTheDocument();
			expect(stepText).toHaveAttribute("data-variants", '["hidden","visible"]');
		});
	});

	it("renders step indicators for each step", () => {
		const { container } = render(<HowItWorksCard {...defaultProps} />);

		const stepIndicators = container.querySelectorAll(".rounded-full.border-2");
		expect(stepIndicators.length).toBe(4);

		stepIndicators.forEach((indicator) => {
			const innerCircle = indicator.querySelector(".bg-background.size-5.rounded-full");
			expect(innerCircle).toBeInTheDocument();
		});
	});

	it("applies custom className properly", () => {
		const customProps = {
			...defaultProps,
			className: "test-custom-class bg-red-500",
		};

		const { container } = render(<HowItWorksCard {...customProps} />);

		const mainContainer = container.firstChild;
		expect(mainContainer).toHaveClass("test-custom-class bg-red-500");
	});

	it("applies custom headerStyle properly", () => {
		const customProps = {
			...defaultProps,
			headerStyle: "text-red-500 text-4xl",
		};

		const { container } = render(<HowItWorksCard {...customProps} />);

		const heading = container.querySelector("h2");
		expect(heading).toHaveClass("text-red-500 text-4xl");
	});
});

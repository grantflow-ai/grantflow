import { render, screen } from "@testing-library/react";
import { BenefitsSection } from "@/components/landing-page/benefits-section";

vi.mock("./backgrounds", () => ({
	PatternedBackground: vi
		.fn()
		.mockImplementation(({ className, ...props }) => (
			<div className={className} data-testid="mock-patterned-background" {...props}></div>
		)),
}));

vi.mock("./scroll-fade-element", () => ({
	ScrollFadeElement: vi.fn().mockImplementation(({ children, className, delay }) => (
		<div className={className} data-delay={delay} data-testid="mock-scroll-fade-element">
			{children}
		</div>
	)),
}));

vi.mock("./scale-element", () => ({
	ScaleElement: vi.fn().mockImplementation(({ children, delay }) => (
		<div data-delay={delay} data-testid="mock-scale-element">
			{children}
		</div>
	)),
}));

vi.mock("./howitworks-card", () => ({
	HowItWorksCard: vi
		.fn()
		.mockImplementation(({ className, headerStyle, heading, steps }) => (
			<div
				className={className}
				data-header-style={headerStyle}
				data-heading={heading}
				data-steps={JSON.stringify(steps)}
				data-testid="mock-howitworks-card"
			></div>
		)),
}));

vi.mock("@/components/landing-page/icons", () => ({
	IconBenefitFirst: vi
		.fn()
		.mockImplementation(({ className }) => <svg className={className} data-testid="mock-icon-benefit-first"></svg>),
	IconBenefitSecond: vi
		.fn()
		.mockImplementation(({ className }) => (
			<svg className={className} data-testid="mock-icon-benefit-second"></svg>
		)),
}));

vi.mock("@/lib/utils", () => ({
	cn: (...inputs: any[]) => inputs.filter(Boolean).join(" "),
}));

describe("BenefitsSection", () => {
	it("renders the section with correct structure", () => {
		const { container } = render(<BenefitsSection />);

		const section = container.querySelector("section");
		expect(section).toBeInTheDocument();
		expect(section).toHaveAttribute("aria-labelledby", "benefits-section");
		expect(section).toHaveClass("relative w-full overflow-hidden bg-white");

		const background = screen.getByTestId("mock-patterned-background");
		expect(background).toBeInTheDocument();
		expect(background).toHaveClass("absolute size-full object-cover object-center");
		expect(background).toHaveAttribute("aria-hidden", "true");

		const contentContainer = container.querySelector(".relative.z-10.flex.flex-col");
		expect(contentContainer).toBeInTheDocument();
	});

	it("renders heading and description with ScrollFadeElement", () => {
		render(<BenefitsSection />);

		const scrollFadeElements = screen.getAllByTestId("mock-scroll-fade-element");
		expect(scrollFadeElements.length).toBe(2);

		const [headingElement, descriptionElement] = scrollFadeElements;

		expect(headingElement).toHaveClass("mx-auto");
		expect(headingElement).not.toHaveAttribute("data-delay");

		const heading = headingElement.querySelector("h2");
		expect(heading).toBeInTheDocument();
		expect(heading).toHaveClass("font-heading font-medium text-stone-800 text-3xl md:text-4xl");
		expect(heading).toHaveTextContent("Simplify Grant Applications with AI-Powered tools");
		expect(heading).toHaveAttribute("id", "benefits-heading");

		expect(descriptionElement).toHaveClass("mx-auto");
		expect(descriptionElement).toHaveAttribute("data-delay", "0.1");

		const description = descriptionElement.querySelector("p");
		expect(description).toBeInTheDocument();
		expect(description).toHaveAttribute("id", "benefits-description");
	});

	it("renders benefits cards with ScaleElement", () => {
		render(<BenefitsSection />);

		const scaleElements = screen.getAllByTestId("mock-scale-element");
		expect(scaleElements.length).toBe(2);

		expect(scaleElements[0]).toHaveAttribute("data-delay", "0");
		const firstBenefitCard = scaleElements[0].querySelector("article");
		expect(firstBenefitCard).toBeInTheDocument();
		expect(firstBenefitCard).toHaveClass(
			"size-full text-stone-800 py-7 px-6 md:px-5 bg-stone-50/60 border-2 border-primary/70 rounded",
		);

		const firstBadge = firstBenefitCard?.querySelector(".inline-flex");
		expect(firstBadge).toBeInTheDocument();
		expect(firstBadge?.querySelector("svg")).toHaveAttribute("data-testid", "mock-icon-benefit-first");
		expect(firstBadge?.querySelector("span")).toHaveTextContent("Save time!");

		expect(firstBenefitCard?.querySelector("h3")).toHaveTextContent(
			"More Time on Grant Writing, Less on Research?",
		);
		expect(firstBenefitCard?.querySelector("p")).toHaveTextContent(/As a PI, you're balancing lab leadership/);

		expect(scaleElements[1]).toHaveAttribute("data-delay", "0.2");
		const secondBenefitCard = scaleElements[1].querySelector("article");
		expect(secondBenefitCard).toBeInTheDocument();

		const secondBadge = secondBenefitCard?.querySelector(".inline-flex");
		expect(secondBadge).toBeInTheDocument();
		expect(secondBadge?.querySelector("svg")).toHaveAttribute("data-testid", "mock-icon-benefit-second");
		expect(secondBadge?.querySelector("span")).toHaveTextContent("Collaborate smarter!");

		expect(secondBenefitCard?.querySelector("h3")).toHaveTextContent("One Place for Your Entire Grant Team");
		expect(secondBenefitCard?.querySelector("p")).toHaveTextContent(/Coordinating with students, administrators/);
	});

	it("renders the HowItWorksCard with correct props", () => {
		render(<BenefitsSection />);

		const howItWorksCard = screen.getByTestId("mock-howitworks-card");
		expect(howItWorksCard).toBeInTheDocument();

		expect(howItWorksCard).toHaveClass(
			"col-span-1 md:col-span-2 bg-stone-50/60 border-2 border-primary/70 rounded",
		);

		expect(howItWorksCard).toHaveAttribute(
			"data-header-style",
			"font-heading font-medium text-stone-800 text-3xl md:text-4xl",
		);
		expect(howItWorksCard).toHaveAttribute("data-heading", "How It Works?");

		const stepsData = JSON.parse(howItWorksCard.dataset.steps ?? "{}");
		expect(stepsData).toEqual({
			step1: "Describe Your Research",
			step2: "Upload Your Research Database",
			step3: "Invite Your Colleagues to Work With You",
			step4: "Generate Your Proposal with AI",
		});
	});

	it("renders the benefits grid with correct structure", () => {
		const { container } = render(<BenefitsSection />);

		const grid = container.querySelector(".my-8.grid.w-full");
		expect(grid).toBeInTheDocument();
		expect(grid).toHaveClass(
			"my-8 grid w-full grid-cols-1 items-start gap-y-8 text-start md:grid-cols-2 md:gap-x-10",
		);

		expect(screen.getAllByTestId("mock-scale-element").length).toBe(2);
		expect(screen.getAllByTestId("mock-howitworks-card").length).toBe(1);
	});
});

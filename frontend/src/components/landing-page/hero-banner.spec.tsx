import { render, screen } from "@testing-library/react";

import { HeroBanner } from "@/components/landing-page/hero-banner";

vi.mock("./backgrounds-animated", () => ({
	AnimatedGradientBackground: vi
		.fn()
		.mockImplementation(({ className }) => (
			<div className={className} data-testid="mock-animated-gradient-background" />
		)),
}));

vi.mock("@/components/icons", () => ({
	IconGoAhead: vi.fn().mockImplementation(() => <svg data-testid="mock-icon-go-ahead" />),
}));

vi.mock("@/components/app-button", () => ({
	AppButton: vi.fn().mockImplementation(({ children, size, theme, variant }) => (
		<button data-size={size} data-testid="mock-app-button" data-theme={theme} data-variant={variant} type="button">
			{children}
		</button>
	)),
}));

describe("HeroBanner", () => {
	it("renders the component with the correct structure", () => {
		const { container } = render(<HeroBanner />);

		const section = container.querySelector("section");
		expect(section).toBeInTheDocument();

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toBeInTheDocument();
		expect(heading).toHaveTextContent("Where Research Meets Funding, Seamlessly.");

		const background = screen.getByTestId("mock-animated-gradient-background");
		expect(background).toBeInTheDocument();
		expect(background).toHaveClass("absolute inset-0 z-10");

		const heroPattern = container.querySelector('svg[aria-hidden="true"]');
		expect(heroPattern).toBeInTheDocument();
		expect(heroPattern).toHaveAttribute("aria-hidden", "true");

		const buttonsContainer = heading.parentElement?.querySelector(".mt-8.flex");
		expect(buttonsContainer).toBeInTheDocument();
	});

	it("renders both AppButtons with correct props and icons", () => {
		render(<HeroBanner />);

		const appButtons = screen.getAllByTestId("mock-app-button");
		expect(appButtons).toHaveLength(2);

		const [contactButton, startHereButton] = appButtons;

		expect(contactButton).toBeInTheDocument();
		expect(contactButton).toHaveTextContent("Contact us");
		expect(contactButton).toHaveAttribute("data-size", "lg");
		expect(contactButton).toHaveAttribute("data-theme", "light");
		expect(contactButton).toHaveAttribute("data-variant", "secondary");

		expect(startHereButton).toBeInTheDocument();
		expect(startHereButton).toHaveTextContent("Start here");
		expect(startHereButton).toHaveAttribute("data-size", "lg");
	});

	it("renders the hero pattern SVG with correct attributes", () => {
		const { container } = render(<HeroBanner />);

		const heroPattern = container.querySelector('svg[aria-hidden="true"]');
		expect(heroPattern).toBeInTheDocument();
		expect(heroPattern).toHaveClass("absolute bottom-0 right-0 z-20 h-4/5 w-[70%] md:h-[90%] md:w-auto lg:h-full");
	});
});

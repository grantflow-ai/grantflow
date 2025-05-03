import { render, screen } from "@testing-library/react";
import { HeroBanner } from "@/components/landing-page/hero-banner";

vi.mock("./backgrounds-animated", () => ({
	AnimatedGradientBackground: vi
		.fn()
		.mockImplementation(({ className }) => (
			<div className={className} data-testid="mock-animated-gradient-background"></div>
		)),
}));

vi.mock("./icons", () => ({
	IconGoAhead: vi.fn().mockImplementation(() => <svg data-testid="mock-icon-go-ahead" />),
}));

vi.mock("@/components/app-button", () => ({
	AppButton: vi.fn().mockImplementation(({ children, size, theme, variant }) => (
		<button data-size={size} data-testid="mock-app-button" data-theme={theme} data-variant={variant}>
			{children}
		</button>
	)),
}));

vi.mock("@/components/scroll-button", () => ({
	ScrollButton: vi.fn().mockImplementation(({ children, rightIcon, selector, size }) => (
		<button data-selector={selector} data-size={size} data-testid="mock-scroll-button">
			{children}
			{rightIcon && <span data-testid="right-icon-container">{rightIcon}</span>}
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

	it("renders the contact button with correct props", () => {
		render(<HeroBanner />);

		const contactButton = screen.getByTestId("mock-app-button");
		expect(contactButton).toBeInTheDocument();
		expect(contactButton).toHaveTextContent("Contact us");
		expect(contactButton).toHaveAttribute("data-size", "lg");
		expect(contactButton).toHaveAttribute("data-theme", "light");
		expect(contactButton).toHaveAttribute("data-variant", "secondary");
	});

	it("renders the try free button with correct props and icon", () => {
		render(<HeroBanner />);

		const tryFreeButton = screen.getByTestId("mock-scroll-button");
		expect(tryFreeButton).toBeInTheDocument();
		expect(tryFreeButton).toHaveTextContent("Try For Free");
		expect(tryFreeButton).toHaveAttribute("data-size", "lg");
		expect(tryFreeButton).toHaveAttribute("data-selector", "waitlist");

		const iconContainer = screen.getByTestId("right-icon-container");
		expect(iconContainer).toBeInTheDocument();

		const icon = screen.getByTestId("mock-icon-go-ahead");
		expect(icon).toBeInTheDocument();
	});

	it("renders the hero pattern SVG with correct attributes", () => {
		const { container } = render(<HeroBanner />);

		const heroPattern = container.querySelector('svg[aria-hidden="true"]');
		expect(heroPattern).toBeInTheDocument();
		expect(heroPattern).toHaveClass("absolute bottom-0 right-0 z-20 h-4/5 w-[70%] md:h-[90%] md:w-auto lg:h-full");
	});
});

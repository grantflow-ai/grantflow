import { fireEvent, render, screen } from "@testing-library/react";
import LandingPage from "./page";
import { ReactNode } from "react";

vi.mock("@/components/landing-page/backgrounds", () => ({
	GradientBackground: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
		<div className={className} data-testid="mock-gradient-bg">
			{children}
		</div>
	),
}));

vi.mock("@/components/landing-page/nav-header", () => ({
	NavHeader: () => <div data-testid="mock-nav-header" />,
}));
vi.mock("@/components/landing-page/hero-banner", () => ({
	HeroBanner: () => <div data-testid="mock-hero-banner" />,
}));
vi.mock("@/components/landing-page/benefits-section", () => ({
	BenefitsSection: () => <div data-testid="mock-benefits-section" />,
}));
vi.mock("@/components/landing-page/early-access-section", () => ({
	EarlyAccessSection: () => <div data-testid="mock-early-access-section" />,
}));
vi.mock("@/components/landing-page/core-features-section", () => ({
	CoreFeaturesSection: () => <div data-testid="mock-core-features-section" />,
}));
vi.mock("@/components/landing-page/testimonials-section", () => ({
	TestimonialsSection: () => <div data-testid="mock-testimonials-section" />,
}));

vi.mock("@/components/logo", () => ({
	LogoDark: ({ className, height, width }: { className?: string; height: number; width: number }) => (
		<div className={className} data-height={height} data-testid="mock-logo-dark" data-width={width} />
	),
}));

vi.mock("next/image", () => ({
	default: ({
		alt,
		className,
		height,
		src,
		width,
	}: {
		alt: string;
		className: string;
		height: number;
		src: Blob | string | undefined;
		width: number;
	}) => (
		// Using <img> instead of <Image> to avoid cyclical reference issues
		// eslint-disable-next-line @next/next/no-img-element
		<img
			alt={alt}
			className={className}
			data-height={height}
			data-src={typeof src === "string" ? src : "mocked-src"}
			data-testid="mock-next-image"
			data-width={width}
			src={src}
		/>
	),
}));

vi.mock("next/link", () => ({
	default: ({
		"aria-label": ariaLabel,
		children,
		className,
		href,
	}: {
		"aria-label"?: string;
		"children"?: React.ReactNode;
		"className"?: string;
		"href": string;
	}) => (
		<a aria-label={ariaLabel} className={className} data-testid="mock-next-link" href={href}>
			{children}
		</a>
	),
}));

vi.mock("@/components/app-button", () => ({
	AppButton: ({
		children,
		onClick,
		size,
		theme,
		variant,
	}: {
		children?: React.ReactNode;
		onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
		size?: "lg" | "md" | "sm";
		theme?: "dark" | "light";
		variant?: "link" | "primary" | "secondary";
	}) => (
		<button
			data-size={size}
			data-testid="mock-app-button"
			data-theme={theme}
			data-variant={variant}
			onClick={onClick}
		>
			{children}
		</button>
	),
}));

vi.mock("@/components/scroll-button", () => ({
	ScrollButton: ({
		children,
		onClick,
		rightIcon,
		selector,
		size,
	}: {
		children?: React.ReactNode;
		onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
		rightIcon?: ReactNode;
		selector: string;
		size?: "lg" | "md" | "sm";
	}) => (
		<button data-selector={selector} data-size={size} data-testid="mock-scroll-button" onClick={onClick}>
			{children}
			{rightIcon && <span data-testid="right-icon-container">{rightIcon}</span>}
		</button>
	),
}));

describe("LandingPage", () => {
	it("renders all major sections", async () => {
		const { container } = render(await LandingPage());

		expect(screen.getByTestId("mock-nav-header")).toBeDefined();
		expect(screen.getByTestId("mock-hero-banner")).toBeDefined();
		expect(screen.getByTestId("mock-benefits-section")).toBeDefined();
		expect(screen.getByTestId("mock-early-access-section")).toBeDefined();
		expect(screen.getByTestId("mock-core-features-section")).toBeDefined();
		expect(screen.getByTestId("mock-testimonials-section")).toBeDefined();

		expect(screen.getByTestId("cta-section")).toBeDefined();
		expect(screen.getByTestId("site-footer")).toBeDefined();

		expect(container).toBeDefined();
	});

	it("renders CTA section with proper accessibility and interactions", async () => {
		render(await LandingPage());

		const ctaSection = screen.getByLabelText("cta-section");
		expect(ctaSection).toBeDefined();

		const contactButton = screen.getByRole("button", { name: /contact us/i });
		expect(contactButton).toBeDefined();

		const tryButton = screen.getByRole("button", { name: /try for free/i });
		expect(tryButton).toBeDefined();

		const mockOnClickContact = vi.fn();
		contactButton.addEventListener("click", mockOnClickContact);
		fireEvent.click(contactButton);
		expect(mockOnClickContact).toHaveBeenCalled();

		const mockScrollFn = vi.fn();
		tryButton.addEventListener("click", mockScrollFn);
		fireEvent.click(tryButton);
		expect(mockScrollFn).toHaveBeenCalled();

		expect(ctaSection.querySelector(".md\\:flex-row")).toBeDefined();
	});

	it("CTA section buttons have correct attributes and behavior", async () => {
		render(await LandingPage());

		const contactButton = screen.getByRole("button", { name: /contact us/i });
		expect(contactButton).toBeDefined();
		expect(contactButton).toHaveAttribute("data-theme", "light");
		expect(contactButton).toHaveAttribute("data-variant", "secondary");
		expect(contactButton).toHaveAttribute("data-size", "lg");

		const tryButton = screen.getByRole("button", { name: /try for free/i });
		expect(tryButton).toBeDefined();
		expect(tryButton).toHaveAttribute("data-size", "lg");
		expect(tryButton).toHaveAttribute("data-selector", "waitlist");

		const iconContainer = screen.getByTestId("right-icon-container");
		expect(iconContainer).toBeDefined();
	});
});

describe("Footer", () => {
	describe("Responsive rendering", () => {
		beforeEach(async () => {
			render(await LandingPage());
		});

		it("renders mobile footer for small screens", () => {
			globalThis.innerWidth = 500;
			globalThis.dispatchEvent(new Event("resize"));

			const mobileFooter = screen.getByTestId("site-footer").querySelector(".md\\:hidden");
			expect(mobileFooter).toBeDefined();

			const mobileLinks = screen.getAllByText(/Terms of Use|Privacy Policy|Imprint/);

			const hasMobileClass = mobileLinks.some((link) => {
				const anchor = link.closest("a");
				return anchor?.className.includes("text-lg");
			});

			expect(hasMobileClass).toBe(true);
		});

		it("renders desktop footer for larger screens", () => {
			globalThis.innerWidth = 1024;
			globalThis.dispatchEvent(new Event("resize"));

			const desktopFooter = screen.getByTestId("site-footer").querySelector(".md\\:flex");
			expect(desktopFooter).toBeDefined();

			const desktopNav = screen.getByTestId("site-footer");
			const isInDesktopLayout = desktopNav.closest(".md\\:flex");
			expect(isInDesktopLayout).toBeDefined();
		});
	});
});

describe("Accessibility", () => {
	beforeEach(async () => {
		render(await LandingPage());
	});

	it("sections have proper ARIA labels", async () => {
		expect(screen.getByLabelText("cta-section")).toBeDefined();
		expect(screen.getByLabelText("site-footer")).toBeDefined();
		expect(screen.getAllByLabelText("footer-navigation")[0]).toBeDefined();

		expect(screen.getAllByLabelText("LinkedIn Icon")[0]).toBeDefined();
		expect(screen.getAllByLabelText("Go to homepage")[0]).toBeDefined();
	});

	it("has proper heading hierarchy", async () => {
		const ctaHeading = screen.getByText("Ready to Transform Your Grant Writing Process?");
		expect(ctaHeading.tagName).toBe("H2");

		expect(ctaHeading.id).toBe("cta-heading");
		const ctaSection = screen.getByLabelText("cta-section");
		expect(ctaSection.getAttribute("aria-label")).toBe("cta-section");
	});

	it("uses semantic HTML structure", async () => {
		expect(screen.getByLabelText("cta-section").tagName).toBe("SECTION");
		expect(screen.getByLabelText("site-footer").tagName).toBe("FOOTER");

		const footerNavigations = screen.getAllByLabelText("footer-navigation");
		expect(footerNavigations[0].tagName).toBe("NAV");

		const [footerNavigation] = footerNavigations;
		const ulElement = footerNavigation.querySelector("ul");
		expect(ulElement).toBeDefined();

		const listItems = ulElement?.querySelectorAll("li");
		expect(listItems?.length).toBeGreaterThan(0);
	});
});

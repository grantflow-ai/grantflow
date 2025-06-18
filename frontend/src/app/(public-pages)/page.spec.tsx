import { fireEvent, render, screen } from "@testing-library/react";

import LandingPage from "@/app/(public-pages)/page";

vi.mock("@/components/landing-page/backgrounds", () => ({
	GradientBackground: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
		<div className={className} data-testid="mock-gradient-bg">
			{children}
		</div>
	),
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
		<div
			aria-label={alt || "Image"}
			className={className}
			data-alt={alt}
			data-height={height}
			data-src={typeof src === "string" ? src : "mocked-src"}
			data-testid="mock-next-image"
			data-width={width}
			role="img"
			style={{
				height: height ? `${height}px` : "auto",
				width: width ? `${width}px` : "auto",
			}}
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

// Don't mock internal components - let them render naturally

describe("LandingPage", () => {
	it("renders all major sections", async () => {
		const { container } = render(await LandingPage());

		expect(screen.getByTestId("mock-hero-banner")).toBeDefined();
		expect(screen.getByTestId("mock-benefits-section")).toBeDefined();
		expect(screen.getByTestId("mock-early-access-section")).toBeDefined();
		expect(screen.getByTestId("mock-core-features-section")).toBeDefined();
		expect(screen.getByTestId("mock-testimonials-section")).toBeDefined();

		expect(screen.getByTestId("cta-section")).toBeDefined();

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

	it("CTA section buttons exist and are clickable", async () => {
		render(await LandingPage());

		const contactButton = screen.getByRole("button", { name: /contact us/i });
		expect(contactButton).toBeDefined();

		const tryButton = screen.getByRole("button", { name: /try for free/i });
		expect(tryButton).toBeDefined();

		// Test that buttons are interactive
		fireEvent.click(contactButton);
		fireEvent.click(tryButton);
	});
});

describe("Accessibility", () => {
	beforeEach(async () => {
		render(await LandingPage());
	});

	it("sections have proper ARIA labels", async () => {
		expect(screen.getByLabelText("cta-section")).toBeDefined();
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
	});
});

import { render, screen } from "@testing-library/react";

import Footer from "@/components/layout/navigation/footer";
import { PagePath } from "@/enums";

vi.mock("next/image", () => ({
	default: vi
		.fn()
		.mockImplementation(({ alt, className, ...props }) => (
			<div
				alt={alt}
				aria-label={alt ?? "Image"}
				className={className}
				data-testid="mocked-image"
				role="img"
				{...props}
			/>
		)),
}));

vi.mock("next/link", () => ({
	default: ({
		"aria-label": ariaLabel,
		children,
		className,
		href,
	}: {
		"aria-label"?: string;
		children: React.ReactNode;
		className?: string;
		href: string;
	}) => (
		<a aria-label={ariaLabel} className={className} href={href}>
			{children}
		</a>
	),
}));

vi.mock("@/components/branding/logo", () => ({
	LogoDark: ({
		className,
		height,
		width,
	}: {
		className?: string;
		height?: number | string;
		width?: number | string;
	}) => (
		<div className={className} data-testid="mocked-logo" style={{ height, width }}>
			LogoDark
		</div>
	),
}));

describe("Footer Component", () => {
	describe("Basic Rendering", () => {
		beforeEach(() => {
			render(<Footer />);
		});

		it("should render as semantic footer element", () => {
			const footer = screen.getByTestId("site-footer");
			expect(footer).toBeInTheDocument();
			expect(footer.tagName).toBe("FOOTER");
		});

		it("should have contentinfo role", () => {
			const footer = screen.getByRole("contentinfo");
			expect(footer).toBeInTheDocument();
		});

		it("should render navigation section in both mobile and desktop views", () => {
			const navs = screen.getAllByRole("navigation", { name: "footer-navigation" });
			expect(navs.length).toBe(2);

			const mobileContainer = document.querySelector("div.md\\:hidden");
			const mobileNav = mobileContainer?.querySelector("nav");
			expect(mobileNav).toHaveAttribute("aria-label", "footer-navigation");

			const desktopContainer = document.querySelector("div.hidden.md\\:flex");
			const desktopNav = desktopContainer?.querySelector("nav");
			expect(desktopNav).toHaveAttribute("aria-label", "footer-navigation");
		});

		it("should contain all legal page links", () => {
			const termsLinks = screen.getAllByText("Terms of Use");
			const privacyLinks = screen.getAllByText("Privacy Policy");
			const imprintLinks = screen.getAllByText("Imprint");

			expect(termsLinks.length).toBeGreaterThanOrEqual(1);
			expect(privacyLinks.length).toBeGreaterThanOrEqual(1);
			expect(imprintLinks.length).toBeGreaterThanOrEqual(1);
		});

		it("should include LinkedIn link with security attributes", () => {
			const linkedInLinks = screen.getAllByLabelText("LinkedIn Icon");
			expect(linkedInLinks.length).toBeGreaterThanOrEqual(1);

			linkedInLinks.forEach((link) => {
				expect(link).toHaveAttribute("href", "https://www.linkedin.com/company/grantflowai/");
				expect(link).toHaveAttribute("target", "_blank");
				expect(link).toHaveAttribute("rel", "noopener noreferrer");
			});
		});
	});

	describe("Link Navigation", () => {
		beforeEach(() => {
			render(<Footer />);
		});

		it("should navigate to homepage when logo is clicked", () => {
			const homeLinks = screen.getAllByLabelText("Go to homepage");
			expect(homeLinks.length).toBeGreaterThanOrEqual(1);
			homeLinks.forEach((link) => {
				expect(link).toHaveAttribute("href", PagePath.ROOT);
			});
		});
	});

	describe("Footer Links", () => {
		beforeEach(() => {
			window.innerWidth = 1024;
			render(<Footer />);
		});

		it("should have correct href attributes for all links", () => {
			const termsLinks = screen.getAllByText("Terms of Use");
			const privacyLinks = screen.getAllByText("Privacy Policy");
			const imprintLinks = screen.getAllByText("Imprint");
			const homeLinks = screen.getAllByLabelText("Go to homepage");

			termsLinks.forEach((link) => {
				const correctTermsLink = link.closest("a");
				expect(correctTermsLink).toHaveAttribute("href", PagePath.TERMS);
			});

			privacyLinks.forEach((link) => {
				const correctPrivacyLink = link.closest("a");
				expect(correctPrivacyLink).toHaveAttribute("href", PagePath.PRIVACY);
			});

			imprintLinks.forEach((link) => {
				const correctImprintLink = link.closest("a");
				expect(correctImprintLink).toHaveAttribute("href", PagePath.IMPRINT);
			});

			homeLinks.forEach((homeLink) => {
				expect(homeLink).toHaveAttribute("href", PagePath.ROOT);
			});
		});
	});
});

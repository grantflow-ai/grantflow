import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/footer";
import { PagePath } from "@/enums";

vi.mock("next/image", () => ({
	default: ({
		alt,
		className,
		height,
		src,
		width,
	}: {
		alt: string;
		className?: string;
		height?: number | string;
		src: Blob | string | undefined;
		width?: number | string;
	}) => (
		// Use of <img> instead of <Image> to prevent cyclical references issues while testing
		// eslint-disable-next-line @next/next/no-img-element
		<img alt={alt} className={className} data-testid="mocked-image" height={height} src={src} width={width} />
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
		"children": React.ReactNode;
		"className"?: string;
		"href": string;
	}) => (
		<a aria-label={ariaLabel} className={className} href={href}>
			{children}
		</a>
	),
}));

vi.mock("@/components/logo", () => ({
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
			window.innerWidth = 1024;
			render(<Footer />);
		});

		it("should render the footer element in both desktop and mobile views", () => {
			const footer = screen.getByTestId("site-footer");
			expect(footer).toBeInTheDocument();

			const mobileContainer = footer.querySelector("div.md\\:hidden");
			const desktopContainer = footer.querySelector("div.hidden.md\\:flex");

			expect(mobileContainer).toBeInTheDocument();
			expect(desktopContainer).toBeInTheDocument();
		});

		it("should have the correct ARIA label", () => {
			const footer = screen.getByRole("contentinfo", { name: "site-footer" });
			expect(footer).toBeInTheDocument();
		});

		it("should include the logo in both mobile and desktop views", () => {
			const logos = screen.getAllByTestId("mocked-logo");
			expect(logos.length).toBe(2);

			const mobileContainer = document.querySelector("div.md\\:hidden");
			const mobileLogo = mobileContainer?.querySelector('[data-testid="mocked-logo"]');
			expect(mobileLogo).toBeInTheDocument();

			const desktopContainer = document.querySelector("div.hidden.md\\:flex");
			const desktopLogo = desktopContainer?.querySelector('[data-testid="mocked-logo"]');
			expect(desktopLogo).toBeInTheDocument();
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

		it("should contain all three links to legal pages in both views", () => {
			const termsLinks = screen.getAllByText("Terms of Use");
			const privacyLinks = screen.getAllByText("Privacy Policy");
			const imprintLinks = screen.getAllByText("Imprint");

			expect(termsLinks.length).toBe(2);
			expect(privacyLinks.length).toBe(2);
			expect(imprintLinks.length).toBe(2);

			const mobileContainer = document.querySelector("div.md\\:hidden");
			expect(mobileContainer?.querySelector('a[href="/terms"]')).toBeInTheDocument();
			expect(mobileContainer?.querySelector('a[href="/privacy"]')).toBeInTheDocument();
			expect(mobileContainer?.querySelector('a[href="/imprint"]')).toBeInTheDocument();

			const desktopContainer = document.querySelector("div.hidden.md\\:flex");
			expect(desktopContainer?.querySelector('a[href="/terms"]')).toBeInTheDocument();
			expect(desktopContainer?.querySelector('a[href="/privacy"]')).toBeInTheDocument();
			expect(desktopContainer?.querySelector('a[href="/imprint"]')).toBeInTheDocument();
		});

		it("should include the LinkedIn link with correct attributes in both views", () => {
			const linkedInLinks = screen.getAllByLabelText("LinkedIn Icon");
			expect(linkedInLinks.length).toBe(2);

			linkedInLinks.forEach((link) => {
				expect(link).toHaveAttribute("href", "https://www.linkedin.com/company/grantflowai/");
				expect(link).toHaveAttribute("target", "_blank");
				expect(link).toHaveAttribute("rel", "noopener noreferrer");
			});

			const mobileContainer = document.querySelector("div.md\\:hidden");
			const mobileLinkedIn = mobileContainer?.querySelector('a[aria-label="LinkedIn Icon"]');
			expect(mobileLinkedIn).toBeInTheDocument();

			const desktopContainer = document.querySelector("div.hidden.md\\:flex");
			const desktopLinkedIn = desktopContainer?.querySelector('a[aria-label="LinkedIn Icon"]');
			expect(desktopLinkedIn).toBeInTheDocument();
		});

		it("should contain the LinkedIn icon image in both views", () => {
			const linkedInIcons = screen.getAllByAltText("LinkedIn");
			expect(linkedInIcons.length).toBe(2);

			const mobileContainer = document.querySelector("div.md\\:hidden");
			const mobileIcon = mobileContainer?.querySelector('img[alt="LinkedIn"]');
			expect(mobileIcon).toBeInTheDocument();

			const desktopContainer = document.querySelector("div.hidden.md\\:flex");
			const desktopIcon = desktopContainer?.querySelector('img[alt="LinkedIn"]');
			expect(desktopIcon).toBeInTheDocument();
		});
	});

	describe("Responsive Design", () => {
		it("should display desktop layout on large screens", () => {
			window.innerWidth = 1024;
			render(<Footer />);

			const desktopContainer = document.querySelector("div.hidden.md\\:flex");
			expect(desktopContainer).toBeInTheDocument();
		});

		it("should display mobile layout on small screens", () => {
			window.innerWidth = 400;
			globalThis.dispatchEvent(new Event("resize"));
			render(<Footer />);

			const mobileContainer = document.querySelector("div.md\\:hidden");
			expect(mobileContainer).toBeInTheDocument();
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

	describe("FooterLinks Component Props", () => {
		it("should apply mobile-specific styles when isMobile is true", () => {
			window.innerWidth = 400;
			render(<Footer />);

			const mobileContainer = document.querySelector("div.md\\:hidden");

			const mobileUl = mobileContainer?.querySelector("ul");
			expect(mobileUl).toHaveClass("flex-col");
			expect(mobileUl).toHaveClass("items-end");
		});
	});
});

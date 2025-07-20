import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach } from "vitest";

import { NavHeader } from "@/components/landing-page/nav-header";

vi.mock("next/link", () => {
	return {
		default: ({
			"aria-label": ariaLabel,
			children,
			href,
		}: {
			"aria-label"?: string;
			children: React.ReactNode;
			className?: string;
			href: string;
		}) => {
			return (
				<a aria-label={ariaLabel} href={href}>
					{children}
				</a>
			);
		},
	};
});

vi.mock("@/components/landing-page/icons", () => {
	return {
		IconCalendar: ({ className }: { className?: string }) => (
			<div className={className} data-testid="icon-calendar">
				Calendar Icon
			</div>
		),
		IconCancel: ({ className, height, width }: { className?: string; height: number; width: number }) => (
			<div className={className} data-height={height} data-testid="icon-cancel" data-width={width}>
				Cancel Icon
			</div>
		),
		IconHamburger: ({ className, height, width }: { className?: string; height: number; width: number }) => (
			<div className={className} data-height={height} data-testid="icon-hamburger" data-width={width}>
				Hamburger Icon
			</div>
		),
	};
});

vi.mock("@/components/branding/logo", () => {
	return {
		Logo: ({ className }: { className?: string }) => (
			<div className={className} data-testid="logo">
				Logo
			</div>
		),
		LogoDark: ({ className }: { className?: string }) => (
			<div className={className} data-testid="logo-dark">
				Logo Dark
			</div>
		),
	};
});

vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

afterEach(() => {
	cleanup();
});

describe.sequential("NavHeader Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Basic Rendering", () => {
		afterEach(() => {
			vi.clearAllMocks();
		});

		it("should render the header element", () => {
			const { container } = render(<NavHeader />);
			const header = container.querySelector('[data-testid="nav-header"]');
			expect(header).toBeInTheDocument();
		});

		it("should render mobile navigation buttons correctly", () => {
			const { container } = render(<NavHeader data-testid="nav-header-test-1" />);
			const mobileMenuButton = container.querySelector('[aria-label*="Navigation Menu"]')!;
			fireEvent.click(mobileMenuButton);

			const mobileMenu = container.querySelector('[data-testid="mobile-menu"]');
			expect(mobileMenu).toBeInTheDocument();

			const homeLinks = within(mobileMenu as HTMLElement).getAllByText("Home");
			expect(homeLinks.length).toBeGreaterThan(0);

			const aboutUsLinks = within(mobileMenu as HTMLElement).getAllByRole("button", {
				name: /go to about us page/i,
			});
			expect(aboutUsLinks.length).toBeGreaterThan(0);
		});

		it("should render mobile menu button", () => {
			const { container } = render(<NavHeader data-testid="nav-header-test-2" />);
			const mobileMenuButton = container.querySelector('[aria-label*="Navigation Menu"]');
			expect(mobileMenuButton).toBeInTheDocument();
		});
	});

	describe("NavHeader Semantic Structure", () => {
		it("should use proper header element as the root element", () => {
			const { container } = render(<NavHeader />);
			const header = container.querySelector('[data-testid="nav-header"]');
			expect(header?.tagName).toBe("HEADER");
		});

		it("should use proper semantic elements for links", () => {
			const { container } = render(<NavHeader data-testid="nav-header-semantic-test" />);
			const links = container.querySelectorAll("a");
			expect(links.length).toBeGreaterThan(0);

			const logoLinks = [...links].filter((link) => link.getAttribute("aria-label") === "Go to homepage");
			expect(logoLinks.length).toBe(1);
		});

		it("should use proper button elements for interactive controls", () => {
			const { container } = render(<NavHeader data-testid="nav-header-test-3" />);
			const buttons = container.querySelectorAll("button");
			expect(buttons.length).toBeGreaterThan(0);

			const mobileMenuButton = container.querySelector('[aria-label*="Navigation Menu"]');
			expect(mobileMenuButton).toBeInTheDocument();
		});

		it("should maintain proper heading hierarchy", () => {
			render(<NavHeader />);
			const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
			expect(headings.length).toBe(0);
		});

		it("should have proper landmark structure", () => {
			const { container } = render(<NavHeader data-testid="nav-header-landmark-test" />);
			const header = container.querySelector('[data-testid="nav-header"]');
			expect(header?.tagName).toBe("HEADER");

			const navSections = [...container.querySelectorAll(".items-center")];
			expect(navSections.length).toBeGreaterThan(0);
			navSections.forEach((section) => {
				expect(header?.contains(section)).toBe(true);
			});
		});
	});

	describe("NavHeader Props", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		describe("With closed mobile menu", () => {
			it("should have correct props for header container", () => {
				const { container } = render(<NavHeader />);
				const headerContainer = container.querySelector('[data-testid="nav-header-container"]');
				expect(headerContainer?.className).toContain("flex items-center justify-between");
			});

			it("should have correct props for mobile menu button when closed", () => {
				const { container } = render(<NavHeader data-testid="nav-header-test-4" />);
				const mobileMenuButton = container.querySelector('[aria-label="Open Navigation Menu"]')!;
				expect(mobileMenuButton.className).toContain("text-white");
				expect(mobileMenuButton.className).not.toContain("text-primary");
				expect(mobileMenuButton.className).toContain("md:hidden");
			});

			it("should have mobile menu container hidden", () => {
				const { container } = render(<NavHeader />);
				const mobileMenuContainer = container.querySelector('[data-testid="mobile-menu"]');
				expect(mobileMenuContainer?.className).toContain("max-h-sm pointer-events-none opacity-0");
			});
		});

		describe("With open mobile menu", () => {
			it("should have correct props for header element when menu is open", () => {
				const { container } = render(<NavHeader data-testid="nav-header-test-5" />);
				const mobileMenuButton = container.querySelector('[aria-label="Open Navigation Menu"]')!;
				fireEvent.click(mobileMenuButton);

				const header = container.querySelector('[data-testid="nav-header"]');
				expect(header?.className).toContain("bg-transparent");
			});

			it("should render mobile menu", () => {
				const { container } = render(<NavHeader data-testid="nav-header-test-6" />);
				const mobileMenuButton = container.querySelector('[aria-label="Open Navigation Menu"]')!;
				fireEvent.click(mobileMenuButton);

				const mobileMenuContainer = container.querySelector('[data-testid="mobile-menu"]');
				expect(mobileMenuContainer).toBeInTheDocument();
			});

			it("should have correct props for mobile menu button when open", () => {
				const { container } = render(<NavHeader data-testid="nav-header-test-7" />);
				const mobileMenuButton = container.querySelector('[aria-label="Open Navigation Menu"]')!;
				fireEvent.click(mobileMenuButton);

				const updatedButton = container.querySelector('[aria-label*="Navigation Menu"]')!;
				expect(updatedButton.className).toContain("text-primary");
				expect(updatedButton.className).not.toContain("text-white");

				const hamburgerIcon = container.querySelector('[data-testid="icon-hamburger"]');
				expect(hamburgerIcon?.className).toContain("rotate-90 scale-0 opacity-0");
				expect(hamburgerIcon?.className).not.toContain("rotate-0 scale-100 opacity-100");

				const cancelIcon = container.querySelector('[data-testid="icon-cancel"]');
				expect(cancelIcon?.className).toContain("rotate-0 scale-100 opacity-100");
				expect(cancelIcon?.className).not.toContain("rotate-90 scale-0 opacity-0");
			});
		});

		describe("NavHeader Accessibility", () => {
			beforeEach(() => {
				vi.clearAllMocks();
			});

			describe("Basic accessibility features", () => {
				it("should have proper focus management for interactive elements", () => {
					const { container } = render(<NavHeader data-testid="nav-header-test-8" />);
					const logoLinks = container.querySelectorAll('[aria-label="Go to homepage"]');
					expect(logoLinks.length).toBe(1);

					const desktopNav = container.querySelector(".hidden.items-center.gap-6.md\\:flex");
					const navLinks = desktopNav?.querySelectorAll("a, button");
					navLinks?.forEach((link) => {
						expect((link as HTMLElement).tabIndex).not.toBe(-1);
					});

					const mobileMenuButton = container.querySelector('[aria-label*="Navigation Menu"]')!;
					expect((mobileMenuButton as HTMLElement).tabIndex).not.toBe(-1);
				});
			});

			describe("Accessibility with closed mobile menu", () => {
				it("should have correct ARIA attributes for mobile menu button when closed", () => {
					const { container } = render(<NavHeader data-testid="nav-header-test-9" />);
					const mobileMenuButton = container.querySelector('[aria-label*="Navigation Menu"]')!;
					expect(mobileMenuButton).toHaveAttribute("aria-label", "Open Navigation Menu");
					expect(mobileMenuButton).not.toHaveAttribute("aria-expanded", "true");
				});

				it("should have mobile menu container properly hidden from screen readers", () => {
					const { container } = render(<NavHeader data-testid="nav-header-test-10" />);
					const mobileMenuContainer = container.querySelector('[data-testid="mobile-menu"]');
					expect(mobileMenuContainer?.className).toContain("opacity-0");
					expect(mobileMenuContainer?.getAttribute("aria-hidden")).toBe("true");
				});
			});

			describe("Accessibility with open mobile menu", () => {
				it("should have correct ARIA attributes for mobile menu button when open", () => {
					const { container } = render(<NavHeader data-testid="nav-header-test-11" />);
					const mobileMenuButton = container.querySelector('[aria-label="Open Navigation Menu"]')!;
					fireEvent.click(mobileMenuButton);

					const updatedButton = container.querySelector('[aria-label*="Navigation Menu"]')!;
					expect(updatedButton).toHaveAttribute("aria-label", "Close Navigation Menu");
				});

				it("should have mobile menu container properly visible to screen readers", () => {
					const { container } = render(<NavHeader data-testid="nav-header-test-12" />);
					const mobileMenuButton = container.querySelector('[aria-label="Open Navigation Menu"]')!;
					fireEvent.click(mobileMenuButton);

					const mobileMenuContainer = container.querySelector('[data-testid="mobile-menu"]');
					expect(mobileMenuContainer?.className).toContain("opacity-100");
					expect(mobileMenuContainer?.className).not.toContain("opacity-0");
					expect(mobileMenuContainer).toHaveAttribute("aria-hidden", "false");
				});

				it("should maintain keyboard navigation in open mobile menu", () => {
					const { container } = render(<NavHeader data-testid="nav-header-test-13" />);
					const mobileMenuButton = container.querySelector('[aria-label="Open Navigation Menu"]')!;
					fireEvent.click(mobileMenuButton);

					const mobileMenuContainer = container.querySelector(".absolute.inset-x-0.top-full.flex.flex-col");
					const mobileMenuLinks = mobileMenuContainer?.querySelectorAll("a, button");
					expect(mobileMenuLinks).toBeTruthy();
					expect(mobileMenuLinks?.length).toBeGreaterThan(0);
					mobileMenuLinks?.forEach((link) => {
						expect((link as HTMLElement).tabIndex).not.toBe(-1);
					});
				});
			});

			it("should maintain accessible navigation order", () => {
				const { container } = render(<NavHeader data-testid="nav-header-test-14" />);

				const header = container.querySelector('[data-testid="nav-header"]')!;
				const focusableElements = header.querySelectorAll(
					"a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])",
				);

				const [firstElement] = focusableElements;
				expect(firstElement).toHaveAttribute("aria-label", "Go to homepage");

				const mobileMenuButton = container.querySelector('[aria-label*="Navigation Menu"]')!;
				fireEvent.click(mobileMenuButton);

				const updatedFocusableElements = header.querySelectorAll(
					"a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])",
				);

				const [updatedFirstElement] = updatedFocusableElements;
				expect(updatedFirstElement).toHaveAttribute("aria-label", "Go to homepage");

				const menuButtonIndex = [...updatedFocusableElements].indexOf(mobileMenuButton);
				expect(menuButtonIndex).toBeGreaterThan(-1);
			});
		});

		describe("Responsive behavior", () => {
			const BREAKPOINT_MD = 768;
			const originalInnerWidth = window.innerWidth;

			afterEach(() => {
				Object.defineProperty(globalThis, "innerWidth", {
					configurable: true,
					value: originalInnerWidth,
					writable: true,
				});
				vi.clearAllMocks();
			});

			it("should show mobile menu button only on smaller screens", () => {
				const { container } = render(<NavHeader data-testid="nav-header-test-15" />);

				const mobileMenuButton = container.querySelector('[aria-label*="Navigation Menu"]')!;
				expect(mobileMenuButton.className).toContain("md:hidden");
			});

			it("should close mobile menu when resizing to desktop width", () => {
				Object.defineProperty(globalThis, "innerWidth", {
					configurable: true,
					value: BREAKPOINT_MD - 1,
					writable: true,
				});

				const { container } = render(<NavHeader data-testid="nav-header-test-16" />);

				const mobileMenuButton = container.querySelector('[aria-label*="Navigation Menu"]')!;
				fireEvent.click(mobileMenuButton);

				const mobileMenuContainer = container.querySelector('[data-testid="mobile-menu"]')!;
				expect(mobileMenuContainer.className).toContain("opacity-100");

				Object.defineProperty(globalThis, "innerWidth", {
					configurable: true,
					value: BREAKPOINT_MD + 1,
					writable: true,
				});

				fireEvent(globalThis as unknown as Window, new Event("resize"));

				expect(mobileMenuContainer.className).toContain("opacity-0");
			});

			it("should maintain correct visibility below and above breakpoint", () => {
				Object.defineProperty(globalThis, "innerWidth", {
					configurable: true,
					value: BREAKPOINT_MD - 1,
					writable: true,
				});

				const { container, rerender } = render(<NavHeader data-testid="nav-header-test-17" />);

				let mobileMenuButton = container.querySelector('[aria-label*="Navigation Menu"]')!;
				expect(globalThis.getComputedStyle(mobileMenuButton).display).not.toBe("none");

				Object.defineProperty(globalThis, "innerWidth", {
					configurable: true,
					value: BREAKPOINT_MD + 1,
					writable: true,
				});

				rerender(<NavHeader data-testid="nav-header-test-17" />);

				mobileMenuButton = container.querySelector('[aria-label*="Navigation Menu"]')!;
				expect(mobileMenuButton.className).toContain("md:hidden");
			});
		});
	});
});

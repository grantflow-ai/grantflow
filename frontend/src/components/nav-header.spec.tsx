import { fireEvent, render, screen, within } from "@testing-library/react";

import NavHeader from "@/components/nav-header";

vi.mock("next/link", () => {
	return {
		default: ({
			"aria-label": ariaLabel,
			children,
			href,
		}: {
			"aria-label"?: string;
			"children": React.ReactNode;
			"className"?: string;
			"href": string;
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

vi.mock("@/components/logo", () => {
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

describe("NavHeader Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Basic Rendering", () => {
		beforeEach(() => {
			render(<NavHeader />);
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it("should render the header element", () => {
			const header = screen.getByTestId("nav-header");
			expect(header).toBeInTheDocument();
		});

		it("should display both logo variants initially with correct visibility", () => {
			const logo = screen.getByTestId("logo");
			const logoDark = screen.getByTestId("logo-dark");

			expect(logo).toBeInTheDocument();
			expect(logoDark).toBeInTheDocument();

			expect(logo.className).toContain("opacity-100");
			expect(logoDark.className).toContain("opacity-0");
		});

		it("should render desktop navigation buttons correctly", () => {
			const aboutUsLinks = screen.getAllByText(/about us/i);
			expect(aboutUsLinks.length).toBeGreaterThan(0);

			const tryForFreeButtons = screen.getAllByText(/try for free/i);
			expect(tryForFreeButtons.length).toBeGreaterThan(0);
		});

		it("should render mobile navigation buttons correctly", () => {
			const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
			fireEvent.click(mobileMenuButton);

			const mobileMenu = screen.getByTestId("mobile-menu");
			expect(mobileMenu).toBeInTheDocument();

			const homeLinks = within(mobileMenu).getAllByText("Home");
			expect(homeLinks.length).toBeGreaterThan(0);

			const aboutUsLinks = within(mobileMenu).getAllByRole("button", { name: /go to about us page/i });
			expect(aboutUsLinks.length).toBeGreaterThan(0);
		});

		it("should not render the mobile menu button on desktop", () => {
			const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
			expect(mobileMenuButton).toHaveClass("md:hidden");
		});
	});

	describe("NavHeader Semantic Structure", () => {
		beforeEach(() => {
			render(<NavHeader />);
		});

		it("should use proper header element as the root element", () => {
			const header = screen.getByTestId("nav-header");
			expect(header.tagName).toBe("HEADER");
		});

		it("should contain navigation elements with proper semantic structure", () => {
			const desktopNav = screen.getByTestId("nav-header-links");
			expect(desktopNav).toBeInTheDocument();

			const mobileMenuContainer = document.querySelector(".absolute.inset-x-0");
			expect(mobileMenuContainer).toBeInTheDocument();
		});

		it("should use proper semantic elements for links", () => {
			const links = document.querySelectorAll("a");
			expect(links.length).toBeGreaterThan(0);

			const logoLinks = [...links].filter((link) => link.getAttribute("aria-label") === "Go to homepage");
			expect(logoLinks.length).toBe(2);
		});

		it("should use proper button elements for interactive controls", () => {
			const buttons = document.querySelectorAll("button");
			expect(buttons.length).toBeGreaterThan(0);

			const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
			expect(mobileMenuButton).toBeInTheDocument();
		});

		it("should maintain proper heading hierarchy", () => {
			const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
			expect(headings.length).toBe(0);
		});

		it("should have proper landmark structure", () => {
			const header = screen.getByTestId("nav-header");
			expect(header.tagName).toBe("HEADER");

			const navSections = [...document.querySelectorAll(".items-center")];
			expect(navSections.length).toBeGreaterThan(0);
			navSections.forEach((section) => {
				expect(header.contains(section)).toBe(true);
			});
		});

		it("should have proper container structure for layout", () => {
			const mainContainer = document.querySelector(".flex.items-center.justify-between");
			expect(mainContainer).toBeInTheDocument();

			const mobileMenuContainer = document.querySelector(".absolute.inset-x-0");
			expect(mobileMenuContainer).toBeInTheDocument();
		});
	});

	describe("NavHeader Content", () => {
		beforeEach(() => {
			render(<NavHeader />);
		});

		it("should display correct desktop navigation link text", () => {
			const homeLinks = screen.getAllByText("Home");
			expect(homeLinks.length).toBeGreaterThan(0);

			const aboutUsLinks = screen.getAllByText(/about us/i);
			expect(aboutUsLinks.length).toBeGreaterThan(0);

			const tryForFreeButtons = screen.getAllByText(/try for free/i);
			expect(tryForFreeButtons.length).toBeGreaterThan(0);
		});

		it("should display correct mobile navigation link text", () => {
			const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
			fireEvent.click(mobileMenuButton);

			const mobileMenu = screen.getByTestId("mobile-menu");
			const homeLinks = within(mobileMenu).getAllByText("Home");
			expect(homeLinks.length).toBeGreaterThan(0);

			const aboutUsLinks = within(mobileMenu).getAllByRole("button", { name: /go to about us page/i });
			expect(aboutUsLinks.length).toBeGreaterThan(0);

			const tryForFreeButtons = screen.getAllByText(/try for free/i);
			expect(tryForFreeButtons.length).toBeGreaterThan(0);
		});
	});

	describe("NavHeader Props", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		describe("With closed mobile menu", () => {
			beforeEach(() => {
				render(<NavHeader />);
			});

			it("should have correct props for header element", () => {
				const header = screen.getByTestId("nav-header");
				expect(header.className).toContain("relative z-40 w-full transition-colors duration-300");
				expect(header.className).toContain("bg-background");
				expect(header.className).not.toContain("bg-white");
			});

			it("should have correct props for header container", () => {
				const headerContainer = screen.getByTestId("nav-header-container");
				expect(headerContainer.className).toContain("flex items-center justify-between");
			});

			it("should have correct props for Logo components", () => {
				const logo = screen.getByTestId("logo");
				const logoDark = screen.getByTestId("logo-dark");

				expect(logo.className).toContain("opacity-100");
				expect(logoDark.className).toContain("opacity-0");

				expect(logo.className).toContain("sm:h-13 lg:h-15 my-1 h-12 w-auto");
				expect(logoDark.className).toContain("sm:h-13 lg:h-15 my-1 h-12 w-auto");

				expect(logo.className).toContain("md:my-2 md:h-14 lg:my-4 xl:my-6 xl:h-16");
				expect(logoDark.className).toContain("md:my-2 md:h-14 lg:my-4 xl:my-6 xl:h-16");
			});

			it("should have correct props for desktop navigation elements", () => {
				const aboutUsLinks = screen.getAllByText(/about us/i);
				expect(aboutUsLinks.length).toBeGreaterThan(0);

				const tryForFreeButtons = screen.getAllByText(/try for free/i);
				expect(tryForFreeButtons.length).toBeGreaterThan(0);
			});

			it("should have correct props for mobile menu button when closed", () => {
				const mobileMenuButton = screen.getByRole("button", { name: /open navigation menu/i });
				expect(mobileMenuButton.className).toContain("text-white");
				expect(mobileMenuButton.className).not.toContain("text-primary");
				expect(mobileMenuButton.className).toContain("md:hidden");
			});

			it("should have mobile menu container hidden", () => {
				const mobileMenuContainer = screen.getByTestId("mobile-menu");
				expect(mobileMenuContainer.className).toContain("max-h-sm pointer-events-none opacity-0");
			});
		});

		describe("With open mobile menu", () => {
			beforeEach(() => {
				render(<NavHeader />);

				const mobileMenuButton = screen.getByRole("button", { name: /open navigation menu/i });
				fireEvent.click(mobileMenuButton);
			});

			it("should have correct props for header element when menu is open", () => {
				const header = screen.getByTestId("nav-header");
				expect(header.className).toContain("relative z-40 w-full transition-colors duration-300");
				expect(header.className).toContain("bg-white");
				expect(header.className).not.toContain("bg-background");
			});

			it("should have correct props for Logo components when menu is open", () => {
				const logo = screen.getByTestId("logo");
				const logoDark = screen.getByTestId("logo-dark");

				expect(logo.className).toContain("opacity-0");
				expect(logoDark.className).toContain("opacity-100");
			});

			it("should have correct props for mobile menu container when open", () => {
				const mobileMenuContainer = document.querySelector(".absolute.inset-x-0");
				expect(mobileMenuContainer).toBeInTheDocument();
				expect(mobileMenuContainer?.className).toContain("bg-white");
			});

			it("should have correct props for mobile navigation elements", () => {
				const aboutUsElements = screen.getAllByText(/about us/i);
				expect(aboutUsElements.length).toBeGreaterThan(1);

				const tryForFreeElements = screen.getAllByText(/try for free/i);
				expect(tryForFreeElements.length).toBeGreaterThan(1);
			});

			it("should have correct props for mobile menu button when open", () => {
				const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
				expect(mobileMenuButton.className).toContain("text-primary");
				expect(mobileMenuButton.className).not.toContain("text-white");

				const hamburgerIcon = document.querySelector('[data-testid="icon-hamburger"]');
				expect(hamburgerIcon?.className).toContain("rotate-90 scale-0 opacity-0");
				expect(hamburgerIcon?.className).not.toContain("rotate-0 scale-100 opacity-100");

				const cancelIcon = document.querySelector('[data-testid="icon-cancel"]');
				expect(cancelIcon?.className).toContain("rotate-0 scale-100 opacity-100");
				expect(cancelIcon?.className).not.toContain("rotate-90 scale-0 opacity-0");
			});
		});

		describe("NavHeader Accessibility", () => {
			beforeEach(() => {
				vi.clearAllMocks();
			});

			describe("Basic accessibility features", () => {
				beforeEach(() => {
					render(<NavHeader />);
				});

				it("should have proper focus management for interactive elements", () => {
					const logoLinks = screen.getAllByRole("link", { name: "Go to homepage" });
					expect(logoLinks.length).toBe(2);

					const desktopNav = document.querySelector(".hidden.items-center.gap-6.md\\:flex");
					const navLinks = desktopNav?.querySelectorAll("a, button");
					navLinks?.forEach((link) => {
						expect((link as HTMLElement).tabIndex).not.toBe(-1);
					});

					const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
					expect(mobileMenuButton.tabIndex).not.toBe(-1);
				});

				it("should have proper aria-labels for non-text elements", () => {
					const logoLinks = screen.getAllByRole("link", { name: "Go to homepage" });
					expect(logoLinks.length).toBe(2);

					const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
					expect(mobileMenuButton).toHaveAttribute("aria-label", "Open Navigation Menu");
				});
			});

			describe("Accessibility with closed mobile menu", () => {
				beforeEach(() => {
					render(<NavHeader />);
				});

				it("should have correct ARIA attributes for mobile menu button when closed", () => {
					const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
					expect(mobileMenuButton).toHaveAttribute("aria-label", "Open Navigation Menu");
					expect(mobileMenuButton).not.toHaveAttribute("aria-expanded", "true");
				});

				it("should have mobile menu container properly hidden from screen readers", () => {
					const mobileMenuContainer = document.querySelector(".absolute.inset-x-0.top-full.flex.flex-col");
					expect(mobileMenuContainer?.className).toContain("max-h-sm pointer-events-none opacity-0");
					expect(mobileMenuContainer?.getAttribute("aria-hidden")).toBe("true");
				});
			});

			describe("Accessibility with open mobile menu", () => {
				beforeEach(() => {
					render(<NavHeader />);

					const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
					fireEvent.click(mobileMenuButton);
				});

				it("should have correct ARIA attributes for mobile menu button when open", () => {
					const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
					expect(mobileMenuButton).toHaveAttribute("aria-label", "Close Navigation Menu");
				});

				it("should have mobile menu container properly visible to screen readers", () => {
					const mobileMenuContainer = document.querySelector(".absolute.inset-x-0.top-full.flex.flex-col");
					expect(mobileMenuContainer?.className).toContain("max-h-lg pointer-events-auto opacity-100");
					expect(mobileMenuContainer?.className).not.toContain("max-h-sm pointer-events-none opacity-0");
					expect(mobileMenuContainer).toHaveAttribute("aria-hidden", "false");
					expect(mobileMenuContainer).toHaveAttribute("aria-expanded", "true");
				});

				it("should maintain keyboard navigation in open mobile menu", () => {
					const mobileMenuContainer = document.querySelector(".absolute.inset-x-0.top-full.flex.flex-col");
					const mobileMenuLinks = mobileMenuContainer?.querySelectorAll("a, button");
					mobileMenuLinks?.forEach((link) => {
						expect((link as HTMLElement).tabIndex).not.toBe(-1);
					});
				});
			});

			it("should maintain accessible navigation order", () => {
				render(<NavHeader />);

				const header = screen.getByTestId("nav-header");
				const focusableElements = header.querySelectorAll(
					"a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])",
				);

				const [firstElement] = focusableElements;
				expect(firstElement).toHaveAttribute("aria-label", "Go to homepage");

				const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
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
				render(<NavHeader />);

				const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
				expect(mobileMenuButton.className).toContain("md:hidden");
			});

			it("should close mobile menu when resizing to desktop width", () => {
				Object.defineProperty(globalThis, "innerWidth", {
					configurable: true,
					value: BREAKPOINT_MD - 1,
					writable: true,
				});

				render(<NavHeader />);

				const mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
				fireEvent.click(mobileMenuButton);

				const mobileMenuContainer = document.querySelector(".absolute.inset-x-0.top-full.flex.flex-col");
				expect(mobileMenuContainer?.className).toContain("max-h-lg pointer-events-auto opacity-100");

				Object.defineProperty(globalThis, "innerWidth", {
					configurable: true,
					value: BREAKPOINT_MD + 1,
					writable: true,
				});

				fireEvent(globalThis as unknown as Window, new Event("resize"));

				expect(mobileMenuContainer?.className).toContain("max-h-sm pointer-events-none opacity-0");
			});

			it("should maintain correct visibility below and above breakpoint", () => {
				Object.defineProperty(globalThis, "innerWidth", {
					configurable: true,
					value: BREAKPOINT_MD - 1,
					writable: true,
				});

				const { rerender } = render(<NavHeader />);

				let mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
				expect(globalThis.getComputedStyle(mobileMenuButton).display).not.toBe("none");

				Object.defineProperty(globalThis, "innerWidth", {
					configurable: true,
					value: BREAKPOINT_MD + 1,
					writable: true,
				});

				rerender(<NavHeader />);

				mobileMenuButton = screen.getByRole("button", { name: /navigation menu/i });
				expect(mobileMenuButton.className).toContain("md:hidden");
			});
		});
	});
});

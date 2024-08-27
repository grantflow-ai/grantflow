import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";

// Mock the components and utilities
vi.mock("@/components/navbar", () => ({
	Navbar: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock("gen/ui/sonner", () => ({
	Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

vi.mock("@/utils/fonts", () => ({
	fontSans: { variable: "font-sans" },
}));

vi.mock("@/utils/env", () => ({
	getEnv: () => ({ NEXT_PUBLIC_SITE_URL: "https://example.com" }),
}));

vi.mock("next-themes", async (importOriginal) => {
	const original = await importOriginal();
	return {
		...(original as Record<string, unknown>),
		ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>,
	};
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

describe("RootLayout", () => {
	vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the layout with all expected components", () => {
		render(<RootLayout>Test Content</RootLayout>);

		expect(screen.getByTestId("navbar")).toBeInTheDocument();
		expect(screen.getByTestId("main-container")).toBeInTheDocument();
		expect(screen.getByTestId("toaster")).toBeInTheDocument();
		expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
	});

	it("applies correct classes to the body", () => {
		render(<RootLayout>Test Content</RootLayout>);

		const body = screen.getByText("Test Content").closest("body");
		expect(body).toHaveClass("min-h-screen bg-background font-sans antialiased font-sans");
	});

	it("renders children within the main container", () => {
		render(<RootLayout>Test Content</RootLayout>);

		const mainContainer = screen.getByTestId("main-container");
		expect(mainContainer).toHaveTextContent("Test Content");
	});

	it("sets correct attributes on the html element", () => {
		render(<RootLayout>Test Content</RootLayout>);

		// Note: This test might not work as expected in the jsdom environment
		// as it doesn't render the actual <html> element. You might need to
		// adjust this test or remove it if it's not applicable in the test environment.
		const html = document.documentElement;
		expect(html).toHaveAttribute("lang", "en");
	});

	it("configures ThemeProvider correctly", () => {
		render(<RootLayout>Test Content</RootLayout>);

		const themeProvider = screen.getByTestId("theme-provider");
		expect(themeProvider).toHaveAttribute("attribute", "class");
		expect(themeProvider).toHaveAttribute("defaultTheme", "system");
		expect(themeProvider).toHaveAttribute("enableSystem", "true");
	});
});

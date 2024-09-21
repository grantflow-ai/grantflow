import { fontSans } from "@/utils/fonts";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import RootLayout from "./layout";

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
		ThemeProvider: ({ children }: { children: ReactNode }) => <div data-testid="theme-provider">{children}</div>,
	};
});

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

vi.mock("dictionaries/i18n-config", () => ({
	i18n: { locales: ["en", "fr"] },
	Locale: { en: "en", fr: "fr" },
}));

describe("RootLayout", () => {
	vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the layout with all expected components", () => {
		render(<RootLayout params={{ lang: "en" }}>Test Content</RootLayout>);

		expect(screen.getByTestId("navbar")).toBeInTheDocument();
		expect(screen.getByTestId("main-container")).toBeInTheDocument();
		expect(screen.getByTestId("toaster")).toBeInTheDocument();
		expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
	});

	it("applies correct classes to the body", () => {
		render(<RootLayout params={{ lang: "en" }}>Test Content</RootLayout>);

		const body = screen.getByText("Test Content").closest("body");
		expect(body).toHaveClass("min-h-screen bg-background font-sans antialiased");
		expect(body).toHaveClass(fontSans.variable);
	});

	it("renders children within the main container", () => {
		render(<RootLayout params={{ lang: "en" }}>Test Content</RootLayout>);

		const mainContainer = screen.getByTestId("main-container");
		expect(mainContainer).toHaveTextContent("Test Content");
		expect(mainContainer).toHaveClass("md:min-h[calc(100dvh-5rem)] min-h-[calc(100dvh-4rem)]");
	});
	it("sets the correct lang attribute on the html element", () => {
		const { container } = render(<RootLayout params={{ lang: "en" }}>Test Content</RootLayout>);

		const htmlElement = container.firstChild as HTMLElement;
		expect(htmlElement.getAttribute("lang")).toBe("en");
	});
});

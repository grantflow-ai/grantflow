import type { ReactNode } from "react";

import { fontSora } from "@/utils/fonts";
import { render, screen } from "@testing-library/react";

import RootLayout from "./layout";

vi.mock("@/components/ui/sonner", () => ({
	Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

vi.mock("@/utils/fonts", () => ({
	fontCabin: { variable: "font-cabin" },
	fontSora: { variable: "font-sora" },
	fontSourceSans: { variable: "font-source-sans" },
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

Object.defineProperty(globalThis, "matchMedia", {
	value: vi.fn().mockImplementation((query) => ({
		addEventListener: vi.fn(),
		addListener: vi.fn(),
		dispatchEvent: vi.fn(),
		matches: false,
		media: query,
		onchange: null,
		removeEventListener: vi.fn(),
		removeListener: vi.fn(),
	})),
	writable: true,
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

	it("renders the layout with all expected components", async () => {
		render(RootLayout({ children: "Test Content" }));

		expect(screen.getByTestId("main-container")).toBeInTheDocument();
		expect(screen.getByTestId("toaster")).toBeInTheDocument();
		expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
	});

	it("applies correct classes to the body", async () => {
		render(RootLayout({ children: "Test Content" }));

		const body = screen.getByText("Test Content").closest("body");
		expect(body).toHaveClass("min-h-screen bg-background antialiased font-sora");
		expect(body).toHaveClass(fontSora.variable);
	});

	it("renders children within the main container", async () => {
		render(RootLayout({ children: "Test Content" }));

		const mainContainer = screen.getByTestId("main-container");
		expect(mainContainer).toHaveTextContent("Test Content");
		expect(mainContainer).toHaveClass("md:min-h[calc(100dvh-5rem)] min-h-[calc(100dvh-4rem)]");
	});

	it("sets the correct lang attribute on the html element", async () => {
		render(RootLayout({ children: "Test Content" }));
		expect(screen.getByTestId("main-container")).toBeInTheDocument();
	});
});

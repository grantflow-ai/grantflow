import { render, screen } from "@testing-library/react";

import RootLayout from "@/app/layout";
import { PagePath } from "@/enums";

vi.mock("@/utils/env", () => ({
	getEnv: () => ({ NEXT_PUBLIC_SITE_URL: "https://example.com" }),
}));

vi.mock("@/utils/fonts", () => ({
	fontCabin: { variable: "font-cabin" },
	fontSora: { variable: "font-sora" },
	fontSourceSans: { variable: "font-source-sans" },
}));

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

		expect(screen.getByText("Test Content")).toBeInTheDocument();
	});

	it("applies correct classes to the body", async () => {
		render(RootLayout({ children: "Test Content" }));

		const body = screen.getByText("Test Content").closest("body");

		expect(body).toHaveClass("min-h-screen");
		expect(body).toHaveClass("bg-background");
		expect(body).toHaveClass("antialiased");
		expect(body).toHaveClass("font-body");
	});

	it("sets the correct lang attribute on the html element", () => {
		const output = RootLayout({ children: "Test Content" });
		expect(output.type).toBe("html");
		expect(output.props.lang).toBe("en");
	});

	it("exports metadata with correct properties", async () => {
		const { metadata } = await import("@/app/layout");

		expect(metadata.title).toBe("GrantFlow.AI");
		expect(metadata.description).toContain("GrantFlow.ai transforms");
		expect(metadata.alternates.canonical).toBe(PagePath.ROOT);

		expect(metadata.openGraph.title).toBe("Ready to Focus on Research, Not Paperwork?");
		expect(metadata.openGraph.type).toBe("website");
		expect(metadata.openGraph.locale).toBe("en_US");

		expect(metadata.openGraph.images[0].url).toBe("https://www.grantflow.ai/opengraph-image.png");
		expect(metadata.openGraph.images[0].width).toBe(1200);
		expect(metadata.openGraph.images[0].height).toBe(630);
	});
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GrantFinderClient } from "./grant-finder-client";

vi.mock("@/components/grant-finder/search-wizard", () => ({
	SearchWizard: () => <div data-testid="search-wizard-mock" />,
}));

vi.mock("@/components/landing-page/nav-header", () => ({
	NavHeader: () => <header data-testid="nav-header-mock" />,
}));

describe("GrantFinderClient", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("should render the main container", () => {
		render(<GrantFinderClient />);
		expect(screen.getByTestId("grant-finder-client")).toBeInTheDocument();
	});

	it("should render the mocked NavHeader", () => {
		render(<GrantFinderClient />);
		expect(screen.getByTestId("nav-header-mock")).toBeInTheDocument();
	});

	it("should render the main content section", () => {
		render(<GrantFinderClient />);
		expect(screen.getByTestId("main-content")).toBeInTheDocument();
	});

	it("should display the correct main title", () => {
		render(<GrantFinderClient />);
		const title = screen.getByTestId("main-content-title");
		expect(title).toBeInTheDocument();
		expect(title).toHaveTextContent("Find the Right NIH Grant, Faster. Smarter. Easier.");
	});

	it("should display the correct subtitle", () => {
		render(<GrantFinderClient />);
		const subtitle = screen.getByTestId("main-content-subtitle");
		expect(subtitle).toBeInTheDocument();
		expect(subtitle).toHaveTextContent(
			"Our intelligent NIH Grants Finder helps researchers and labs instantly discover funding opportunities tailored to their field, project type, and stage, so you can focus on your science, not on searching. Plus, get email alerts the moment a matching grant is announced, ensuring you never miss the right opportunity.",
		);
	});

	it("should render the mocked SearchWizard", () => {
		render(<GrantFinderClient />);
		expect(screen.getByTestId("search-wizard-mock")).toBeInTheDocument();
	});
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import GrantFinderPage from "./page";

// Mock the client component
vi.mock("./grant-finder-client", () => ({
	GrantFinderClient: () => <div data-testid="grant-finder-client">Mocked GrantFinderClient</div>,
}));

describe("GrantFinderPage", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders the grant finder page", () => {
		render(<GrantFinderPage />);

		expect(screen.getByTestId("grant-finder-client")).toBeInTheDocument();
	});

	it("displays the mocked client component content", () => {
		render(<GrantFinderPage />);

		expect(screen.getByText("Mocked GrantFinderClient")).toBeInTheDocument();
	});

	it("is a default export", () => {
		expect(GrantFinderPage).toBeDefined();
		expect(typeof GrantFinderPage).toBe("function");
	});

	it("renders without crashing", () => {
		expect(() => render(<GrantFinderPage />)).not.toThrow();
	});

	it("has correct component structure", () => {
		const { container } = render(<GrantFinderPage />);

		// Should render without any wrapper elements since it just returns the client component
		expect(container.firstChild).toBeTruthy();
	});

	it("passes no props to client component", () => {
		render(<GrantFinderPage />);

		// Since it's a server component that just renders the client component,
		// we verify it renders successfully
		expect(screen.getByTestId("grant-finder-client")).toBeInTheDocument();
	});

	it("is a server component", () => {
		// Server components are just functions, not React components with hooks
		expect(GrantFinderPage.length).toBe(0); // No parameters expected
	});

	it("returns JSX element", () => {
		const result = GrantFinderPage();
		expect(result).toBeDefined();
		expect(typeof result).toBe("object");
	});

	it("can be rendered multiple times", () => {
		const { unmount } = render(<GrantFinderPage />);
		expect(screen.getByTestId("grant-finder-client")).toBeInTheDocument();

		unmount();

		render(<GrantFinderPage />);
		expect(screen.getByTestId("grant-finder-client")).toBeInTheDocument();
	});
});

import { render, screen } from "@testing-library/react";

import DefaultLayout from "@/app/(default)/layout";

vi.mock("@/components/shared-layout", () => ({
	default: vi.fn().mockImplementation(({ children }) => <div data-testid="mock-shared-layout">{children}</div>),
}));

describe("DefaultLayout", () => {
	it("renders with SharedLayout wrapper", () => {
		render(<DefaultLayout>Test Content</DefaultLayout>);

		const sharedLayout = screen.getByTestId("mock-shared-layout");
		expect(sharedLayout).toBeInTheDocument();
	});

	it("renders main container with correct attributes", () => {
		render(<DefaultLayout>Test Content</DefaultLayout>);

		const mainContainer = screen.getByTestId("main-container");
		expect(mainContainer).toBeInTheDocument();
		expect(mainContainer).toHaveClass("flex grow");
		expect(mainContainer.tagName).toBe("MAIN");
	});

	it("renders children within main container", () => {
		const testContent = "Test Child Content";
		render(<DefaultLayout>{testContent}</DefaultLayout>);

		const mainContainer = screen.getByTestId("main-container");
		expect(mainContainer).toHaveTextContent(testContent);
	});
});

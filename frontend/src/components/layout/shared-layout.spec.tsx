import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";

import SharedLayout from "./shared-layout";

vi.mock("@/components/shared/toast-listener", () => ({
	ToastListener: () => <div data-testid="toast-listener" />,
}));

vi.mock("@/components/ui/sonner", () => ({
	Toaster: () => <div data-testid="toaster" />,
}));

vi.mock("@/providers/cookies-provider", () => ({
	CookiesProviderWrapper: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="cookies-provider">{children}</div>
	),
}));

afterEach(() => {
	cleanup();
});

describe.sequential("SharedLayout", () => {
	it("renders children within cookies provider", () => {
		render(
			<SharedLayout>
				<div data-testid="child-component">Test Content</div>
			</SharedLayout>,
		);

		expect(screen.getByTestId("cookies-provider")).toBeInTheDocument();
		expect(screen.getByTestId("child-component")).toBeInTheDocument();
		expect(screen.getByText("Test Content")).toBeInTheDocument();
	});

	it("includes toaster component", () => {
		render(
			<SharedLayout>
				<div>Content</div>
			</SharedLayout>,
		);

		expect(screen.getByTestId("toaster")).toBeInTheDocument();
	});

	it("includes toast listener in suspense", () => {
		render(
			<SharedLayout>
				<div>Content</div>
			</SharedLayout>,
		);

		expect(screen.getByTestId("toast-listener")).toBeInTheDocument();
	});

	it("renders multiple children", () => {
		render(
			<SharedLayout>
				<div data-testid="first-child">First</div>
				<div data-testid="second-child">Second</div>
				<span data-testid="third-child">Third</span>
			</SharedLayout>,
		);

		expect(screen.getByTestId("first-child")).toBeInTheDocument();
		expect(screen.getByTestId("second-child")).toBeInTheDocument();
		expect(screen.getByTestId("third-child")).toBeInTheDocument();
	});

	it("handles nested components", () => {
		render(
			<SharedLayout>
				<div data-testid="parent">
					<div data-testid="nested-child">Nested Content</div>
				</div>
			</SharedLayout>,
		);

		expect(screen.getByTestId("parent")).toBeInTheDocument();
		expect(screen.getByTestId("nested-child")).toBeInTheDocument();
		expect(screen.getByText("Nested Content")).toBeInTheDocument();
	});

	it("maintains component structure", () => {
		render(
			<SharedLayout>
				<div data-testid="content">Main Content</div>
			</SharedLayout>,
		);

		const container = screen.getByTestId("cookies-provider");
		const children = [...container.children];

		expect(children).toHaveLength(3);
		expect(screen.getByTestId("content")).toBeInTheDocument();
		expect(screen.getByTestId("toaster")).toBeInTheDocument();
		expect(screen.getByTestId("toast-listener")).toBeInTheDocument();
	});

	it("handles empty children", () => {
		render(<SharedLayout>{null}</SharedLayout>);

		expect(screen.getByTestId("cookies-provider")).toBeInTheDocument();
		expect(screen.getByTestId("toaster")).toBeInTheDocument();
		expect(screen.getByTestId("toast-listener")).toBeInTheDocument();
	});

	it("handles React fragments as children", () => {
		render(
			<SharedLayout>
				<div data-testid="fragment-child-1">Fragment 1</div>
				<div data-testid="fragment-child-2">Fragment 2</div>
			</SharedLayout>,
		);

		expect(screen.getByTestId("fragment-child-1")).toBeInTheDocument();
		expect(screen.getByTestId("fragment-child-2")).toBeInTheDocument();
	});
});

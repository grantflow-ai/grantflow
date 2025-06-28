import { render, screen } from "@testing-library/react";

import { SWRProvider } from "./swr-provider";

vi.mock("swr", () => ({
	SWRConfig: ({ children, value }: any) => (
		<div data-swr-config={JSON.stringify(value)} data-testid="swr-config">
			{children}
		</div>
	),
}));

describe("SWRProvider", () => {
	it("renders children within SWRConfig", () => {
		render(
			<SWRProvider>
				<div data-testid="child-component">Test Child</div>
			</SWRProvider>,
		);

		expect(screen.getByTestId("swr-config")).toBeInTheDocument();
		expect(screen.getByTestId("child-component")).toBeInTheDocument();
		expect(screen.getByText("Test Child")).toBeInTheDocument();
	});

	it("provides correct SWR configuration", () => {
		render(
			<SWRProvider>
				<div>Child</div>
			</SWRProvider>,
		);

		const swrConfig = screen.getByTestId("swr-config");
		const configData = JSON.parse(swrConfig.dataset.swrConfig ?? "{}");

		expect(configData).toEqual({
			dedupingInterval: 2000,
			errorRetryCount: 3,
			errorRetryInterval: 5000,
			refreshInterval: 0,
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
			shouldRetryOnError: true,
		});
	});

	it("renders multiple children", () => {
		render(
			<SWRProvider>
				<div data-testid="first-child">First</div>
				<div data-testid="second-child">Second</div>
				<span data-testid="third-child">Third</span>
			</SWRProvider>,
		);

		expect(screen.getByTestId("first-child")).toBeInTheDocument();
		expect(screen.getByTestId("second-child")).toBeInTheDocument();
		expect(screen.getByTestId("third-child")).toBeInTheDocument();
	});

	it("handles nested components", () => {
		render(
			<SWRProvider>
				<div data-testid="parent">
					<div data-testid="nested-child">Nested Content</div>
				</div>
			</SWRProvider>,
		);

		expect(screen.getByTestId("parent")).toBeInTheDocument();
		expect(screen.getByTestId("nested-child")).toBeInTheDocument();
		expect(screen.getByText("Nested Content")).toBeInTheDocument();
	});

	it("has stable configuration values", () => {
		const { rerender } = render(
			<SWRProvider>
				<div>Initial</div>
			</SWRProvider>,
		);

		const initialConfig = JSON.parse(screen.getByTestId("swr-config").dataset.swrConfig ?? "{}");

		rerender(
			<SWRProvider>
				<div>Updated</div>
			</SWRProvider>,
		);

		const updatedConfig = JSON.parse(screen.getByTestId("swr-config").dataset.swrConfig ?? "{}");

		expect(initialConfig).toEqual(updatedConfig);
	});
});
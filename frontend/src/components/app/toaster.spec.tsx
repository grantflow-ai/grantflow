import { render, screen } from "@testing-library/react";

import { AppToaster } from "./toaster";

vi.mock("next-themes", () => ({
	useTheme: () => ({
		setTheme: vi.fn(),
		theme: "light",
	}),
}));

vi.mock("sonner", () => ({
	Toaster: ({ closeButton, icons, offset, position, theme, ...props }: any) => (
		<div
			data-close-button={closeButton}
			data-offset={offset}
			data-position={position}
			data-testid="app-toaster"
			data-theme={theme}
			{...props}
		>
			<div data-testid="error-icon">{icons?.error}</div>
			<div data-testid="success-icon">{icons?.success}</div>
			<div data-testid="info-icon">{icons?.info}</div>
			<div data-testid="warning-icon">{icons?.warning}</div>
		</div>
	),
}));

describe("AppToaster", () => {
	it("renders the toaster component", () => {
		render(<AppToaster />);

		expect(screen.getByTestId("app-toaster")).toBeInTheDocument();
	});

	it("disables close button", () => {
		render(<AppToaster />);

		const toaster = screen.getByTestId("app-toaster");
		expect(toaster).toHaveAttribute("data-close-button", "false");
	});

	it("renders error icon", () => {
		render(<AppToaster />);

		const errorIcon = screen.getByTestId("error-icon").querySelector("img");
		expect(errorIcon).toHaveAttribute("alt", "Error");
		expect(errorIcon).toHaveAttribute("src", "/icons/icon-toast-error.svg");
	});

	it("renders success icon", () => {
		render(<AppToaster />);

		const successIcon = screen.getByTestId("success-icon").querySelector("img");
		expect(successIcon).toHaveAttribute("alt", "Success");
		expect(successIcon).toHaveAttribute("src", "/icons/icon-toast-success-white.svg");
	});

	it("renders info icon", () => {
		render(<AppToaster />);

		const infoIcon = screen.getByTestId("info-icon").querySelector("img");
		expect(infoIcon).toHaveAttribute("alt", "Info");
		expect(infoIcon).toHaveAttribute("src", "/icons/icon-toast-info.svg");
	});

	it("renders warning icon", () => {
		render(<AppToaster />);

		const warningIcon = screen.getByTestId("warning-icon").querySelector("img");
		expect(warningIcon).toHaveAttribute("alt", "Warning");
		expect(warningIcon).toHaveAttribute("src", "/icons/icon-toast-warning.svg");
	});

	it("positions toasts at bottom-center with correct offset", () => {
		render(<AppToaster />);

		const toaster = screen.getByTestId("app-toaster");
		expect(toaster).toHaveAttribute("data-position", "bottom-center");
		expect(toaster).toHaveAttribute("data-offset", "24");
	});

	it("applies correct theme", () => {
		render(<AppToaster />);

		const toaster = screen.getByTestId("app-toaster");
		expect(toaster).toHaveAttribute("data-theme", "light");
	});
});

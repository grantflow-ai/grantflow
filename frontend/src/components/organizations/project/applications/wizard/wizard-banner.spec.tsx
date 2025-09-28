import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WizardBanner } from "./wizard-banner";

describe("WizardBanner", () => {
	it("renders with default info variant", () => {
		render(<WizardBanner>Test message</WizardBanner>);

		expect(screen.getByTestId("wizard-banner-info")).toBeInTheDocument();
		expect(screen.getByText("Test message")).toBeInTheDocument();
		expect(screen.getByAltText("info")).toBeInTheDocument();
	});

	it("renders with warning variant", () => {
		render(<WizardBanner variant="warning">Warning message</WizardBanner>);

		expect(screen.getByTestId("wizard-banner-warning")).toBeInTheDocument();
		expect(screen.getByText("Warning message")).toBeInTheDocument();
		expect(screen.getByAltText("warning")).toBeInTheDocument();
	});

	it("renders with error variant", () => {
		render(<WizardBanner variant="error">Error message</WizardBanner>);

		expect(screen.getByTestId("wizard-banner-error")).toBeInTheDocument();
		expect(screen.getByText("Error message")).toBeInTheDocument();
		expect(screen.getByAltText("error")).toBeInTheDocument();
	});

	it("shows close button when onClose is provided", () => {
		const onClose = vi.fn();
		render(<WizardBanner onClose={onClose}>Test message</WizardBanner>);

		const closeButton = screen.getByRole("button");
		expect(closeButton).toBeInTheDocument();
		expect(screen.getByAltText("Close")).toBeInTheDocument();
	});

	it("does not show close button when onClose is not provided", () => {
		render(<WizardBanner>Test message</WizardBanner>);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("calls onClose when close button is clicked", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(<WizardBanner onClose={onClose}>Test message</WizardBanner>);

		const closeButton = screen.getByRole("button");
		await user.click(closeButton);

		expect(onClose).toHaveBeenCalledOnce();
	});

	it("renders complex children correctly", () => {
		render(
			<WizardBanner variant="warning">
				<div>
					<p className="font-medium">Warning title</p>
					<p className="mt-1">Warning description</p>
				</div>
			</WizardBanner>,
		);

		expect(screen.getByText("Warning title")).toBeInTheDocument();
		expect(screen.getByText("Warning description")).toBeInTheDocument();
	});

	it("applies correct styling based on variant", () => {
		const { rerender } = render(<WizardBanner variant="info">Info message</WizardBanner>);

		let banner = screen.getByTestId("wizard-banner-info");
		expect(banner).toHaveClass("bg-slate-100", "outline-slate-400");

		rerender(<WizardBanner variant="warning">Warning message</WizardBanner>);

		banner = screen.getByTestId("wizard-banner-warning");
		expect(banner).toHaveClass("bg-yellow-50", "outline-yellow-400");

		rerender(<WizardBanner variant="error">Error message</WizardBanner>);

		banner = screen.getByTestId("wizard-banner-error");
		expect(banner).toHaveClass("bg-red-50", "outline-red-400");
	});
});

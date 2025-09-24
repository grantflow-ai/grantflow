import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationDownloadMenu } from "./application-download-menu";

// Mock the dropdown menu components
vi.mock("@/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
	DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-content">{children}</div>
	),
	DropdownMenuItem: ({ children, onClick }: any) => (
		<div
			data-testid="dropdown-item"
			onClick={onClick}
			onKeyDown={(e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick?.(e);
				}
			}}
			role="menuitem"
			tabIndex={0}
		>
			{children}
		</div>
	),
	DropdownMenuTrigger: ({ children, className, disabled, onClick }: any) => (
		<button className={className} disabled={disabled} onClick={onClick} type="button">
			{children}
		</button>
	),
}));

describe("ApplicationDownloadMenu", () => {
	const mockOnDownload = vi.fn();

	beforeEach(() => {
		mockOnDownload.mockClear();
	});

	it("renders download button in enabled state", () => {
		render(<ApplicationDownloadMenu disabled={false} onDownload={mockOnDownload} />);

		const trigger = screen.getByRole("button");
		expect(trigger).toBeInTheDocument();
		expect(trigger).not.toBeDisabled();
		expect(screen.getByText("Download")).toBeInTheDocument();

		// Check for SVG icon presence
		const downloadIcon = screen.getByTestId("dropdown-menu").querySelector("svg");
		expect(downloadIcon).toBeInTheDocument();
	});

	it("renders download button in disabled state", () => {
		render(<ApplicationDownloadMenu disabled={true} onDownload={mockOnDownload} />);

		const trigger = screen.getByRole("button");
		expect(trigger).toBeInTheDocument();
		expect(trigger).toBeDisabled();
		expect(screen.getByText("Downloading...")).toBeInTheDocument();

		// Check for SVG icon presence
		const loaderIcon = screen.getByTestId("dropdown-menu").querySelector("svg");
		expect(loaderIcon).toBeInTheDocument();
	});

	it("shows download options when clicked", async () => {
		const user = userEvent.setup();
		render(<ApplicationDownloadMenu disabled={false} onDownload={mockOnDownload} />);

		const trigger = screen.getByRole("button");
		await user.click(trigger);

		await waitFor(() => {
			expect(screen.getByText("Markdown (.md)")).toBeInTheDocument();
			expect(screen.getByText("PDF (.pdf)")).toBeInTheDocument();
			expect(screen.getByText("Word (.docx)")).toBeInTheDocument();
		});
	});

	it("calls onDownload with markdown format when markdown option is clicked", async () => {
		const user = userEvent.setup();
		render(<ApplicationDownloadMenu disabled={false} onDownload={mockOnDownload} />);

		const trigger = screen.getByRole("button");
		await user.click(trigger);

		const markdownOption = await screen.findByText("Markdown (.md)");
		await user.click(markdownOption);

		expect(mockOnDownload).toHaveBeenCalledWith("markdown");
	});

	it("calls onDownload with pdf format when PDF option is clicked", async () => {
		const user = userEvent.setup();
		render(<ApplicationDownloadMenu disabled={false} onDownload={mockOnDownload} />);

		const trigger = screen.getByRole("button");
		await user.click(trigger);

		const pdfOption = await screen.findByText("PDF (.pdf)");
		await user.click(pdfOption);

		expect(mockOnDownload).toHaveBeenCalledWith("pdf");
	});

	it("calls onDownload with docx format when Word option is clicked", async () => {
		const user = userEvent.setup();
		render(<ApplicationDownloadMenu disabled={false} onDownload={mockOnDownload} />);

		const trigger = screen.getByRole("button");
		await user.click(trigger);

		const docxOption = await screen.findByText("Word (.docx)");
		await user.click(docxOption);

		expect(mockOnDownload).toHaveBeenCalledWith("docx");
	});

	it("displays correct icons for each format", async () => {
		const user = userEvent.setup();
		render(<ApplicationDownloadMenu disabled={false} onDownload={mockOnDownload} />);

		const trigger = screen.getByRole("button");
		await user.click(trigger);

		await waitFor(() => {
			// Check that menu items are present
			const menuItems = screen.getAllByTestId("dropdown-item");
			expect(menuItems).toHaveLength(3);

			// Each menu item should have an icon and text
			menuItems.forEach((item) => {
				expect(item.querySelector("svg")).toBeInTheDocument();
			});
		});
	});

	it("button is disabled when disabled prop is true", async () => {
		const user = userEvent.setup();
		render(<ApplicationDownloadMenu disabled={true} onDownload={mockOnDownload} />);

		const trigger = screen.getByRole("button");

		// Button should be disabled
		expect(trigger).toBeDisabled();

		// Try to click the disabled button - it should not trigger the callback
		await user.click(trigger);

		// onDownload should not have been called
		expect(mockOnDownload).not.toHaveBeenCalled();
	});

	it("applies correct styling classes", () => {
		render(<ApplicationDownloadMenu disabled={false} onDownload={mockOnDownload} />);

		const trigger = screen.getByRole("button");
		// Check that the className contains expected styling patterns
		const { className } = trigger;
		expect(className).toContain("cursor-pointer");
		expect(className).not.toContain("cursor-not-allowed");
	});

	it("applies disabled styling classes when disabled", () => {
		render(<ApplicationDownloadMenu disabled={true} onDownload={mockOnDownload} />);

		const trigger = screen.getByRole("button");
		// Check that the className contains expected styling patterns
		const { className } = trigger;
		expect(className).toContain("cursor-not-allowed");
		expect(className).not.toContain("cursor-pointer");
	});
});

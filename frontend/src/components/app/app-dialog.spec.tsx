import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
	AppDialog,
	AppDialogContent,
	AppDialogDescription,
	AppDialogFooter,
	AppDialogHeader,
	AppDialogTitle,
	AppDialogTrigger,
	ConfirmDialog,
} from "./app-dialog";

// Mock the ui/dialog components
vi.mock("@/components/ui/dialog", () => ({
	Dialog: ({ children, onOpenChange, open }: any) => (
		<button data-open={open} data-testid="dialog" onClick={() => onOpenChange?.(!open)} type="button">
			{children}
		</button>
	),
	DialogContent: ({ children, className, showCloseButton, ...props }: any) => (
		<div className={className} data-show-close-button={showCloseButton} data-testid="dialog-content" {...props}>
			{children}
		</div>
	),
	DialogDescription: ({ children, className, ...props }: any) => (
		<div className={className} data-testid="dialog-description" {...props}>
			{children}
		</div>
	),
	DialogFooter: ({ children, className, ...props }: any) => (
		<div className={className} data-testid="dialog-footer" {...props}>
			{children}
		</div>
	),
	DialogHeader: ({ children, className, ...props }: any) => (
		<div className={className} data-testid="dialog-header" {...props}>
			{children}
		</div>
	),
	DialogTitle: ({ children, className, ...props }: any) => (
		<div className={className} data-testid="dialog-title" {...props}>
			{children}
		</div>
	),
	DialogTrigger: ({ children, ...props }: any) => (
		<div data-testid="dialog-trigger" {...props}>
			{children}
		</div>
	),
}));

describe("AppDialog", () => {
	it("renders children within dialog", () => {
		render(
			<AppDialog open>
				<div>Dialog content</div>
			</AppDialog>,
		);

		expect(screen.getByTestId("dialog")).toBeInTheDocument();
		expect(screen.getByText("Dialog content")).toBeInTheDocument();
	});

	it("forwards props to Dialog component", () => {
		const onOpenChange = vi.fn();
		render(
			<AppDialog onOpenChange={onOpenChange} open>
				<div>Content</div>
			</AppDialog>,
		);

		expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "true");
	});
});

describe("AppDialogContent", () => {
	it("renders with testid and default showCloseButton", () => {
		render(<AppDialogContent>Content</AppDialogContent>);

		const content = screen.getByTestId("app-dialog-content");
		expect(content).toBeInTheDocument();
		expect(content).toHaveAttribute("data-show-close-button", "true");
	});

	it("respects custom showCloseButton prop", () => {
		render(<AppDialogContent showCloseButton={false}>Content</AppDialogContent>);

		expect(screen.getByTestId("app-dialog-content")).toHaveAttribute("data-show-close-button", "false");
	});

	it("applies custom className", () => {
		render(<AppDialogContent className="custom-class">Content</AppDialogContent>);

		expect(screen.getByTestId("app-dialog-content")).toHaveClass("custom-class");
	});
});

describe("AppDialogTrigger", () => {
	it("renders trigger element", () => {
		render(
			<AppDialogTrigger>
				<button type="button">Open Dialog</button>
			</AppDialogTrigger>,
		);

		expect(screen.getByTestId("dialog-trigger")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Open Dialog" })).toBeInTheDocument();
	});
});

describe("AppDialogHeader", () => {
	it("renders header with custom className", () => {
		render(<AppDialogHeader className="custom-header">Header</AppDialogHeader>);

		expect(screen.getByTestId("dialog-header")).toHaveClass("custom-header");
	});
});

describe("AppDialogTitle", () => {
	it("renders title with custom className", () => {
		render(<AppDialogTitle className="custom-title">Title</AppDialogTitle>);

		expect(screen.getByTestId("dialog-title")).toHaveClass("custom-title");
	});
});

describe("AppDialogDescription", () => {
	it("renders description with custom className", () => {
		render(<AppDialogDescription className="custom-desc">Description</AppDialogDescription>);

		expect(screen.getByTestId("dialog-description")).toHaveClass("custom-desc");
	});
});

describe("AppDialogFooter", () => {
	it("renders footer with custom className", () => {
		render(<AppDialogFooter className="custom-footer">Footer</AppDialogFooter>);

		expect(screen.getByTestId("dialog-footer")).toHaveClass("custom-footer");
	});
});

describe("ConfirmDialog", () => {
	const defaultProps = {
		onConfirm: vi.fn(),
		onOpenChange: vi.fn(),
		open: true,
		title: "Confirm Action",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders with title and default buttons", () => {
		render(<ConfirmDialog {...defaultProps} />);

		expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
		expect(screen.getByTestId("dialog-title")).toHaveTextContent("Confirm Action");
		expect(screen.getByTestId("confirm-dialog-cancel")).toHaveTextContent("Cancel");
		expect(screen.getByTestId("confirm-dialog-confirm")).toHaveTextContent("Confirm");
	});

	it("renders with description when provided", () => {
		render(<ConfirmDialog {...defaultProps} description="Are you sure you want to continue?" />);

		expect(screen.getByTestId("dialog-description")).toHaveTextContent("Are you sure you want to continue?");
	});

	it("uses custom button text when provided", () => {
		render(<ConfirmDialog {...defaultProps} cancelText="No" confirmText="Yes" />);

		expect(screen.getByTestId("confirm-dialog-cancel")).toHaveTextContent("No");
		expect(screen.getByTestId("confirm-dialog-confirm")).toHaveTextContent("Yes");
	});

	it("calls onCancel and onOpenChange when cancel button is clicked", async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();

		render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

		await user.click(screen.getByTestId("confirm-dialog-cancel"));

		expect(onCancel).toHaveBeenCalledOnce();
		expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
	});

	it("calls onConfirm and onOpenChange when confirm button is clicked", async () => {
		const user = userEvent.setup();

		render(<ConfirmDialog {...defaultProps} />);

		await user.click(screen.getByTestId("confirm-dialog-confirm"));

		expect(defaultProps.onConfirm).toHaveBeenCalledOnce();
		expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
	});

	it("handles missing onCancel gracefully", async () => {
		const user = userEvent.setup();

		render(<ConfirmDialog {...defaultProps} />);

		await user.click(screen.getByTestId("confirm-dialog-cancel"));

		// Should not throw and should still call onOpenChange
		expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
	});

	it("applies default variant styling to confirm button", () => {
		render(<ConfirmDialog {...defaultProps} />);

		const confirmButton = screen.getByTestId("confirm-dialog-confirm");
		expect(confirmButton).toHaveClass("bg-primary", "text-primary-foreground", "hover:bg-primary/90");
	});

	it("applies danger variant styling to confirm button", () => {
		render(<ConfirmDialog {...defaultProps} variant="danger" />);

		const confirmButton = screen.getByTestId("confirm-dialog-confirm");
		expect(confirmButton).toHaveClass("bg-destructive", "text-destructive-foreground", "hover:bg-destructive/90");
	});

	it("applies correct styling to cancel button", () => {
		render(<ConfirmDialog {...defaultProps} />);

		const cancelButton = screen.getByTestId("confirm-dialog-cancel");
		expect(cancelButton).toHaveClass(
			"border",
			"border-input",
			"bg-background",
			"hover:bg-accent",
			"hover:text-accent-foreground",
		);
	});

	it("respects showCloseButton prop", () => {
		render(<ConfirmDialog {...defaultProps} showCloseButton={false} />);

		expect(screen.getByTestId("confirm-dialog")).toHaveAttribute("data-show-close-button", "false");
	});

	it("has correct button types", () => {
		render(<ConfirmDialog {...defaultProps} />);

		expect(screen.getByTestId("confirm-dialog-cancel")).toHaveAttribute("type", "button");
		expect(screen.getByTestId("confirm-dialog-confirm")).toHaveAttribute("type", "button");
	});

	it("applies shared button styling", () => {
		render(<ConfirmDialog {...defaultProps} />);

		const buttons = [screen.getByTestId("confirm-dialog-cancel"), screen.getByTestId("confirm-dialog-confirm")];

		buttons.forEach((button) => {
			expect(button).toHaveClass(
				"inline-flex",
				"h-10",
				"items-center",
				"justify-center",
				"rounded-md",
				"px-4",
				"py-2",
				"text-sm",
				"font-medium",
				"transition-colors",
			);
		});
	});

	it("conditionally renders description", () => {
		render(<ConfirmDialog {...defaultProps} />);

		expect(screen.queryByTestId("dialog-description")).not.toBeInTheDocument();
	});
});

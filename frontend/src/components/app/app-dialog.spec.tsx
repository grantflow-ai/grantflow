import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe } from "vitest";

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

vi.mock("@/components/ui/dialog", () => ({
	Dialog: ({ children, open }: any) => (
		<div data-open={open} data-testid="dialog">
			{children}
		</div>
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

afterEach(() => {
	cleanup();
});

describe.sequential("AppDialog", () => {
	it("renders children within dialog", () => {
		const { container } = render(
			<AppDialog open>
				<div>Dialog content</div>
			</AppDialog>,
		);

		expect(container.querySelector('[data-testid="dialog"]')).toBeInTheDocument();
		expect(screen.getByText("Dialog content")).toBeInTheDocument();
	});

	it("forwards props to Dialog component", () => {
		const onOpenChange = vi.fn();
		const { container } = render(
			<AppDialog onOpenChange={onOpenChange} open>
				<div>Content</div>
			</AppDialog>,
		);

		expect(container.querySelector('[data-testid="dialog"]')).toHaveAttribute("data-open", "true");
	});
});

describe.sequential("AppDialogContent", () => {
	it("renders with testid and default showCloseButton", () => {
		const { container } = render(<AppDialogContent>Content</AppDialogContent>);

		const content = container.querySelector('[data-testid="app-dialog-content"]');
		expect(content).toBeInTheDocument();
		expect(content).toHaveAttribute("data-show-close-button", "true");
	});

	it("respects custom showCloseButton prop", () => {
		const { container } = render(<AppDialogContent showCloseButton={false}>Content</AppDialogContent>);

		expect(container.querySelector('[data-testid="app-dialog-content"]')).toHaveAttribute(
			"data-show-close-button",
			"false",
		);
	});

	it("applies custom className", () => {
		const { container } = render(<AppDialogContent className="custom-class">Content</AppDialogContent>);

		expect(container.querySelector('[data-testid="app-dialog-content"]')).toHaveClass("custom-class");
	});
});

describe.sequential("AppDialogTrigger", () => {
	it("renders trigger element", () => {
		const { container } = render(
			<AppDialogTrigger>
				<button type="button">Open Dialog</button>
			</AppDialogTrigger>,
		);

		expect(container.querySelector('[data-testid="dialog-trigger"]')).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Open Dialog" })).toBeInTheDocument();
	});
});

describe.sequential("AppDialogHeader", () => {
	it("renders header with custom className", () => {
		const { container } = render(<AppDialogHeader className="custom-header">Header</AppDialogHeader>);

		expect(container.querySelector('[data-testid="dialog-header"]')).toHaveClass("custom-header");
	});
});

describe.sequential("AppDialogTitle", () => {
	it("renders title with custom className", () => {
		const { container } = render(<AppDialogTitle className="custom-title">Title</AppDialogTitle>);

		expect(container.querySelector('[data-testid="dialog-title"]')).toHaveClass("custom-title");
	});
});

describe.sequential("AppDialogDescription", () => {
	it("renders description with custom className", () => {
		const { container } = render(<AppDialogDescription className="custom-desc">Description</AppDialogDescription>);

		expect(container.querySelector('[data-testid="dialog-description"]')).toHaveClass("custom-desc");
	});
});

describe.sequential("AppDialogFooter", () => {
	it("renders footer with custom className", () => {
		const { container } = render(<AppDialogFooter className="custom-footer">Footer</AppDialogFooter>);

		expect(container.querySelector('[data-testid="dialog-footer"]')).toHaveClass("custom-footer");
	});
});

describe.sequential("ConfirmDialog", () => {
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
		const { container } = render(<ConfirmDialog {...defaultProps} />);

		expect(container.querySelector('[data-testid="confirm-dialog"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="dialog-title"]')).toHaveTextContent("Confirm Action");
		expect(container.querySelector('[data-testid="confirm-dialog-cancel"]')).toHaveTextContent("Cancel");
		expect(container.querySelector('[data-testid="confirm-dialog-confirm"]')).toHaveTextContent("Confirm");
	});

	it("renders with description when provided", () => {
		const { container } = render(
			<ConfirmDialog {...defaultProps} description="Are you sure you want to continue?" />,
		);

		expect(container.querySelector('[data-testid="dialog-description"]')).toHaveTextContent(
			"Are you sure you want to continue?",
		);
	});

	it("uses custom button text when provided", () => {
		const { container } = render(<ConfirmDialog {...defaultProps} cancelText="No" confirmText="Yes" />);

		expect(container.querySelector('[data-testid="confirm-dialog-cancel"]')).toHaveTextContent("No");
		expect(container.querySelector('[data-testid="confirm-dialog-confirm"]')).toHaveTextContent("Yes");
	});

	it("calls onCancel and onOpenChange when cancel button is clicked", async () => {
		const user = userEvent.setup();
		const onCancel = vi.fn();

		const { container } = render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

		await user.click(container.querySelector('[data-testid="confirm-dialog-cancel"]')!);

		expect(onCancel).toHaveBeenCalledOnce();
		expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
	});

	it("calls onConfirm and onOpenChange when confirm button is clicked", async () => {
		const user = userEvent.setup();

		const { container } = render(<ConfirmDialog {...defaultProps} />);

		await user.click(container.querySelector('[data-testid="confirm-dialog-confirm"]')!);

		expect(defaultProps.onConfirm).toHaveBeenCalledOnce();
		expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
	});

	it("handles missing onCancel gracefully", async () => {
		const user = userEvent.setup();

		const { container } = render(<ConfirmDialog {...defaultProps} />);

		await user.click(container.querySelector('[data-testid="confirm-dialog-cancel"]')!);

		expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
	});

	it("applies default variant styling to confirm button", () => {
		const { container } = render(<ConfirmDialog {...defaultProps} />);

		const confirmButton = container.querySelector('[data-testid="confirm-dialog-confirm"]');
		expect(confirmButton).toHaveClass("bg-primary", "text-primary-foreground", "hover:bg-primary/90");
	});

	it("applies danger variant styling to confirm button", () => {
		const { container } = render(<ConfirmDialog {...defaultProps} variant="danger" />);

		const confirmButton = container.querySelector('[data-testid="confirm-dialog-confirm"]');
		expect(confirmButton).toHaveClass("bg-destructive", "text-destructive-foreground", "hover:bg-destructive/90");
	});

	it("applies correct styling to cancel button", () => {
		const { container } = render(<ConfirmDialog {...defaultProps} />);

		const cancelButton = container.querySelector('[data-testid="confirm-dialog-cancel"]');
		expect(cancelButton).toHaveClass(
			"border",
			"border-input",
			"bg-background",
			"hover:bg-accent",
			"hover:text-accent-foreground",
		);
	});

	it("respects showCloseButton prop", () => {
		const { container } = render(<ConfirmDialog {...defaultProps} showCloseButton={false} />);

		expect(container.querySelector('[data-testid="confirm-dialog"]')).toHaveAttribute(
			"data-show-close-button",
			"false",
		);
	});

	it("has correct button types", () => {
		const { container } = render(<ConfirmDialog {...defaultProps} />);

		expect(container.querySelector('[data-testid="confirm-dialog-cancel"]')).toHaveAttribute("type", "button");
		expect(container.querySelector('[data-testid="confirm-dialog-confirm"]')).toHaveAttribute("type", "button");
	});

	it("applies shared button styling", () => {
		const { container } = render(<ConfirmDialog {...defaultProps} />);

		const buttons = [
			container.querySelector('[data-testid="confirm-dialog-cancel"]'),
			container.querySelector('[data-testid="confirm-dialog-confirm"]'),
		];

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
		const { container } = render(<ConfirmDialog {...defaultProps} />);

		expect(container.querySelector('[data-testid="dialog-description"]')).not.toBeInTheDocument();
		// Verify that the dialog content itself is rendered
		expect(container.querySelector('[data-testid="confirm-dialog"]')).toBeInTheDocument();
	});
});

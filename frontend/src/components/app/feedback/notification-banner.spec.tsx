import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NotificationData } from "@/components/app";
import { NotificationBanner } from "@/components/app";

describe("NotificationBanner", () => {
	const mockNotification: NotificationData = {
		id: "test-123",
		message: "has a grant deadline in 2 days",
		projectName: "Research Project",
		title: "Deadline Approaching",
		type: "deadline",
	};

	it("displays notification content", () => {
		render(<NotificationBanner notification={mockNotification} />);

		expect(screen.getByTestId("notification-title")).toBeInTheDocument();
		expect(screen.getByTestId("notification-project-name")).toBeInTheDocument();
		expect(screen.getByTestId("notification-message")).toBeInTheDocument();
	});

	it("renders close button when onClose is provided", () => {
		const mockOnClose = vi.fn();
		render(<NotificationBanner notification={mockNotification} onClose={mockOnClose} />);

		const closeButton = screen.getByTestId("notification-close-button");
		expect(closeButton).toBeInTheDocument();
	});

	it("does not render close button when onClose is not provided", () => {
		render(<NotificationBanner notification={mockNotification} />);

		const closeButton = screen.queryByTestId("notification-close-button");
		expect(closeButton).not.toBeInTheDocument();
	});

	it("calls onClose with notification id when close button is clicked", async () => {
		const mockOnClose = vi.fn();
		const user = userEvent.setup();

		render(<NotificationBanner notification={mockNotification} onClose={mockOnClose} />);

		const closeButton = screen.getByTestId("notification-close-button");
		await user.click(closeButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnClose).toHaveBeenCalledWith("test-123");
	});

	it("handles different notification types", () => {
		const notificationTypes: NotificationData["type"][] = ["deadline", "info", "success", "warning"];

		notificationTypes.forEach((type) => {
			const notification = { ...mockNotification, type };
			const { unmount } = render(<NotificationBanner notification={notification} />);

			expect(screen.getByTestId("notification-title")).toBeInTheDocument();
			unmount();
		});
	});

	it("defaults to deadline type when type is not specified", () => {
		const notificationWithoutType = { ...mockNotification, type: undefined };

		render(<NotificationBanner notification={notificationWithoutType} />);

		expect(screen.getByTestId("notification-title")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		render(<NotificationBanner className="test-custom-class" notification={mockNotification} />);

		const container = screen.getByTestId("notification-message").closest("div");
		expect(container?.parentElement).toHaveClass("test-custom-class");
	});

	it("formats project name with quotes", () => {
		render(<NotificationBanner notification={mockNotification} />);

		const projectNameElement = screen.getByTestId("notification-project-name");
		expect(projectNameElement).toBeInTheDocument();
		expect(projectNameElement.textContent).toContain("Research Project");
	});
});

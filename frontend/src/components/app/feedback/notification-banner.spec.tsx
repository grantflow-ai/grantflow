import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NotificationData } from "./notification-banner";
import { NotificationBanner } from "./notification-banner";

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

		expect(screen.getByText("Deadline Approaching")).toBeInTheDocument();
		expect(screen.getByText('"Research Project"')).toBeInTheDocument();
		expect(screen.getByText("has a grant deadline in 2 days")).toBeInTheDocument();
	});

	it("renders close button when onClose is provided", () => {
		const mockOnClose = vi.fn();
		render(<NotificationBanner notification={mockNotification} onClose={mockOnClose} />);

		const closeButton = screen.getByRole("button", { name: "Close notification" });
		expect(closeButton).toBeInTheDocument();
	});

	it("does not render close button when onClose is not provided", () => {
		render(<NotificationBanner notification={mockNotification} />);

		const closeButton = screen.queryByRole("button", { name: "Close notification" });
		expect(closeButton).not.toBeInTheDocument();
	});

	it("calls onClose with notification id when close button is clicked", async () => {
		const mockOnClose = vi.fn();
		const user = userEvent.setup();

		render(<NotificationBanner notification={mockNotification} onClose={mockOnClose} />);

		const closeButton = screen.getByRole("button", { name: "Close notification" });
		await user.click(closeButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
		expect(mockOnClose).toHaveBeenCalledWith("test-123");
	});

	it("handles different notification types", () => {
		const notificationTypes: NotificationData["type"][] = ["deadline", "info", "success", "warning"];

		notificationTypes.forEach((type) => {
			const notification = { ...mockNotification, type };
			const { unmount } = render(<NotificationBanner notification={notification} />);

			// Verify the notification renders without error
			expect(screen.getByText(notification.title)).toBeInTheDocument();
			unmount();
		});
	});

	it("defaults to deadline type when type is not specified", () => {
		const notificationWithoutType = { ...mockNotification, type: undefined };

		render(<NotificationBanner notification={notificationWithoutType} />);

		// Should still render without error
		expect(screen.getByText(notificationWithoutType.title)).toBeInTheDocument();
	});

	it("applies custom className", () => {
		const { container } = render(<NotificationBanner className="custom-class" notification={mockNotification} />);

		const bannerElement = container.firstChild;
		expect(bannerElement).toHaveClass("custom-class");
	});

	it("formats project name with quotes", () => {
		render(<NotificationBanner notification={mockNotification} />);

		// Check for the quoted project name
		const projectNameElement = screen.getByText('"Research Project"');
		expect(projectNameElement).toBeInTheDocument();
		expect(projectNameElement.tagName).toBe("SPAN");
	});
});

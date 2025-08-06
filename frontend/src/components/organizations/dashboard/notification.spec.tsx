import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { Notification } from "./notification";
import type { Notification as NotificationType } from "./notification";

const MOCK_NOTIFICATIONS: NotificationType[] = [
	{
		description: "Neuroadaptive Interfaces for Human-AI Teaming",
		dotColor: "bg-yellow-500",
		id: 1,
		title: "7 days until grant deadline",
	},
	{
		description: "AI for Scientific Discovery",
		dotColor: "bg-green-500",
		id: 2,
		title: "New Grant Opportunity",
	},
	{
		description: "Your application for 'AI in Healthcare' has been reviewed.",
		dotColor: "bg-blue-500",
		id: 3,
		title: "Application Update",
	},
];

describe.sequential("Notification component", () => {
	afterEach(() => {
		cleanup();
	});

	it("shows notification dropdown and items when open", async () => {
		render(<Notification initialNotifications={MOCK_NOTIFICATIONS} isOpen />);

		expect(screen.getByTestId("notification-panel")).toBeInTheDocument();

		// Check for the first notification
		expect(screen.getByTestId("notification-dot-1")).toBeInTheDocument();
		expect(screen.getByTestId("notification-title-1")).toHaveTextContent("7 days until grant deadline");
		expect(screen.getByTestId("notification-description-1")).toHaveTextContent(/Neuroadaptive Interfaces/);
		expect(screen.getByTestId("notification-close-1")).toBeInTheDocument();

		// Check that all three notifications are rendered
		const items = screen.getAllByTestId(/notification-item-/);
		expect(items).toHaveLength(3);
	});
});

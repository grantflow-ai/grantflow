import { RagProcessingStatusMessageFactory } from "::testing/factories";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe } from "vitest";
import { NotificationProgress } from "@/components/app/feedback/notification-progress";

describe.sequential("NotificationProgress", () => {
	afterEach(() => {
		cleanup();
	});

	const mockNotification = RagProcessingStatusMessageFactory.build({
		event: "section_texts_generated",
	});

	it("displays progress message", () => {
		render(<NotificationProgress notification={mockNotification} />);

		const messageElement = screen.getByTestId("notification-progress-message");
		expect(messageElement).toBeInTheDocument();
	});

	it("shows completed icon for completed events", () => {
		const completedNotification = RagProcessingStatusMessageFactory.build({
			event: "grant_application_generation_completed",
		});

		render(<NotificationProgress notification={completedNotification} />);

		const messageElement = screen.getByTestId("notification-progress-message");
		expect(messageElement.textContent).toContain("✅");
	});

	it("shows error icon for error events", () => {
		const errorNotification = RagProcessingStatusMessageFactory.build({
			event: "pipeline_error",
		});

		render(<NotificationProgress notification={errorNotification} />);

		const messageElement = screen.getByTestId("notification-progress-message");
		expect(messageElement.textContent).toContain("❌");
	});

	it("shows cancelled icon for cancelled events", () => {
		const cancelledNotification = RagProcessingStatusMessageFactory.build({
			event: "job_cancelled",
		});

		render(<NotificationProgress notification={cancelledNotification} />);

		const messageElement = screen.getByTestId("notification-progress-message");
		expect(messageElement.textContent).toContain("🚫");
	});

	it("shows extract icon for extract events", () => {
		const extractNotification = RagProcessingStatusMessageFactory.build({
			event: "cfp_data_extracted",
		});

		render(<NotificationProgress notification={extractNotification} />);

		const messageElement = screen.getByTestId("notification-progress-message");
		expect(messageElement.textContent).toContain("📄");
	});
});

import { RagProcessingStatusFactory } from "::testing/factories";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe } from "vitest";
import { NotificationProgress } from "@/components/app/feedback/notification-progress";

describe.sequential("NotificationProgress", () => {
	afterEach(() => {
		cleanup();
	});

	const mockNotification = RagProcessingStatusFactory.build({
		event: "section_texts_generated",
		message: "Generating text for all grant sections...",
	});

	it("displays progress message", () => {
		render(<NotificationProgress notification={mockNotification} />);

		const messageElement = screen.getByTestId("notification-progress-message");
		expect(messageElement).toBeInTheDocument();
		expect(messageElement.textContent).toContain("Generating text for all grant sections...");
	});

	it("shows completed icon for completed events", () => {
		const completedNotification = RagProcessingStatusFactory.build({
			event: "grant_application_generation_completed",
			message: "Application generation completed",
		});

		render(<NotificationProgress notification={completedNotification} />);

		const messageElement = screen.getByTestId("notification-progress-message");
		expect(messageElement.textContent).toContain("✅");
	});

	it("shows error icon for error events", () => {
		const errorNotification = RagProcessingStatusFactory.build({
			event: "pipeline_error",
			message: "An error occurred",
		});

		render(<NotificationProgress notification={errorNotification} />);

		const messageElement = screen.getByTestId("notification-progress-message");
		expect(messageElement.textContent).toContain("❌");
	});

	it("shows cancelled icon for cancelled events", () => {
		const cancelledNotification = RagProcessingStatusFactory.build({
			event: "job_cancelled",
			message: "Job was cancelled",
		});

		render(<NotificationProgress notification={cancelledNotification} />);

		const messageElement = screen.getByTestId("notification-progress-message");
		expect(messageElement.textContent).toContain("🚫");
	});

	it("shows extract icon for extract events", () => {
		const extractNotification = RagProcessingStatusFactory.build({
			event: "cfp_data_extracted",
			message: "CFP data extracted",
		});

		render(<NotificationProgress notification={extractNotification} />);

		const messageElement = screen.getByTestId("notification-progress-message");
		expect(messageElement.textContent).toContain("📄");
	});
});

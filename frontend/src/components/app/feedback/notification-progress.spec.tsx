import { RagProcessingStatusFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { NotificationProgress } from "@/components/app";

describe("NotificationProgress", () => {
	const mockNotification = RagProcessingStatusFactory.build({
		current_pipeline_stage: 4,
		event: "generating_section_texts",
		message: "Generating text for all grant sections...",
		total_pipeline_stages: 9,
	});

	it("displays progress message", () => {
		render(<NotificationProgress notification={mockNotification} />);

		const messageElement = screen.getByTestId("notification-progress-message");
		expect(messageElement).toBeInTheDocument();
		expect(messageElement.textContent).toContain("Generating text for all grant sections...");
	});

	it("shows progress percentage", () => {
		render(<NotificationProgress notification={mockNotification} />);

		const percentageElement = screen.getByTestId("notification-progress-percentage");
		expect(percentageElement).toBeInTheDocument();
		expect(percentageElement.textContent).toContain("44% complete");
	});

	it("displays current and total stages", () => {
		render(<NotificationProgress notification={mockNotification} />);

		const stagesElement = screen.getByTestId("notification-progress-stages");
		expect(stagesElement).toBeInTheDocument();
		expect(stagesElement.textContent).toContain("4 / 9");
	});

	it("renders nothing when pipeline stages are not provided", () => {
		const notificationWithoutStages = RagProcessingStatusFactory.build({
			current_pipeline_stage: undefined,
			event: "some_event",
			message: "Some message",
			total_pipeline_stages: undefined,
		});

		const { container } = render(<NotificationProgress notification={notificationWithoutStages} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders nothing when stages are partially provided", () => {
		const notificationPartialStages = RagProcessingStatusFactory.build({
			current_pipeline_stage: 5,
			event: "some_event",
			message: "Some message",
			total_pipeline_stages: undefined,
		});

		const { container } = render(<NotificationProgress notification={notificationPartialStages} />);
		expect(container.firstChild).toBeNull();
	});

	it("handles zero progress", () => {
		const zeroProgressNotification = RagProcessingStatusFactory.build({
			current_pipeline_stage: 0,
			event: "started_processing",
			message: "Starting the process...",
			total_pipeline_stages: 10,
		});

		render(<NotificationProgress notification={zeroProgressNotification} />);

		const stagesElement = screen.getByTestId("notification-progress-stages");
		expect(stagesElement).toBeInTheDocument();
		expect(stagesElement.textContent).toContain("0 / 10");

		const percentageElement = screen.getByTestId("notification-progress-percentage");
		expect(percentageElement).toBeInTheDocument();
		expect(percentageElement.textContent).toContain("0% complete");
	});

	it("handles 100% progress", () => {
		const completeProgressNotification = RagProcessingStatusFactory.build({
			current_pipeline_stage: 10,
			event: "completed_processing",
			message: "Process complete!",
			total_pipeline_stages: 10,
		});

		render(<NotificationProgress notification={completeProgressNotification} />);

		const stagesElement = screen.getByTestId("notification-progress-stages");
		expect(stagesElement).toBeInTheDocument();
		expect(stagesElement.textContent).toContain("10 / 10");

		const percentageElement = screen.getByTestId("notification-progress-percentage");
		expect(percentageElement).toBeInTheDocument();
		expect(percentageElement.textContent).toContain("100% complete");
	});
});

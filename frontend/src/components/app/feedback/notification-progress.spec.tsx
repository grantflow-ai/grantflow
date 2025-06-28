import { RagProcessingStatusFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { NotificationProgress } from "./notification-progress";

describe("NotificationProgress", () => {
	const mockNotification = RagProcessingStatusFactory.build({
		current_pipeline_stage: 4,
		event: "generating_section_texts",
		message: "Generating text for all grant sections...",
		total_pipeline_stages: 9,
	});

	it("displays progress message", () => {
		render(<NotificationProgress notification={mockNotification} />);

		expect(screen.getByText("Generating text for all grant sections...")).toBeInTheDocument();
	});

	it("shows progress percentage", () => {
		render(<NotificationProgress notification={mockNotification} />);

		expect(screen.getByText("44% complete")).toBeInTheDocument();
	});

	it("displays current and total stages", () => {
		render(<NotificationProgress notification={mockNotification} />);

		expect(screen.getByText("4 / 9")).toBeInTheDocument();
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

	it("handles complete progress (100%)", () => {
		const completeNotification = RagProcessingStatusFactory.build({
			current_pipeline_stage: 9,
			event: "grant_application_generation_completed",
			message: "Grant application text generation completed successfully.",
			total_pipeline_stages: 9,
		});

		render(<NotificationProgress notification={completeNotification} />);

		expect(screen.getByText("9 / 9")).toBeInTheDocument();
		expect(screen.getByText("100% complete")).toBeInTheDocument();
	});

	it("handles zero progress", () => {
		const zeroProgressNotification = RagProcessingStatusFactory.build({
			current_pipeline_stage: 0,
			event: "grant_application_generation_started",
			message: "Starting grant application generation...",
			total_pipeline_stages: 10,
		});

		render(<NotificationProgress notification={zeroProgressNotification} />);

		expect(screen.getByText("0 / 10")).toBeInTheDocument();
		expect(screen.getByText("0% complete")).toBeInTheDocument();
	});

	it("rounds percentage to nearest integer", () => {
		const notification = RagProcessingStatusFactory.build({
			current_pipeline_stage: 1,
			event: "some_event",
			message: "Processing...",
			total_pipeline_stages: 3,
		});

		render(<NotificationProgress notification={notification} />);

		// 1/3 = 0.333... should round to 33%
		expect(screen.getByText("33% complete")).toBeInTheDocument();
	});
});

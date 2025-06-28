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

	it("renders progress bar with correct message", () => {
		render(<NotificationProgress notification={mockNotification} />);

		expect(screen.getByText("Generating text for all grant sections...")).toBeInTheDocument();
		expect(screen.getByText("44% complete")).toBeInTheDocument();
	});

	it("displays current and total stages", () => {
		render(<NotificationProgress notification={mockNotification} />);

		expect(screen.getByText("4 / 9")).toBeInTheDocument();
	});

	it("calculates progress percentage correctly", () => {
		render(<NotificationProgress notification={mockNotification} />);

		const progressBar = screen.getByTestId("notification-progress");
		expect(progressBar).toBeInTheDocument();

		const progressIndicator = progressBar.querySelector('[data-slot="progress-indicator"]');
		expect(progressIndicator).toHaveStyle({ transform: "translateX(-56%)" });
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

	it("renders nothing when only current stage is provided", () => {
		const notificationPartialStages = RagProcessingStatusFactory.build({
			current_pipeline_stage: 5,
			event: "some_event",
			message: "Some message",
			total_pipeline_stages: undefined,
		});

		const { container } = render(<NotificationProgress notification={notificationPartialStages} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders nothing when only total stages is provided", () => {
		const notificationPartialStages = RagProcessingStatusFactory.build({
			current_pipeline_stage: undefined,
			event: "some_event",
			message: "Some message",
			total_pipeline_stages: 10,
		});

		const { container } = render(<NotificationProgress notification={notificationPartialStages} />);
		expect(container.firstChild).toBeNull();
	});

	it("handles complete progress correctly", () => {
		const completeNotification = RagProcessingStatusFactory.build({
			current_pipeline_stage: 9,
			event: "grant_application_generation_completed",
			message: "Grant application text generation completed successfully.",
			total_pipeline_stages: 9,
		});

		render(<NotificationProgress notification={completeNotification} />);

		expect(screen.getByText("9 / 9")).toBeInTheDocument();
		expect(screen.getByText("100% complete")).toBeInTheDocument();

		const progressIndicator = screen
			.getByTestId("notification-progress")
			.querySelector('[data-slot="progress-indicator"]');
		expect(progressIndicator).toHaveStyle({ transform: "translateX(-0%)" });
	});

	it("displays appropriate status indicators based on event type", () => {
		const testCases = [
			{ event: "grant_application_generation_started", expectedIcon: "🚀" },
			{ event: "validating_template", expectedIcon: "🔍" },
			{ event: "generating_section_texts", expectedIcon: "✨" },
			{ event: "assembling_application", expectedIcon: "🔧" },
			{ event: "saving_application", expectedIcon: "💾" },
			{ event: "extracting_cfp_data", expectedIcon: "📄" },
			{ event: "unknown_event", expectedIcon: "⚡" },
		];

		testCases.forEach(({ event, expectedIcon }) => {
			const { unmount } = render(
				<NotificationProgress
					notification={{
						...mockNotification,
						event,
					}}
				/>,
			);
			expect(screen.getByText(expectedIcon)).toBeInTheDocument();
			unmount();
		});
	});
});
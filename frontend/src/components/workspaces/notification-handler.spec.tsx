import { RagProcessingStatusMessageFactory } from "::testing/factories";
import { render, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { vi } from "vitest";
import { NotificationHandler } from "./notification-handler";

vi.mock("sonner", () => {
	const mockToast = vi.fn(() => "toast-id-123") as any;
	mockToast.success = vi.fn();
	mockToast.error = vi.fn();
	mockToast.warning = vi.fn();
	mockToast.info = vi.fn();
	mockToast.dismiss = vi.fn();
	return { toast: mockToast };
});

vi.mock("@/components/notification-progress", () => ({
	NotificationProgress: ({ notification }: { notification: any }) => (
		<div data-testid="mock-notification-progress">{notification.message}</div>
	),
}));

describe("NotificationHandler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows progress toast for progress events", async () => {
		const notification = RagProcessingStatusMessageFactory.build({
			data: {
				current_pipeline_stage: 1,
				event: "grant_application_generation_started",
				message: "Starting grant application text generation pipeline...",
				total_pipeline_stages: 9,
			},
			event: "grant_application_generation_started",
			type: "data",
		});

		render(<NotificationHandler notification={notification} />);

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					props: expect.objectContaining({
						notification: notification.data,
					}),
				}),
				expect.objectContaining({
					duration: Number.POSITIVE_INFINITY,
				}),
			);
		});
	});

	it("shows error toast for error events", async () => {
		const notification = RagProcessingStatusMessageFactory.build({
			data: {
				data: { recoverable: true },
				event: "generation_error",
				message: "An error occurred",
			},
			event: "generation_error",
			type: "error",
		});

		render(<NotificationHandler notification={notification} />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("❌ Error: An error occurred", {
				description: "Please follow the instructions above to resolve this issue.",
				duration: 10_000,
			});
		});
	});

	it("shows warning toast for warning events", async () => {
		const notification = RagProcessingStatusMessageFactory.build({
			data: {
				event: "insufficient_context_error",
				message: "Insufficient context provided",
			},
			event: "insufficient_context_error",
			type: "data",
		});

		render(<NotificationHandler notification={notification} />);

		await waitFor(() => {
			expect(toast.warning).toHaveBeenCalledWith("⚠️ Insufficient context provided", {
				description: undefined,
				duration: 8000,
			});
		});
	});

	it("shows success toast for success events", async () => {
		const notification = RagProcessingStatusMessageFactory.build({
			data: {
				event: "application_saved",
				message: "Application saved successfully",
			},
			event: "application_saved",
			type: "data",
		});

		render(<NotificationHandler notification={notification} />);

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith("✓ Application saved successfully", {
				duration: 5000,
			});
		});
	});

	it("shows info toast for unknown events", async () => {
		const notification = RagProcessingStatusMessageFactory.build({
			data: {
				data: { key1: "value1", key2: "value2" },
				event: "unknown_event",
				message: "Some information",
			},
			event: "unknown_event",
			type: "data",
		});

		render(<NotificationHandler notification={notification} />);

		await waitFor(() => {
			expect(toast.info).toHaveBeenCalledWith("Some information", {
				description: "key1: value1, key2: value2",
			});
		});
	});

	it("dismisses previous toast when showing new progress", async () => {
		const firstNotification = RagProcessingStatusMessageFactory.build({
			data: {
				current_pipeline_stage: 1,
				event: "grant_application_generation_started",
				message: "Starting...",
				total_pipeline_stages: 9,
			},
			event: "grant_application_generation_started",
			type: "data",
		});

		const secondNotification = RagProcessingStatusMessageFactory.build({
			data: {
				current_pipeline_stage: 2,
				event: "validating_template",
				message: "Validating...",
				total_pipeline_stages: 9,
			},
			event: "validating_template",
			type: "data",
		});

		const { rerender } = render(<NotificationHandler notification={firstNotification} />);

		await waitFor(() => {
			expect(toast).toHaveBeenCalled();
		});

		rerender(<NotificationHandler notification={secondNotification} />);

		await waitFor(() => {
			expect(toast.dismiss).toHaveBeenCalledWith("toast-id-123");
		});
	});

	it("does not show description for error without recoverable flag", async () => {
		const notification = RagProcessingStatusMessageFactory.build({
			data: {
				data: { recoverable: false },
				event: "generation_error",
				message: "An error occurred",
			},
			event: "generation_error",
			type: "error",
		});

		render(<NotificationHandler notification={notification} />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("❌ Error: An error occurred", {
				description: undefined,
				duration: 10_000,
			});
		});
	});
});

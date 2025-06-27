import { render, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { vi } from "vitest";
import type { RagProcessingStatusMessage } from "@/hooks/use-application-notifications";
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

describe("NotificationHandler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows info toast for progress events", async () => {
		const notification: RagProcessingStatusMessage = {
			data: {
				data: {
					current_pipeline_stage: 1,
					total_pipeline_stages: 9,
				},
				event: "grant_application_generation_started",
				message: "Starting grant application text generation pipeline...",
			},
			event: "grant_application_generation_started",
			parent_id: "test-parent-id",
			type: "data",
		};

		render(<NotificationHandler notification={notification} />);

		await waitFor(() => {
			expect(toast.info).toHaveBeenCalledWith("Starting grant application text generation pipeline...", {
				description: "current_pipeline_stage: 1, total_pipeline_stages: 9",
			});
		});
	});

	it("shows error toast for error events", async () => {
		const notification: RagProcessingStatusMessage = {
			data: {
				data: { recoverable: true },
				event: "generation_error",
				message: "An error occurred",
			},
			event: "generation_error",
			parent_id: "test-parent-id",
			type: "error",
		};

		render(<NotificationHandler notification={notification} />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("❌ Error: An error occurred", {
				description: "Please follow the instructions above to resolve this issue.",
				duration: 10_000,
			});
		});
	});

	it("shows warning toast for warning events", async () => {
		const notification: RagProcessingStatusMessage = {
			data: {
				event: "insufficient_context_error",
				message: "Insufficient context provided",
			},
			event: "insufficient_context_error",
			parent_id: "test-parent-id",
			type: "data",
		};

		render(<NotificationHandler notification={notification} />);

		await waitFor(() => {
			expect(toast.warning).toHaveBeenCalledWith("⚠️ Insufficient context provided", {
				description: undefined,
				duration: 8000,
			});
		});
	});

	it("shows success toast for success events", async () => {
		const notification: RagProcessingStatusMessage = {
			data: {
				event: "application_saved",
				message: "Application saved successfully",
			},
			event: "application_saved",
			parent_id: "test-parent-id",
			type: "data",
		};

		render(<NotificationHandler notification={notification} />);

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalledWith("✓ Application saved successfully", {
				duration: 5000,
			});
		});
	});

	it("shows info toast for unknown events", async () => {
		const notification: RagProcessingStatusMessage = {
			data: {
				data: { key1: "value1", key2: "value2" },
				event: "unknown_event",
				message: "Some information",
			},
			event: "unknown_event",
			parent_id: "test-parent-id",
			type: "data",
		};

		render(<NotificationHandler notification={notification} />);

		await waitFor(() => {
			expect(toast.info).toHaveBeenCalledWith("Some information", {
				description: "key1: value1, key2: value2",
			});
		});
	});

	it("shows multiple info toasts for progress events", async () => {
		const firstNotification: RagProcessingStatusMessage = {
			data: {
				data: {
					current_pipeline_stage: 1,
					total_pipeline_stages: 9,
				},
				event: "grant_application_generation_started",
				message: "Starting...",
			},
			event: "grant_application_generation_started",
			parent_id: "test-parent-id",
			type: "data",
		};

		const secondNotification: RagProcessingStatusMessage = {
			data: {
				data: {
					current_pipeline_stage: 2,
					total_pipeline_stages: 9,
				},
				event: "validating_template",
				message: "Validating...",
			},
			event: "validating_template",
			parent_id: "test-parent-id",
			type: "data",
		};

		const { rerender } = render(<NotificationHandler notification={firstNotification} />);

		await waitFor(() => {
			expect(toast.info).toHaveBeenCalledWith("Starting...", expect.any(Object));
		});

		rerender(<NotificationHandler notification={secondNotification} />);

		await waitFor(() => {
			expect(toast.info).toHaveBeenCalledWith("Validating...", expect.any(Object));
		});
	});

	it("does not show description for error without recoverable flag", async () => {
		const notification: RagProcessingStatusMessage = {
			data: {
				data: { recoverable: false },
				event: "generation_error",
				message: "An error occurred",
			},
			event: "generation_error",
			parent_id: "test-parent-id",
			type: "error",
		};

		render(<NotificationHandler notification={notification} />);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("❌ Error: An error occurred", {
				description: undefined,
				duration: 10_000,
			});
		});
	});
});

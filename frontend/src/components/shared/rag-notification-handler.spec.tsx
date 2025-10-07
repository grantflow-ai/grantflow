import { render } from "@testing-library/react";
import { toast } from "sonner";
import { RagProcessingStatusMessageFactory } from "testing/factories";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RagProcessingStatusMessage } from "@/hooks/use-application-notifications";
import { ERROR_EVENTS, type NotificationEvent, SUCCESS_EVENTS, WARNING_EVENTS } from "@/types/notification-events";
import { RagNotificationHandler } from "./rag-notification-handler";

vi.mock("sonner", () => ({
	toast: {
		dismiss: vi.fn(),
		error: vi.fn().mockReturnValue("mock-toast-id"),
		info: vi.fn().mockReturnValue("mock-toast-id"),
		success: vi.fn().mockReturnValue("mock-toast-id"),
		warning: vi.fn().mockReturnValue("mock-toast-id"),
	},
}));

describe("RagNotificationHandler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Template Generation Events", () => {
		it("displays toast for cfp_data_extracted with organization and subject", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: {
					organization: "Test Organization",
					subject: "This is a test subject that is quite long and will be truncated",
				},
				event: "cfp_data_extracted",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✓ Cfp Data Extracted",
				expect.objectContaining({
					description:
						"Extracted grant details from organization Test Organization: This is a test subject that is quite long and will be trunca...",
				}),
			);
		});

		it("displays toast for cfp_data_extracted with unknown organization", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: {
					organization: "unknown",
					subject: "Test subject",
				},
				event: "cfp_data_extracted",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✓ Cfp Data Extracted",
				expect.objectContaining({
					description: "Extracted grant details: Test subject...",
				}),
			);
		});

		it("displays toast for grant_template_created", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: {
					organization: "Test Org",
					sections_created: 5,
				},
				event: "grant_template_created",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✓ Grant Template Created",
				expect.objectContaining({
					description: "Created template with 5 sections for Test Org",
					duration: 5000,
				}),
			);
		});

		it("displays toast for metadata_generated", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { sections_created: 5 },
				event: "metadata_generated",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✓ Metadata Generated",
				expect.objectContaining({
					description: expect.stringMatching(/^Generated metadata for \d+ sections$/),
					duration: 5000,
				}),
			);
		});
	});

	describe("Application Generation Events", () => {
		it("displays toast for relationships_extracted", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { relationships_count: 10 },
				event: "relationships_extracted",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✓ Relationships Extracted",
				expect.objectContaining({
					description: expect.stringMatching(/^Identified \d+ relationships?$/),
					duration: 5000,
				}),
			);
		});

		it("displays toast for objectives_enriched", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { objectives: 3, tasks: 8 },
				event: "objectives_enriched",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✓ Objectives Enriched",
				expect.objectContaining({
					description: expect.stringMatching(/^Enriched \d+ objectives? with \d+ research tasks?$/),
					duration: 5000,
				}),
			);
		});

		it("displays toast for wikidata_enhancement_complete with singular term", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { terms_added: 1 },
				event: "wikidata_enhancement_complete",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✓ Wikidata Enhancement Complete",
				expect.objectContaining({
					description: "Enhanced content with 1 additional term",
					duration: 5000,
				}),
			);
		});

		it("displays toast for wikidata_enhancement_complete with plural terms", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { terms_added: 25 },
				event: "wikidata_enhancement_complete",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✓ Wikidata Enhancement Complete",
				expect.objectContaining({
					description: "Enhanced content with 25 additional terms",
					duration: 5000,
				}),
			);
		});

		it("displays toast for research_plan_completed", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { objectives: 3, tasks: 10, words: 1000 },
				event: "research_plan_completed",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✅ Completed: Research Plan Completed",
				expect.objectContaining({
					description: expect.stringMatching(
						/^Research plan ready with \d+ objectives?, \d+ tasks? \(\d+ words\)$/,
					),
					duration: 8000,
				}),
			);
		});

		it("displays toast for section_texts_generated", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { sections_generated: 5 },
				event: "section_texts_generated",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✓ Section Texts Generated",
				expect.objectContaining({
					description: expect.stringMatching(/^Generated content for \d+ sections?$/),
					duration: 5000,
				}),
			);
		});

		it("displays toast for grant_application_generation_completed", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { word_count: 2500 },
				event: "grant_application_generation_completed",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✅ Completed: Grant Application Generation Completed",
				expect.objectContaining({
					description: expect.stringMatching(/^Application complete with [\d,]+ words$/),
					duration: 8000,
				}),
			);
		});
	});

	describe("Error Events", () => {
		it("displays error toast for indexing_failed", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { error_type: "indexing_failed", message: "Failed to index document", recoverable: true },
				event: "indexing_failed",
				type: "error",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.error).toHaveBeenCalledWith(
				"❌ Error: Processing indexing failed",
				expect.objectContaining({
					description: "Please follow the instructions above to resolve this issue.",
					duration: 10_000,
				}),
			);
		});

		it("displays error toast for internal_error without recoverable flag", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { error_type: "internal_error", message: "Internal server error" },
				event: "internal_error",
				type: "error",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.error).toHaveBeenCalledWith("❌ Error: Processing internal error", {
				description: undefined,
				duration: 10_000,
			});
		});

		it("displays error toast for pipeline_error", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { error_type: "pipeline_error", message: "Pipeline error occurred", recoverable: false },
				event: "pipeline_error",
				type: "error",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.error).toHaveBeenCalledWith("❌ Error: Processing pipeline error", {
				description: undefined,
				duration: 10_000,
			});
		});
	});

	describe("Warning Events", () => {
		it("displays warning toast for indexing_timeout", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { retryable: true, suggestion: "Please wait a moment and try again." },
				event: "indexing_timeout",
				type: "warning",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.warning).toHaveBeenCalledWith(
				"⚠️ Processing indexing timeout",
				expect.objectContaining({
					description: "Please wait a moment and try again.",
					duration: 8000,
				}),
			);
		});

		it("displays warning toast for insufficient_context_error with default retry message", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { retryable: true },
				event: "insufficient_context_error",
				type: "warning",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.warning).toHaveBeenCalledWith(
				"⚠️ Processing insufficient context error",
				expect.objectContaining({
					description: "This operation will be automatically retried.",
					duration: 8000,
				}),
			);
		});

		it("displays warning toast for llm_timeout", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { retryable: true, suggestion: "AI processing is taking longer than expected" },
				event: "llm_timeout",
				type: "warning",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.warning).toHaveBeenCalledWith(
				"⚠️ Processing llm timeout",
				expect.objectContaining({
					description: expect.any(String),
					duration: 8000,
				}),
			);
		});

		it("displays warning toast for job_cancelled", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { retryable: false },
				event: "job_cancelled",
				type: "warning",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.warning).toHaveBeenCalledWith(
				"⚠️ Processing job cancelled",
				expect.objectContaining({
					description: undefined,
					duration: 8000,
				}),
			);
		});
	});

	describe("Toast Dismissal Logic", () => {
		it("does not dismiss toast for success events", () => {
			const initialNotification = RagProcessingStatusMessageFactory.build({
				data: { sections_created: 5 },
				event: "metadata_generated",
				type: "success",
			});

			const { rerender } = render(<RagNotificationHandler notification={initialNotification} />);

			vi.clearAllMocks();

			const successNotification = RagProcessingStatusMessageFactory.build({
				data: { organization: "Test Org", sections_created: 5 },
				event: "grant_template_created",
				type: "success",
			});

			rerender(<RagNotificationHandler notification={successNotification} />);

			expect(toast.dismiss).not.toHaveBeenCalled();
		});
	});

	describe("Pluralization Helper", () => {
		it("handles singular counts correctly", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { relationships_count: 1 },
				event: "relationships_extracted",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✓ Relationships Extracted",
				expect.objectContaining({
					description: "Identified 1 relationship",
				}),
			);
		});

		it("handles plural counts correctly", () => {
			const notification = RagProcessingStatusMessageFactory.build({
				data: { objectives: 1, tasks: 1 },
				event: "objectives_enriched",
				type: "success",
			});

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.success).toHaveBeenCalledWith(
				"✓ Objectives Enriched",
				expect.objectContaining({
					description: "Enriched 1 objective with 1 research task",
				}),
			);
		});
	});

	describe("Info Toast Fallback", () => {
		it("does not display info toast for unknown event types that are not NotificationEvents", () => {
			const notification: RagProcessingStatusMessage = {
				application_data: undefined,
				data: {
					custom_field: "value",
				},
				event: "unknown_event" as never,
				parent_id: "test-app-id",
				type: "info",
			};

			render(<RagNotificationHandler notification={notification} />);

			expect(toast.info).not.toHaveBeenCalled();
		});
	});

	describe("Event Categorization", () => {
		ERROR_EVENTS.forEach((event) => {
			it(`categorizes ${event} as error event`, () => {
				const notification = RagProcessingStatusMessageFactory.build({
					data: { error_type: event, message: "Error occurred" },
					event,
					type: "error",
				});

				render(<RagNotificationHandler notification={notification} />);

				expect(toast.error).toHaveBeenCalled();
			});
		});

		WARNING_EVENTS.forEach((event) => {
			it(`categorizes ${event} as warning event`, () => {
				const notification = RagProcessingStatusMessageFactory.build({
					data: { retryable: true },
					event,
					type: "warning",
				});

				render(<RagNotificationHandler notification={notification} />);

				expect(toast.warning).toHaveBeenCalled();
			});
		});

		SUCCESS_EVENTS.forEach((event) => {
			it(`categorizes ${event} as success event`, () => {
				const eventData: Partial<Record<NotificationEvent, Record<string, unknown>>> = {
					cfp_data_extracted: { organization: "Test Org", subject: "Test" },
					grant_application_generation_completed: { word_count: 2500 },
					grant_template_created: { organization: "Test Org", sections_created: 5 },
					metadata_generated: { sections_created: 5 },
					objectives_enriched: { objectives: 3, tasks: 8 },
					relationships_extracted: { relationships_count: 10 },
					research_plan_completed: { objectives: 3, tasks: 10, words: 1000 },
					section_texts_generated: { sections_generated: 5 },
					wikidata_enhancement_complete: { terms_added: 15 },
				};

				const notification = RagProcessingStatusMessageFactory.build({
					data: eventData[event],
					event,
					type: "success",
				});

				render(<RagNotificationHandler notification={notification} />);

				expect(toast.success).toHaveBeenCalled();
			});
		});
	});
});

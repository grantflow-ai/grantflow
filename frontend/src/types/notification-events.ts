export type ApplicationGenerationEvent =
	| "grant_application_generation_completed"
	| "objectives_enriched"
	| "relationships_extracted"
	| "research_plan_completed"
	| "section_texts_generated"
	| "wikidata_enhancement_complete"
	| ErrorEvent
	| WarningEvent;

export type ApplicationProgressEvent = Exclude<ApplicationGenerationEvent, RagErrorEvent>;

export type ErrorEvent = "indexing_failed" | "internal_error" | "pipeline_error";

export type NotificationEvent = ApplicationGenerationEvent | TemplateGenerationEvent;

export type ProgressEvent = Exclude<NotificationEvent, RagErrorEvent>;

export type RagErrorEvent = ErrorEvent | WarningEvent;

export type TemplateGenerationEvent =
	| "cfp_data_extracted"
	| "grant_template_created"
	| "metadata_generated"
	| ErrorEvent
	| WarningEvent;

export type WarningEvent = "indexing_timeout" | "insufficient_context_error" | "job_cancelled" | "llm_timeout";

export function isApplicationProgressEvent(event: unknown): event is ApplicationProgressEvent {
	return (
		typeof event === "string" &&
		[
			"grant_application_generation_completed",
			"objectives_enriched",
			"relationships_extracted",
			"research_plan_completed",
			"section_texts_generated",
			"wikidata_enhancement_complete",
		].includes(event)
	);
}

export function isProgressEvent(event: unknown): event is ProgressEvent {
	const successEvents = [
		"cfp_data_extracted",
		"grant_application_generation_completed",
		"grant_template_created",
		"metadata_generated",
		"objectives_enriched",
		"relationships_extracted",
		"research_plan_completed",
		"section_texts_generated",
		"wikidata_enhancement_complete",
	];
	return typeof event === "string" && successEvents.includes(event);
}

export function isRagErrorEvent(event: unknown): event is RagErrorEvent {
	const ragErrorEvents = [
		"indexing_failed",
		"indexing_timeout",
		"insufficient_context_error",
		"internal_error",
		"job_cancelled",
		"llm_timeout",
		"pipeline_error",
	];
	return typeof event === "string" && ragErrorEvents.includes(event);
}

export function isTemplateEvent(event: unknown): event is TemplateGenerationEvent {
	const templateEvents = [
		"cfp_data_extracted",
		"grant_template_created",
		"indexing_failed",
		"indexing_timeout",
		"insufficient_context_error",
		"internal_error",
		"job_cancelled",
		"llm_timeout",
		"metadata_generated",
		"pipeline_error",
	];
	return typeof event === "string" && templateEvents.includes(event);
}

export const ERROR_EVENTS = new Set<NotificationEvent>(["indexing_failed", "internal_error", "pipeline_error"]);

export const WARNING_EVENTS = new Set<NotificationEvent>([
	"indexing_timeout",
	"insufficient_context_error",
	"job_cancelled",
	"llm_timeout",
]);

export const SUCCESS_EVENTS = new Set<NotificationEvent>([
	"cfp_data_extracted",
	"grant_application_generation_completed",
	"grant_template_created",
	"metadata_generated",
	"objectives_enriched",
	"relationships_extracted",
	"research_plan_completed",
	"section_texts_generated",
	"wikidata_enhancement_complete",
]);

export function isNotificationEvent(event: unknown): event is NotificationEvent {
	const notificationEvents = [
		"indexing_failed",
		"internal_error",
		"pipeline_error",
		"indexing_timeout",
		"insufficient_context_error",
		"job_cancelled",
		"llm_timeout",
		"cfp_data_extracted",
		"grant_application_generation_completed",
		"grant_template_created",
		"metadata_generated",
		"objectives_enriched",
		"relationships_extracted",
		"research_plan_completed",
		"section_texts_generated",
		"wikidata_enhancement_complete",
	];
	return typeof event === "string" && notificationEvents.includes(event);
}

export type ApplicationGenerationEvent =
	| "grant_application_generation_completed"
	| "indexing_failed"
	| "indexing_timeout"
	| "insufficient_context_error"
	| "internal_error"
	| "job_cancelled"
	| "llm_timeout"
	| "objectives_enriched"
	| "pipeline_error"
	| "relationships_extracted"
	| "research_plan_completed"
	| "section_texts_generated"
	| "wikidata_enhancement_complete";

export type NotificationEvent = ApplicationGenerationEvent | TemplateGenerationEvent;

export type TemplateGenerationEvent =
	| "cfp_data_extracted"
	| "grant_template_created"
	| "indexing_failed"
	| "indexing_timeout"
	| "insufficient_context_error"
	| "internal_error"
	| "job_cancelled"
	| "llm_timeout"
	| "metadata_generated"
	| "pipeline_error"
	| "sections_extracted";

export function isApplicationEvent(event: NotificationEvent): event is ApplicationGenerationEvent {
	return [
		"grant_application_generation_completed",
		"objectives_enriched",
		"relationships_extracted",
		"research_plan_completed",
		"section_texts_generated",
		"wikidata_enhancement_complete",
	].includes(event);
}

export function isTemplateEvent(event: NotificationEvent): event is TemplateGenerationEvent {
	return ["cfp_data_extracted", "grant_template_created", "metadata_generated", "sections_extracted"].includes(event);
}

export const ERROR_EVENTS = new Set<NotificationEvent>([
	"indexing_failed",
	"indexing_timeout",
	"insufficient_context_error",
	"internal_error",
	"job_cancelled",
	"llm_timeout",
	"pipeline_error",
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
	"sections_extracted",
	"wikidata_enhancement_complete",
]);

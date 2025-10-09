const TEMPLATE_PROGRESS_EVENT_VALUES = ["cfp_data_extracted", "metadata_generated"] as const;
const APPLICATION_PROGRESS_EVENT_VALUES = [
	"objectives_enriched",
	"relationships_extracted",
	"research_plan_completed",
	"section_texts_generated",
	"wikidata_enhancement_complete",
] as const;
const PROGRESS_EVENT_VALUES = [...APPLICATION_PROGRESS_EVENT_VALUES, ...TEMPLATE_PROGRESS_EVENT_VALUES] as const;

const TEMPLATE_SUCCESS_EVENT_VALUE = "grant_template_created";
const APPLICATION_SUCCESS_EVENT_VALUE = "grant_application_generation_completed";
const SUCCESS_EVENT_VALUES = [APPLICATION_SUCCESS_EVENT_VALUE, TEMPLATE_SUCCESS_EVENT_VALUE] as const;

const ERROR_EVENT_VALUES = ["indexing_failed", "internal_error", "pipeline_error"] as const;
const WARNING_EVENT_VALUES = [
	"indexing_timeout",
	"insufficient_context_error",
	"job_cancelled",
	"llm_timeout",
] as const;
const RAG_PIPELINE_ERROR_EVENT_VALUES = [...ERROR_EVENT_VALUES, ...WARNING_EVENT_VALUES] as const;

const TEMPLATE_EVENT_VALUES = [
	...TEMPLATE_PROGRESS_EVENT_VALUES,
	TEMPLATE_SUCCESS_EVENT_VALUE,
	...ERROR_EVENT_VALUES,
	...WARNING_EVENT_VALUES,
] as const;

const APPLICATION_GENERATION_EVENT_VALUES = [
	...APPLICATION_PROGRESS_EVENT_VALUES,
	APPLICATION_SUCCESS_EVENT_VALUE,
] as const;

const GENERATION_EVENT_VALUES = [...PROGRESS_EVENT_VALUES, ...SUCCESS_EVENT_VALUES] as const;
const RAG_EVENT_VALUES = [...APPLICATION_GENERATION_EVENT_VALUES, ...TEMPLATE_EVENT_VALUES] as const;

export type ApplicationGenerationEvent = (typeof APPLICATION_GENERATION_EVENT_VALUES)[number];
export type GenerationEvent = (typeof GENERATION_EVENT_VALUES)[number];
export type ProgressEvent = (typeof PROGRESS_EVENT_VALUES)[number];
export type RagEvent = (typeof RAG_EVENT_VALUES)[number];
export type RagPipelineErrorEvent = (typeof RAG_PIPELINE_ERROR_EVENT_VALUES)[number];
export type TemplateEvent = (typeof TEMPLATE_EVENT_VALUES)[number];

const APPLICATION_GEN_EVENTS = new Set<string>(APPLICATION_GENERATION_EVENT_VALUES);
const GENERATION_EVENTS = new Set<string>(GENERATION_EVENT_VALUES);
const RAG_EVENTS = new Set<string>(RAG_EVENT_VALUES);
const RAG_PIPELINE_ERROR_EVENTS = new Set<string>(RAG_PIPELINE_ERROR_EVENT_VALUES);
const TEMPLATE_EVENTS = new Set<string>(TEMPLATE_EVENT_VALUES);

export const ERROR_EVENTS = new Set<string>(ERROR_EVENT_VALUES);
export const WARNING_EVENTS = new Set<string>(WARNING_EVENT_VALUES);
export const PROGRESS_EVENTS = new Set<string>(PROGRESS_EVENT_VALUES);
export const SUCCESS_EVENTS = new Set<string>(SUCCESS_EVENT_VALUES);

export function isApplicationGenEvent(event: unknown): event is ApplicationGenerationEvent {
	return typeof event === "string" && APPLICATION_GEN_EVENTS.has(event);
}
export function isGenerationEvent(event: unknown): event is GenerationEvent {
	return typeof event === "string" && GENERATION_EVENTS.has(event);
}
export function isRagEvent(event: unknown): event is RagEvent {
	return typeof event === "string" && RAG_EVENTS.has(event);
}
export function isRagPipelineErrorEvent(event: unknown): event is RagPipelineErrorEvent {
	return typeof event === "string" && RAG_PIPELINE_ERROR_EVENTS.has(event);
}
export function isTemplateEvent(event: unknown): event is TemplateEvent {
	return typeof event === "string" && TEMPLATE_EVENTS.has(event);
}

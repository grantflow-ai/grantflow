import { Factory } from "interface-forge";

import { API } from "@/types/api-types";

export const ApplicationFactory = new Factory<API.CreateApplication.Http201.ResponseBody>((factory) => ({
	created_at: factory.date.recent().toISOString(),
	grant_template: undefined,
	id: factory.string.uuid(),
	rag_sources: [],
	status: "DRAFT",
	title: factory.lorem.sentence({ max: 5, min: 3 }),
	updated_at: factory.date.recent().toISOString(),
	workspace_id: factory.string.uuid(),
}));

export const ApplicationWithTemplateFactory = new Factory<API.RetrieveApplication.Http200.ResponseBody>((factory) => ({
	created_at: factory.date.recent().toISOString(),
	grant_template: {
		created_at: factory.date.recent().toISOString(),
		funding_organization: {
			abbreviation: factory.company.name().slice(0, 5).toUpperCase(),
			created_at: factory.date.recent().toISOString(),
			full_name: factory.company.name(),
			id: factory.string.uuid(),
			updated_at: factory.date.recent().toISOString(),
		},
		funding_organization_id: factory.string.uuid(),
		grant_application_id: factory.string.uuid(),
		grant_sections: [
			{
				depends_on: [],
				generation_instructions: factory.lorem.sentence(),
				id: factory.string.uuid(),
				is_clinical_trial: false,
				is_detailed_workplan: false,
				keywords: [factory.lorem.word(), factory.lorem.word()],
				max_words: 500,
				order: 0,
				parent_id: null,
				search_queries: [factory.lorem.sentence()],
				title: "Executive Summary",
				topics: [factory.lorem.word()],
			},
			{
				depends_on: [],
				generation_instructions: factory.lorem.sentence(),
				id: factory.string.uuid(),
				is_clinical_trial: false,
				is_detailed_workplan: false,
				keywords: [factory.lorem.word(), factory.lorem.word()],
				max_words: 1000,
				order: 1,
				parent_id: null,
				search_queries: [factory.lorem.sentence()],
				title: "Project Description",
				topics: [factory.lorem.word()],
			},
		],
		id: factory.string.uuid(),
		rag_sources: [],
		submission_date: undefined,
		updated_at: factory.date.recent().toISOString(),
	},
	id: factory.string.uuid(),
	rag_sources: [],
	status: "DRAFT",
	title: factory.lorem.sentence({ max: 5, min: 3 }),
	updated_at: factory.date.recent().toISOString(),
	workspace_id: factory.string.uuid(),
}));

export const RagSourceFactory = new Factory<API.RetrieveApplication.Http200.ResponseBody["rag_sources"][0]>(
	(factory) => ({
		filename: factory.helpers.maybe(
			() => `${factory.lorem.word()}.${factory.helpers.arrayElement(["pdf", "doc", "txt", "csv"])}`,
		),
		sourceId: factory.string.uuid(),
		status: factory.helpers.arrayElement(["FAILED", "FINISHED", "INDEXING"] as const),
		url: factory.helpers.maybe(() => factory.internet.url()),
	}),
);

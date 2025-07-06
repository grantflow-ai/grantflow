import { GrantSectionDetailedFactory, RagJobResponseFactory } from "::testing/factories";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger";
import { triggerWebSocketScenario } from "../websocket";
import { applicationStore } from "./applications";

export const ragHandlers = {
	generateGrantTemplate: async ({ params }: { params?: Record<string, string> }): Promise<void> => {
		const applicationId = params?.application_id;
		const templateId = params?.template_id;

		if (!(applicationId && templateId)) {
			throw new Error("Application ID and Template ID required");
		}

		log.info("[Mock API] Generating grant template", { applicationId, templateId });

		log.info("[Mock API] Triggering grant template WebSocket scenario", {
			applicationId,
			scenarioName: "grant-template-generation",
			templateId,
		});
		triggerWebSocketScenario(applicationId, "grant-template-generation");

		setTimeout(() => {
			const application = applicationStore.get(applicationId);
			if (application?.grant_template) {
				const sections = GrantSectionDetailedFactory.batch(8).map((section, index) => ({
					...section,
					order: index + 1,
					title:
						[
							"Executive Summary",
							"Research Background",
							"Objectives and Hypotheses",
							"Methodology",
							"Expected Outcomes",
							"Timeline and Milestones",
							"Budget Justification",
							"Team and Resources",
						][index] || section.title,
				}));

				const updatedApplication = {
					...application,
					grant_template: {
						...application.grant_template,
						grant_sections: sections,
						rag_job_id: crypto.randomUUID(),
					},
				};

				applicationStore.set(applicationId, updatedApplication);
				log.info("[Mock API] Grant template sections generated", {
					applicationId,
					sectionCount: sections.length,
				});
			}
		}, 2000);
	},
	getRagJob: async ({
		params,
	}: {
		params?: Record<string, string>;
	}): Promise<API.RetrieveRagJob.Http200.ResponseBody> => {
		const jobId = params?.job_id;
		if (!jobId) {
			throw new Error("Job ID required");
		}

		return RagJobResponseFactory.build({
			completed_at: new Date().toISOString(),
			id: jobId,
			status: "COMPLETED",
		});
	},

	updateGrantTemplate: async ({
		params,
	}: {
		body?: any;
		params?: Record<string, string>;
	}): Promise<API.UpdateGrantTemplate.Http200.ResponseBody> => {
		const templateId = params?.template_id;
		if (!templateId) {
			throw new Error("Template ID required");
		}

		return undefined;
	},
};

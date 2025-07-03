import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	FormInputsFactory,
	RagSourceFileFactory,
	RagSourceUrlFactory,
	ResearchObjectiveFactory,
} from "::testing/factories";
import { getScenario } from "@/dev-tools";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger";
import { getMockAPIClient } from "../client";

// Use global to persist store across hot reloads in development
interface GlobalStore {
	__MOCK_APPLICATION_STORE__?: Map<string, API.RetrieveApplication.Http200.ResponseBody>;
}
const globalStore = globalThis as unknown as GlobalStore;
if (!globalStore.__MOCK_APPLICATION_STORE__) {
	globalStore.__MOCK_APPLICATION_STORE__ = new Map<string, API.RetrieveApplication.Http200.ResponseBody>();
}
export const applicationStore: Map<string, API.RetrieveApplication.Http200.ResponseBody> =
	globalStore.__MOCK_APPLICATION_STORE__;

export const applicationHandlers = {
	createApplication: async ({
		body,
		params,
	}: {
		body?: any;
		params?: Record<string, string>;
	}): Promise<API.CreateApplication.Http201.ResponseBody> => {
		const requestBody = body as API.CreateApplication.RequestBody;
		const projectId = params?.project_id;
		if (!projectId) {
			throw new Error("Project ID required");
		}

		log.info("[Mock API] Creating application", { title: requestBody.title });
		const id = crypto.randomUUID();
		const application = ApplicationFactory.build({
			form_inputs: undefined,
			grant_template: undefined,
			id,
			project_id: projectId,
			research_objectives: undefined,
			status: "DRAFT",
			title: requestBody.title,
		});
		applicationStore.set(id, application);
		return application;
	},

	deleteApplication: async ({ params }: { params?: Record<string, string> }): Promise<void> => {
		const applicationId = params?.application_id;
		if (!applicationId) {
			throw new Error("Application ID required");
		}

		log.info("[Mock API] Deleting application", { applicationId });
		applicationStore.delete(applicationId);
	},

	generateApplication: async ({
		params,
	}: {
		params?: Record<string, string>;
	}): Promise<API.GenerateApplication.Http201.ResponseBody> => {
		const applicationId = params?.application_id;
		if (!applicationId) {
			throw new Error("Application ID required");
		}

		log.info("[Mock API] Generating application", { applicationId });

		const application = applicationStore.get(applicationId);
		if (!application) {
			throw new Error("Application not found");
		}

		const generatedText =
			"This is a mock generated application text. It would normally contain AI-generated content based on the template and sources.";

		const updatedApplication = {
			...application,
			form_inputs: FormInputsFactory.build() as unknown, // Factory returns correct type but TS inference issue
			research_objectives: ResearchObjectiveFactory.batch(3),
			status: "IN_PROGRESS" as const,
			text: generatedText,
		};
		applicationStore.set(applicationId, updatedApplication as Parameters<typeof applicationStore.set>[1]);

		return undefined;
	},

	getRagSources: async ({
		params,
	}: {
		params?: Record<string, string>;
	}): Promise<API.RetrieveGrantApplicationRagSources.Http200.ResponseBody> => {
		const applicationId = params?.application_id;
		if (!applicationId) {
			throw new Error("Application ID required");
		}

		log.info("[Mock API] Getting RAG sources for application", { applicationId });

		return [...RagSourceFileFactory.batch(2), ...RagSourceUrlFactory.batch(1)];
	},

	retrieveApplication: async ({
		params,
	}: {
		params?: Record<string, string>;
	}): Promise<API.RetrieveApplication.Http200.ResponseBody> => {
		const applicationId = params?.application_id;
		if (!applicationId) {
			throw new Error("Application ID required");
		}

		const projectId = params?.project_id;
		log.info("[Mock API] Retrieving application", { applicationId, projectId });

		const existingApplication = applicationStore.get(applicationId);
		if (existingApplication) {
			if (projectId && existingApplication.project_id !== projectId) {
				log.warn("[Mock API] Project ID mismatch", {
					actualProjectId: existingApplication.project_id,
					applicationId,
					requestedProjectId: projectId,
				});
			}
			log.info("[Mock API] Returning application from store", { applicationId });
			return existingApplication;
		}

		const currentScenarioName = getMockAPIClient().getCurrentScenarioName();
		const scenario = getScenario(currentScenarioName);
		const scenarioApplication = scenario?.data.applications.get(applicationId);

		if (scenarioApplication) {
			log.info("[Mock API] Application not in store, using scenario data", {
				applicationId,
				scenario: currentScenarioName,
			});
			applicationStore.set(applicationId, scenarioApplication);
			return scenarioApplication;
		}

		log.info("[Mock API] Application not found in store or scenario, creating new one", { applicationId });
		const application = ApplicationWithTemplateFactory.build({
			id: applicationId,
		});
		applicationStore.set(applicationId, application);
		return application;
	},

	updateApplication: async ({
		body,
		params,
	}: {
		body?: any;
		params?: Record<string, string>;
	}): Promise<API.UpdateApplication.Http200.ResponseBody> => {
		const requestBody = body as API.UpdateApplication.RequestBody;
		const applicationId = params?.application_id;
		if (!applicationId) {
			throw new Error("Application ID required");
		}

		log.info("[Mock API] Updating application", { applicationId, body });

		const existingApplication = applicationStore.get(applicationId);
		if (!existingApplication) {
			throw new Error("Application not found");
		}

		const updatedApplication = {
			...existingApplication,
			...requestBody,
			updated_at: new Date().toISOString(),
		};
		applicationStore.set(applicationId, updatedApplication as Parameters<typeof applicationStore.set>[1]);

		// Return the full updated application
		return updatedApplication as API.UpdateApplication.Http200.ResponseBody;
	},
};

// Function to clear the global application store when switching scenarios
export function clearApplicationStore(): void {
	applicationStore.clear();
	log.info("[Mock API] Application store cleared");
}

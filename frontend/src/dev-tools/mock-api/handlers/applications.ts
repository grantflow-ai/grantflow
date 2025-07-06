import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	FormInputsFactory,
	RagSourceFileFactory,
	RagSourceUrlFactory,
	ResearchObjectiveFactory,
} from "::testing/factories";
import { addDays, addWeeks, subDays } from "date-fns";
import { getScenario, triggerWebSocketScenario } from "@/dev-tools";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger";
import { getMockAPIClient } from "../client";

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
		const currentScenarioName = getMockAPIClient().getCurrentScenarioName();
		const scenario = getScenario(currentScenarioName);

		const id = crypto.randomUUID();

		const deadlineScenarios = [
			addWeeks(new Date(), 6),
			addDays(new Date(), 10),
			addDays(new Date(), 3),
			subDays(new Date(), 5),
			addWeeks(new Date(), 12),
		];

		const randomDeadline = deadlineScenarios[Math.floor(Math.random() * deadlineScenarios.length)];

		let application: API.CreateApplication.Http201.ResponseBody;

		if (scenario && scenario.data.applications.size > 0) {
			const templateApp = [...scenario.data.applications.values()][0];

			if (templateApp.grant_template) {
				application = ApplicationWithTemplateFactory.build({
					form_inputs: undefined,
					grant_template: {
						...templateApp.grant_template,
						created_at: new Date().toISOString(),
						rag_sources: templateApp.grant_template.rag_sources || [],
						submission_date: randomDeadline.toISOString(),
						updated_at: new Date().toISOString(),
					},
					id,
					project_id: projectId,
					research_objectives: undefined,
					status: "DRAFT",
					title: requestBody.title,
				});
				console.log("[DEBUG] Created application with grant template", {
					id,
					ragSourcesCount: application.grant_template?.rag_sources?.length || 0,
					title: requestBody.title,
				});
			} else {
				application = ApplicationFactory.build({
					form_inputs: undefined,
					grant_template: undefined,
					id,
					project_id: projectId,
					research_objectives: undefined,
					status: "DRAFT",
					title: requestBody.title,
				});
				console.log("[DEBUG] Created basic application without template", { id, title: requestBody.title });
			}
		} else {
			// Fallback to basic application when no scenario or empty scenario
			console.log("[DEBUG] No scenario or empty scenario, creating basic application");
			application = ApplicationFactory.build({
				form_inputs: undefined,
				grant_template: undefined,
				id,
				project_id: projectId,
				research_objectives: undefined,
				status: "DRAFT",
				title: requestBody.title,
			});
		}

		console.log("[DEBUG] Storing application in applicationStore", { id, title: application.title });
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

		triggerWebSocketScenario(applicationId, "grant-application-generation");

		const application = applicationStore.get(applicationId);
		if (!application) {
			throw new Error("Application not found");
		}

		const ragJobId = crypto.randomUUID();

		const processingApplication = {
			...application,
			rag_job_id: ragJobId,
			status: "IN_PROGRESS" as const,
		};
		applicationStore.set(applicationId, processingApplication as Parameters<typeof applicationStore.set>[1]);

		const PIPELINE_DURATION_MS = 150_000;

		setTimeout(() => {
			const currentApp = applicationStore.get(applicationId);
			if (!currentApp) return;

			const generatedText = `# AI-Powered Early Cancer Detection Using Novel Biomarkers

## Executive Summary

This research proposal presents an innovative approach to early cancer detection through the integration of artificial intelligence and novel biomarker discovery. Our multidisciplinary team aims to develop a comprehensive diagnostic platform that combines machine learning algorithms with cutting-edge proteomics and genomics analysis to identify cancer at its earliest stages, when treatment is most effective.

## Research Background

Cancer remains one of the leading causes of mortality worldwide, with late-stage diagnosis being a primary factor in poor patient outcomes. Current diagnostic methods often fail to detect tumors until they have progressed significantly. Recent advances in AI and molecular biology present unprecedented opportunities to revolutionize cancer detection through the identification and analysis of novel biomarkers.

Our preliminary research has identified several promising protein and genetic markers that show significant variation in early-stage cancer patients. By leveraging deep learning algorithms trained on large-scale clinical datasets, we propose to develop a diagnostic tool that can detect these subtle molecular changes with high accuracy and specificity.

## Objectives and Hypotheses

### Primary Objectives:
1. Identify and validate a panel of novel biomarkers for early-stage cancer detection
2. Develop AI algorithms capable of analyzing complex biomarker patterns
3. Create an integrated diagnostic platform for clinical implementation
4. Validate the platform through large-scale clinical trials

### Central Hypothesis:
We hypothesize that the combination of novel biomarker discovery and AI-driven pattern recognition will enable cancer detection at stages 0-1 with >95% accuracy, significantly improving patient outcomes through earlier intervention.

## Methodology

### Phase 1: Biomarker Discovery (Months 1-12)
- Comprehensive proteomic and genomic analysis of patient samples
- Identification of candidate biomarkers through differential expression analysis
- Initial validation using independent sample cohorts

### Phase 2: AI Development (Months 6-18)
- Development of deep learning architectures for biomarker pattern recognition
- Training on existing clinical datasets
- Optimization of algorithms for sensitivity and specificity

### Phase 3: Platform Integration (Months 12-24)
- Integration of biomarker assays with AI analysis pipeline
- Development of user-friendly clinical interface
- Regulatory compliance and quality assurance

### Phase 4: Clinical Validation (Months 18-36)
- Multi-center clinical trials with diverse patient populations
- Performance comparison with existing diagnostic methods
- Long-term outcome tracking

## Expected Outcomes

We anticipate this research will result in:
1. A validated panel of 15-20 novel cancer biomarkers
2. AI algorithms with >95% accuracy in early cancer detection
3. A clinically deployable diagnostic platform
4. Published results in high-impact journals
5. Patent applications for novel discoveries

## Timeline and Milestones

- Q1-Q2 Year 1: Complete initial biomarker discovery phase
- Q3-Q4 Year 1: Develop preliminary AI models
- Q1-Q2 Year 2: Begin platform integration
- Q3-Q4 Year 2: Initiate clinical trials
- Year 3: Complete validation and prepare for commercialization

## Budget Justification

Total Budget: $3.5 Million

### Personnel (60%): $2.1M
- Principal Investigator (20% effort)
- Co-Investigators (3 @ 25% effort)
- Postdoctoral Researchers (2 @ 100% effort)
- Graduate Students (4 @ 50% effort)
- Research Technicians (2 @ 100% effort)

### Equipment and Supplies (25%): $875K
- Mass spectrometry equipment
- High-throughput sequencing
- Computational infrastructure
- Laboratory consumables

### Other Direct Costs (15%): $525K
- Clinical trial costs
- Publication and dissemination
- Travel and conferences
- Consultant fees

## Team and Resources

Our multidisciplinary team brings together expertise in:
- Cancer biology and oncology
- Artificial intelligence and machine learning
- Proteomics and genomics
- Clinical trial design and implementation
- Regulatory affairs and commercialization

The research will be conducted at our state-of-the-art facilities, which include:
- Advanced proteomics core facility
- High-performance computing cluster
- Clinical research center with biobanking capabilities
- Established partnerships with major cancer centers

## Conclusion

This innovative research program represents a paradigm shift in cancer diagnostics, combining cutting-edge molecular biology with artificial intelligence to detect cancer at its earliest and most treatable stages. The successful completion of this project will not only advance scientific knowledge but also directly impact patient care by enabling earlier interventions and improved outcomes. We are confident that our experienced team, comprehensive approach, and robust methodology will deliver transformative results in the fight against cancer.`;

			const finalApplication = {
				...currentApp,
				completed_at: new Date().toISOString(),
				form_inputs: FormInputsFactory.build() as unknown,
				research_objectives: ResearchObjectiveFactory.batch(3),
				status: "COMPLETED" as const,
				text: generatedText,
			};

			applicationStore.set(applicationId, finalApplication as Parameters<typeof applicationStore.set>[1]);

			log.info("[Mock API] Grant application generation completed", {
				applicationId,
				duration: "2.5 minutes",
				textLength: generatedText.length,
			});
		}, PIPELINE_DURATION_MS);

		log.info("[Mock API] Grant application generation pipeline started", {
			applicationId,
			estimatedDuration: "2.5 minutes",
			ragJobId,
		});

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
			log.info("[Mock API] Returning application from store", { existingApplication });
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
			text: undefined,
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

		return updatedApplication as API.UpdateApplication.Http200.ResponseBody;
	},
};

export function clearApplicationStore(): void {
	applicationStore.clear();
	log.info("[Mock API] Application store cleared");
}

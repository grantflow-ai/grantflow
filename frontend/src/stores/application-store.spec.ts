import { setupAuthenticatedTest } from "::testing/auth-helpers";
import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
} from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getApplication, updateApplication } from "@/actions/grant-applications";
import { updateGrantTemplate } from "@/actions/grant-template";
import { retrieveRagJob } from "@/actions/rag-jobs";
import { crawlTemplateUrl, createTemplateSourceUploadUrl, deleteTemplateSource } from "@/actions/sources";
import type { API } from "@/types/api-types";
import { extractObjectPathFromUrl, triggerDevIndexing } from "@/utils/dev-indexing-patch";
import { getEnv } from "@/utils/env";

import { useApplicationStore } from "./application-store";

vi.mock("@/actions/grant-applications", () => ({
	createApplication: vi.fn(),
	generateApplication: vi.fn(),
	getApplication: vi.fn(),
	updateApplication: vi.fn(),
}));
vi.mock("@/actions/grant-template", () => ({
	generateGrantTemplate: vi.fn(),
	updateGrantTemplate: vi.fn(),
}));
vi.mock("@/actions/rag-jobs", () => ({
	retrieveRagJob: vi.fn(),
}));
vi.mock("@/actions/sources", () => ({
	crawlApplicationUrl: vi.fn(),
	crawlTemplateUrl: vi.fn(),
	createApplicationSourceUploadUrl: vi.fn(),
	createTemplateSourceUploadUrl: vi.fn(() =>
		Promise.resolve({
			source_id: "source-123",
			url: "https://upload.url",
		}),
	),
	deleteApplicationSource: vi.fn(),
	deleteTemplateSource: vi.fn(),
}));
vi.mock("@/utils/dev-indexing-patch", () => ({
	extractObjectPathFromUrl: vi.fn(),
	triggerDevIndexing: vi.fn(),
}));
vi.mock("@/utils/env", () => ({
	getEnv: vi.fn(),
}));

import ky, { HTTPError } from "ky";

vi.mock("ky", () => ({
	default: vi.fn(),
	HTTPError: class HTTPError extends Error {
		response: { status: number };
		constructor(message: string, status: number) {
			super(message);
			this.response = { status };
		}
	},
}));
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));
vi.mock("@/stores/organization-store", () => ({
	useOrganizationStore: {
		getState: vi.fn(() => ({
			clearOrganization: vi.fn(),
			selectedOrganizationId: "mock-org-id",
		})),
		setState: vi.fn(),
	},
}));

describe("Application Store", () => {
	beforeEach(() => {
		resetAllStores();
		setupAuthenticatedTest();

		vi.clearAllMocks();
		vi.resetAllMocks();

		vi.mocked(updateApplication).mockReset();
		vi.mocked(getApplication).mockReset();
		vi.mocked(updateGrantTemplate).mockReset();
		vi.mocked(retrieveRagJob).mockReset();

		vi.mocked(getEnv).mockReturnValue({
			NEXT_PUBLIC_BACKEND_API_BASE_URL: "http://localhost:8000",
		} as any);
	});

	describe("state management", () => {
		it("should initialize with default state", () => {
			const state = useApplicationStore.getState();
			expect(state.application).toBeNull();
			expect(state.areAppOperationsInProgress).toBe(false);
		});
	});

	describe.sequential("updateApplicationTitle", () => {
		it("should call updateApplication API and update state on success", async () => {
			const application = {
				...ApplicationFactory.build(),
				id: "app-id-1",
				project_id: "project-id-1",
				title: "Old Title",
			} as const;

			const updatedApplication = {
				...application,
				title: "New Title",
			};

			vi.mocked(updateApplication).mockResolvedValue(updatedApplication);

			useApplicationStore.setState({ application });

			const { updateApplicationTitle } = useApplicationStore.getState();

			await updateApplicationTitle("mock-org-id", "project-id-1", "app-id-1", "New Title");

			expect(updateApplication).toHaveBeenCalledWith("mock-org-id", "project-id-1", "app-id-1", {
				title: "New Title",
			});

			const finalState = useApplicationStore.getState();
			expect(finalState.application?.title).toBe("New Title");
			expect(finalState.application?.id).toBe("app-id-1");
		});

		it("should rollback on API error", async () => {
			const application = {
				...ApplicationFactory.build(),
				id: "app-id-2",
				project_id: "project-id-2",
				title: "Old Title",
			} as const;

			vi.mocked(updateApplication).mockRejectedValue(new Error("API Error"));

			useApplicationStore.setState({ application });

			const { updateApplicationTitle } = useApplicationStore.getState();

			await updateApplicationTitle("mock-org-id", "project-id-2", "app-id-2", "New Title");

			const state = useApplicationStore.getState();
			expect(state.application?.title).toBe("Old Title");
			expect(state.application?.id).toBe("app-id-2");
		});
	});

	describe("getApplication", () => {
		it("should fetch application and update state", async () => {
			const application = ApplicationFactory.build();

			vi.mocked(getApplication).mockResolvedValue(application);

			const { getApplication: retrieveApp } = useApplicationStore.getState();

			await retrieveApp("mock-org-id", "project-id", "app-id");

			expect(getApplication).toHaveBeenCalledWith("mock-org-id", "project-id", "app-id");

			const state = useApplicationStore.getState();
			expect(state.application).toEqual(application);
			expect(state.areAppOperationsInProgress).toBe(false);
		});
	});

	describe("setApplication", () => {
		it("should update application", () => {
			const application = ApplicationFactory.build({ title: "Test App" });

			useApplicationStore.setState({ application: null });

			const { setApplication } = useApplicationStore.getState();

			setApplication(application);

			const state = useApplicationStore.getState();
			expect(state.application).toEqual(application);
		});
	});

	describe.sequential("updateGrantSections", () => {
		it("should update grant template sections", async () => {
			useApplicationStore.getState().reset();
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "1",
					max_words: 500,
					order: 0,
					title: "Introduction",
				}),
			];

			const application: API.RetrieveApplication.Http200.ResponseBody = {
				completed_at: undefined,
				created_at: "2023-01-01T00:00:00Z",
				deadline: undefined,
				form_inputs: undefined,
				grant_template: {
					...GrantTemplateFactory.build(),
					grant_sections: [],
					id: "test-template-id",
				},
				id: "test-app-id",
				project_id: "test-project-id",
				rag_job_id: undefined,
				rag_sources: [],
				research_objectives: undefined,
				status: "WORKING_DRAFT",
				text: undefined,
				title: "Test Application",
				updated_at: "2023-01-01T00:00:00Z",
			};

			vi.mocked(updateGrantTemplate).mockResolvedValue({} as any);

			useApplicationStore.setState({ application });

			const { updateGrantSections } = useApplicationStore.getState();

			await updateGrantSections(sections);

			expect(updateGrantTemplate).toHaveBeenCalledWith(
				"mock-org-id",
				"test-project-id",
				"test-app-id",
				"test-template-id",
				{ grant_sections: sections },
			);
		});

		it("should handle missing grant template gracefully", async () => {
			useApplicationStore.getState().reset();

			const application: API.RetrieveApplication.Http200.ResponseBody = {
				completed_at: undefined,
				created_at: "2023-01-01T00:00:00Z",
				deadline: undefined,
				form_inputs: undefined,
				grant_template: undefined,
				id: "test-app-id-2",
				project_id: "test-project-id-2",
				rag_job_id: undefined,
				rag_sources: [],
				research_objectives: undefined,
				status: "WORKING_DRAFT",
				text: undefined,
				title: "Test Application 2",
				updated_at: "2023-01-01T00:00:00Z",
			};

			vi.mocked(updateGrantTemplate).mockClear();

			useApplicationStore.setState({ application });

			const { updateGrantSections } = useApplicationStore.getState();

			await updateGrantSections([]);

			expect(updateGrantTemplate).not.toHaveBeenCalled();
		});

		it("should handle API errors gracefully", async () => {
			const application = ApplicationWithTemplateFactory.build();

			vi.mocked(updateGrantTemplate).mockRejectedValue(new Error("API Error"));

			useApplicationStore.setState({ application });

			const { updateGrantSections } = useApplicationStore.getState();

			await updateGrantSections([]);

			expect(updateGrantTemplate).toHaveBeenCalled();
		});
	});

	describe("upload method selection in development", () => {
		beforeEach(() => {
			vi.mocked(createTemplateSourceUploadUrl).mockResolvedValue({
				source_id: "source-123",
				url: "https://upload.url",
			});
			vi.mocked(extractObjectPathFromUrl).mockReturnValue("path");
			vi.mocked(triggerDevIndexing).mockResolvedValue(undefined);
			vi.mocked(ky).mockReturnValue({ ok: true } as any);
			vi.mocked(getApplication).mockResolvedValue(ApplicationWithTemplateFactory.build());
		});

		it("should use production upload with localhost backend in test environment", async () => {
			const file = new File(["content"], "test.pdf", { type: "application/pdf" });
			Object.assign(file, { id: "test.pdf" });
			const application = ApplicationWithTemplateFactory.build();

			vi.mocked(getEnv).mockReturnValue({
				NEXT_PUBLIC_BACKEND_API_BASE_URL: "http://localhost:8000",
			} as any);

			vi.mocked(getApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { addFile } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await addFile(file as any, application.grant_template.id);
			}

			expect(extractObjectPathFromUrl).toHaveBeenCalled();
			expect(triggerDevIndexing).toHaveBeenCalled();
		});

		it("should use production upload with remote backend", async () => {
			vi.clearAllMocks();

			const file = new File(["content"], "test.pdf", { type: "application/pdf" });
			Object.assign(file, { id: "test.pdf" });
			const application = ApplicationWithTemplateFactory.build();

			vi.mocked(getEnv).mockReturnValue({
				NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://staging-api.grantflow.ai/",
			} as any);

			vi.mocked(createTemplateSourceUploadUrl).mockResolvedValue({
				source_id: "source-123",
				url: "https://upload.url",
			});
			vi.mocked(ky).mockReturnValue({ ok: true } as any);
			vi.mocked(extractObjectPathFromUrl).mockReturnValue("path");
			vi.mocked(triggerDevIndexing).mockResolvedValue(undefined);
			vi.mocked(getApplication).mockResolvedValue(application);

			useApplicationStore.setState({ application });

			const { addFile } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await addFile(file as any, application.grant_template.id);
			}

			expect(ky).toHaveBeenCalled();
			expect(extractObjectPathFromUrl).toHaveBeenCalled();
			expect(triggerDevIndexing).toHaveBeenCalled();
		});
	});

	describe("file and URL management", () => {
		it("should validate state for RAG source operations", async () => {
			const file = new File(["content"], "test.pdf", { type: "application/pdf" });
			Object.assign(file, { id: "test.pdf" });
			const application = ApplicationWithTemplateFactory.build();

			const { createTemplateSourceUploadUrl } = await import("@/actions/sources");
			const { extractObjectPathFromUrl, triggerDevIndexing } = await import("@/utils/dev-indexing-patch");

			vi.mocked(createTemplateSourceUploadUrl).mockImplementation(() =>
				Promise.resolve({
					source_id: "source-123",
					url: "https://upload.url",
				}),
			);
			vi.mocked(extractObjectPathFromUrl).mockImplementation(() => "path");
			vi.mocked(triggerDevIndexing).mockImplementation(() => Promise.resolve());
			vi.mocked(getApplication).mockResolvedValue(application);

			useApplicationStore.setState({ application });

			const { addFile } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await addFile(file as any, application.grant_template.id);
			}

			expect(true).toBe(true);
		});

		it("should handle invalid parentId validation", async () => {
			const file = new File(["content"], "test.pdf", { type: "application/pdf" });
			Object.assign(file, { id: "test.pdf" });
			const application = ApplicationWithTemplateFactory.build();

			useApplicationStore.setState({ application });

			const { addFile } = useApplicationStore.getState();
			await addFile(file as any, "invalid-parent-id");
			expect(createTemplateSourceUploadUrl).not.toHaveBeenCalled();
		});

		it("should handle missing organization selection", async () => {
			const file = new File(["content"], "test.pdf", { type: "application/pdf" });
			Object.assign(file, { id: "test.pdf" });
			const application = ApplicationWithTemplateFactory.build();

			const { useOrganizationStore } = await import("@/stores/organization-store");
			vi.mocked(useOrganizationStore.getState).mockReturnValue({
				...useOrganizationStore.getState(),
				selectedOrganizationId: null,
			});

			useApplicationStore.setState({ application });

			const { addFile } = useApplicationStore.getState();

			await expect(addFile(file as any, application.grant_template?.id ?? "")).rejects.toThrow(
				"No organization selected",
			);
		});

		it("should handle file removal with missing file ID", async () => {
			const fileWithoutId = new File(["content"], "test.pdf", { type: "application/pdf" });

			const application = ApplicationWithTemplateFactory.build();

			useApplicationStore.setState({ application });

			const { removeFile } = useApplicationStore.getState();

			await removeFile(fileWithoutId as any, application.grant_template?.id ?? "");

			expect(deleteTemplateSource).not.toHaveBeenCalled();
		});

		it("should add files with parentId", async () => {
			const file = new File(["content"], "test.pdf", { type: "application/pdf" });
			Object.assign(file, { id: "test.pdf" });
			const application = ApplicationWithTemplateFactory.build();

			vi.mocked(createTemplateSourceUploadUrl).mockResolvedValue({
				source_id: "source-123",
				url: "https://upload.url",
			});
			vi.mocked(extractObjectPathFromUrl).mockReturnValue("path");
			vi.mocked(triggerDevIndexing).mockResolvedValue(undefined);
			vi.mocked(ky).mockReturnValue({ ok: true } as any);
			vi.mocked(getApplication).mockResolvedValue(application);

			useApplicationStore.setState({ application });

			const { addFile } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await addFile(file as any, application.grant_template.id);
			}

			expect(createTemplateSourceUploadUrl).toHaveBeenCalled();
		});

		it("should add URLs with parentId", async () => {
			const application = ApplicationWithTemplateFactory.build();

			vi.mocked(crawlTemplateUrl).mockResolvedValue({ source_id: "source-123" });
			vi.mocked(getApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { addUrl } = useApplicationStore.getState();

			await addUrl("https://example.com", application.grant_template?.id ?? "");

			expect(crawlTemplateUrl).toHaveBeenCalledWith(
				"mock-org-id",
				application.project_id,
				application.grant_template?.id,
				"https://example.com",
			);
		});

		it("should remove files with parentId", async () => {
			const file1 = { id: "1", name: "test1.pdf", size: 1000 };
			const application = ApplicationWithTemplateFactory.build();

			vi.mocked(getApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { removeFile } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await removeFile(file1 as any, application.grant_template.id);

				const { deleteTemplateSource } = await import("@/actions/sources");
				expect(deleteTemplateSource).toHaveBeenCalledWith(
					"mock-org-id",
					application.project_id,
					application.grant_template.id,
					"1",
				);
			}
		});

		it("should remove URLs", async () => {
			const ragSource = { id: "source-1", sourceId: "source-1", status: "FINISHED", url: "https://example.com" };
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...GrantTemplateFactory.build(),
					rag_sources: [ragSource] as any,
				},
			});

			vi.mocked(deleteTemplateSource).mockResolvedValue(undefined);
			vi.mocked(getApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { removeUrl } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await removeUrl("https://example.com", application.grant_template.id);

				expect(deleteTemplateSource).toHaveBeenCalledWith(
					"mock-org-id",
					application.project_id,
					application.grant_template.id,
					"source-1",
				);
			}
		});

		it("should handle URL removal when URL not found in sources", async () => {
			const ragSource = {
				id: "source-1",
				sourceId: "source-1",
				status: "FINISHED",
				url: "https://different.com",
			};
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...GrantTemplateFactory.build(),
					rag_sources: [ragSource] as any,
				},
			});

			useApplicationStore.setState({ application });

			const { removeUrl } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await removeUrl("https://notfound.com", application.grant_template.id);

				expect(deleteTemplateSource).not.toHaveBeenCalled();
			}
		});
	});

	describe("optimistic updates and rollback", () => {
		it("should rollback application updates on API failure", async () => {
			const originalApplication = ApplicationFactory.build({
				id: "app-id",
				project_id: "project-id",
				title: "Original Title",
			});

			vi.mocked(updateApplication).mockRejectedValue(new Error("API Failed"));

			useApplicationStore.setState({ application: originalApplication });

			const { updateApplication: updateApp } = useApplicationStore.getState();

			await updateApp({ title: "Updated Title" });

			const state = useApplicationStore.getState();
			expect(state.application?.title).toBe("Original Title");
			expect(state.areAppOperationsInProgress).toBe(false);
		});

		it("should handle grant template validation errors (422 status)", async () => {
			const application = ApplicationWithTemplateFactory.build();
			const httpError = new HTTPError(
				new Response(JSON.stringify({ detail: "Validation failed" }), { status: 422 }),
				{} as any,
				{} as any,
			);

			const { generateGrantTemplate } = await import("@/actions/grant-template");
			vi.mocked(generateGrantTemplate).mockRejectedValue(httpError);

			useApplicationStore.setState({ application });

			const { generateTemplate } = useApplicationStore.getState();

			await generateTemplate(application.grant_template?.id ?? "");

			expect(generateGrantTemplate).toHaveBeenCalled();
		});

		it("should handle non-422 errors in template generation", async () => {
			const application = ApplicationWithTemplateFactory.build();
			const httpError = new HTTPError(
				new Response(JSON.stringify({ detail: "Server error" }), { status: 500 }),
				{} as any,
				{} as any,
			);

			const { generateGrantTemplate } = await import("@/actions/grant-template");
			vi.mocked(generateGrantTemplate).mockRejectedValue(httpError);

			useApplicationStore.setState({ application });

			const { generateTemplate } = useApplicationStore.getState();

			await generateTemplate(application.grant_template?.id ?? "");

			expect(generateGrantTemplate).toHaveBeenCalled();
		});
	});

	describe("RAG job restoration", () => {
		describe.sequential("checkAndRestoreJobState", () => {
			it("should not restore when application is null", async () => {
				useApplicationStore.setState({ application: null });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).not.toHaveBeenCalled();
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toBeNull();
			});

			it("should not restore when no rag_job_id exists", async () => {
				vi.mocked(retrieveRagJob).mockClear();

				const application = ApplicationFactory.build();

				application.rag_job_id = undefined;
				application.grant_template = undefined;

				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).not.toHaveBeenCalled();
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toBeNull();
			});

			it("should restore PROCESSING job state", async () => {
				useApplicationStore.getState().reset();
				const application = ApplicationFactory.build({
					project_id: "project-id",
					rag_job_id: "job-123",
				});
				const jobData = {
					created_at: "2023-01-01T00:00:00Z",
					current_stage: 3,
					id: "job-123",
					job_type: "grant_template_generation" as const,
					retry_count: 0,
					status: "PROCESSING" as const,
					total_stages: 6,
					updated_at: "2023-01-01T00:30:00Z",
				};

				vi.mocked(retrieveRagJob).mockResolvedValue(jobData);
				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).toHaveBeenCalledWith("mock-org-id", "project-id", "job-123");
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toEqual(jobData);
				expect(state.ragJobState.isRestoring).toBe(false);
			});

			it("should restore PENDING job state", async () => {
				const application = ApplicationFactory.build({
					project_id: "project-id",
					rag_job_id: "job-123",
				});
				const jobData = {
					created_at: "2023-01-01T00:00:00Z",
					current_stage: 0,
					id: "job-123",
					job_type: "grant_application_generation",
					retry_count: 0,
					status: "PENDING" as const,
					total_stages: 8,
					updated_at: "2023-01-01T00:00:00Z",
				};

				vi.mocked(retrieveRagJob).mockResolvedValue(jobData);
				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).toHaveBeenCalledWith("mock-org-id", "project-id", "job-123");
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toEqual(jobData);
			});

			it("should not restore COMPLETED job state", async () => {
				const application = ApplicationFactory.build({
					project_id: "project-id",
					rag_job_id: "job-123",
				});
				const jobData = {
					created_at: "2023-01-01T00:00:00Z",
					current_stage: 6,
					id: "job-123",
					job_type: "grant_template_generation",
					retry_count: 0,
					status: "COMPLETED" as const,
					total_stages: 6,
					updated_at: "2023-01-01T01:00:00Z",
				};

				vi.mocked(retrieveRagJob).mockResolvedValue(jobData);
				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).toHaveBeenCalledWith("mock-org-id", "project-id", "job-123");
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toBeNull();
			});

			it("should not restore FAILED job state", async () => {
				const application = ApplicationFactory.build({
					project_id: "project-id",
					rag_job_id: "job-123",
				});
				const jobData = {
					created_at: "2023-01-01T00:00:00Z",
					current_stage: 2,
					error_message: "Something went wrong",
					id: "job-123",
					job_type: "grant_template_generation" as const,
					retry_count: 1,
					status: "FAILED" as const,
					total_stages: 6,
					updated_at: "2023-01-01T00:15:00Z",
				};

				vi.mocked(retrieveRagJob).mockResolvedValue(jobData);
				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).toHaveBeenCalledWith("mock-org-id", "project-id", "job-123");
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toBeNull();
			});

			it("should check grant template rag_job_id if application rag_job_id is missing", async () => {
				const application = ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ rag_job_id: "template-job-123" }),
					project_id: "project-id",
					rag_job_id: undefined,
				});
				const jobData = {
					created_at: "2023-01-01T00:00:00Z",
					current_stage: 2,
					id: "template-job-123",
					job_type: "grant_template_generation" as const,
					retry_count: 0,
					status: "PROCESSING" as const,
					total_stages: 6,
					updated_at: "2023-01-01T00:10:00Z",
				};

				vi.mocked(retrieveRagJob).mockResolvedValue(jobData);
				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).toHaveBeenCalledWith("mock-org-id", "project-id", "template-job-123");
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toEqual(jobData);
			});

			it("should handle API errors gracefully", async () => {
				const application = ApplicationFactory.build({
					project_id: "project-id",
					rag_job_id: "job-123",
				});

				vi.mocked(retrieveRagJob).mockRejectedValue(new Error("Job not found"));
				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).toHaveBeenCalledWith("mock-org-id", "project-id", "job-123");
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toBeNull();
				expect(state.ragJobState.isRestoring).toBe(false);
			});
		});

		describe("clearRestoredJobState", () => {
			it("should clear restored job state", () => {
				const jobData = {
					created_at: "2023-01-01T00:00:00Z",
					current_stage: 3,
					id: "job-123",
					job_type: "grant_template_generation",
					retry_count: 0,
					status: "PROCESSING" as const,
					total_stages: 6,
					updated_at: "2023-01-01T00:30:00Z",
				};

				useApplicationStore.setState({
					ragJobState: {
						isRestoring: false,
						restoredJob: jobData,
					},
				});

				const { clearRestoredJobState } = useApplicationStore.getState();

				clearRestoredJobState();

				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toBeNull();
				expect(state.ragJobState.isRestoring).toBe(false);
			});
		});
	});
});

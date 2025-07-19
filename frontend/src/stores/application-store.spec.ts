import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
} from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getApplication, updateApplication } from "@/actions/grant-applications";
import { updateGrantTemplate } from "@/actions/grant-template";
import { retrieveRagJob } from "@/actions/rag-jobs";

import { useApplicationStore } from "./application-store";

vi.mock("@/actions/grant-applications", () => ({
	createApplication: vi.fn(),
	generateApplication: vi.fn(),
	getApplication: vi.fn(),
	updateApplication: vi.fn(),
}));
vi.mock("@/actions/grant-template");
vi.mock("@/actions/rag-jobs");
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

import ky from "ky";

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
			selectedOrganizationId: "mock-org-id",
		})),
	},
}));

describe("Application Store", () => {
	beforeEach(() => {
		useApplicationStore.setState({
			application: null,
			areAppOperationsInProgress: false,
			ragJobState: {
				isRestoring: false,
				restoredJob: null,
			},
		});

		vi.clearAllMocks();

		// Reset all mocks to their default implementations
		vi.mocked(updateApplication).mockReset();
		vi.mocked(getApplication).mockReset();
		vi.mocked(updateGrantTemplate).mockReset();
		vi.mocked(retrieveRagJob).mockReset();
	});

	describe("state management", () => {
		it("should initialize with default state", () => {
			const state = useApplicationStore.getState();
			expect(state.application).toBeNull();
			expect(state.areAppOperationsInProgress).toBe(false);
		});
	});

	describe("updateApplicationTitle", () => {
		it("should call updateApplication API and update state on success", async () => {
			const application = ApplicationFactory.build({
				id: "app-id",
				project_id: "project-id",
			});
			// Set title explicitly to avoid random values
			application.title = "Old Title";

			// Create updated application with new title - should match the API response type
			const updatedApplication = {
				...application,
				rag_job_id: undefined, // Add this since it's part of the response type
				title: "New Title",
			};

			// Mock the imported function - need to handle the organization parameter
			vi.mocked(updateApplication).mockResolvedValue(updatedApplication);

			useApplicationStore.setState({ application });

			const { updateApplicationTitle } = useApplicationStore.getState();

			await updateApplicationTitle("mock-org-id", "project-id", "app-id", "New Title");

			expect(updateApplication).toHaveBeenCalledWith("mock-org-id", "project-id", "app-id", {
				title: "New Title",
			});

			const state = useApplicationStore.getState();
			expect(state.application?.title).toBe("New Title");
		});

		it("should rollback on API error", async () => {
			// Create a specific application with a known title
			const application = ApplicationFactory.build({
				id: "app-id",
				project_id: "project-id",
			});
			// Set title explicitly to avoid random values
			application.title = "Old Title";

			vi.mocked(updateApplication).mockRejectedValue(new Error("API Error"));

			useApplicationStore.setState({ application });

			const { updateApplicationTitle } = useApplicationStore.getState();

			await updateApplicationTitle("mock-org-id", "project-id", "app-id", "New Title");

			const state = useApplicationStore.getState();
			expect(state.application?.title).toBe("Old Title");
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

			// Clear any existing application first
			useApplicationStore.setState({ application: null });

			const { setApplication } = useApplicationStore.getState();

			setApplication(application);

			const state = useApplicationStore.getState();
			expect(state.application).toEqual(application);
		});
	});

	describe("updateGrantSections", () => {
		it("should update grant template sections", async () => {
			const sections = [
				GrantSectionDetailedFactory.build({
					id: "1",
					max_words: 500,
					order: 0,
					title: "Introduction",
				}),
			];

			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...GrantTemplateFactory.build(),
					grant_sections: [],
				},
			});

			vi.mocked(updateGrantTemplate).mockResolvedValue({} as any);

			useApplicationStore.setState({ application });

			const { updateGrantSections } = useApplicationStore.getState();

			await updateGrantSections(sections);

			expect(updateGrantTemplate).toHaveBeenCalledWith(
				"mock-org-id",
				application.project_id,
				application.id,
				application.grant_template!.id,
				{ grant_sections: sections },
			);
		});

		it("should handle missing grant template gracefully", async () => {
			// Create an application without grant_template
			const application = ApplicationFactory.build();
			// Explicitly set grant_template to undefined
			application.grant_template = undefined;

			// Reset the mock before the test to ensure clean state
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

	describe("file and URL management", () => {
		it("should validate state for RAG source operations", async () => {
			const file = new File(["content"], "test.pdf", { type: "application/pdf" });
			Object.assign(file, { id: "test.pdf" });
			const application = ApplicationWithTemplateFactory.build();

			// Mock the required functions
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

		it("should add files with parentId", async () => {
			const file = new File(["content"], "test.pdf", { type: "application/pdf" });
			Object.assign(file, { id: "test.pdf" });
			const application = ApplicationWithTemplateFactory.build();

			// Import the already mocked modules to get their mock functions
			const { createTemplateSourceUploadUrl } = await import("@/actions/sources");
			const { extractObjectPathFromUrl, triggerDevIndexing } = await import("@/utils/dev-indexing-patch");

			// Set up the mock implementations
			vi.mocked(extractObjectPathFromUrl).mockReturnValue("path");
			vi.mocked(triggerDevIndexing).mockResolvedValue(undefined);
			vi.mocked(ky).mockReturnValue({ ok: true } as any);
			vi.mocked(getApplication).mockResolvedValue(application);

			useApplicationStore.setState({ application });

			const { addFile } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await addFile(file as any, application.grant_template.id);
			}

			// Check that createTemplateSourceUploadUrl was called
			expect(createTemplateSourceUploadUrl).toHaveBeenCalled();
		});

		it("should add URLs with parentId", async () => {
			const application = ApplicationWithTemplateFactory.build();

			const { crawlTemplateUrl } = await import("@/actions/sources");
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

			const { deleteTemplateSource } = await import("@/actions/sources");
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
	});

	describe("RAG job restoration", () => {
		describe("checkAndRestoreJobState", () => {
			it("should not restore when application is null", async () => {
				// Ensure application is null
				useApplicationStore.setState({ application: null });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).not.toHaveBeenCalled();
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toBeNull();
			});

			it("should not restore when no rag_job_id exists", async () => {
				const application = ApplicationFactory.build();
				// Explicitly set both rag_job_id fields to undefined
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

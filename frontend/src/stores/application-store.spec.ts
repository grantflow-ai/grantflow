import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
} from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { retrieveApplication, updateApplication } from "@/actions/grant-applications";
import { updateGrantTemplate } from "@/actions/grant-template";
import { retrieveRagJob } from "@/actions/rag-jobs";

import { useApplicationStore } from "./application-store";

vi.mock("@/actions/grant-applications");
vi.mock("@/actions/grant-template");
vi.mock("@/actions/rag-jobs");
vi.mock("@/actions/sources");
vi.mock("@/utils/dev-indexing-patch");
vi.mock("ky", () => ({
	default: vi.fn(() => Promise.resolve({ ok: true })),
}));
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

describe("Application Store", () => {
	beforeEach(() => {
		useApplicationStore.setState({
			application: null,
			isLoading: false,
			ragJobState: {
				isRestoring: false,
				restoredJob: null,
			},
		});

		vi.clearAllMocks();
	});

	describe("state management", () => {
		it("should initialize with default state", () => {
			const state = useApplicationStore.getState();
			expect(state.application).toBeNull();
			expect(state.isLoading).toBe(false);
		});
	});

	describe("updateApplicationTitle", () => {
		it("should call updateApplication API and update state on success", async () => {
			const application = ApplicationFactory.build({ title: "Old Title" });
			const updatedApplication = { ...application, title: "New Title" };

			vi.mocked(updateApplication).mockResolvedValue(updatedApplication);

			useApplicationStore.setState({ application });

			const { updateApplicationTitle } = useApplicationStore.getState();

			await updateApplicationTitle("workspace-id", "app-id", "New Title");

			expect(updateApplication).toHaveBeenCalledWith("workspace-id", "app-id", { title: "New Title" });

			const state = useApplicationStore.getState();
			expect(state.application).toEqual(updatedApplication);
		});

		it("should rollback on API error", async () => {
			const application = ApplicationFactory.build({ title: "Old Title" });

			vi.mocked(updateApplication).mockRejectedValue(new Error("API Error"));

			useApplicationStore.setState({ application });

			const { updateApplicationTitle } = useApplicationStore.getState();

			await updateApplicationTitle("workspace-id", "app-id", "New Title");

			const state = useApplicationStore.getState();
			expect(state.application?.title).toBe("Old Title");
		});
	});

	describe("retrieveApplication", () => {
		it("should fetch application and update state", async () => {
			const application = ApplicationFactory.build();

			vi.mocked(retrieveApplication).mockResolvedValue(application);

			const { retrieveApplication: retrieveApp } = useApplicationStore.getState();

			await retrieveApp("workspace-id", "app-id");

			expect(retrieveApplication).toHaveBeenCalledWith("workspace-id", "app-id");

			const state = useApplicationStore.getState();
			expect(state.application).toEqual(application);
			expect(state.isLoading).toBe(false);
		});
	});

	describe("setApplication", () => {
		it("should update application", () => {
			const application = ApplicationFactory.build({ title: "Test App" });

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
				application.workspace_id,
				application.id,
				application.grant_template!.id,
				{ grant_sections: sections },
			);
		});

		it("should handle missing grant template gracefully", async () => {
			const application = ApplicationFactory.build({ grant_template: undefined });

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
		it("should add files with parentId", async () => {
			const file = new File(["content"], "test.pdf", { type: "application/pdf" });
			Object.assign(file, { id: "test.pdf" });
			const application = ApplicationWithTemplateFactory.build();

			const { createTemplateSourceUploadUrl } = await import("@/actions/sources");
			const { extractObjectPathFromUrl, triggerDevIndexing } = await import("@/utils/dev-indexing-patch");

			vi.mocked(createTemplateSourceUploadUrl).mockResolvedValue({
				source_id: "source-123",
				url: "https://upload.url",
			});
			vi.mocked(extractObjectPathFromUrl).mockReturnValue("path");
			vi.mocked(triggerDevIndexing).mockImplementation(() => Promise.resolve());

			vi.mocked(retrieveApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { addFile } = useApplicationStore.getState();

			await addFile(file as any, application.grant_template?.id);

			expect(createTemplateSourceUploadUrl).toHaveBeenCalled();
		});

		it("should add URLs with parentId", async () => {
			const application = ApplicationWithTemplateFactory.build();

			const { crawlTemplateUrl } = await import("@/actions/sources");
			vi.mocked(crawlTemplateUrl).mockResolvedValue({ source_id: "source-123" });

			vi.mocked(retrieveApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { addUrl } = useApplicationStore.getState();

			await addUrl("https://example.com", application.grant_template?.id ?? "");

			expect(crawlTemplateUrl).toHaveBeenCalledWith(
				application.workspace_id,
				application.grant_template?.id,
				"https://example.com",
			);
		});

		it("should remove files with parentId", async () => {
			const file1 = { id: "1", name: "test1.pdf", size: 1000 };
			const application = ApplicationWithTemplateFactory.build();

			const { deleteTemplateSource } = await import("@/actions/sources");
			vi.mocked(deleteTemplateSource).mockResolvedValue(undefined);

			vi.mocked(retrieveApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { removeFile } = useApplicationStore.getState();

			await removeFile(file1 as any, application.grant_template?.id);

			expect(deleteTemplateSource).toHaveBeenCalledWith(
				application.workspace_id,
				application.grant_template?.id,
				"1",
			);
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

			vi.mocked(retrieveApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { removeUrl } = useApplicationStore.getState();

			await removeUrl("https://example.com", application.grant_template?.id);

			expect(deleteTemplateSource).toHaveBeenCalledWith(
				application.workspace_id,
				application.grant_template?.id,
				"source-1",
			);
		});
	});

	describe("areFilesOrUrlsIndexing", () => {
		it("should return true when sources are indexing", () => {
			const application = ApplicationFactory.build({
				rag_sources: [
					{ id: "1", status: "FINISHED" },
					{ id: "2", status: "INDEXING" },
				] as any,
			});

			useApplicationStore.setState({ application });

			const { areFilesOrUrlsIndexing } = useApplicationStore.getState();

			expect(areFilesOrUrlsIndexing()).toBe(true);
		});

		it("should check template sources as well", () => {
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [{ status: "INDEXING" }] as any,
				}),
				rag_sources: [{ status: "FINISHED" }] as any,
			});

			useApplicationStore.setState({ application });

			const { areFilesOrUrlsIndexing } = useApplicationStore.getState();

			expect(areFilesOrUrlsIndexing()).toBe(true);
		});

		it("should return false when no sources are indexing", () => {
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [{ status: "FINISHED" }] as any,
				}),
				rag_sources: [{ status: "FINISHED" }] as any,
			});

			useApplicationStore.setState({ application });

			const { areFilesOrUrlsIndexing } = useApplicationStore.getState();

			expect(areFilesOrUrlsIndexing()).toBe(false);
		});

		it("should return false when application is null", () => {
			const { areFilesOrUrlsIndexing } = useApplicationStore.getState();

			expect(areFilesOrUrlsIndexing()).toBe(false);
		});
	});

	describe("RAG job restoration", () => {
		describe("checkAndRestoreJobState", () => {
			it("should not restore when application is null", async () => {
				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).not.toHaveBeenCalled();
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toBeNull();
			});

			it("should not restore when no rag_job_id exists", async () => {
				const application = ApplicationFactory.build({
					grant_template: undefined,
					rag_job_id: undefined,
				});
				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).not.toHaveBeenCalled();
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toBeNull();
			});

			it("should restore PROCESSING job state", async () => {
				const application = ApplicationFactory.build({
					rag_job_id: "job-123",
					workspace_id: "workspace-id",
				});
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

				vi.mocked(retrieveRagJob).mockResolvedValue(jobData);
				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).toHaveBeenCalledWith("workspace-id", "job-123");
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toEqual(jobData);
				expect(state.ragJobState.isRestoring).toBe(false);
			});

			it("should restore PENDING job state", async () => {
				const application = ApplicationFactory.build({
					rag_job_id: "job-123",
					workspace_id: "workspace-id",
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

				expect(retrieveRagJob).toHaveBeenCalledWith("workspace-id", "job-123");
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toEqual(jobData);
			});

			it("should not restore COMPLETED job state", async () => {
				const application = ApplicationFactory.build({
					rag_job_id: "job-123",
					workspace_id: "workspace-id",
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

				expect(retrieveRagJob).toHaveBeenCalledWith("workspace-id", "job-123");
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toBeNull();
			});

			it("should not restore FAILED job state", async () => {
				const application = ApplicationFactory.build({
					rag_job_id: "job-123",
					workspace_id: "workspace-id",
				});
				const jobData = {
					created_at: "2023-01-01T00:00:00Z",
					current_stage: 2,
					error_message: "Something went wrong",
					id: "job-123",
					job_type: "grant_template_generation",
					retry_count: 1,
					status: "FAILED" as const,
					total_stages: 6,
					updated_at: "2023-01-01T00:15:00Z",
				};

				vi.mocked(retrieveRagJob).mockResolvedValue(jobData);
				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).toHaveBeenCalledWith("workspace-id", "job-123");
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toBeNull();
			});

			it("should check grant template rag_job_id if application rag_job_id is missing", async () => {
				const application = ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ rag_job_id: "template-job-123" }),
					rag_job_id: undefined,
					workspace_id: "workspace-id",
				});
				const jobData = {
					created_at: "2023-01-01T00:00:00Z",
					current_stage: 2,
					id: "template-job-123",
					job_type: "grant_template_generation",
					retry_count: 0,
					status: "PROCESSING" as const,
					total_stages: 6,
					updated_at: "2023-01-01T00:10:00Z",
				};

				vi.mocked(retrieveRagJob).mockResolvedValue(jobData);
				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).toHaveBeenCalledWith("workspace-id", "template-job-123");
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toEqual(jobData);
			});

			it("should handle API errors gracefully", async () => {
				const application = ApplicationFactory.build({
					rag_job_id: "job-123",
					workspace_id: "workspace-id",
				});

				vi.mocked(retrieveRagJob).mockRejectedValue(new Error("Job not found"));
				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();

				await checkAndRestoreJobState();

				expect(retrieveRagJob).toHaveBeenCalledWith("workspace-id", "job-123");
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

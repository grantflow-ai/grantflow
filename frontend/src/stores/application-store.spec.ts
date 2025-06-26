import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	CreateGrantApplicationRagSourceUploadUrlResponseFactory,
	FileWithIdFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
	RagJobResponseFactory,
} from "::testing/factories";
import type { HTTPError } from "ky";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApplication, retrieveApplication, updateApplication } from "@/actions/grant-applications";
import { generateGrantTemplate, updateGrantTemplate } from "@/actions/grant-template";
import { retrieveRagJob } from "@/actions/rag-jobs";

import { useApplicationStore } from "./application-store";

vi.mock("@/actions/grant-applications");
vi.mock("@/actions/grant-template");
vi.mock("@/actions/rag-jobs");
vi.mock("@/actions/sources");
vi.mock("@/utils/dev-indexing-patch");
vi.mock("ky", async (importOriginal) => {
	const actual = await importOriginal<typeof import("ky")>();
	return {
		...actual,
		default: vi.fn(() => Promise.resolve({ ok: true })),
	};
});
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

const mockSourcesActions = () => {
	return import("@/actions/sources");
};

const mockDevIndexingPatch = () => {
	return import("@/utils/dev-indexing-patch");
};

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
	});

	describe("state management", () => {
		it("should initialize with default state", () => {
			const state = useApplicationStore.getState();
			expect(state.application).toBeNull();
			expect(state.areAppOperationsInProgress).toBe(false);
			expect(state.ragJobState.isRestoring).toBe(false);
			expect(state.ragJobState.restoredJob).toBeNull();
		});

		it("should track operations in progress during createApplication", async () => {
			const newApplication = ApplicationFactory.build({ title: "New Application" });

			const operationStates: boolean[] = [];

			vi.mocked(createApplication).mockImplementation(async () => {
				operationStates.push(useApplicationStore.getState().areAppOperationsInProgress);
				return newApplication;
			});

			const { createApplication: createApp } = useApplicationStore.getState();

			await createApp("workspace-id");

			expect(operationStates).toContain(true);
			expect(useApplicationStore.getState().areAppOperationsInProgress).toBe(false);
		});

		it("should track operations in progress during retrieveApplication", async () => {
			const application = ApplicationFactory.build();
			const operationStates: boolean[] = [];

			vi.mocked(retrieveApplication).mockImplementation(async () => {
				operationStates.push(useApplicationStore.getState().areAppOperationsInProgress);
				return application;
			});

			const { retrieveApplication: retrieveApp } = useApplicationStore.getState();
			await retrieveApp("workspace-id", "app-id");

			expect(operationStates).toContain(true);
			expect(useApplicationStore.getState().areAppOperationsInProgress).toBe(false);
		});

		it("should track operations in progress during updateApplication", async () => {
			const application = ApplicationFactory.build();
			const updatedData = { title: "Updated Title" };
			const operationStates: boolean[] = [];

			vi.mocked(updateApplication).mockImplementation(async () => {
				operationStates.push(useApplicationStore.getState().areAppOperationsInProgress);
				return { ...application, ...updatedData };
			});

			useApplicationStore.setState({ application });
			const { updateApplication: updateApp } = useApplicationStore.getState();

			await updateApp(updatedData);

			expect(operationStates).toContain(true);
			expect(useApplicationStore.getState().areAppOperationsInProgress).toBe(false);
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

		it("should handle concurrent updateApplicationTitle calls", async () => {
			const application = ApplicationFactory.build({ title: "Initial Title" });
			let callCount = 0;

			vi.mocked(updateApplication).mockImplementation(async (_wsId, _appId, data) => {
				callCount++;
				await new Promise((resolve) => setTimeout(resolve, 100));
				return { ...application, title: data.title! };
			});

			useApplicationStore.setState({ application });
			const { updateApplicationTitle } = useApplicationStore.getState();

			await Promise.all([
				updateApplicationTitle("workspace-id", "app-id", "Title 1"),
				updateApplicationTitle("workspace-id", "app-id", "Title 2"),
				updateApplicationTitle("workspace-id", "app-id", "Title 3"),
			]);

			expect(callCount).toBe(3);
			const finalState = useApplicationStore.getState();
			expect(finalState.application?.title).toBe("Title 3");
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

			vi.mocked(updateGrantTemplate).mockResolvedValue(undefined);

			useApplicationStore.setState({ application });

			const { updateGrantSections } = useApplicationStore.getState();

			await updateGrantSections(sections);

			if (application.grant_template?.id) {
				expect(updateGrantTemplate).toHaveBeenCalledWith(
					application.workspace_id,
					application.id,
					application.grant_template.id,
					{ grant_sections: sections },
				);
			}
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

		it("should handle concurrent updateGrantSections calls", async () => {
			const application = ApplicationWithTemplateFactory.build();
			let callCount = 0;
			const sections1 = [GrantSectionDetailedFactory.build({ title: "Section 1" })];
			const sections2 = [GrantSectionDetailedFactory.build({ title: "Section 2" })];

			vi.mocked(updateGrantTemplate).mockImplementation(async (_wsId, _appId, _templateId, _data) => {
				callCount++;
				await new Promise((resolve) => setTimeout(resolve, 50));
				return undefined;
			});

			useApplicationStore.setState({ application });
			const { updateGrantSections } = useApplicationStore.getState();

			await Promise.all([updateGrantSections(sections1), updateGrantSections(sections2)]);

			expect(callCount).toBe(2);
		});

		it("should handle state cleanup on errors", async () => {
			const application = ApplicationWithTemplateFactory.build();
			const initialSections = application.grant_template?.grant_sections ?? [];

			vi.mocked(updateGrantTemplate).mockRejectedValue(new Error("Network error"));
			useApplicationStore.setState({ application });

			const { updateGrantSections } = useApplicationStore.getState();
			const newSections = [GrantSectionDetailedFactory.build({ title: "New Section" })];

			await updateGrantSections(newSections);

			const state = useApplicationStore.getState();
			expect(state.application?.grant_template?.grant_sections).toEqual(initialSections);
		});
	});

	describe("createApplication", () => {
		it("should handle errors during application creation", async () => {
			vi.mocked(createApplication).mockRejectedValue(new Error("Creation failed"));

			const { createApplication: createApp } = useApplicationStore.getState();

			await createApp("workspace-id");

			expect(createApplication).toHaveBeenCalledWith("workspace-id", { title: "Untitled Application" });

			const state = useApplicationStore.getState();
			expect(state.areAppOperationsInProgress).toBe(false);
			expect(state.application).toBeNull();
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
			expect(state.areAppOperationsInProgress).toBe(false);
		});

		it("should handle errors during application retrieval", async () => {
			vi.mocked(retrieveApplication).mockRejectedValue(new Error("Retrieval failed"));

			const { retrieveApplication: retrieveApp } = useApplicationStore.getState();

			await retrieveApp("workspace-id", "app-id");

			const state = useApplicationStore.getState();
			expect(state.areAppOperationsInProgress).toBe(false);
		});
	});

	describe("updateApplication", () => {
		it("should handle errors and rollback state", async () => {
			const application = ApplicationFactory.build({ title: "Original Title" });
			vi.mocked(updateApplication).mockRejectedValue(new Error("Update failed"));

			useApplicationStore.setState({ application });
			const { updateApplication: updateApp } = useApplicationStore.getState();

			await updateApp({ title: "New Title" });

			const state = useApplicationStore.getState();
			expect(state.application?.title).toBe("Original Title");
			expect(state.areAppOperationsInProgress).toBe(false);
		});
	});

	describe("generateTemplate", () => {
		it("should handle HTTP 422 validation errors", async () => {
			const application = ApplicationFactory.build();
			const httpError = Object.assign(new Error("Validation error"), {
				response: { json: () => Promise.resolve({ message: "Grant template not found" }), status: 422 },
			}) as HTTPError;

			vi.mocked(generateGrantTemplate).mockRejectedValue(httpError);
			useApplicationStore.setState({ application });

			const { generateTemplate } = useApplicationStore.getState();

			await generateTemplate("template-id");

			expect(generateGrantTemplate).toHaveBeenCalledWith(application.workspace_id, application.id, "template-id");
		});

		it("should handle general errors during template generation", async () => {
			const application = ApplicationFactory.build();
			vi.mocked(generateGrantTemplate).mockRejectedValue(new Error("General error"));
			useApplicationStore.setState({ application });

			const { generateTemplate } = useApplicationStore.getState();

			await generateTemplate("template-id");

			expect(generateGrantTemplate).toHaveBeenCalled();
		});

		it("should handle progress text when stage info is available", async () => {
			const application = ApplicationFactory.build({
				rag_job_id: "job-123",
			});
			const jobData = RagJobResponseFactory.build({
				current_stage: 2,
				status: "PROCESSING",
				total_stages: 5,
			});

			vi.mocked(retrieveRagJob).mockResolvedValue(jobData);
			useApplicationStore.setState({ application });

			const { checkAndRestoreJobState } = useApplicationStore.getState();
			await checkAndRestoreJobState();

			const state = useApplicationStore.getState();
			expect(state.ragJobState.restoredJob).toEqual(jobData);
		});
	});

	describe("file and URL management", () => {
		it("should add files with parentId", async () => {
			const fileWithId = FileWithIdFactory.build();
			const application = ApplicationWithTemplateFactory.build();

			const { createTemplateSourceUploadUrl } = await mockSourcesActions();
			const { extractObjectPathFromUrl, triggerDevIndexing } = await mockDevIndexingPatch();

			const mockUploadResponse = CreateGrantApplicationRagSourceUploadUrlResponseFactory.build();
			vi.mocked(createTemplateSourceUploadUrl).mockResolvedValue(mockUploadResponse);
			vi.mocked(extractObjectPathFromUrl).mockReturnValue("path");
			vi.mocked(triggerDevIndexing).mockImplementation(() => Promise.resolve());

			vi.mocked(retrieveApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { addFile } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await addFile(fileWithId, application.grant_template.id);
			}

			expect(createTemplateSourceUploadUrl).toHaveBeenCalled();
		});

		it("should handle file upload errors", async () => {
			const fileWithId = FileWithIdFactory.build();
			const application = ApplicationWithTemplateFactory.build();

			const { createTemplateSourceUploadUrl } = await mockSourcesActions();
			vi.mocked(createTemplateSourceUploadUrl).mockRejectedValue(new Error("Upload failed"));

			useApplicationStore.setState({ application });
			const { addFile } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await addFile(fileWithId, application.grant_template.id);
			}

			expect(createTemplateSourceUploadUrl).toHaveBeenCalled();
		});

		it("should skip file upload when validation fails", async () => {
			const fileWithId = FileWithIdFactory.build();
			useApplicationStore.setState({ application: null });

			const { addFile } = useApplicationStore.getState();
			await addFile(fileWithId, "invalid-parent");

			const { createTemplateSourceUploadUrl } = await mockSourcesActions();
			expect(createTemplateSourceUploadUrl).not.toHaveBeenCalled();
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

		it("should handle URL processing errors", async () => {
			const application = ApplicationWithTemplateFactory.build();

			const { crawlTemplateUrl } = await mockSourcesActions();
			vi.mocked(crawlTemplateUrl).mockRejectedValue(new Error("URL processing failed"));

			useApplicationStore.setState({ application });
			const { addUrl } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await addUrl("https://example.com", application.grant_template.id);
			}

			expect(crawlTemplateUrl).toHaveBeenCalled();
		});

		it("should skip URL processing when validation fails", async () => {
			useApplicationStore.setState({ application: null });

			const { addUrl } = useApplicationStore.getState();
			await addUrl("https://example.com", "invalid-parent");

			const { crawlTemplateUrl } = await mockSourcesActions();
			expect(crawlTemplateUrl).not.toHaveBeenCalled();
		});

		it("should remove files with parentId", async () => {
			const file = FileWithIdFactory.build({ id: "1" });
			const application = ApplicationWithTemplateFactory.build();

			const { deleteTemplateSource } = await mockSourcesActions();
			vi.mocked(deleteTemplateSource).mockResolvedValue(undefined);

			vi.mocked(retrieveApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { removeFile } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await removeFile(file, application.grant_template.id);

				expect(deleteTemplateSource).toHaveBeenCalledWith(
					application.workspace_id,
					application.grant_template.id,
					"1",
				);
			}
		});

		it("should skip file removal when validation fails", async () => {
			const file = FileWithIdFactory.build({ id: "1" });
			useApplicationStore.setState({ application: null });

			const { removeFile } = useApplicationStore.getState();
			await removeFile(file, "invalid-parent");

			const { deleteTemplateSource } = await mockSourcesActions();
			expect(deleteTemplateSource).not.toHaveBeenCalled();
		});

		it("should skip file removal when file ID is missing", async () => {
			const file = FileWithIdFactory.build({ id: undefined });
			const application = ApplicationWithTemplateFactory.build();
			useApplicationStore.setState({ application });

			const { removeFile } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await removeFile(file, application.grant_template.id);
			}

			const { deleteTemplateSource } = await mockSourcesActions();
			expect(deleteTemplateSource).not.toHaveBeenCalled();
		});

		it("should handle file removal errors", async () => {
			const file = FileWithIdFactory.build({ id: "1" });
			const application = ApplicationWithTemplateFactory.build();

			const { deleteTemplateSource } = await mockSourcesActions();
			vi.mocked(deleteTemplateSource).mockRejectedValue(new Error("Deletion failed"));

			useApplicationStore.setState({ application });
			const { removeFile } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await removeFile(file, application.grant_template.id);
			}

			expect(deleteTemplateSource).toHaveBeenCalled();
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

			if (application.grant_template?.id) {
				await removeUrl("https://example.com", application.grant_template.id);

				expect(deleteTemplateSource).toHaveBeenCalledWith(
					application.workspace_id,
					application.grant_template.id,
					"source-1",
				);
			}
		});

		it("should skip URL removal when validation fails", async () => {
			useApplicationStore.setState({ application: null });

			const { removeUrl } = useApplicationStore.getState();
			await removeUrl("https://example.com", "invalid-parent");

			const { deleteTemplateSource } = await mockSourcesActions();
			expect(deleteTemplateSource).not.toHaveBeenCalled();
		});

		it("should skip URL removal when source not found", async () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...GrantTemplateFactory.build(),
					rag_sources: [],
				},
			});
			useApplicationStore.setState({ application });

			const { removeUrl } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await removeUrl("https://nonexistent.com", application.grant_template.id);
			}

			const { deleteTemplateSource } = await mockSourcesActions();
			expect(deleteTemplateSource).not.toHaveBeenCalled();
		});

		it("should handle URL removal errors", async () => {
			const ragSource = { id: "source-1", sourceId: "source-1", status: "FINISHED", url: "https://example.com" };
			const application = ApplicationWithTemplateFactory.build({
				grant_template: {
					...GrantTemplateFactory.build(),
					rag_sources: [ragSource] as any,
				},
			});

			const { deleteTemplateSource } = await mockSourcesActions();
			vi.mocked(deleteTemplateSource).mockRejectedValue(new Error("Deletion failed"));

			useApplicationStore.setState({ application });
			const { removeUrl } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await removeUrl("https://example.com", application.grant_template.id);
			}

			expect(deleteTemplateSource).toHaveBeenCalled();
		});

		it("should handle template parent sources correctly", async () => {
			const ragSource = { id: "source-1", sourceId: "source-1", status: "FINISHED", url: "https://example.com" };
			const application = ApplicationFactory.build({
				rag_sources: [ragSource] as any,
			});

			const { deleteApplicationSource } = await mockSourcesActions();
			vi.mocked(deleteApplicationSource).mockResolvedValue(undefined);

			useApplicationStore.setState({ application });
			const { removeUrl } = useApplicationStore.getState();

			await removeUrl("https://example.com", application.id);

			expect(deleteApplicationSource).toHaveBeenCalledWith(application.workspace_id, application.id, "source-1");
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
				const jobData = RagJobResponseFactory.build({
					id: "job-123",
					job_type: "grant_template_generation",
					status: "PROCESSING",
				});

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
				const jobData = RagJobResponseFactory.build({
					id: "job-123",
					job_type: "grant_application_generation",
					status: "PENDING",
				});

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
				const jobData = RagJobResponseFactory.build({
					id: "job-123",
					job_type: "grant_template_generation",
					status: "COMPLETED",
				});

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
				const jobData = RagJobResponseFactory.build({
					id: "job-123",
					job_type: "grant_template_generation",
					status: "FAILED",
				});

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
				const jobData = RagJobResponseFactory.build({
					id: "template-job-123",
					job_type: "grant_template_generation",
					status: "PROCESSING",
				});

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

			it("should prioritize application rag_job_id over template rag_job_id", async () => {
				const application = ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ rag_job_id: "template-job-456" }),
					rag_job_id: "app-job-123",
					workspace_id: "workspace-id",
				});
				const jobData = RagJobResponseFactory.build({
					id: "app-job-123",
					job_type: "grant_application_generation",
					status: "PROCESSING",
				});

				vi.mocked(retrieveRagJob).mockResolvedValue(jobData);
				useApplicationStore.setState({ application });

				const { checkAndRestoreJobState } = useApplicationStore.getState();
				await checkAndRestoreJobState();

				expect(retrieveRagJob).toHaveBeenCalledWith("workspace-id", "app-job-123");
				const state = useApplicationStore.getState();
				expect(state.ragJobState.restoredJob).toEqual(jobData);
			});

			it("should handle multiple job status types correctly", async () => {
				const testCases = [
					{ shouldRestore: true, status: "PROCESSING" as const },
					{ shouldRestore: true, status: "PENDING" as const },
					{ shouldRestore: false, status: "COMPLETED" as const },
					{ shouldRestore: false, status: "FAILED" as const },
				];

				for (const testCase of testCases) {
					const application = ApplicationFactory.build({
						rag_job_id: "job-123",
						workspace_id: "workspace-id",
					});
					const jobData = RagJobResponseFactory.build({
						id: "job-123",
						job_type: "grant_template_generation",
						status: testCase.status,
					});

					vi.mocked(retrieveRagJob).mockResolvedValue(jobData);
					useApplicationStore.setState({ application });

					const { checkAndRestoreJobState } = useApplicationStore.getState();
					await checkAndRestoreJobState();

					const state = useApplicationStore.getState();
					if (testCase.shouldRestore) {
						expect(state.ragJobState.restoredJob).toEqual(jobData);
					} else {
						expect(state.ragJobState.restoredJob).toBeNull();
					}

					useApplicationStore.setState({
						ragJobState: { isRestoring: false, restoredJob: null },
					});
					vi.clearAllMocks();
				}
			});
		});

		describe("clearRestoredJobState", () => {
			it("should clear restored job state", () => {
				const jobData = RagJobResponseFactory.build({
					id: "job-123",
					job_type: "grant_template_generation",
					status: "PROCESSING",
				});

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

		it("should handle concurrent file operations", async () => {
			const application = ApplicationWithTemplateFactory.build();
			const file1 = FileWithIdFactory.build({ id: "file1" });
			const file2 = FileWithIdFactory.build({ id: "file2" });

			const { createTemplateSourceUploadUrl } = await mockSourcesActions();
			const { extractObjectPathFromUrl, triggerDevIndexing } = await mockDevIndexingPatch();

			let uploadCount = 0;
			vi.mocked(createTemplateSourceUploadUrl).mockImplementation(async () => {
				uploadCount++;
				await new Promise((resolve) => setTimeout(resolve, 50));
				return CreateGrantApplicationRagSourceUploadUrlResponseFactory.build({
					source_id: `source-${uploadCount}`,
				});
			});
			vi.mocked(extractObjectPathFromUrl).mockReturnValue("path");
			vi.mocked(triggerDevIndexing).mockResolvedValue();
			vi.mocked(retrieveApplication).mockResolvedValue(application);

			useApplicationStore.setState({ application });
			const { addFile } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await Promise.all([
					addFile(file1, application.grant_template.id),
					addFile(file2, application.grant_template.id),
				]);
			}

			expect(uploadCount).toBe(2);
		});

		it("should handle concurrent URL operations", async () => {
			const application = ApplicationWithTemplateFactory.build();
			const urls = ["https://example1.com", "https://example2.com", "https://example3.com"];

			const { crawlTemplateUrl } = await mockSourcesActions();
			let crawlCount = 0;

			vi.mocked(crawlTemplateUrl).mockImplementation(async () => {
				crawlCount++;
				await new Promise((resolve) => setTimeout(resolve, 30));
				return { source_id: `source-${crawlCount}` };
			});

			vi.mocked(retrieveApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { addUrl } = useApplicationStore.getState();

			if (application.grant_template?.id) {
				await Promise.all(urls.map((url) => addUrl(url, application.grant_template!.id)));
			}

			expect(crawlCount).toBe(3);
		});
	});
});

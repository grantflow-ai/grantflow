import { ApplicationFactory, ApplicationWithTemplateFactory, GrantTemplateFactory } from "::testing/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApplication, retrieveApplication, updateApplication } from "@/actions/grant-applications";
import { updateGrantTemplate } from "@/actions/grant-template";

import { useApplicationStore } from "./application-store";

vi.mock("@/actions/grant-applications");
vi.mock("@/actions/grant-template");
vi.mock("@/actions/sources");
vi.mock("@/utils/dev-indexing-patch");
vi.mock("ky", () => ({
	default: vi.fn(() => Promise.resolve({ ok: true })),
}));

describe("Application Store", () => {
	beforeEach(() => {
		useApplicationStore.setState({
			application: null,
			applicationTitle: "",
			isLoading: false,
			uploadedFiles: {
				application: [],
				template: [],
			},
			urls: {
				application: [],
				template: [],
			},
		});

		vi.clearAllMocks();
	});

	describe("state management", () => {
		it("should initialize with default state", () => {
			const state = useApplicationStore.getState();
			expect(state.application).toBeNull();
			expect(state.applicationTitle).toBe("");
			expect(state.isLoading).toBe(false);
			expect(state.uploadedFiles).toEqual({
				application: [],
				template: [],
			});
			expect(state.urls).toEqual({
				application: [],
				template: [],
			});
		});
	});

	describe("setApplicationTitle", () => {
		it("should update application title immediately", () => {
			const { setApplicationTitle } = useApplicationStore.getState();

			setApplicationTitle("New Title");

			const state = useApplicationStore.getState();
			expect(state.applicationTitle).toBe("New Title");
		});

		it("should also update application object title optimistically", () => {
			const application = ApplicationFactory.build({ title: "Old Title" });
			useApplicationStore.setState({ application });

			const { setApplicationTitle } = useApplicationStore.getState();

			setApplicationTitle("New Title");

			const state = useApplicationStore.getState();
			expect(state.applicationTitle).toBe("New Title");
			expect(state.application?.title).toBe("New Title");
		});

		it("should handle null application gracefully", () => {
			const { setApplicationTitle } = useApplicationStore.getState();

			setApplicationTitle("New Title");

			const state = useApplicationStore.getState();
			expect(state.applicationTitle).toBe("New Title");
			expect(state.application).toBeNull();
		});
	});

	describe("updateApplicationTitle", () => {
		it("should call updateApplication API and update state on success", async () => {
			const application = ApplicationFactory.build({ title: "Old Title" });
			const updatedApplication = { ...application, title: "New Title" };

			vi.mocked(updateApplication).mockResolvedValue(updatedApplication);

			useApplicationStore.setState({
				application,
				applicationTitle: "Old Title",
			});

			const { updateApplicationTitle } = useApplicationStore.getState();

			await updateApplicationTitle("workspace-id", "app-id", "New Title");

			expect(updateApplication).toHaveBeenCalledWith("workspace-id", "app-id", { title: "New Title" });

			const state = useApplicationStore.getState();
			expect(state.application).toEqual(updatedApplication);
			expect(state.applicationTitle).toBe("New Title");
		});

		it("should rollback on API error", async () => {
			const application = ApplicationFactory.build({ title: "Old Title" });

			vi.mocked(updateApplication).mockRejectedValue(new Error("API Error"));

			useApplicationStore.setState({
				application,
				applicationTitle: "Old Title",
			});

			const { updateApplicationTitle } = useApplicationStore.getState();

			await updateApplicationTitle("workspace-id", "app-id", "New Title");

			const state = useApplicationStore.getState();
			expect(state.application?.title).toBe("Old Title");
			expect(state.applicationTitle).toBe("Old Title");
		});
	});

	describe("createApplication", () => {
		it("should create application and update state", async () => {
			const application = ApplicationFactory.build();

			vi.mocked(createApplication).mockResolvedValue(application);

			const { createApplication: createApp } = useApplicationStore.getState();

			await createApp("workspace-id");

			expect(createApplication).toHaveBeenCalledWith("workspace-id", { title: "Untitled Application" });

			const state = useApplicationStore.getState();
			expect(state.application).toEqual(application);
			expect(state.applicationTitle).toBe(application.title);
			expect(state.isLoading).toBe(false);
		});

		it("should handle errors gracefully", async () => {
			vi.mocked(createApplication).mockRejectedValue(new Error("API Error"));

			const { createApplication: createApp } = useApplicationStore.getState();

			await createApp("workspace-id");

			const state = useApplicationStore.getState();
			expect(state.application).toBeNull();
			expect(state.isLoading).toBe(false);
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
			expect(state.applicationTitle).toBe(application.title);
			expect(state.isLoading).toBe(false);
		});
	});

	describe("setApplication", () => {
		it("should update both application and title", () => {
			const application = ApplicationFactory.build({ title: "Test App" });

			const { setApplication } = useApplicationStore.getState();

			setApplication(application);

			const state = useApplicationStore.getState();
			expect(state.application).toEqual(application);
			expect(state.applicationTitle).toBe("Test App");
		});
	});

	describe("updateGrantSections", () => {
		it("should update grant template sections", async () => {
			const sections = [
				{
					depends_on: [],
					generation_instructions: "",
					id: "1",
					is_clinical_trial: null,
					is_detailed_workplan: null,
					keywords: [],
					max_words: 500,
					order: 0,
					parent_id: null,
					search_queries: [],
					title: "Introduction",
					topics: [],
				},
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
		it("should add files", async () => {
			const file = new File(["content"], "test.pdf", { type: "application/pdf" });
			Object.assign(file, { id: "test.pdf" });
			const application = ApplicationWithTemplateFactory.build();

			const { createApplicationSourceUploadUrl } = await import("@/actions/sources");
			const { extractObjectPathFromUrl, triggerDevIndexing } = await import("@/utils/dev-indexing-patch");

			vi.mocked(createApplicationSourceUploadUrl).mockResolvedValue({
				source_id: "source-123",
				url: "https://upload.url",
			});
			vi.mocked(extractObjectPathFromUrl).mockReturnValue("path");
			vi.mocked(triggerDevIndexing).mockImplementation(() => Promise.resolve());

			vi.mocked(retrieveApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { addFile } = useApplicationStore.getState();

			await addFile(file as any, application.id);

			const state = useApplicationStore.getState();
			expect(state.uploadedFiles.application).toHaveLength(1);
			expect(state.uploadedFiles.application[0].name).toBe("test.pdf");
		});

		it("should add URLs without duplicates", async () => {
			const application = ApplicationWithTemplateFactory.build();

			const { crawlTemplateUrl } = await import("@/actions/sources");
			vi.mocked(crawlTemplateUrl).mockResolvedValue({ source_id: "source-123" });

			vi.mocked(retrieveApplication).mockResolvedValue(application);
			useApplicationStore.setState({ application });

			const { addUrl } = useApplicationStore.getState();

			await addUrl("https://example.com", application.grant_template!.id);
			await addUrl("https://example.com", application.grant_template!.id);
			await addUrl("https://different.com", application.grant_template!.id);

			const state = useApplicationStore.getState();
			expect(state.urls.template).toEqual(["https://example.com", "https://different.com"]);
		});

		it("should remove files", async () => {
			const file1 = { id: "1", name: "test1.pdf", size: 1000 };
			const file2 = { id: "2", name: "test2.pdf", size: 2000 };
			const application = ApplicationWithTemplateFactory.build();

			const { deleteTemplateSource } = await import("@/actions/sources");
			vi.mocked(deleteTemplateSource).mockResolvedValue(undefined);

			vi.mocked(retrieveApplication).mockResolvedValue(application);
			useApplicationStore.setState({ 
				application, 
				uploadedFiles: {
					application: [],
					template: [file1, file2] as any,
				}
			});

			const { removeFile } = useApplicationStore.getState();

			await removeFile(file1 as any, application.grant_template!.id);

			const state = useApplicationStore.getState();
			expect(state.uploadedFiles.template).toEqual([file2]);
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
			useApplicationStore.setState({ 
				application, 
				urls: {
					application: [],
					template: ["https://example.com", "https://different.com"],
				}
			});

			const { removeUrl } = useApplicationStore.getState();

			await removeUrl("https://example.com", application.grant_template!.id);

			const state = useApplicationStore.getState();
			expect(state.urls.template).toEqual(["https://different.com"]);
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

	describe("handleApplicationInit", () => {
		it("should retrieve existing application when ID provided", async () => {
			const application = ApplicationFactory.build();

			vi.mocked(retrieveApplication).mockResolvedValue(application);

			const { handleApplicationInit } = useApplicationStore.getState();

			await handleApplicationInit("workspace-id", "app-id");

			expect(retrieveApplication).toHaveBeenCalledWith("workspace-id", "app-id");
			expect(createApplication).not.toHaveBeenCalled();
		});

		it("should create new application when no ID provided", async () => {
			const application = ApplicationFactory.build();

			vi.mocked(createApplication).mockResolvedValue(application);

			const { handleApplicationInit } = useApplicationStore.getState();

			await handleApplicationInit("workspace-id");

			expect(createApplication).toHaveBeenCalledWith("workspace-id", { title: "Untitled Application" });
			expect(retrieveApplication).not.toHaveBeenCalled();
		});
	});
});
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory } from "::testing/factories";
import { useApplicationStore } from "@/stores/application-store";
import { mockUseWizardStore, mockWizardStore } from "@/testing/wizard-store-mock";

import { ApplicationDetailsStep } from "./application-details-step";

vi.mock("@/actions/sources", () => ({
	crawlTemplateUrl: vi.fn().mockResolvedValue({ message: "URL crawled successfully" }),
	deleteTemplateSource: vi.fn(),
}));

vi.mock("@/stores/wizard-store", () => ({
	useWizardStore: mockUseWizardStore,
}));

vi.mock("@/stores/application-store", () => ({
	useApplicationStore: vi.fn(),
}));

describe("ApplicationDetailsStep", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		Object.assign(mockWizardStore, {
			applicationState: {
				application: null,
				uploadedFiles: [],
				urls: [],
			},
			isLoading: false,
			ui: {
				currentStep: 0,
				fileDropdownStates: {},
				linkHoverStates: {},
				urlInput: "",
			},
		});

		vi.mocked(useApplicationStore).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: null,
			areFilesOrUrlsIndexing: vi.fn(() => false),
			createApplication: vi.fn(),
			generateTemplate: vi.fn(),
			handleApplicationInit: vi.fn(),
			isLoading: false,
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
			retrieveApplication: vi.fn(),
			setApplication: vi.fn(),
			setUploadedFiles: vi.fn(),
			setUrls: vi.fn(),
			updateApplication: vi.fn().mockResolvedValue(undefined),
			uploadedFiles: [],
			urls: [],
		});
	});

	it("renders application title section", () => {
		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-title-header")).toBeInTheDocument();
		expect(screen.getByTestId("application-title-description")).toBeInTheDocument();
		expect(screen.getByTestId("application-title-textarea")).toBeInTheDocument();
	});

	it("renders application instructions section", () => {
		render(<ApplicationDetailsStep />);

		expect(screen.getByText("Application Instructions")).toBeInTheDocument();
		expect(screen.getAllByText("Documents")[0]).toBeInTheDocument();
		expect(screen.getAllByText("Links")[0]).toBeInTheDocument();
	});

	it("displays character count for title", () => {
		vi.mocked(useApplicationStore).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({
				grant_template: {
					created_at: "",
					grant_application_id: "",
					grant_sections: [],
					id: "test-template-id",
					rag_sources: [],
					updated_at: "",
				},
				id: "test-id",
				title: "Test Title",
				workspace_id: "test-workspace-id",
			}),
			areFilesOrUrlsIndexing: vi.fn(() => false),
			createApplication: vi.fn(),
			generateTemplate: vi.fn(),
			handleApplicationInit: vi.fn(),
			isLoading: false,
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
			retrieveApplication: vi.fn(),
			setApplication: vi.fn(),
			setUploadedFiles: vi.fn(),
			setUrls: vi.fn(),
			updateApplication: vi.fn().mockResolvedValue(undefined),
			uploadedFiles: [],
			urls: [],
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-title-textarea-chars-count")).toBeInTheDocument();
	});

	it("calls updateApplication when title is typed", async () => {
		const user = userEvent.setup();
		const mockUpdateApplication = vi.fn().mockResolvedValue(undefined);

		vi.mocked(useApplicationStore).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({
				grant_template: {
					created_at: "",
					grant_application_id: "",
					grant_sections: [],
					id: "test-template-id",
					rag_sources: [],
					updated_at: "",
				},
				id: "test-id",
				title: "",
				workspace_id: "test-workspace-id",
			}),
			areFilesOrUrlsIndexing: vi.fn(() => false),
			createApplication: vi.fn(),
			generateTemplate: vi.fn(),
			handleApplicationInit: vi.fn(),
			isLoading: false,
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
			retrieveApplication: vi.fn(),
			setApplication: vi.fn(),
			setUploadedFiles: vi.fn(),
			setUrls: vi.fn(),
			updateApplication: mockUpdateApplication,
			uploadedFiles: [],
			urls: [],
		});

		render(<ApplicationDetailsStep />);

		const textarea = screen.getByTestId("application-title-textarea");
		await user.type(textarea, "Test");

		await waitFor(() => {
			expect(mockUpdateApplication).toHaveBeenCalled();
		});
	});

	it("limits title length to 120 characters", () => {
		render(<ApplicationDetailsStep />);

		const textarea = screen.getByTestId("application-title-textarea");
		expect(textarea).toHaveAttribute("maxLength", "120");
	});

	it("renders URL input component", () => {
		vi.mocked(useApplicationStore).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({
				grant_template: {
					created_at: "",
					grant_application_id: "",
					grant_sections: [],
					id: "test-template-id",
					rag_sources: [],
					updated_at: "",
				},
				id: "test-id",
				title: "",
				workspace_id: "test-workspace-id",
			}),
			areFilesOrUrlsIndexing: vi.fn(() => false),
			createApplication: vi.fn(),
			generateTemplate: vi.fn(),
			handleApplicationInit: vi.fn(),
			isLoading: false,
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
			retrieveApplication: vi.fn(),
			setApplication: vi.fn(),
			setUploadedFiles: vi.fn(),
			setUrls: vi.fn(),
			updateApplication: vi.fn().mockResolvedValue(undefined),
			uploadedFiles: [],
			urls: [],
		});

		render(<ApplicationDetailsStep />);

		const urlInput = screen.getByPlaceholderText("Paste a link and press Enter to add");
		expect(urlInput).toBeInTheDocument();
	});

	it("displays existing URLs", () => {
		vi.mocked(useApplicationStore).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({
				grant_template: {
					created_at: "",
					grant_application_id: "",
					grant_sections: [],
					id: "test-template-id",
					rag_sources: [],
					updated_at: "",
				},
				id: "test-id",
				title: "Test Title",
				workspace_id: "test-workspace-id",
			}),
			areFilesOrUrlsIndexing: vi.fn(() => false),
			createApplication: vi.fn(),
			generateTemplate: vi.fn(),
			handleApplicationInit: vi.fn(),
			isLoading: false,
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
			retrieveApplication: vi.fn(),
			setApplication: vi.fn(),
			setUploadedFiles: vi.fn(),
			setUrls: vi.fn(),
			updateApplication: vi.fn().mockResolvedValue(undefined),
			uploadedFiles: [],
			urls: ["https://example1.com", "https://example2.com"],
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getAllByText("https://example1.com").length).toBeGreaterThan(0);
		expect(screen.getAllByText("https://example2.com").length).toBeGreaterThan(0);
	});

	it("displays URLs and shows removal on hover", async () => {
		const user = userEvent.setup();

		vi.mocked(useApplicationStore).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({
				grant_template: {
					created_at: "",
					grant_application_id: "",
					grant_sections: [],
					id: "test-template-id",
					rag_sources: [],
					updated_at: "",
				},
				id: "test-id",
				title: "Test Title",
				workspace_id: "test-workspace-id",
			}),
			areFilesOrUrlsIndexing: vi.fn(() => false),
			createApplication: vi.fn(),
			generateTemplate: vi.fn(),
			handleApplicationInit: vi.fn(),
			isLoading: false,
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
			retrieveApplication: vi.fn(),
			setApplication: vi.fn(),
			setUploadedFiles: vi.fn(),
			setUrls: vi.fn(),
			updateApplication: vi.fn().mockResolvedValue(undefined),
			uploadedFiles: [],
			urls: ["https://example1.com", "https://example2.com"],
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-links")).toBeInTheDocument();
		expect(screen.getByText("https://example1.com")).toBeInTheDocument();
		expect(screen.getByText("https://example2.com")).toBeInTheDocument();

		const [link] = screen.getAllByTestId("link-preview-item");
		await user.hover(link);

		await waitFor(() => {
			expect(screen.getByTestId("link-remove-icon")).toBeInTheDocument();
		});
	});

	it("renders TemplateFileContainer", () => {
		const { container } = render(<ApplicationDetailsStep />);

		const templateFileContainer = container.querySelector('[data-testid="template-file-container"]');
		expect(templateFileContainer).toBeInTheDocument();
	});

	it("renders application preview with empty state", () => {
		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-title-textarea")).toBeInTheDocument();
		expect(screen.getAllByText("Application Title").length).toBeGreaterThan(0);
		expect(screen.queryByTestId("application-documents")).not.toBeInTheDocument();
		expect(screen.queryByTestId("application-links")).not.toBeInTheDocument();
	});

	it("shows uploaded files in preview", () => {
		const file = new File(["content"], "test.pdf", { type: "application/pdf" });
		Object.assign(file, { id: "file-id" });

		vi.mocked(useApplicationStore).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({
				grant_template: {
					created_at: "",
					grant_application_id: "",
					grant_sections: [],
					id: "test-template-id",
					rag_sources: [],
					updated_at: "",
				},
				id: "test-id",
				title: "Test Title",
				workspace_id: "test-workspace-id",
			}),
			areFilesOrUrlsIndexing: vi.fn(() => false),
			createApplication: vi.fn(),
			generateTemplate: vi.fn(),
			handleApplicationInit: vi.fn(),
			isLoading: false,
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
			retrieveApplication: vi.fn(),
			setApplication: vi.fn(),
			setUploadedFiles: vi.fn(),
			setUrls: vi.fn(),
			updateApplication: vi.fn().mockResolvedValue(undefined),
			uploadedFiles: [file],
			urls: [],
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-documents")).toBeInTheDocument();
		expect(screen.getByText("test.pdf")).toBeInTheDocument();
	});

	it("renders file dropdown with right-click", async () => {
		const user = userEvent.setup();

		const file = new File(["content"], "test.pdf", { type: "application/pdf" });
		Object.assign(file, { id: "file-id" });

		vi.mocked(useApplicationStore).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({
				grant_template: {
					created_at: "",
					grant_application_id: "",
					grant_sections: [],
					id: "test-template-id",
					rag_sources: [],
					updated_at: "",
				},
				id: "test-id",
				title: "Test Title",
				workspace_id: "test-workspace-id",
			}),
			areFilesOrUrlsIndexing: vi.fn(() => false),
			createApplication: vi.fn(),
			generateTemplate: vi.fn(),
			handleApplicationInit: vi.fn(),
			isLoading: false,
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
			retrieveApplication: vi.fn(),
			setApplication: vi.fn(),
			setUploadedFiles: vi.fn(),
			setUrls: vi.fn(),
			updateApplication: vi.fn().mockResolvedValue(undefined),
			uploadedFiles: [file],
			urls: [],
		});

		render(<ApplicationDetailsStep />);

		const fileCard = screen.getByText("test.pdf").closest(".group");
		expect(fileCard).toBeInTheDocument();

		if (fileCard) {
			await user.pointer({ keys: "[MouseRight]", target: fileCard });
		}

		await waitFor(() => {
			expect(screen.getByText("Open")).toBeInTheDocument();
			expect(screen.getByText("Remove")).toBeInTheDocument();
		});
	});
});

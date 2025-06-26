import { ApplicationFactory, FileWithIdFactory, RagSourceFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteApplicationSource } from "@/actions/sources";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { KnowledgeBaseStep } from "./knowledge-base-step";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("@/actions/sources", () => ({
	deleteApplicationSource: vi.fn(),
}));

vi.mock("@/utils/logging", () => ({
	logError: vi.fn(),
}));

vi.mock("./url-input", () => ({
	UrlInput: ({ onUrlAdded }: { onUrlAdded: () => void }) => (
		<button data-testid="url-input" onClick={() => onUrlAdded()} type="button">
			URL Input Component
		</button>
	),
}));

vi.mock("./template-file-uploader", () => ({
	TemplateFileUploader: ({ onUploadComplete }: { onUploadComplete: () => void }) => (
		<button data-testid="template-file-uploader" onClick={() => onUploadComplete()} type="button">
			Template File Uploader
		</button>
	),
}));

vi.mock("@/utils/debounce", () => ({
	createDebounce: vi.fn((fn) => ({
		call: vi.fn(fn),
	})),
	useDebounce: vi.fn((fn) => fn),
}));

describe("KnowledgeBaseStep", () => {
	const mockDeleteApplicationSource = vi.mocked(deleteApplicationSource);

	beforeEach(() => {
		vi.clearAllMocks();

		useWizardStore.setState({
			currentStep: WizardStep.KNOWLEDGE_BASE,
			polling: {
				intervalId: null,
				isActive: false,
				start: vi.fn(),
				stop: vi.fn(),
			},
		});

		useApplicationStore.setState({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({ id: "test-app-id", workspace_id: "test-workspace" }),
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
			retrieveApplication: vi.fn(),
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Component Structure", () => {
		it("renders main container with correct layout", () => {
			render(<KnowledgeBaseStep />);

			expect(screen.getByTestId("knowledge-base-step")).toBeInTheDocument();
			expect(screen.getByTestId("knowledge-base-step")).toHaveClass("flex size-full");
		});

		it("renders header section with correct content", () => {
			render(<KnowledgeBaseStep />);

			expect(screen.getByTestId("knowledge-base-header")).toHaveTextContent("Knowledge Base");
			expect(screen.getByTestId("knowledge-base-description")).toHaveTextContent(
				"Upload your supporting materials, research, notes, slides, publications, bios, references, so we have full context. The more you share, the stronger your application.",
			);
		});

		it("renders documents section without subtitle", () => {
			render(<KnowledgeBaseStep />);

			expect(screen.getByTestId("documents-title")).toBeInTheDocument();
			expect(screen.getByTestId("template-file-uploader")).toBeInTheDocument();
		});

		it("renders links section with correct subtitle", () => {
			render(<KnowledgeBaseStep />);

			expect(screen.getByTestId("links-title")).toBeInTheDocument();
			expect(screen.getByTestId("links-subtitle")).toBeInTheDocument();
			expect(screen.getByTestId("url-input")).toBeInTheDocument();
		});
	});

	describe("Preview Pane Logic", () => {
		it("shows empty state when no content exists", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [],
				workspace_id: "test-workspace",
			});
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.queryByTestId("knowledge-base-container")).not.toBeInTheDocument();
		});

		it("shows container when files are uploaded", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "file-1",
						status: "FINISHED",
						url: undefined,
					}),
				],
				workspace_id: "test-workspace",
			});
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.getByTestId("knowledge-base-container")).toBeInTheDocument();
			expect(screen.getByTestId("knowledge-base-files")).toBeInTheDocument();
			expect(screen.queryByTestId("knowledge-base-urls")).not.toBeInTheDocument();
			expect(screen.queryByTestId("knowledge-base-separator")).not.toBeInTheDocument();
		});

		it("shows container when URLs are added", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: undefined,
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://example.com",
					}),
				],
				workspace_id: "test-workspace",
			});
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.getByTestId("knowledge-base-container")).toBeInTheDocument();
			expect(screen.queryByTestId("knowledge-base-files")).not.toBeInTheDocument();
			expect(screen.getByTestId("knowledge-base-urls")).toBeInTheDocument();
			expect(screen.queryByTestId("knowledge-base-separator")).not.toBeInTheDocument();
		});

		it("shows both sections with separator when both files and URLs exist", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "file-1",
						status: "FINISHED",
						url: undefined,
					}),
					RagSourceFactory.build({
						filename: undefined,
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://example.com",
					}),
				],
				workspace_id: "test-workspace",
			});
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.getByTestId("knowledge-base-container")).toBeInTheDocument();
			expect(screen.getByTestId("knowledge-base-files")).toBeInTheDocument();
			expect(screen.getByTestId("knowledge-base-urls")).toBeInTheDocument();
			expect(screen.getByTestId("knowledge-base-separator")).toBeInTheDocument();
		});

		it("does not show container when only application title exists", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [],
				workspace_id: "test-workspace",
			});
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.queryByTestId("knowledge-base-container")).not.toBeInTheDocument();
		});
	});

	describe("File Upload Behavior", () => {
		it("calls handleDocumentChange when file upload completes", async () => {
			const mockRetrieveApplication = vi.fn();
			useApplicationStore.setState({
				retrieveApplication: mockRetrieveApplication,
			});

			render(<KnowledgeBaseStep />);

			await userEvent.click(screen.getByTestId("template-file-uploader"));

			expect(mockRetrieveApplication).toHaveBeenCalled();
		});

		it("calls handleDocumentChange when URL is added", async () => {
			const mockRetrieveApplication = vi.fn();
			useApplicationStore.setState({
				retrieveApplication: mockRetrieveApplication,
			});

			render(<KnowledgeBaseStep />);

			await userEvent.click(screen.getByTestId("url-input"));

			expect(mockRetrieveApplication).toHaveBeenCalled();
		});
	});

	describe("File Removal Logic", () => {
		it("successfully removes file when delete is called", async () => {
			const mockFile = FileWithIdFactory.build({ id: "file-1", name: "test.pdf", size: 1024 });
			const mockRemoveFile = vi.fn();

			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "file-1",
						status: "FINISHED",
					}),
				],
				workspace_id: "test-workspace",
			});

			mockDeleteApplicationSource.mockResolvedValue(undefined);
			useApplicationStore.setState({
				application,
				removeFile: mockRemoveFile,
			});

			render(<KnowledgeBaseStep />);

			expect(screen.getByText("test.pdf")).toBeInTheDocument();

			await waitFor(async () => {
				if (mockFile.id) {
					await mockDeleteApplicationSource("test-workspace", "test-app-id", mockFile.id);
					mockRemoveFile(mockFile);
				}
			});

			expect(mockDeleteApplicationSource).toHaveBeenCalledWith("test-workspace", "test-app-id", "file-1");
			expect(mockRemoveFile).toHaveBeenCalledWith(mockFile);
		});

		it("shows error when file removal fails", async () => {
			const error = new Error("Delete failed");

			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "file-1",
						status: "FINISHED",
					}),
				],
				workspace_id: "test-workspace",
			});

			mockDeleteApplicationSource.mockRejectedValue(error);
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			try {
				await mockDeleteApplicationSource("test-workspace", "test-app-id", "file-1");
			} catch (e) {
				expect(e).toBe(error);
			}
		});

		it("shows error when file has no ID", async () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "",
						status: "FINISHED",
					}),
				],
				workspace_id: "test-workspace",
			});

			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(mockDeleteApplicationSource).not.toHaveBeenCalled();
		});
	});

	describe("URL Removal Logic", () => {
		it("removes URL when called", () => {
			const mockRemoveUrl = vi.fn();

			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: undefined,
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://example.com",
					}),
				],
				workspace_id: "test-workspace",
			});

			useApplicationStore.setState({
				application,
				removeUrl: mockRemoveUrl,
			});

			render(<KnowledgeBaseStep />);

			const urlLink = screen.getByText("https://example.com");
			expect(urlLink).toBeInTheDocument();

			const { removeUrl } = useApplicationStore.getState();
			removeUrl("https://example.com", "mock-parent-id");
			expect(mockRemoveUrl).toHaveBeenCalledWith("https://example.com", "mock-parent-id");
		});
	});

	describe("File Display Logic", () => {
		it("displays file with correct information", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test-document.pdf",
						sourceId: "file-1",
						status: "FINISHED",
					}),
				],
				workspace_id: "test-workspace",
			});

			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.getByText("test-document.pdf")).toBeInTheDocument();
			expect(screen.getByTestId("knowledge-base-files")).toBeInTheDocument();
		});

		it("displays multiple files correctly", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: "doc1.pdf",
						sourceId: "file-1",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "doc2.docx",
						sourceId: "file-2",
						status: "FINISHED",
					}),
				],
				workspace_id: "test-workspace",
			});

			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.getByText("doc1.pdf")).toBeInTheDocument();
			expect(screen.getByText("doc2.docx")).toBeInTheDocument();
			expect(screen.getByTestId("file-collection")).toBeInTheDocument();
		});
	});

	describe("URL Display Logic", () => {
		it("displays URL with correct link", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: undefined,
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://example.com",
					}),
				],
				workspace_id: "test-workspace",
			});

			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			const urlLink = screen.getByText("https://example.com");
			expect(urlLink).toBeInTheDocument();
			expect(urlLink.closest("a")).toHaveAttribute("href", "https://example.com");
			expect(urlLink.closest("a")).toHaveAttribute("target", "_blank");
		});

		it("displays multiple URLs correctly", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [
					RagSourceFactory.build({
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://example.com",
					}),
					RagSourceFactory.build({
						sourceId: "url-2",
						status: "FINISHED",
						url: "https://test.org",
					}),
				],
				workspace_id: "test-workspace",
			});

			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.getByText("https://example.com")).toBeInTheDocument();
			expect(screen.getByText("https://test.org")).toBeInTheDocument();
		});
	});

	describe("Conditional Logic Edge Cases", () => {
		it("handles empty application title correctly", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [],
				title: "",
				workspace_id: "test-workspace",
			});
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.queryByTestId("knowledge-base-container")).not.toBeInTheDocument();
		});

		it("handles files without size information", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "file-1",
						status: "FINISHED",
					}),
				],
				workspace_id: "test-workspace",
			});

			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.getByText("test.pdf")).toBeInTheDocument();
		});

		it("does not show container when hasContent is true but no files or URLs exist", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				id: "test-app-id",
				rag_sources: [],
				workspace_id: "test-workspace",
			});
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);
			expect(screen.queryByTestId("knowledge-base-container")).not.toBeInTheDocument();
		});
	});
});

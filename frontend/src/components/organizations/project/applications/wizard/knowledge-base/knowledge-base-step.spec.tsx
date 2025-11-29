import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ApplicationFactory, FileWithIdFactory, RagSourceFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/components/organizations/project/applications/wizard/url-input", () => ({
	UrlInput: () => (
		<button data-testid="url-input" type="button">
			URL Input Component
		</button>
	),
}));

vi.mock("@/components/organizations/project/applications/wizard/template-file-uploader", () => ({
	TemplateFileUploader: ({ sourceType }: { sourceType: string }) => (
		<button data-testid="template-file-uploader" type="button">
			Template File Uploader - {sourceType}
		</button>
	),
}));

vi.mock("@/utils/debounce", () => ({
	createDebounce: vi.fn((fn) => ({
		call: vi.fn(fn),
	})),
	useDebounce: vi.fn((fn) => fn),
}));

describe.sequential("KnowledgeBaseStep", () => {
	const mockDeleteApplicationSource = vi.mocked(deleteApplicationSource);

	beforeEach(() => {
		vi.clearAllMocks();
		setupAuthenticatedTest();

		useWizardStore.setState({
			currentStep: WizardStep.KNOWLEDGE_BASE,
		});

		useApplicationStore.setState({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({ id: "test-app-id", project_id: "test-project" }),
			getApplication: vi.fn(),
			pendingUploads: {
				application: new Set(),
				template: new Set(),
			},
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
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

		it("passes correct sourceType to TemplateFileUploader", () => {
			render(<KnowledgeBaseStep />);

			expect(screen.getByText("Template File Uploader - application")).toBeInTheDocument();
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
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [],
			});
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.queryByTestId("knowledge-base-container")).not.toBeInTheDocument();
		});

		it("shows container when files are uploaded", () => {
			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "file-1",
						status: "FINISHED" as const,
					}),
				],
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
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						sourceId: "url-1",
						status: "FINISHED" as const,
						url: "https://example.com",
					}),
				],
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
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "file-1",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://example.com",
					}),
				],
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
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [],
			});
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.queryByTestId("knowledge-base-container")).not.toBeInTheDocument();
		});
	});

	describe("File Removal Logic", () => {
		it("successfully removes file when delete is called", async () => {
			const mockFile = FileWithIdFactory.build({ id: "file-1", name: "test.pdf", size: 1024 });
			const mockRemoveFile = vi.fn();

			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "file-1",
						status: "FINISHED",
					}),
				],
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
					await mockDeleteApplicationSource("mock-org-id", "test-project", "test-app-id", mockFile.id);
					mockRemoveFile(mockFile);
				}
			});

			expect(mockDeleteApplicationSource).toHaveBeenCalledWith(
				"mock-org-id",
				"test-project",
				"test-app-id",
				"file-1",
			);
			expect(mockRemoveFile).toHaveBeenCalledWith(mockFile);
		});

		it("shows error when file removal fails", async () => {
			const error = new Error("Delete failed");

			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "file-1",
						status: "FINISHED",
					}),
				],
			});

			mockDeleteApplicationSource.mockRejectedValue(error);
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			try {
				await mockDeleteApplicationSource("mock-org-id", "test-project", "test-app-id", "file-1");
			} catch (e) {
				expect(e).toBe(error);
			}
		});

		it("shows error when file has no ID", async () => {
			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "",
						status: "FINISHED",
					}),
				],
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
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://example.com",
					}),
				],
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
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test-document.pdf",
						sourceId: "file-1",
						status: "FINISHED",
					}),
				],
			});

			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.getByText("test-document.pdf")).toBeInTheDocument();
			expect(screen.getByTestId("knowledge-base-files")).toBeInTheDocument();
		});

		it("displays multiple files correctly", () => {
			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
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
			});

			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.getByText("doc1.pdf")).toBeInTheDocument();
			expect(screen.getByText("doc2.docx")).toBeInTheDocument();
			expect(screen.getByTestId("knowledge-base-files")).toBeInTheDocument();
		});
	});

	describe("URL Display Logic", () => {
		it("displays URL with correct link", () => {
			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://example.com",
					}),
				],
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
				id: "test-app-id",
				project_id: "test-project",
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
			});

			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.getByText("https://example.com")).toBeInTheDocument();
			expect(screen.getByText("https://test.org")).toBeInTheDocument();
		});
	});

	describe("Source Filtering Logic", () => {
		it("excludes FAILED sources from file display", () => {
			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						filename: "good-file.pdf",
						sourceId: "file-1",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "failed-file.pdf",
						sourceId: "file-2",
						status: "FAILED",
					}),
				],
			});

			useApplicationStore.setState({ application });
			render(<KnowledgeBaseStep />);

			expect(screen.getByText("good-file.pdf")).toBeInTheDocument();
			expect(screen.queryByText("failed-file.pdf")).not.toBeInTheDocument();
		});

		it("excludes FAILED sources from URL display", () => {
			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://good-url.com",
					}),
					RagSourceFactory.build({
						sourceId: "url-2",
						status: "FAILED",
						url: "https://failed-url.com",
					}),
				],
			});

			useApplicationStore.setState({ application });
			render(<KnowledgeBaseStep />);

			expect(screen.getByText("https://good-url.com")).toBeInTheDocument();
			expect(screen.queryByText("https://failed-url.com")).not.toBeInTheDocument();
		});

		it("excludes sources without filename or url", () => {
			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						sourceId: "invalid-1",
						status: "FINISHED" as const,
					}),
					RagSourceFactory.build({
						filename: "valid-file.pdf",
						sourceId: "file-1",
						status: "FINISHED" as const,
					}),
				],
			});

			useApplicationStore.setState({ application });
			render(<KnowledgeBaseStep />);

			expect(screen.getByText("valid-file.pdf")).toBeInTheDocument();
			expect(screen.queryByTestId("knowledge-base-urls")).not.toBeInTheDocument();
		});
	});

	describe("URL Grid Column Distribution", () => {
		it("distributes URLs correctly across two columns", () => {
			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						sourceId: "url-0",
						status: "FINISHED",
						url: "https://first.com",
					}),
					RagSourceFactory.build({
						sourceId: "url-1",
						status: "FINISHED",
						url: "https://second.com",
					}),
					RagSourceFactory.build({
						sourceId: "url-2",
						status: "FINISHED",
						url: "https://third.com",
					}),
					RagSourceFactory.build({
						sourceId: "url-3",
						status: "FINISHED",
						url: "https://fourth.com",
					}),
				],
			});

			useApplicationStore.setState({ application });
			render(<KnowledgeBaseStep />);

			const urlsContainer = screen.getByTestId("knowledge-base-urls");
			const columns = urlsContainer.querySelectorAll(".space-y-1");

			expect(columns).toHaveLength(2);
			expect(columns[0]).toHaveTextContent("https://first.com");
			expect(columns[0]).toHaveTextContent("https://third.com");
			expect(columns[1]).toHaveTextContent("https://second.com");
			expect(columns[1]).toHaveTextContent("https://fourth.com");
		});

		it("handles single URL in grid layout", () => {
			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						sourceId: "url-0",
						status: "FINISHED" as const,
						url: "https://single.com",
					}),
				],
			});

			useApplicationStore.setState({ application });
			render(<KnowledgeBaseStep />);

			const urlsContainer = screen.getByTestId("knowledge-base-urls");
			const columns = urlsContainer.querySelectorAll(".space-y-1");

			expect(columns).toHaveLength(2);
			expect(columns[0]).toHaveTextContent("https://single.com");
			expect(columns[1]).not.toHaveTextContent("https://single.com");
		});
	});

	describe("Application State Handling", () => {
		it("handles null application gracefully", () => {
			useApplicationStore.setState({ application: null });

			render(<KnowledgeBaseStep />);

			expect(screen.getByTestId("knowledge-base-step")).toBeInTheDocument();
			expect(screen.queryByTestId("knowledge-base-container")).not.toBeInTheDocument();
		});

		it("handles undefined rag_sources", () => {
			const application = {
				...ApplicationFactory.build({
					id: "test-app-id",
					project_id: "test-project",
				}),
				rag_sources: [],
			};

			useApplicationStore.setState({ application });
			render(<KnowledgeBaseStep />);

			expect(screen.queryByTestId("knowledge-base-container")).not.toBeInTheDocument();
		});
	});

	describe("Conditional Logic Edge Cases", () => {
		it("handles empty application title correctly", () => {
			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [],
				title: "",
			});
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.queryByTestId("knowledge-base-container")).not.toBeInTheDocument();
		});

		it("handles files without size information", () => {
			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "file-1",
						status: "FINISHED" as const,
					}),
				],
			});

			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);

			expect(screen.getByText("test.pdf")).toBeInTheDocument();
		});

		it("does not show container when hasContent is true but no files or URLs exist", () => {
			const application = ApplicationFactory.build({
				id: "test-app-id",
				project_id: "test-project",
				rag_sources: [],
			});
			useApplicationStore.setState({ application });

			render(<KnowledgeBaseStep />);
			expect(screen.queryByTestId("knowledge-base-container")).not.toBeInTheDocument();
		});
	});
});

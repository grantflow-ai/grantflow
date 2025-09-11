import { ApplicationFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SourceIndexingStatus } from "@/enums";
import { useApplicationStore } from "@/stores/application-store";
import { ApplicationPreview } from "./application-preview";

vi.mock("@/components/shared", () => ({
	ThemeBadge: vi.fn(({ children, className, leftIcon }) => (
		<span className={className} data-testid="theme-badge">
			{leftIcon && <span data-testid="badge-icon">{leftIcon}</span>}
			{children}
		</span>
	)),
}));

vi.mock("@/components/ui/empty-state-preview", () => ({
	EmptyStatePreview: vi.fn(() => <div data-testid="empty-state-preview">Empty State</div>),
}));

vi.mock("@/components/organizations/project/applications/wizard/file-preview-card", () => ({
	FilePreviewCard: vi.fn(({ file, parentId, sourceStatus }) => (
		<div data-testid="file-preview-card">
			<span data-testid="file-name">{file.name}</span>
			<span data-testid="file-parent-id">{parentId}</span>
			<span data-testid="file-source-status">{sourceStatus}</span>
		</div>
	)),
}));

vi.mock("@/components/organizations/project/applications/wizard/link-preview-item", () => ({
	LinkPreviewItem: vi.fn(({ parentId, sourceStatus, url }) => (
		<div data-testid="link-preview-item">
			<span data-testid="link-url">{url}</span>
			<span data-testid="link-parent-id">{parentId}</span>
			<span data-testid="link-source-status">{sourceStatus}</span>
		</div>
	)),
}));

vi.mock("@/components/organizations/project/applications/wizard/preview-card", () => ({
	PreviewCard: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
}));

vi.mock("@/components/organizations/project/applications/wizard/wizard-right-pane", () => ({
	WizardRightPane: vi.fn(({ children, padding }) => (
		<div className={padding} data-testid="wizard-right-pane">
			{children}
		</div>
	)),
}));

const createMockFile = (id: string, name: string) => {
	const file = new File(["mock content"], name, { type: "application/pdf" });
	return Object.assign(file, { id });
};

describe("ApplicationPreview", () => {
	beforeEach(() => {
		resetAllStores();
		vi.clearAllMocks();
	});

	it("renders empty state when no data is provided", () => {
		useApplicationStore.setState({
			application: null,
			pendingUploads: {
				application: new Set(),
				template: new Set(),
			},
		});

		render(<ApplicationPreview draftTitle="" />);

		expect(screen.getByTestId("empty-state-preview")).toBeInTheDocument();
		expect(screen.queryByTestId("application-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("application-documents")).not.toBeInTheDocument();
	});

	it("renders application title when provided", () => {
		render(<ApplicationPreview draftTitle="My Grant Application" />);

		expect(screen.getByText("My Grant Application")).toBeInTheDocument();
	});

	it("renders 'Untitled Application' when title is empty but has files or urls", () => {
		const mockSources = [RagSourceFactory.build({ filename: "test.pdf", status: "FINISHED", url: undefined })];
		const mockTemplate = GrantTemplateFactory.build({ rag_sources: mockSources });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });

		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationPreview draftTitle="" />);

		expect(screen.getByTestId("application-title")).toHaveTextContent("Untitled Application");
	});

	it("renders file preview cards for template files", () => {
		const mockSources = [
			RagSourceFactory.build({
				filename: "grant-guide.pdf",
				status: SourceIndexingStatus.INDEXING,
				url: undefined,
			}),
			RagSourceFactory.build({
				filename: "requirements.docx",
				status: SourceIndexingStatus.FINISHED,
				url: undefined,
			}),
		];
		const mockTemplate = GrantTemplateFactory.build({ rag_sources: mockSources });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });

		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationPreview draftTitle="Test" parentId="template-123" />);

		expect(screen.getByTestId("application-documents")).toBeInTheDocument();
		expect(screen.getByText("Application Documents")).toBeInTheDocument();

		const fileCards = screen.getAllByTestId("file-preview-card");
		expect(fileCards).toHaveLength(2);

		expect(screen.getByText("grant-guide.pdf")).toBeInTheDocument();
		expect(screen.getByText("requirements.docx")).toBeInTheDocument();

		const parentIds = screen.getAllByTestId("file-parent-id");
		expect(parentIds[0]).toHaveTextContent("template-123");
		expect(parentIds[1]).toHaveTextContent("template-123");
	});

	it("filters out failed file sources", () => {
		const mockSources = [
			RagSourceFactory.build({
				filename: "good.pdf",
				status: SourceIndexingStatus.FINISHED,
				url: undefined,
			}),
			RagSourceFactory.build({
				filename: "failed.pdf",
				status: SourceIndexingStatus.FAILED,
				url: undefined,
			}),
		];
		const mockTemplate = GrantTemplateFactory.build({ rag_sources: mockSources });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });

		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationPreview draftTitle="Test" />);

		const fileCards = screen.getAllByTestId("file-preview-card");
		expect(fileCards).toHaveLength(1);
		expect(screen.getByText("good.pdf")).toBeInTheDocument();
		expect(screen.queryByText("failed.pdf")).not.toBeInTheDocument();
	});

	it("renders link preview items for template URLs", () => {
		const mockSources = [
			RagSourceFactory.build({
				filename: undefined,
				status: SourceIndexingStatus.INDEXING,
				url: "https://example.com/grant1",
			}),
			RagSourceFactory.build({
				filename: undefined,
				status: SourceIndexingStatus.FINISHED,
				url: "https://example.com/grant2",
			}),
		];
		const mockTemplate = GrantTemplateFactory.build({ rag_sources: mockSources });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });

		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationPreview draftTitle="Test" parentId="template-456" />);

		expect(screen.getByTestId("application-links")).toBeInTheDocument();
		expect(screen.getByText("Links")).toBeInTheDocument();

		const linkItems = screen.getAllByTestId("link-preview-item");
		expect(linkItems).toHaveLength(2);

		expect(screen.getByText("https://example.com/grant1")).toBeInTheDocument();
		expect(screen.getByText("https://example.com/grant2")).toBeInTheDocument();

		const parentIds = screen.getAllByTestId("link-parent-id");
		expect(parentIds[0]).toHaveTextContent("template-456");
		expect(parentIds[1]).toHaveTextContent("template-456");
	});

	it("filters out failed URL sources", () => {
		const mockSources = [
			RagSourceFactory.build({
				filename: undefined,
				status: SourceIndexingStatus.FINISHED,
				url: "https://example.com/good",
			}),
			RagSourceFactory.build({
				filename: undefined,
				status: SourceIndexingStatus.FAILED,
				url: "https://example.com/failed",
			}),
		];
		const mockTemplate = GrantTemplateFactory.build({ rag_sources: mockSources });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });

		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationPreview draftTitle="Test" />);

		const linkItems = screen.getAllByTestId("link-preview-item");
		expect(linkItems).toHaveLength(1);
		expect(screen.getByText("https://example.com/good")).toBeInTheDocument();
		expect(screen.queryByText("https://example.com/failed")).not.toBeInTheDocument();
	});

	it("distributes URLs across two columns", () => {
		const mockSources = [
			RagSourceFactory.build({
				filename: undefined,
				status: SourceIndexingStatus.FINISHED,
				url: "https://example.com/1",
			}),
			RagSourceFactory.build({
				filename: undefined,
				status: SourceIndexingStatus.FINISHED,
				url: "https://example.com/2",
			}),
			RagSourceFactory.build({
				filename: undefined,
				status: SourceIndexingStatus.FINISHED,
				url: "https://example.com/3",
			}),
			RagSourceFactory.build({
				filename: undefined,
				status: SourceIndexingStatus.FINISHED,
				url: "https://example.com/4",
			}),
		];
		const mockTemplate = GrantTemplateFactory.build({ rag_sources: mockSources });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });

		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationPreview draftTitle="Test" />);

		const linkItems = screen.getAllByTestId("link-preview-item");
		expect(linkItems).toHaveLength(4);

		const linkUrls = screen.getAllByTestId("link-url").map((el) => el.textContent);
		expect(linkUrls).toContain("https://example.com/1");
		expect(linkUrls).toContain("https://example.com/2");
		expect(linkUrls).toContain("https://example.com/3");
		expect(linkUrls).toContain("https://example.com/4");
	});

	it("renders both files and URLs when both are present", () => {
		const mockSources = [
			RagSourceFactory.build({
				filename: "document.pdf",
				status: SourceIndexingStatus.FINISHED,
				url: undefined,
			}),
			RagSourceFactory.build({
				filename: undefined,
				status: SourceIndexingStatus.FINISHED,
				url: "https://example.com/info",
			}),
		];
		const mockTemplate = GrantTemplateFactory.build({ rag_sources: mockSources });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });

		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationPreview draftTitle="Mixed Content App" />);

		expect(screen.getByText("document.pdf")).toBeInTheDocument();
		expect(screen.getByText("https://example.com/info")).toBeInTheDocument();
	});

	it("passes source status to file and link components", () => {
		const mockSources = [
			RagSourceFactory.build({
				filename: "test.pdf",
				status: SourceIndexingStatus.INDEXING,
				url: undefined,
			}),
			RagSourceFactory.build({
				filename: undefined,
				status: SourceIndexingStatus.FINISHED,
				url: "https://example.com",
			}),
		];
		const mockTemplate = GrantTemplateFactory.build({ rag_sources: mockSources });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });

		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationPreview draftTitle="Test" />);

		expect(screen.getByTestId("file-source-status")).toHaveTextContent(SourceIndexingStatus.INDEXING);
		expect(screen.getByTestId("link-source-status")).toHaveTextContent(SourceIndexingStatus.FINISHED);
	});

	describe("Pending Files Logic", () => {
		it("renders documents card when only pending files are present", () => {
			const pendingFile = createMockFile("pending-1", "pending-doc.pdf");

			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ rag_sources: [] }),
				}),
				pendingUploads: {
					application: new Set(),
					template: new Set([pendingFile]),
				},
			});

			render(<ApplicationPreview draftTitle="Test App" />);

			expect(screen.getByTestId("application-documents")).toBeInTheDocument();
			expect(screen.getByText("Application Documents")).toBeInTheDocument();
			expect(screen.getByTestId("pending-file-preview-card")).toBeInTheDocument();
			expect(screen.getByText("pending-doc.pdf")).toBeInTheDocument();
		});

		it("renders pending files after uploaded documents", () => {
			const uploadedSource = RagSourceFactory.build({
				filename: "uploaded-doc.pdf",
				status: SourceIndexingStatus.FINISHED,
				url: undefined,
			});
			const pendingFile = createMockFile("pending-1", "pending-doc.pdf");

			const mockTemplate = GrantTemplateFactory.build({ rag_sources: [uploadedSource] });
			const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });

			useApplicationStore.setState({
				application: mockApplication,
				pendingUploads: {
					application: new Set(),
					template: new Set([pendingFile]),
				},
			});

			render(<ApplicationPreview draftTitle="Test App" />);

			const allFiles = screen.getAllByTestId(/file-preview-card|pending-file-preview-card/);

			expect(allFiles).toHaveLength(2);
			expect(screen.getByTestId("file-preview-card")).toBeInTheDocument();
			expect(screen.getByTestId("pending-file-preview-card")).toBeInTheDocument();

			expect(screen.getByText("uploaded-doc.pdf")).toBeInTheDocument();
			expect(screen.getByText("pending-doc.pdf")).toBeInTheDocument();
		});

		it("does not render documents card when both sources and pending uploads are empty", () => {
			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ rag_sources: [] }),
				}),
				pendingUploads: {
					application: new Set(),
					template: new Set(),
				},
			});

			render(<ApplicationPreview draftTitle="" />);

			expect(screen.getByTestId("empty-state-preview")).toBeInTheDocument();
			expect(screen.queryByTestId("application-documents")).not.toBeInTheDocument();
		});

		it("does not render documents card when both sources and pending uploads are empty but title exists", () => {
			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ rag_sources: [] }),
				}),
				pendingUploads: {
					application: new Set(),
					template: new Set(),
				},
			});

			render(<ApplicationPreview draftTitle="My App" />);

			expect(screen.queryByTestId("empty-state-preview")).not.toBeInTheDocument();
			expect(screen.getByText("My App")).toBeInTheDocument();
			expect(screen.queryByTestId("application-documents")).not.toBeInTheDocument();
		});

		it("renders multiple pending files correctly", () => {
			const pendingFile1 = createMockFile("pending-1", "doc1.pdf");
			const pendingFile2 = createMockFile("pending-2", "doc2.docx");

			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ rag_sources: [] }),
				}),
				pendingUploads: {
					application: new Set(),
					template: new Set([pendingFile1, pendingFile2]),
				},
			});

			render(<ApplicationPreview draftTitle="Test App" />);

			const pendingCards = screen.getAllByTestId("pending-file-preview-card");
			expect(pendingCards).toHaveLength(2);

			expect(screen.getByText("doc1.pdf")).toBeInTheDocument();
			expect(screen.getByText("doc2.docx")).toBeInTheDocument();
		});

		it("only shows template pending files, not application pending files", () => {
			const templatePendingFile = createMockFile("template-pending", "template-doc.pdf");
			const applicationPendingFile = createMockFile("app-pending", "app-doc.pdf");

			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ rag_sources: [] }),
				}),
				pendingUploads: {
					application: new Set([applicationPendingFile]),
					template: new Set([templatePendingFile]),
				},
			});

			render(<ApplicationPreview draftTitle="Test App" />);

			expect(screen.getByText("template-doc.pdf")).toBeInTheDocument();
			expect(screen.queryByText("app-doc.pdf")).not.toBeInTheDocument();

			const pendingCards = screen.getAllByTestId("pending-file-preview-card");
			expect(pendingCards).toHaveLength(1);
		});

		it("correctly handles empty state with title when no sources or pending files", () => {
			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ rag_sources: [] }),
				}),
				pendingUploads: {
					application: new Set(),
					template: new Set(),
				},
			});

			render(<ApplicationPreview draftTitle="Test Application" />);

			expect(screen.getByText("Test Application")).toBeInTheDocument();
			expect(screen.queryByTestId("empty-state-preview")).not.toBeInTheDocument();
			expect(screen.queryByTestId("application-documents")).not.toBeInTheDocument();
			expect(screen.queryByTestId("application-links")).not.toBeInTheDocument();
		});

		it("renders documents card with mixed uploaded and pending files in correct order", () => {
			const uploadedSource1 = RagSourceFactory.build({
				filename: "uploaded1.pdf",
				status: SourceIndexingStatus.FINISHED,
				url: undefined,
			});
			const uploadedSource2 = RagSourceFactory.build({
				filename: "uploaded2.docx",
				status: SourceIndexingStatus.INDEXING,
				url: undefined,
			});
			const pendingFile1 = createMockFile("pending-1", "pending1.pdf");
			const pendingFile2 = createMockFile("pending-2", "pending2.txt");

			const mockTemplate = GrantTemplateFactory.build({ rag_sources: [uploadedSource1, uploadedSource2] });
			const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });

			useApplicationStore.setState({
				application: mockApplication,
				pendingUploads: {
					application: new Set(),
					template: new Set([pendingFile1, pendingFile2]),
				},
			});

			render(<ApplicationPreview draftTitle="Mixed Files App" />);

			expect(screen.getByTestId("application-documents")).toBeInTheDocument();

			const uploadedCards = screen.getAllByTestId("file-preview-card");
			const pendingCards = screen.getAllByTestId("pending-file-preview-card");

			expect(uploadedCards).toHaveLength(2);
			expect(pendingCards).toHaveLength(2);

			expect(screen.getByText("uploaded1.pdf")).toBeInTheDocument();
			expect(screen.getByText("uploaded2.docx")).toBeInTheDocument();
			expect(screen.getByText("pending1.pdf")).toBeInTheDocument();
			expect(screen.getByText("pending2.txt")).toBeInTheDocument();
		});

		it("filters out failed sources but shows all pending files", () => {
			const goodSource = RagSourceFactory.build({
				filename: "good.pdf",
				status: SourceIndexingStatus.FINISHED,
				url: undefined,
			});
			const failedSource = RagSourceFactory.build({
				filename: "failed.pdf",
				status: SourceIndexingStatus.FAILED,
				url: undefined,
			});
			const pendingFile = createMockFile("pending-1", "pending.pdf");

			const mockTemplate = GrantTemplateFactory.build({ rag_sources: [goodSource, failedSource] });
			const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });

			useApplicationStore.setState({
				application: mockApplication,
				pendingUploads: {
					application: new Set(),
					template: new Set([pendingFile]),
				},
			});

			render(<ApplicationPreview draftTitle="Test App" />);

			expect(screen.getByText("good.pdf")).toBeInTheDocument();
			expect(screen.queryByText("failed.pdf")).not.toBeInTheDocument();
			expect(screen.getByText("pending.pdf")).toBeInTheDocument();

			const uploadedCards = screen.getAllByTestId("file-preview-card");
			const pendingCards = screen.getAllByTestId("pending-file-preview-card");

			expect(uploadedCards).toHaveLength(1);
			expect(pendingCards).toHaveLength(1);
		});
	});
});

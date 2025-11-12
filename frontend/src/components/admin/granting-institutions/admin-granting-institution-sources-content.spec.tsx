import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SourceIndexingStatus } from "@/enums";
import type { API } from "@/types/api-types";
import { AdminGrantingInstitutionSourcesContent } from "./admin-granting-institution-sources-content";

const mockAdminStore = {
	grantingInstitution: null as API.GetGrantingInstitution.Http200.ResponseBody | null,
};

const mockGrantingInstitutionStore = {
	addFile: vi.fn(),
	addUrl: vi.fn(),
	deleteSource: vi.fn(),
	isLoading: false,
	loadData: vi.fn(),
	pendingUploads: new Set(),
	removePendingUpload: vi.fn(),
	reset: vi.fn(),
	setInstitutionId: vi.fn(),
	sources: [] as any[],
};

const createMockInstitution = (): API.GetGrantingInstitution.Http200.ResponseBody => ({
	abbreviation: "NIH",
	created_at: "2024-01-01T00:00:00Z",
	full_name: "National Institutes of Health",
	id: "institution-123",
	source_count: 5,
	updated_at: "2024-01-01T00:00:00Z",
});

const createMockFileSource = (id: string): any => ({
	created_at: "2024-01-01T00:00:00Z",
	filename: "document.pdf",
	id,
	indexing_status: SourceIndexingStatus.FINISHED,
	mime_type: "application/pdf",
	updated_at: "2024-01-01T00:00:00Z",
});

const createMockUrlSource = (id: string, url: string): any => ({
	created_at: "2024-01-01T00:00:00Z",
	id,
	indexing_status: SourceIndexingStatus.FINISHED,
	updated_at: "2024-01-01T00:00:00Z",
	url,
});

vi.mock("@/stores/admin-store", () => ({
	useAdminStore: () => mockAdminStore,
}));

vi.mock("@/stores/granting-institution-store", () => ({
	useGrantingInstitutionStore: () => mockGrantingInstitutionStore,
}));

vi.mock("@/components/organizations/project/applications/wizard/wizard-left-pane", () => ({
	WizardLeftPane: ({ children, testId }: any) => <div data-testid={testId}>{children}</div>,
}));

vi.mock("@/components/organizations/project/applications/wizard/wizard-right-pane", () => ({
	WizardRightPane: ({ children, testId }: any) => <div data-testid={testId}>{children}</div>,
}));

vi.mock("@/components/shared/rag-source-file-uploader", () => ({
	RagSourceFileUploader: ({ testId }: any) => <div data-testid={testId}>File Uploader</div>,
}));

vi.mock("@/components/shared/rag-source-url-input", () => ({
	RagSourceUrlInput: ({ testId }: any) => <div data-testid={testId}>URL Input</div>,
}));

vi.mock("@/components/ui/empty-state-preview", () => ({
	EmptyStatePreview: () => <div data-testid="empty-state">Empty State</div>,
}));

vi.mock("@/components/organizations/project/applications/wizard/preview-card", () => ({
	PreviewCard: ({ children }: any) => <div data-testid="preview-card">{children}</div>,
}));

vi.mock("@/components/organizations/project/applications/wizard/file-preview-card", () => ({
	FilePreviewCard: ({ file }: any) => <div data-testid={`file-preview-${file.name}`}>{file.name}</div>,
}));

vi.mock("@/components/organizations/project/applications/wizard/pending-file-preview-card", () => ({
	PendingFilePreviewCard: ({ file }: any) => <div data-testid={`pending-file-${file.id}`}>Pending: {file.id}</div>,
}));

vi.mock("@/components/organizations/project/applications/wizard/link-preview-item", () => ({
	LinkPreviewItem: ({ url }: any) => <div data-testid={`url-preview-${url}`}>{url}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
	Separator: () => <div data-testid="admin-sources-separator">Separator</div>,
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("AdminGrantingInstitutionSourcesContent", () => {
	beforeEach(() => {
		mockAdminStore.grantingInstitution = createMockInstitution();
		mockGrantingInstitutionStore.isLoading = false;
		mockGrantingInstitutionStore.sources = [];
		mockGrantingInstitutionStore.pendingUploads = new Set();
	});

	describe("initialization", () => {
		it("should set institution ID and load data on mount", async () => {
			render(<AdminGrantingInstitutionSourcesContent />);

			await waitFor(() => {
				expect(mockGrantingInstitutionStore.setInstitutionId).toHaveBeenCalledWith("institution-123");
				expect(mockGrantingInstitutionStore.loadData).toHaveBeenCalled();
			});
		});

		it("should reset store on unmount", () => {
			const { unmount } = render(<AdminGrantingInstitutionSourcesContent />);

			unmount();

			expect(mockGrantingInstitutionStore.reset).toHaveBeenCalled();
		});

		it("should not load data when no institution", () => {
			mockAdminStore.grantingInstitution = null;

			render(<AdminGrantingInstitutionSourcesContent />);

			expect(mockGrantingInstitutionStore.setInstitutionId).not.toHaveBeenCalled();
		});
	});

	describe("loading state", () => {
		it("should show loading spinner when loading", () => {
			mockGrantingInstitutionStore.isLoading = true;

			render(<AdminGrantingInstitutionSourcesContent />);

			expect(screen.getByTestId("sources-loading")).toBeInTheDocument();
			expect(screen.getByText("Loading sources...")).toBeInTheDocument();
		});

		it("should not show content when loading", () => {
			mockGrantingInstitutionStore.isLoading = true;

			render(<AdminGrantingInstitutionSourcesContent />);

			expect(screen.queryByTestId("admin-sources-content")).not.toBeInTheDocument();
		});
	});

	describe("no institution state", () => {
		it("should show message when no institution selected", () => {
			mockAdminStore.grantingInstitution = null;
			mockGrantingInstitutionStore.isLoading = false;

			render(<AdminGrantingInstitutionSourcesContent />);

			expect(screen.getByTestId("sources-no-institution")).toBeInTheDocument();
			expect(screen.getByText("No institution selected")).toBeInTheDocument();
		});
	});

	describe("rendering with sources", () => {
		it("should render file sources", async () => {
			mockGrantingInstitutionStore.sources = [createMockFileSource("source-1")];

			render(<AdminGrantingInstitutionSourcesContent />);

			await waitFor(() => {
				expect(screen.getByTestId("admin-sources-files")).toBeInTheDocument();
			});
		});

		it("should render URL sources", async () => {
			mockGrantingInstitutionStore.sources = [createMockUrlSource("source-1", "https://example.com")];

			render(<AdminGrantingInstitutionSourcesContent />);

			await waitFor(() => {
				expect(screen.getByTestId("admin-sources-urls")).toBeInTheDocument();
			});
		});

		it("should render both files and URLs with separator", async () => {
			mockGrantingInstitutionStore.sources = [
				createMockFileSource("source-1"),
				createMockUrlSource("source-2", "https://example.com"),
			];

			render(<AdminGrantingInstitutionSourcesContent />);

			await waitFor(() => {
				expect(screen.getByTestId("admin-sources-files")).toBeInTheDocument();
				expect(screen.getByTestId("admin-sources-urls")).toBeInTheDocument();
				expect(screen.getByTestId("admin-sources-separator")).toBeInTheDocument();
			});
		});

		it("should show empty state when no sources", () => {
			mockGrantingInstitutionStore.sources = [];

			render(<AdminGrantingInstitutionSourcesContent />);

			expect(screen.getByTestId("empty-state")).toBeInTheDocument();
		});
	});

	describe("rendering UI elements", () => {
		it("should render title and description", () => {
			render(<AdminGrantingInstitutionSourcesContent />);

			expect(screen.getByText("Source Materials")).toBeInTheDocument();
			expect(screen.getByText(/Upload documents and add URLs/)).toBeInTheDocument();
		});

		it("should render file uploader", () => {
			render(<AdminGrantingInstitutionSourcesContent />);

			expect(screen.getByTestId("admin-sources-file-upload")).toBeInTheDocument();
		});

		it("should render URL input", () => {
			render(<AdminGrantingInstitutionSourcesContent />);

			expect(screen.getByTestId("admin-sources-url-input")).toBeInTheDocument();
		});

		it("should render left and right panes", () => {
			render(<AdminGrantingInstitutionSourcesContent />);

			expect(screen.getByTestId("admin-sources-left-pane")).toBeInTheDocument();
			expect(screen.getByTestId("admin-sources-right-pane")).toBeInTheDocument();
		});
	});

	describe("pending uploads", () => {
		it("should render pending file uploads", async () => {
			const pendingFile = { id: "pending-1", name: "uploading.pdf" };
			mockGrantingInstitutionStore.pendingUploads = new Set([pendingFile]);

			render(<AdminGrantingInstitutionSourcesContent />);

			await waitFor(() => {
				expect(screen.getByTestId(`pending-file-${pendingFile.id}`)).toBeInTheDocument();
			});
		});

		it("should show preview card when there are pending uploads", async () => {
			const pendingFile = { id: "pending-1", name: "uploading.pdf" };
			mockGrantingInstitutionStore.pendingUploads = new Set([pendingFile]);

			render(<AdminGrantingInstitutionSourcesContent />);

			await waitFor(() => {
				expect(screen.getByTestId("preview-card")).toBeInTheDocument();
			});
		});
	});
});

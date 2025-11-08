import { resetAllStores } from "::testing/store-reset";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGrantingInstitutionStore } from "@/stores/granting-institution-store";
import type { API } from "@/types/api-types";

import GrantingInstitutionDetailPage from "./page";

vi.mock("next/navigation", () => ({
	useParams: vi.fn(),
}));

const mockStore = {
	addFile: vi.fn(),
	addUrl: vi.fn(),
	deleteSource: vi.fn(),
	institution: null as API.GetGrantingInstitution.Http200.ResponseBody | null,
	isLoading: false,
	loadData: vi.fn(),
	pendingUploads: new Set(),
	removePendingUpload: vi.fn(),
	reset: vi.fn(),
	setInstitutionId: vi.fn(),
	sources: [] as API.RetrieveGrantingInstitutionRagSources.Http200.ResponseBody,
};

vi.mock("@/stores/granting-institution-store", () => ({
	useGrantingInstitutionStore: vi.fn(() => mockStore),
}));

vi.mock("@/components/organizations/project/applications/wizard/wizard-left-pane", () => ({
	WizardLeftPane: ({ children, testId }: { children: React.ReactNode; testId: string }) => (
		<div data-testid={testId}>{children}</div>
	),
}));

vi.mock("@/components/organizations/project/applications/wizard/wizard-right-pane", () => ({
	WizardRightPane: ({ children, testId }: { children: React.ReactNode; testId?: string }) => (
		<div data-testid={testId}>{children}</div>
	),
}));

vi.mock("@/components/shared/rag-source-file-uploader", () => ({
	RagSourceFileUploader: ({
		onFileAdd,
		onFileRemove,
		testId,
	}: {
		onFileAdd: (file: any) => void;
		onFileRemove: (id: string) => void;
		testId: string;
	}) => (
		<div data-testid={testId}>
			<button data-testid="file-upload-button" onClick={() => onFileAdd({ id: "test-file" })} type="button">
				Upload File
			</button>
			<button data-testid="file-remove-button" onClick={() => onFileRemove("test-file")} type="button">
				Remove File
			</button>
		</div>
	),
}));

vi.mock("@/components/shared/rag-source-url-input", () => ({
	RagSourceUrlInput: ({
		onUrlAdd,
		testId,
	}: {
		existingUrls: string[];
		onUrlAdd: (url: string) => void;
		testId: string;
	}) => (
		<div data-testid={testId}>
			<button data-testid="url-add-button" onClick={() => onUrlAdd("https://example.com")} type="button">
				Add URL
			</button>
		</div>
	),
}));

vi.mock("@/components/organizations/project/applications/wizard/file-preview-card", () => ({
	FilePreviewCard: ({
		file,
		onDelete,
	}: {
		file: any;
		onDelete: () => void;
		parentId?: string;
		sourceStatus?: string;
	}) => (
		<div data-testid={`file-preview-${file.name}`}>
			<span>{file.name}</span>
			<button data-testid={`delete-file-${file.name}`} onClick={onDelete} type="button">
				Delete
			</button>
		</div>
	),
}));

vi.mock("@/components/organizations/project/applications/wizard/link-preview-item", () => ({
	LinkPreviewItem: ({
		onDelete,
		url,
	}: {
		onDelete: () => void;
		parentId?: string;
		sourceStatus?: string;
		url: string;
	}) => (
		<div data-testid={`url-preview-${url}`}>
			<span>{url}</span>
			<button data-testid={`delete-url-${url}`} onClick={onDelete} type="button">
				Delete
			</button>
		</div>
	),
}));

vi.mock("@/components/organizations/project/applications/wizard/pending-file-preview-card", () => ({
	PendingFilePreviewCard: ({ file }: { file: any }) => (
		<div data-testid={`pending-file-${file.name}`}>
			<span>{file.name}</span>
			<span>Uploading...</span>
		</div>
	),
}));

vi.mock("@/components/ui/empty-state-preview", () => ({
	EmptyStatePreview: () => <div data-testid="empty-state">No sources yet</div>,
}));

describe("GrantingInstitutionDetailPage", () => {
	const mockInstitution: API.GetGrantingInstitution.Http200.ResponseBody = {
		abbreviation: "NIH",
		created_at: "2024-01-01T00:00:00Z",
		full_name: "National Institutes of Health",
		id: "institution-123",
		source_count: 0,
		updated_at: "2024-01-01T00:00:00Z",
	};

	const mockSources: API.RetrieveGrantingInstitutionRagSources.Http200.ResponseBody = [
		{
			created_at: "2024-01-01T00:00:00Z",
			filename: "guidelines.pdf",
			id: "source-1",
			indexing_status: "FINISHED",
			mime_type: "application/pdf",
			size: 1024,
		},
		{
			created_at: "2024-01-01T00:00:00Z",
			description: null,
			id: "source-2",
			indexing_status: "FINISHED",
			title: null,
			url: "https://example.com/info",
		},
	];

	beforeEach(() => {
		resetAllStores();
		vi.clearAllMocks();

		mockStore.institution = null;
		mockStore.isLoading = false;
		mockStore.sources = [];
		mockStore.pendingUploads = new Set();

		vi.mocked(useParams).mockReturnValue({ id: "institution-123" });
		vi.mocked(useGrantingInstitutionStore).mockReturnValue(mockStore);
	});

	describe("loading states", () => {
		it("should display loading spinner when isLoading is true", () => {
			mockStore.isLoading = true;

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByText("Loading granting institution...")).toBeInTheDocument();
		});

		it("should display error message when institution is not found", () => {
			mockStore.isLoading = false;
			mockStore.institution = null;

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByText("Granting institution not found")).toBeInTheDocument();
		});
	});

	describe("initialization", () => {
		it("should call setInstitutionId and loadData on mount", () => {
			mockStore.institution = mockInstitution;

			render(<GrantingInstitutionDetailPage />);

			expect(mockStore.setInstitutionId).toHaveBeenCalledWith("institution-123");
			expect(mockStore.loadData).toHaveBeenCalled();
		});

		it("should call reset on unmount", () => {
			mockStore.institution = mockInstitution;

			const { unmount } = render(<GrantingInstitutionDetailPage />);

			unmount();

			expect(mockStore.reset).toHaveBeenCalled();
		});
	});

	describe("institution display", () => {
		it("should display institution name and abbreviation", () => {
			mockStore.institution = mockInstitution;

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByText("National Institutes of Health")).toBeInTheDocument();
			expect(screen.getByText("NIH")).toBeInTheDocument();
		});

		it("should not display abbreviation if not provided", () => {
			mockStore.institution = { ...mockInstitution, abbreviation: null };

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByText("National Institutes of Health")).toBeInTheDocument();
			expect(screen.queryByText("NIH")).not.toBeInTheDocument();
		});

		it("should display back to list link", () => {
			mockStore.institution = mockInstitution;

			render(<GrantingInstitutionDetailPage />);

			const backButton = screen.getByText("Back to list");
			expect(backButton).toBeInTheDocument();
		});

		it("should display edit details link", () => {
			mockStore.institution = mockInstitution;

			render(<GrantingInstitutionDetailPage />);

			const editButton = screen.getByText("Edit Details");
			expect(editButton).toBeInTheDocument();
		});
	});

	describe("empty state", () => {
		it("should display empty state when no files or URLs", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = [];

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByTestId("empty-state")).toBeInTheDocument();
		});
	});

	describe("file management", () => {
		it("should display uploaded files", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = [mockSources[0]];

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByTestId("file-preview-guidelines.pdf")).toBeInTheDocument();
		});

		it("should display pending uploads", () => {
			const pendingFile = new File(["test"], "pending.pdf", { type: "application/pdf" });
			Object.assign(pendingFile, { id: "pending-1" });

			mockStore.institution = mockInstitution;
			mockStore.pendingUploads = new Set([pendingFile as any]);

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByTestId("pending-file-pending.pdf")).toBeInTheDocument();
		});

		it("should call addFile when file upload is triggered", async () => {
			mockStore.institution = mockInstitution;

			render(<GrantingInstitutionDetailPage />);

			const uploadButton = screen.getByTestId("file-upload-button");
			fireEvent.click(uploadButton);

			await waitFor(() => {
				expect(mockStore.addFile).toHaveBeenCalledWith({ id: "test-file" });
			});
		});

		it("should call removePendingUpload when file is removed", () => {
			mockStore.institution = mockInstitution;

			render(<GrantingInstitutionDetailPage />);

			const removeButton = screen.getByTestId("file-remove-button");
			fireEvent.click(removeButton);

			expect(mockStore.removePendingUpload).toHaveBeenCalledWith("test-file");
		});

		it("should call deleteSource when file delete is clicked", async () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = [mockSources[0]];

			render(<GrantingInstitutionDetailPage />);

			const deleteButton = screen.getByTestId("delete-file-guidelines.pdf");
			fireEvent.click(deleteButton);

			await waitFor(() => {
				expect(mockStore.deleteSource).toHaveBeenCalledWith("source-1");
			});
		});
	});

	describe("URL management", () => {
		it("should display added URLs", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = [mockSources[1]];

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByTestId("url-preview-https://example.com/info")).toBeInTheDocument();
		});

		it("should call addUrl when URL add is triggered", async () => {
			mockStore.institution = mockInstitution;

			render(<GrantingInstitutionDetailPage />);

			const addUrlButton = screen.getByTestId("url-add-button");
			fireEvent.click(addUrlButton);

			await waitFor(() => {
				expect(mockStore.addUrl).toHaveBeenCalledWith("https://example.com");
			});
		});

		it("should call deleteSource when URL delete is clicked", async () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = [mockSources[1]];

			render(<GrantingInstitutionDetailPage />);

			const deleteButton = screen.getByTestId("delete-url-https://example.com/info");
			fireEvent.click(deleteButton);

			await waitFor(() => {
				expect(mockStore.deleteSource).toHaveBeenCalledWith("source-2");
			});
		});
	});

	describe("mixed content", () => {
		it("should display both files and URLs", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = mockSources;

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByTestId("file-preview-guidelines.pdf")).toBeInTheDocument();
			expect(screen.getByTestId("url-preview-https://example.com/info")).toBeInTheDocument();
		});

		it("should display separator when both files and URLs exist", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = mockSources;

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByTestId("granting-institution-separator")).toBeInTheDocument();
		});

		it("should not display separator when only files exist", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = [mockSources[0]];

			render(<GrantingInstitutionDetailPage />);

			expect(screen.queryByTestId("granting-institution-separator")).not.toBeInTheDocument();
		});

		it("should not display separator when only URLs exist", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = [mockSources[1]];

			render(<GrantingInstitutionDetailPage />);

			expect(screen.queryByTestId("granting-institution-separator")).not.toBeInTheDocument();
		});
	});

	describe("polling for status updates", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should poll for updates when sources are indexing", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = [
				{
					...mockSources[0],
					indexing_status: "INDEXING",
				},
			];

			render(<GrantingInstitutionDetailPage />);

			vi.clearAllMocks();

			vi.advanceTimersByTime(3000);

			expect(mockStore.loadData).toHaveBeenCalledTimes(1);

			vi.advanceTimersByTime(3000);

			expect(mockStore.loadData).toHaveBeenCalledTimes(2);
		});

		it("should not poll when all sources are finished", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = mockSources;

			render(<GrantingInstitutionDetailPage />);

			vi.clearAllMocks();

			vi.advanceTimersByTime(10_000);

			expect(mockStore.loadData).not.toHaveBeenCalled();
		});

		it("should stop polling on unmount", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = [
				{
					...mockSources[0],
					indexing_status: "INDEXING",
				},
			];

			const { unmount } = render(<GrantingInstitutionDetailPage />);

			vi.clearAllMocks();

			unmount();

			vi.advanceTimersByTime(10_000);

			expect(mockStore.loadData).not.toHaveBeenCalled();
		});
	});

	describe("UI sections", () => {
		it("should render left pane with correct test ID", () => {
			mockStore.institution = mockInstitution;

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByTestId("granting-institution-left-pane")).toBeInTheDocument();
		});

		it("should render right pane with correct test ID", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = mockSources;

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByTestId("granting-institution-right-pane")).toBeInTheDocument();
		});

		it("should render sources container when sources exist", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = mockSources;

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByTestId("granting-institution-sources-container")).toBeInTheDocument();
		});

		it("should render files container when files exist", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = [mockSources[0]];

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByTestId("granting-institution-files")).toBeInTheDocument();
		});

		it("should render URLs container when URLs exist", () => {
			mockStore.institution = mockInstitution;
			mockStore.sources = [mockSources[1]];

			render(<GrantingInstitutionDetailPage />);

			expect(screen.getByTestId("granting-institution-urls")).toBeInTheDocument();
		});
	});
});

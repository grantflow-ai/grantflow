import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory } from "::testing/factories";
import { useApplicationStore } from "@/stores/application-store";
import { mockUseWizardStore, mockWizardStore } from "@/testing/wizard-store-mock";

import { ApplicationPreview, FileWithId } from "./application-preview";

vi.mock("@/stores/wizard-store", () => ({
	useWizardStore: mockUseWizardStore,
}));

vi.mock("@/stores/application-store", () => ({
	useApplicationStore: vi.fn(),
}));

function createMockFile(name: string, size: number, type: string, id?: string): FileWithId {
	const file = new File(["content"], name, { type }) as FileWithId;
	Object.defineProperty(file, "size", { value: size, writable: false });
	if (id) {
		file.id = id;
	}
	return file;
}

describe("ApplicationPreview", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mock store to default state
		Object.assign(mockWizardStore, {
			applicationState: {
				application: null,
				uploadedFiles: [],
				urls: [],
			},
			ui: {
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

	it("renders empty state when no content", () => {
		render(<ApplicationPreview />);

		expect(screen.getByText("Add application details, documents, or links to see a preview")).toBeInTheDocument();
	});

	it("renders application title", () => {
		vi.mocked(useApplicationStore).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({
				id: "test-id",
				title: "Test Application",
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

		render(<ApplicationPreview />);

		expect(screen.getByText("Test Application")).toBeInTheDocument();
		expect(screen.getByTestId("application-title")).toBeInTheDocument();
	});

	it("renders untitled when no title", () => {
		const file = createMockFile("test.pdf", 1024, "application/pdf", "file-id");
		vi.mocked(useApplicationStore).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({
				id: "test-id",
				title: undefined,
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

		render(<ApplicationPreview />);

		expect(screen.getByText("Untitled Application")).toBeInTheDocument();
	});

	it("renders uploaded files", () => {
		const file = createMockFile("test.pdf", 1024, "application/pdf", "file-id");
		vi.mocked(useApplicationStore).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({
				id: "test-id",
				title: "Test Application",
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

		render(<ApplicationPreview />);

		expect(screen.getByTestId("application-documents")).toBeInTheDocument();
		expect(screen.getByText("test.pdf")).toBeInTheDocument();
	});

	it("renders URLs", () => {
		vi.mocked(useApplicationStore).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({
				id: "test-id",
				title: "Test Application",
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
			urls: ["https://example.com"],
		});

		render(<ApplicationPreview />);

		expect(screen.getByTestId("application-links")).toBeInTheDocument();
		expect(screen.getByText("https://example.com")).toBeInTheDocument();
	});
});

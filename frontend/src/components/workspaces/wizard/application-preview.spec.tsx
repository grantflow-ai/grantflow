import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUseWizardStore, mockWizardStore } from "@/testing/wizard-store-mock";

import { ApplicationPreview, FileWithId } from "./application-preview";

vi.mock("@/stores/wizard-store", () => ({
	useWizardStore: mockUseWizardStore,
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
	});

	it("renders empty state when no content", () => {
		render(<ApplicationPreview />);

		expect(screen.getByText("Add application details, documents, or links to see a preview")).toBeInTheDocument();
	});

	it("renders application title", () => {
		Object.assign(mockWizardStore, {
			applicationState: {
				...mockWizardStore.applicationState,
				application: {
					id: "test-id",
					title: "Test Application",
					workspace_id: "test-workspace-id",
				},
			},
		});

		render(<ApplicationPreview />);

		expect(screen.getByText("Test Application")).toBeInTheDocument();
		expect(screen.getByTestId("application-title")).toBeInTheDocument();
	});

	it("renders untitled when no title", () => {
		const file = createMockFile("test.pdf", 1024, "application/pdf", "file-id");
		Object.assign(mockWizardStore, {
			applicationState: {
				...mockWizardStore.applicationState,
				uploadedFiles: [file],
			},
		});

		render(<ApplicationPreview />);

		expect(screen.getByText("Untitled Application")).toBeInTheDocument();
	});

	it("renders uploaded files", () => {
		const file = createMockFile("test.pdf", 1024, "application/pdf", "file-id");
		Object.assign(mockWizardStore, {
			applicationState: {
				...mockWizardStore.applicationState,
				uploadedFiles: [file],
			},
		});

		render(<ApplicationPreview />);

		expect(screen.getByTestId("application-documents")).toBeInTheDocument();
		expect(screen.getByText("test.pdf")).toBeInTheDocument();
	});

	it("renders URLs", () => {
		Object.assign(mockWizardStore, {
			applicationState: {
				...mockWizardStore.applicationState,
				urls: ["https://example.com"],
			},
		});

		render(<ApplicationPreview />);

		expect(screen.getByTestId("application-links")).toBeInTheDocument();
		expect(screen.getByText("https://example.com")).toBeInTheDocument();
	});
});

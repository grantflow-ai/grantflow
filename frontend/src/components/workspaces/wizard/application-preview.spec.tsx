import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory } from "::testing/factories";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ApplicationPreview } from "./application-preview";

import type { FileWithId } from "@/types/files";

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

		useWizardStore.setState({
			ui: {
				currentStep: 0,
				fileDropdownStates: {},
				linkHoverStates: {},
				urlInput: "",
			},
		});

		useApplicationStore.setState({
			application: null,
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});
	});

	it("renders empty state when no content", () => {
		render(<ApplicationPreview />);

		expect(screen.queryByTestId("application-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("application-documents")).not.toBeInTheDocument();
		expect(screen.queryByTestId("application-links")).not.toBeInTheDocument();
	});

	it("renders application title", () => {
		const application = ApplicationFactory.build({
			id: "test-id",
			title: "Test Application",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});

		render(<ApplicationPreview />);

		expect(screen.getByTestId("application-title")).toBeInTheDocument();
		expect(screen.getByTestId("application-title")).toHaveTextContent("Test Application");
	});

	it("renders untitled when no title", () => {
		const file = createMockFile("test.pdf", 1024, "application/pdf", "file-id");
		const application = ApplicationFactory.build({
			id: "test-id",
			title: undefined,
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
			isLoading: false,
			uploadedFiles: [file],
			urls: [],
		});

		render(<ApplicationPreview />);

		expect(screen.getByTestId("application-title")).toHaveTextContent("Untitled Application");
	});

	it("renders uploaded files", () => {
		const file1 = createMockFile("test1.pdf", 1024, "application/pdf", "file-1");
		const file2 = createMockFile("test2.pdf", 2048, "application/pdf", "file-2");

		useApplicationStore.setState({
			application: null,
			isLoading: false,
			uploadedFiles: [file1, file2],
			urls: [],
		});

		render(<ApplicationPreview />);

		expect(screen.getByTestId("application-documents")).toBeInTheDocument();
		expect(screen.getByTestId("file-collection")).toBeInTheDocument();
	});

	it("renders URLs", () => {
		useApplicationStore.setState({
			application: null,
			isLoading: false,
			uploadedFiles: [],
			urls: ["https://example.com", "https://test.com"],
		});

		render(<ApplicationPreview />);

		expect(screen.getByTestId("application-links")).toBeInTheDocument();
	});
});

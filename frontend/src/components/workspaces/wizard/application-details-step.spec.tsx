import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUseWizardStore, mockWizardStore } from "@/testing/wizard-store-mock";

import { ApplicationDetailsStep } from "./application-details-step";

vi.mock("@/actions/sources", () => ({
	crawlTemplateUrl: vi.fn().mockResolvedValue({ message: "URL crawled successfully" }),
	deleteTemplateSource: vi.fn(),
}));

vi.mock("@/stores/wizard-store", () => ({
	useWizardStore: mockUseWizardStore,
}));

describe("ApplicationDetailsStep", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mock store to default state
		Object.assign(mockWizardStore, {
			applicationId: null,
			applicationTitle: "",
			currentStep: 0,
			isCreatingApplication: false,
			templateId: "test-template-id",
			ui: {
				fileDropdownStates: {},
				linkHoverStates: {},
				urlInput: "",
			},
			uploadedFiles: [],
			urls: [],
			workspaceId: "test-workspace-id",
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
		Object.assign(mockWizardStore, {
			applicationTitle: "Test Title",
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-title-textarea-chars-count")).toBeInTheDocument();
	});

	it("calls setApplicationTitle when title is typed", async () => {
		const user = userEvent.setup();

		render(<ApplicationDetailsStep />);

		const textarea = screen.getByTestId("application-title-textarea");
		await user.type(textarea, "Test");

		// Check that setApplicationTitle was called multiple times as the user types
		expect(mockWizardStore.setApplicationTitle).toHaveBeenCalled();
		expect(mockWizardStore.setApplicationTitle).toHaveBeenCalledWith("T");
		expect(mockWizardStore.setApplicationTitle).toHaveBeenCalledWith("e");
		expect(mockWizardStore.setApplicationTitle).toHaveBeenCalledWith("s");
		expect(mockWizardStore.setApplicationTitle).toHaveBeenCalledWith("t");
	});

	it("limits title length to 120 characters", () => {
		render(<ApplicationDetailsStep />);

		const textarea = screen.getByTestId("application-title-textarea");
		expect(textarea).toHaveAttribute("maxLength", "120");
	});

	it("types in URL input", async () => {
		const user = userEvent.setup();

		// Set up required fields for URL input to work
		Object.assign(mockWizardStore, {
			templateId: "test-template-id",
			ui: {
				...mockWizardStore.ui,
				urlInput: "",
			},
			workspaceId: "test-workspace-id",
		});

		render(<ApplicationDetailsStep />);

		const urlInput = screen.getByPlaceholderText("Paste a link and press Enter to add");
		await user.type(urlInput, "https://example.com");

		// Check that setUrlInput was called as the user types
		expect(mockWizardStore.setUrlInput).toHaveBeenCalled();
	});

	it("displays existing URLs", () => {
		Object.assign(mockWizardStore, {
			urls: ["https://example1.com", "https://example2.com"],
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getAllByText("https://example1.com").length).toBeGreaterThan(0);
		expect(screen.getAllByText("https://example2.com").length).toBeGreaterThan(0);
	});

	it("displays URLs and allows hover interaction", async () => {
		const user = userEvent.setup();

		Object.assign(mockWizardStore, {
			urls: ["https://example1.com", "https://example2.com"],
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-links")).toBeInTheDocument();
		expect(screen.getByText("https://example1.com")).toBeInTheDocument();
		expect(screen.getByText("https://example2.com")).toBeInTheDocument();

		const [link] = screen.getAllByTestId("link-preview-item");
		await user.hover(link);

		// Check that hovering calls the state setter
		await waitFor(() => {
			expect(mockWizardStore.setLinkHoverState).toHaveBeenCalledWith("https://example1.com", true);
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

		Object.assign(mockWizardStore, {
			uploadedFiles: [file],
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-documents")).toBeInTheDocument();
		expect(screen.getByText("test.pdf")).toBeInTheDocument();
	});

	it("renders file dropdown with right-click", async () => {
		const user = userEvent.setup();

		const file = new File(["content"], "test.pdf", { type: "application/pdf" });
		Object.assign(file, { id: "file-id" });

		Object.assign(mockWizardStore, {
			uploadedFiles: [file],
		});

		render(<ApplicationDetailsStep />);

		const fileCard = screen.getByText("test.pdf").closest(".group");
		if (fileCard) {
			await user.pointer({ keys: "[MouseRight]", target: fileCard });
		}

		// Check that right-clicking calls the dropdown state setter
		await waitFor(() => {
			expect(mockWizardStore.setFileDropdownOpen).toHaveBeenCalledWith("test.pdf", true);
		});
	});
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory } from "::testing/factories";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ApplicationDetailsStep } from "./application-details-step";

vi.mock("@/actions/sources", () => ({
	crawlTemplateUrl: vi.fn().mockResolvedValue({ message: "URL crawled successfully" }),
	deleteTemplateSource: vi.fn(),
}));

vi.mock("@/actions/grant-applications", () => ({
	updateApplication: vi.fn(),
}));

describe("ApplicationDetailsStep", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset wizard store to initial state
		useWizardStore.setState({
			polling: {
				intervalId: null,
				isActive: false,
				start: vi.fn(),
				stop: vi.fn(),
			},
			ui: {
				currentStep: 0,
				fileDropdownStates: {},
				linkHoverStates: {},
				urlInput: "",
			},
			workspaceId: "",
			wsConnectionStatus: undefined,
			wsConnectionStatusColor: undefined,
		});

		// Reset application store to initial state
		useApplicationStore.setState({
			application: null,
			applicationTitle: "",
			isLoading: false,
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
		// Set application store state with an application
		useApplicationStore.setState({
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
			applicationTitle: "Test Title",
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-title-textarea-chars-count")).toBeInTheDocument();
	});

	it("calls handleTitleChange when title is typed", async () => {
		const user = userEvent.setup();

		// Spy on the handleTitleChange method
		const handleTitleChangeSpy = vi.spyOn(useWizardStore.getState(), "handleTitleChange");

		// Set application store state
		useApplicationStore.setState({
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
			applicationTitle: "",
		});

		render(<ApplicationDetailsStep />);

		const textarea = screen.getByTestId("application-title-textarea");
		await user.type(textarea, "Test");

		await waitFor(() => {
			expect(handleTitleChangeSpy).toHaveBeenCalled();
		});
	});

	it("limits title length to 120 characters", () => {
		render(<ApplicationDetailsStep />);

		const textarea = screen.getByTestId("application-title-textarea");
		expect(textarea).toHaveAttribute("maxLength", "120");
	});

	it("renders URL input component", () => {
		// Set application store state
		useApplicationStore.setState({
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
		});

		render(<ApplicationDetailsStep />);

		const urlInput = screen.getByPlaceholderText("Paste a link and press Enter to add");
		expect(urlInput).toBeInTheDocument();
	});

	it("displays existing URLs", () => {
		// Set application store state with URLs
		useApplicationStore.setState({
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
			applicationTitle: "Test Title",
			urls: ["https://example1.com", "https://example2.com"],
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getAllByText("https://example1.com").length).toBeGreaterThan(0);
		expect(screen.getAllByText("https://example2.com").length).toBeGreaterThan(0);
	});

	it("displays URLs and shows removal on hover", async () => {
		const user = userEvent.setup();

		// Set application store state with URLs
		useApplicationStore.setState({
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
			applicationTitle: "Test Title",
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

		// Set application store state with uploaded files
		useApplicationStore.setState({
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
			applicationTitle: "Test Title",
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

		// Set application store state with uploaded files
		useApplicationStore.setState({
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
			applicationTitle: "Test Title",
			uploadedFiles: [file],
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

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory, FileWithIdFactory } from "::testing/factories";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ApplicationDetailsStep } from "./application-details-step";

vi.mock("@/actions/sources", () => ({
	crawlTemplateUrl: vi.fn().mockResolvedValue({ message: "URL crawled successfully" }),
	deleteTemplateSource: vi.fn(),
}));

vi.mock("@/actions/grant-applications", () => ({
	updateApplication: vi.fn().mockResolvedValue({
		id: "test-id",
		title: "Updated Title",
		workspace_id: "test-workspace-id",
	}),
}));

describe("ApplicationDetailsStep", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
			polling: {
				intervalId: null,
				isActive: false,
				start: vi.fn(),
				stop: vi.fn(),
			},
		});

		useApplicationStore.setState({
			application: null,
			applicationTitle: "",
			isLoading: false,
			updateApplicationTitle: vi.fn().mockResolvedValue(undefined),
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

		const handleTitleChangeSpy = vi.spyOn(useWizardStore.getState(), "handleTitleChange");

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
			const removeIcons = screen.getAllByTestId("link-remove-icon");
			expect(removeIcons.length).toBeGreaterThan(0);
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
		const file = FileWithIdFactory.build({ name: "test.pdf" });

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

		const file = FileWithIdFactory.build({ name: "test.pdf" });

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

		const fileCard = screen.getByText("test.pdf").closest("button");
		expect(fileCard).toBeInTheDocument();

		if (fileCard) {
			await user.pointer({ keys: "[MouseRight]", target: fileCard });
		}

		await waitFor(() => {
			expect(screen.getByRole("menu")).toBeInTheDocument();
			expect(screen.getByText("Open")).toBeInTheDocument();
			expect(screen.getByText("Remove")).toBeInTheDocument();
		});
	});
});

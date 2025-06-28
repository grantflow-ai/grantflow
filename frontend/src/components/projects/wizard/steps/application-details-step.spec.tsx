import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantTemplateFactory,
	RagSourceFactory,
} from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ApplicationDetailsStep } from "./application-details-step";

const { mockUsePollingCleanup } = vi.hoisted(() => ({
	mockUsePollingCleanup: vi.fn(),
}));

vi.mock("@/hooks/use-polling-cleanup", () => ({
	usePollingCleanup: mockUsePollingCleanup,
}));

vi.mock("@/actions/sources", () => ({
	crawlTemplateUrl: vi.fn().mockResolvedValue({ message: "URL crawled successfully" }),
	deleteTemplateSource: vi.fn(),
}));

vi.mock("@/actions/grant-applications", () => ({
	updateApplication: vi.fn().mockResolvedValue({
		id: "test-id",
		project_id: "test-project-id",
		title: "Updated Title",
	}),
}));

describe("ApplicationDetailsStep", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUsePollingCleanup.mockClear();

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
			areAppOperationsInProgress: false,
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

		expect(screen.getByTestId("application-instructions-header")).toBeInTheDocument();
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
				project_id: "test-project-id",
				title: "Test Title",
			}),
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
				project_id: "test-project-id",
				title: "",
			}),
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
				project_id: "test-project-id",
				title: "",
			}),
		});

		render(<ApplicationDetailsStep />);

		const urlInput = screen.getByPlaceholderText("Paste a link and press Enter to add");
		expect(urlInput).toBeInTheDocument();
	});

	it("displays existing URLs", () => {
		const ragSource1 = RagSourceFactory.build({
			sourceId: "source-1",
			status: "FINISHED",
			url: "https://example1.com",
		});
		const ragSource2 = RagSourceFactory.build({
			sourceId: "source-2",
			status: "FINISHED",
			url: "https://example2.com",
		});

		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				id: "test-template-id",
				rag_sources: [ragSource1, ragSource2],
			}),
			id: "test-id",
			project_id: "test-project-id",
			title: "Test Title",
		});

		useApplicationStore.setState({
			application,
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getAllByText("https://example1.com").length).toBeGreaterThan(0);
		expect(screen.getAllByText("https://example2.com").length).toBeGreaterThan(0);
	});

	it("displays URLs and shows removal on hover", async () => {
		const user = userEvent.setup();

		const ragSource1 = RagSourceFactory.build({
			sourceId: "source-1",
			status: "FINISHED",
			url: "https://example1.com",
		});
		const ragSource2 = RagSourceFactory.build({
			sourceId: "source-2",
			status: "FINISHED",
			url: "https://example2.com",
		});

		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				id: "test-template-id",
				rag_sources: [ragSource1, ragSource2],
			}),
			id: "test-id",
			project_id: "test-project-id",
			title: "Test Title",
		});

		useApplicationStore.setState({
			application,
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
		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("template-file-container")).toBeInTheDocument();
	});

	it("renders application preview with empty state", () => {
		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-title-textarea")).toBeInTheDocument();
		expect(screen.getByTestId("application-title-header")).toBeInTheDocument();
		expect(screen.queryByTestId("application-documents")).not.toBeInTheDocument();
		expect(screen.queryByTestId("application-links")).not.toBeInTheDocument();
	});

	it("shows uploaded files in preview", () => {
		const fileSource = RagSourceFactory.build({
			filename: "test.pdf",
			sourceId: "file-1",
			status: "FINISHED",
		});

		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				id: "test-template-id",
				rag_sources: [fileSource],
			}),
			id: "test-id",
			project_id: "test-project-id",
			title: "Test Title",
		});

		useApplicationStore.setState({
			application,
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-documents")).toBeInTheDocument();
		expect(screen.getByText("test.pdf")).toBeInTheDocument();
	});

	it("renders file dropdown with right-click", async () => {
		const user = userEvent.setup();

		const fileSource = RagSourceFactory.build({
			filename: "test.pdf",
			sourceId: "file-1",
			status: "FINISHED",
		});

		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				id: "test-template-id",
				rag_sources: [fileSource],
			}),
			id: "test-id",
			project_id: "test-project-id",
			title: "Test Title",
		});

		useApplicationStore.setState({
			application,
		});

		render(<ApplicationDetailsStep />);

		const fileCard = screen.getByText("test.pdf").closest("button");
		expect(fileCard).toBeInTheDocument();

		if (fileCard) {
			await user.pointer({ keys: "[MouseRight]", target: fileCard });
		}

		await waitFor(
			() => {
				expect(screen.getByTestId("file-context-menu")).toBeInTheDocument();
				expect(screen.getByTestId("file-menu-open")).toBeInTheDocument();
				expect(screen.getByTestId("file-menu-remove")).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});

	it("calls usePollingCleanup hook", () => {
		render(<ApplicationDetailsStep />);

		expect(mockUsePollingCleanup).toHaveBeenCalled();
	});

	it("renders main container with correct data-testid", () => {
		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
	});

	it("passes connection status props to ApplicationPreview", () => {
		render(<ApplicationDetailsStep connectionStatus="Connected" connectionStatusColor="bg-green-500" />);

		expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
	});

	it("derives parentId from application grant_template id", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				id: "test-template-id",
			}),
			id: "test-id",
			project_id: "test-project-id",
			title: "Test Title",
		});

		useApplicationStore.setState({
			application,
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("template-file-container")).toBeInTheDocument();
	});

	it("handles null application gracefully", () => {
		useApplicationStore.setState({
			application: null,
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		expect(screen.getByTestId("application-title-textarea")).toBeInTheDocument();
	});

	it("handles application without grant_template gracefully", () => {
		const application = ApplicationFactory.build({
			grant_template: undefined,
			id: "test-id",
			project_id: "test-project-id",
			title: "Test Title",
		});

		useApplicationStore.setState({
			application,
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		expect(screen.getByTestId("application-title-textarea")).toBeInTheDocument();
	});
});
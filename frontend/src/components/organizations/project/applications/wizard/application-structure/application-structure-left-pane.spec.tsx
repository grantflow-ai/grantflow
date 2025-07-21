import { ApplicationFactory, GrantSectionFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { ApplicationStructureLeftPane } from "./application-structure-left-pane";

vi.mock("@/components/organizations/project/applications/wizard/shared", () => ({
	PreviewCard: vi.fn(({ children, className, ...props }) => (
		<div className={className} {...props}>
			{children}
		</div>
	)),
	WizardLeftPane: vi.fn(({ children, contentSpacing, testId }) => (
		<div className={contentSpacing} data-testid={testId}>
			{children}
		</div>
	)),
}));

vi.mock("../shared/file-preview-card", () => ({
	FilePreviewCard: vi.fn(({ file, parentId, sourceStatus }) => (
		<div data-testid="file-preview-card">
			<span data-testid="file-name">{file.name}</span>
			<span data-testid="file-parent-id">{parentId}</span>
			<span data-testid="file-source-status">{sourceStatus}</span>
		</div>
	)),
	LinkPreviewItem: vi.fn(({ parentId, sourceStatus, url }) => (
		<div data-testid="link-preview-item">
			<span data-testid="link-url">{url}</span>
			<span data-testid="link-parent-id">{parentId}</span>
			<span data-testid="link-source-status">{sourceStatus}</span>
		</div>
	)),
}));

vi.mock("@/hooks/use-polling-cleanup", () => ({
	usePollingCleanup: vi.fn(),
}));

describe("ApplicationStructureLeftPane", () => {
	const user = userEvent.setup();

	beforeEach(() => {
		resetAllStores();
		vi.clearAllMocks();
	});

	it("renders analyzing steps when no grant sections exist", () => {
		const mockTemplate = GrantTemplateFactory.build({ grant_sections: [] });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationStructureLeftPane />);

		expect(screen.getByTestId("application-structure-left-pane")).toBeInTheDocument();
		expect(screen.getByTestId("application-structure-header")).toHaveTextContent("Application Structure");
		expect(screen.queryByTestId("application-structure-description")).not.toBeInTheDocument();

		// Should show analyzing steps
		const stepTitles = screen.getAllByTestId("analyzing-step-title");
		expect(stepTitles).toHaveLength(4);
		expect(stepTitles[0]).toHaveTextContent("Reading the call");
		expect(stepTitles[1]).toHaveTextContent("Building the outline");
		expect(stepTitles[2]).toHaveTextContent("Adding writing cues");
		expect(stepTitles[3]).toHaveTextContent("Final check");
	});

	it("renders content view when grant sections exist", () => {
		const mockSections = [GrantSectionFactory.build()];
		const mockTemplate = GrantTemplateFactory.build({ grant_sections: mockSections });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationStructureLeftPane />);

		expect(screen.getByTestId("application-structure-header")).toHaveTextContent("Application Structure");
		expect(screen.getByTestId("application-structure-description")).toBeInTheDocument();
		expect(screen.queryByTestId("analyzing-step-title")).not.toBeInTheDocument();
	});

	it("shows info banner by default and can be closed", async () => {
		const mockSections = [GrantSectionFactory.build()];
		const mockTemplate = GrantTemplateFactory.build({ grant_sections: mockSections });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationStructureLeftPane />);

		expect(screen.getByText(/Keep in mind that AI has limitations/)).toBeInTheDocument();

		const closeButton = screen.getByAltText("Close");
		await user.click(closeButton);

		await waitFor(() => {
			expect(screen.queryByText(/Keep in mind that AI has limitations/)).not.toBeInTheDocument();
		});
	});

	it("renders document cards when template has file sources", () => {
		const mockSources = [
			RagSourceFactory.build({ filename: "grant-guide.pdf", url: undefined }),
			RagSourceFactory.build({ filename: "requirements.docx", url: undefined }),
		];
		const mockTemplate = GrantTemplateFactory.build({
			grant_sections: [GrantSectionFactory.build()],
			rag_sources: mockSources,
		});
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationStructureLeftPane />);

		expect(screen.getByTestId("application-documents")).toBeInTheDocument();
		expect(screen.getByText("Application Documents")).toBeInTheDocument();

		const fileCards = screen.getAllByTestId("file-preview-card");
		expect(fileCards).toHaveLength(2);
		expect(screen.getByText("grant-guide.pdf")).toBeInTheDocument();
		expect(screen.getByText("requirements.docx")).toBeInTheDocument();
	});

	it("renders link cards when template has URL sources", () => {
		const mockSources = [
			RagSourceFactory.build({ filename: undefined, url: "https://example.com/grant1" }),
			RagSourceFactory.build({ filename: undefined, url: "https://example.com/grant2" }),
		];
		const mockTemplate = GrantTemplateFactory.build({
			grant_sections: [GrantSectionFactory.build()],
			rag_sources: mockSources,
		});
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationStructureLeftPane />);

		expect(screen.getByTestId("application-links")).toBeInTheDocument();
		expect(screen.getByText("Links")).toBeInTheDocument();

		const linkItems = screen.getAllByTestId("link-preview-item");
		expect(linkItems).toHaveLength(2);
		expect(screen.getByText("https://example.com/grant1")).toBeInTheDocument();
		expect(screen.getByText("https://example.com/grant2")).toBeInTheDocument();
	});

	it("passes parent ID to file and link components", () => {
		const mockTemplate = GrantTemplateFactory.build({
			grant_sections: [GrantSectionFactory.build()],
			id: "template-123",
			rag_sources: [
				RagSourceFactory.build({ filename: "test.pdf", url: undefined }),
				RagSourceFactory.build({ filename: undefined, url: "https://example.com" }),
			],
		});
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationStructureLeftPane />);

		const fileParentIds = screen.getAllByTestId("file-parent-id");
		expect(fileParentIds[0]).toHaveTextContent("template-123");

		const linkParentIds = screen.getAllByTestId("link-parent-id");
		expect(linkParentIds[0]).toHaveTextContent("template-123");
	});

	it("shows active step indicator based on template generation status", () => {
		const mockTemplate = GrantTemplateFactory.build({ grant_sections: [] });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		useWizardStore.setState({
			templateGenerationStatus: {
				event: "sections_extracted",
				message: "Extracting sections",
			},
		});

		render(<ApplicationStructureLeftPane />);

		// Second step should be active (index 1)
		const activeIndicators = screen.getAllByTestId("step-active-indicator");
		expect(activeIndicators).toHaveLength(1);
	});

	it("shows error state when template generation fails", () => {
		const mockTemplate = GrantTemplateFactory.build({ grant_sections: [] });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		useWizardStore.setState({
			templateGenerationStatus: {
				event: "generation_error",
				message: "Failed to generate template: Invalid document format",
			},
		});

		render(<ApplicationStructureLeftPane />);

		expect(screen.getByTestId("error-title")).toHaveTextContent("Template Generation Failed");
		expect(screen.getByTestId("error-message")).toHaveTextContent(
			"Failed to generate template: Invalid document format",
		);
	});

	it("hides step details for indexing events", () => {
		const mockTemplate = GrantTemplateFactory.build({ grant_sections: [] });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		useWizardStore.setState({
			templateGenerationStatus: {
				event: "indexing_in_progress",
				message: "Indexing documents",
			},
		});

		render(<ApplicationStructureLeftPane />);

		// Step titles should be visible but not the detailed steps
		expect(screen.getAllByTestId("analyzing-step-title")).toHaveLength(4);
		expect(screen.queryByText(/Analyzing the documents/)).not.toBeInTheDocument();
	});

	it("shows step details for extraction events", () => {
		const mockTemplate = GrantTemplateFactory.build({ grant_sections: [] });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		useWizardStore.setState({
			templateGenerationStatus: {
				event: "sections_extracted",
				message: "Extracting sections",
			},
		});

		render(<ApplicationStructureLeftPane />);

		// Should show detailed steps
		expect(screen.getByText(/Analyzing the documents/)).toBeInTheDocument();
		expect(screen.getByText(/Translating the requirements/)).toBeInTheDocument();
	});

	it("progresses through steps based on template generation events", async () => {
		const mockTemplate = GrantTemplateFactory.build({ grant_sections: [] });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		const { rerender } = render(<ApplicationStructureLeftPane />);

		// Start with first event
		useWizardStore.setState({
			templateGenerationStatus: {
				event: "grant_template_generation_started",
				message: "Starting generation",
			},
		});
		rerender(<ApplicationStructureLeftPane />);

		// Progress to extraction
		useWizardStore.setState({
			templateGenerationStatus: {
				event: "sections_extracted",
				message: "Sections extracted",
			},
		});
		rerender(<ApplicationStructureLeftPane />);

		// Progress to metadata
		useWizardStore.setState({
			templateGenerationStatus: {
				event: "metadata_generated",
				message: "Metadata generated",
			},
		});
		rerender(<ApplicationStructureLeftPane />);

		// Final step
		useWizardStore.setState({
			templateGenerationStatus: {
				event: "grant_template_created",
				message: "Template created",
			},
		});
		rerender(<ApplicationStructureLeftPane />);

		// All steps should eventually be visible
		await waitFor(() => {
			const stepNumbers = screen.getAllByText(/^[1-4]$/);
			expect(stepNumbers.length).toBeGreaterThan(0);
		});
	});

	it("filters out sources without filename or URL", () => {
		const mockSources = [
			RagSourceFactory.build({ filename: "valid.pdf", url: undefined }),
			RagSourceFactory.build({ filename: undefined, url: undefined }),
			RagSourceFactory.build({ filename: undefined, url: "https://example.com" }),
		];
		const mockTemplate = GrantTemplateFactory.build({
			grant_sections: [GrantSectionFactory.build()],
			rag_sources: mockSources,
		});
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationStructureLeftPane />);

		const fileCards = screen.getAllByTestId("file-preview-card");
		expect(fileCards).toHaveLength(1);

		const linkItems = screen.getAllByTestId("link-preview-item");
		expect(linkItems).toHaveLength(1);
	});
});

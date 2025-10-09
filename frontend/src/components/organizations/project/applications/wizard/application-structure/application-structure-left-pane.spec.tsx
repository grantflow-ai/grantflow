import { ApplicationFactory, GrantSectionFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { ApplicationStructureLeftPane } from "./application-structure-left-pane";

vi.mock("@/components/app/app-dropdown", () => ({
	AppDropdownMenu: vi.fn(({ children }) => <div data-testid="mocked-dropdown-menu">{children}</div>),
	AppDropdownMenuContent: vi.fn(({ children }) => <div>{children}</div>),
	AppDropdownMenuItem: vi.fn(({ children, onClick }) => (
		<button onClick={onClick} type="button">
			{children}
		</button>
	)),
	AppDropdownMenuTrigger: vi.fn(({ children }) => <div>{children}</div>),
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

	it("renders file and link components with correct data", () => {
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

		const fileCards = screen.getAllByTestId("file-preview-card");
		expect(fileCards).toHaveLength(1);
		expect(screen.getByText("test.pdf")).toBeInTheDocument();

		const linkItems = screen.getAllByTestId("link-preview-item");
		expect(linkItems).toHaveLength(1);
		expect(screen.getByText("https://example.com")).toBeInTheDocument();
	});

	it("shows error state when template generation fails", () => {
		const mockTemplate = GrantTemplateFactory.build({ grant_sections: [] });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		useWizardStore.setState({
			templateEvent: "pipeline_error",
		});

		render(<ApplicationStructureLeftPane />);

		expect(screen.getByTestId("error-title")).toHaveTextContent("Template Generation Failed");
		expect(screen.getByTestId("error-message")).toHaveTextContent("Template generation failed");
	});

	it("shows step details for all template generation events", () => {
		const mockTemplate = GrantTemplateFactory.build({ grant_sections: [] });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		useWizardStore.setState({
			templateEvent: "cfp_data_extracted",
		});

		render(<ApplicationStructureLeftPane />);

		expect(screen.getAllByTestId("analyzing-step-title")).toHaveLength(4);
		expect(screen.getByText(/Analyzing the documents/)).toBeInTheDocument();
	});

	it("shows template generation progress with metadata_generated event", () => {
		const mockTemplate = GrantTemplateFactory.build({ grant_sections: [] });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		useWizardStore.setState({
			templateEvent: "metadata_generated",
		});

		render(<ApplicationStructureLeftPane />);

		expect(screen.getByText(/Reading the call/)).toBeInTheDocument();
		expect(screen.getByText(/Building the outline/)).toBeInTheDocument();
		expect(screen.getByText(/Analyzing the documents/)).toBeInTheDocument();
	});

	it("shows step details for non-indexing events", () => {
		const mockTemplate = GrantTemplateFactory.build({ grant_sections: [] });
		const mockApplication = ApplicationFactory.build({ grant_template: mockTemplate });
		useApplicationStore.setState({ application: mockApplication });

		useWizardStore.setState({
			templateEvent: "metadata_generated",
		});

		render(<ApplicationStructureLeftPane />);

		expect(screen.getByText(/Analyzing the documents/)).toBeInTheDocument();
		expect(screen.getByText(/Translating the requirements/)).toBeInTheDocument();
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

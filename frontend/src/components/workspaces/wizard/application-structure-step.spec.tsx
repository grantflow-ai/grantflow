import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory, ApplicationWithTemplateFactory } from "::testing/factories";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ApplicationStructureStep } from "./application-structure-step";

describe("ApplicationStructureStep", () => {
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
				currentStep: 1,
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

	it("renders the main component", () => {
		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-step")).toBeInTheDocument();
	});

	it("renders the header section", () => {
		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-header")).toBeInTheDocument();
		expect(screen.getByText("Application Structure")).toBeInTheDocument();
		expect(screen.getByTestId("application-structure-description")).toBeInTheDocument();
		expect(screen.getByText("Review and customize the structure of your grant application.")).toBeInTheDocument();
	});

	it("renders the configuration cards", () => {
		render(<ApplicationStructureStep />);

		expect(screen.getByText("Section Configuration")).toBeInTheDocument();
		expect(
			screen.getByText("Configure the sections and structure of your application based on the requirements."),
		).toBeInTheDocument();

		expect(screen.getByText("Content Organization")).toBeInTheDocument();
		expect(
			screen.getByText("Organize your content and determine the flow of your application."),
		).toBeInTheDocument();

		expect(screen.getByText("Requirements Mapping")).toBeInTheDocument();
		expect(
			screen.getByText("Map application requirements to specific sections and content areas."),
		).toBeInTheDocument();
	});

	it("shows empty state when no application title", () => {
		render(<ApplicationStructureStep />);

		expect(screen.getByText("Configure your application structure to see a preview")).toBeInTheDocument();
	});

	it("shows preview when application title is present", () => {
		const application = ApplicationWithTemplateFactory.build({
			id: "test-id",
			title: "Test Application",
			workspace_id: "test-workspace-id",
		});

		// Set the application store state
		useApplicationStore.setState({
			application,
			applicationTitle: "Test Application",
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-title")).toBeInTheDocument();
		expect(screen.getByText("Test Application")).toBeInTheDocument();
		expect(screen.queryByText("Configure your application structure to see a preview")).not.toBeInTheDocument();
	});

	it("displays untitled when no title is set", () => {
		const application = ApplicationWithTemplateFactory.build({
			id: "test-id",
			title: "",
			workspace_id: "test-workspace-id",
		});

		// Set the application store state with empty title
		useApplicationStore.setState({
			application,
			applicationTitle: "",
		});

		render(<ApplicationStructureStep />);

		const titleElement = screen.getByTestId("application-structure-title");
		expect(titleElement).toBeInTheDocument();
		expect(titleElement).toHaveTextContent("Untitled Application");
	});

	it("renders application sections preview", () => {
		const application = ApplicationFactory.build({
			grant_template: {
				created_at: new Date().toISOString(),
				funding_organization: undefined,
				funding_organization_id: undefined,
				grant_application_id: "test-id",
				grant_sections: [],
				id: "template-id",
				rag_sources: [],
				submission_date: undefined,
				updated_at: new Date().toISOString(),
			},
			id: "test-id",
			title: "Test Application",
			workspace_id: "test-workspace-id",
		});

		// Set the application store state
		useApplicationStore.setState({
			application,
			applicationTitle: "Test Application",
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-sections")).toBeInTheDocument();
		expect(screen.getByText("Application Sections")).toBeInTheDocument();

		expect(screen.getByText("Executive Summary")).toBeInTheDocument();
		expect(screen.getByText("Overview of the project and key highlights")).toBeInTheDocument();

		expect(screen.getByText("Project Description")).toBeInTheDocument();
		expect(screen.getByText("Detailed description of the proposed project")).toBeInTheDocument();

		expect(screen.getByText("Budget & Timeline")).toBeInTheDocument();
		expect(screen.getByText("Financial breakdown and project timeline")).toBeInTheDocument();

		expect(screen.getByText("Team & Qualifications")).toBeInTheDocument();
		expect(screen.getByText("Team members and their relevant experience")).toBeInTheDocument();
	});

	it("has correct layout structure", () => {
		render(<ApplicationStructureStep />);

		const mainContainer = screen.getByTestId("application-structure-step");
		expect(mainContainer).toHaveClass("flex", "size-full");

		const leftPane = mainContainer.querySelector(".w-1\\/3");
		expect(leftPane).toBeInTheDocument();
		expect(leftPane).toHaveClass("sm:w-1/2", "space-y-6", "overflow-y-auto", "p-6");

		const previewPane = mainContainer.querySelector(".w-\\[70\\%\\]");
		expect(previewPane).toBeInTheDocument();
		expect(previewPane).toHaveClass(
			"bg-preview-bg",
			"flex",
			"h-full",
			"flex-col",
			"gap-6",
			"border-l",
			"border-gray-100",
		);
	});

	it("handles long application titles gracefully", () => {
		const longTitle =
			"This is a very long application title that should be handled gracefully by the UI without breaking the layout or causing overflow issues";

		const application = ApplicationWithTemplateFactory.build({
			id: "test-id",
			title: longTitle,
			workspace_id: "test-workspace-id",
		});

		// Set the application store state with long title
		useApplicationStore.setState({
			application,
			applicationTitle: longTitle,
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByText(longTitle)).toBeInTheDocument();
		expect(screen.getByTestId("application-structure-title")).toBeInTheDocument();
	});
});

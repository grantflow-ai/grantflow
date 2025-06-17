import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUseWizardStore, mockWizardStore } from "@/testing/wizard-store-mock";

import { ApplicationStructureStep } from "./application-structure-step";

vi.mock("@/stores/wizard-store", () => ({
	useWizardStore: mockUseWizardStore,
}));

describe("ApplicationStructureStep", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mock store to default state
		Object.assign(mockWizardStore, {
			applicationState: {
				application: null,
				applicationId: null,
				applicationTitle: "",
				templateId: null,
				wsConnectionStatus: undefined,
				wsConnectionStatusColor: undefined,
			},
			contentState: {
				uploadedFiles: [],
				urls: [],
			},
			isLoading: false,
			ui: {
				currentStep: 1,
				fileDropdownStates: {},
				linkHoverStates: {},
				urlInput: "",
			},
			uiState: {},
			workspaceId: "test-workspace-id",
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
		Object.assign(mockWizardStore, {
			applicationState: {
				...mockWizardStore.applicationState,
				applicationTitle: "Test Application",
			},
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-title")).toBeInTheDocument();
		expect(screen.getByText("Test Application")).toBeInTheDocument();
		expect(screen.queryByText("Configure your application structure to see a preview")).not.toBeInTheDocument();
	});

	it("displays untitled when no title is set", () => {
		Object.assign(mockWizardStore, {
			applicationState: {
				...mockWizardStore.applicationState,
				application: { id: "test-id" }, // Has application but no title
				applicationTitle: " ", // Truthy but effectively empty to trigger preview but show "Untitled Application"
			},
		});

		render(<ApplicationStructureStep />);

		const titleElement = screen.getByTestId("application-structure-title");
		expect(titleElement).toBeInTheDocument();
		expect(titleElement).toHaveTextContent("Untitled Application");
	});

	it("shows connection status when present", () => {
		Object.assign(mockWizardStore, {
			applicationState: {
				...mockWizardStore.applicationState,
				applicationTitle: "Test Application",
				wsConnectionStatus: "Connected",
				wsConnectionStatusColor: "bg-green-500",
			},
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByText("Connected")).toBeInTheDocument();
	});

	it("renders application sections preview", () => {
		Object.assign(mockWizardStore, {
			applicationState: {
				...mockWizardStore.applicationState,
				applicationTitle: "Test Application",
			},
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-sections")).toBeInTheDocument();
		expect(screen.getByText("Application Sections")).toBeInTheDocument();

		// Check for the sample sections
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

		// Left pane should have responsive width classes
		const leftPane = mainContainer.querySelector(".w-1\\/3");
		expect(leftPane).toBeInTheDocument();
		expect(leftPane).toHaveClass("sm:w-1/2", "space-y-6", "overflow-y-auto", "p-6");

		// Preview pane should have correct width
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

	it("renders with different connection status colors", () => {
		Object.assign(mockWizardStore, {
			applicationState: {
				...mockWizardStore.applicationState,
				applicationTitle: "Test Application",
				wsConnectionStatus: "Processing",
				wsConnectionStatusColor: "bg-yellow-500",
			},
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByText("Processing")).toBeInTheDocument();
		const badge = screen.getByText("Processing").closest(".bg-yellow-500");
		expect(badge).toBeInTheDocument();
	});

	it("handles long application titles gracefully", () => {
		const longTitle =
			"This is a very long application title that should be handled gracefully by the UI without breaking the layout or causing overflow issues";

		Object.assign(mockWizardStore, {
			applicationState: {
				...mockWizardStore.applicationState,
				applicationTitle: longTitle,
			},
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByText(longTitle)).toBeInTheDocument();
		expect(screen.getByTestId("application-structure-title")).toBeInTheDocument();
	});
});

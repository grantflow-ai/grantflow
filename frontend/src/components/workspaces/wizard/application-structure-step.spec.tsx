import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory, ApplicationWithTemplateFactory, GrantSectionDetailedFactory } from "::testing/factories";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ApplicationStructureStep } from "./application-structure-step";

describe("ApplicationStructureStep", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		useWizardStore.setState({
			currentStep: 1,
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

		useApplicationStore.setState({
			application,
			applicationTitle: longTitle,
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByText(longTitle)).toBeInTheDocument();
		expect(screen.getByTestId("application-structure-title")).toBeInTheDocument();
	});

	describe("grant sections functionality", () => {
		it("renders grant sections when available", () => {
			const grantSections = [
				GrantSectionDetailedFactory.build({ id: "1", order: 0, parent_id: null, title: "Introduction" }),
				GrantSectionDetailedFactory.build({ id: "2", order: 1, parent_id: null, title: "Methods" }),
				GrantSectionDetailedFactory.build({ id: "3", order: 2, parent_id: null, title: "Results" }),
			];

			const application = ApplicationWithTemplateFactory.build();
			if (application.grant_template) {
				application.grant_template.grant_sections = grantSections;
			}

			useApplicationStore.setState({
				application,
				applicationTitle: "Test Application",
			});

			render(<ApplicationStructureStep />);

			expect(screen.getByText("Introduction")).toBeInTheDocument();
			expect(screen.getByText("Methods")).toBeInTheDocument();
			expect(screen.getByText("Results")).toBeInTheDocument();
		});

		it("shows add new section button", () => {
			const application = ApplicationWithTemplateFactory.build();

			useApplicationStore.setState({
				application,
				applicationTitle: "Test Application",
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByText("Add New Section");
			expect(addButton).toBeInTheDocument();
		});

		it("opens new section form when add button is clicked", () => {
			const application = ApplicationWithTemplateFactory.build();

			useApplicationStore.setState({
				application,
				applicationTitle: "Test Application",
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByText("Add New Section");
			fireEvent.click(addButton);

			expect(screen.getByText("New section")).toBeInTheDocument();
			expect(screen.getByLabelText("Section name")).toBeInTheDocument();
			expect(screen.getByText("Words/Characters count")).toBeInTheDocument();
		});

		it("calls updateGrantSections when adding a new section", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build();
			if (application.grant_template) {
				application.grant_template.grant_sections = [];
			}

			useApplicationStore.setState({
				application,
				applicationTitle: "Test Application",
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByText("Add New Section");
			fireEvent.click(addButton);

			const nameInput = screen.getByLabelText("Section name");
			fireEvent.change(nameInput, { target: { value: "New Section Title" } });

			const saveButton = screen.getByText("Save");
			fireEvent.click(saveButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalledWith(
					expect.arrayContaining([
						expect.objectContaining({
							max_words: 3000,
							title: "New Section Title",
						}),
					]),
				);
			});
		});

		it("displays max words for sections", () => {
			const grantSections = [
				GrantSectionDetailedFactory.build({
					id: "1",
					max_words: 1500,
					order: 0,
					parent_id: null,
					title: "Introduction",
				}),
			];

			const application = ApplicationWithTemplateFactory.build();
			if (application.grant_template) {
				application.grant_template.grant_sections = grantSections;
			}

			useApplicationStore.setState({
				application,
				applicationTitle: "Test Application",
			});

			render(<ApplicationStructureStep />);

			expect(screen.getByText("1,500 Max words")).toBeInTheDocument();
		});

		it("handles subsections correctly", () => {
			const grantSections = [
				GrantSectionDetailedFactory.build({
					id: "1",
					order: 0,
					parent_id: null,
					title: "Main Section",
				}),
				GrantSectionDetailedFactory.build({
					id: "2",
					order: 1,
					parent_id: "1",
					title: "Subsection",
				}),
			];

			const application = ApplicationWithTemplateFactory.build();
			if (application.grant_template) {
				application.grant_template.grant_sections = grantSections;
			}

			useApplicationStore.setState({
				application,
				applicationTitle: "Test Application",
			});

			render(<ApplicationStructureStep />);

			expect(screen.getByText("Main Section")).toBeInTheDocument();
			expect(screen.getByText("Subsection")).toBeInTheDocument();
		});

		it("disables save button when section name is empty", () => {
			const application = ApplicationWithTemplateFactory.build();

			useApplicationStore.setState({
				application,
				applicationTitle: "Test Application",
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByText("Add New Section");
			fireEvent.click(addButton);

			const saveButton = screen.getByText("Save");
			expect(saveButton).toBeDisabled();

			const nameInput = screen.getByLabelText("Section name");
			fireEvent.change(nameInput, { target: { value: "Test" } });

			expect(saveButton).not.toBeDisabled();

			fireEvent.change(nameInput, { target: { value: "" } });

			expect(saveButton).toBeDisabled();
		});
	});
});

import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
} from "::testing/factories";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ApplicationStructureStep } from "./application-structure-step";

vi.mock("next/image", () => ({
	default: ({ alt, className }: { alt: string; className?: string; src: string }) => (
		<div className={className} data-testid={`image-${alt}`} />
	),
}));

describe("ApplicationStructureStep", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		useWizardStore.setState({
			checkTemplateRagJobStatus: vi.fn(),
			currentStep: WizardStep.APPLICATION_STRUCTURE,
			grantTemplateRagJobData: null,
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
			retrieveApplication: vi.fn(),
			updateGrantSections: vi.fn(),
		});
	});

	it("renders the main component", () => {
		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-step")).toBeInTheDocument();
	});

	it("renders the header section", () => {
		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-header")).toBeInTheDocument();
		expect(screen.getByTestId("application-structure-description")).toBeInTheDocument();
	});

	it("renders the application documents card", () => {
		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-documents-title")).toBeInTheDocument();
		expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
	});

	it("shows empty state when no application title", () => {
		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("empty-state-message")).toBeInTheDocument();
	});

	it("shows preview when application is present", () => {
		const application = ApplicationWithTemplateFactory.build({
			id: "test-id",
			title: "Test Application",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-sections")).toBeInTheDocument();
		expect(screen.queryByTestId("empty-state-message")).not.toBeInTheDocument();
	});

	it("shows application sections when application exists", () => {
		const application = ApplicationWithTemplateFactory.build({
			id: "test-id",
			title: "",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-sections")).toBeInTheDocument();
		expect(screen.getByTestId("add-new-section-button")).toBeInTheDocument();
	});

	it("renders application sections preview", () => {
		const application = ApplicationFactory.build({
			grant_template: GrantTemplateFactory.build({
				grant_application_id: "test-id",
				grant_sections: [],
				id: "template-id",
			}),
			id: "test-id",
			title: "Test Application",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-sections")).toBeInTheDocument();
	});

	it("has correct layout structure", () => {
		render(<ApplicationStructureStep />);

		const mainContainer = screen.getByTestId("application-structure-step");
		expect(mainContainer).toBeInTheDocument();
		expect(mainContainer).toHaveClass("flex", "size-full");

		const leftPane = mainContainer.querySelector(".w-1\\/3");
		expect(leftPane).toBeInTheDocument();

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

	it("renders with application that has grant sections", () => {
		const application = ApplicationWithTemplateFactory.build({
			id: "test-id",
			title: "Test Application",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
		});

		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-sections")).toBeInTheDocument();
		expect(screen.getByTestId("add-new-section-button")).toBeInTheDocument();
	});

	describe("grant sections functionality", () => {
		it("renders grant sections when available", () => {
			const grantSections = [
				GrantSectionDetailedFactory.build({ id: "1", order: 0, parent_id: null, title: "Introduction" }),
				GrantSectionDetailedFactory.build({ id: "2", order: 1, parent_id: null, title: "Methods" }),
				GrantSectionDetailedFactory.build({ id: "3", order: 2, parent_id: null, title: "Results" }),
			];

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: grantSections,
				}),
			});

			useApplicationStore.setState({
				application,
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
			});

			render(<ApplicationStructureStep />);

			expect(screen.getByTestId("add-new-section-button")).toBeInTheDocument();
		});

		it("calls updateGrantSections when add button is clicked", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_application_id: "test-id",
					grant_sections: [], // Empty sections array
					id: "template-id",
				}),
				id: "test-id",
				title: "Test Application",
				workspace_id: "test-workspace-id",
			});

			useApplicationStore.setState({
				application,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalledWith([
					expect.objectContaining({
						depends_on: [],
						generation_instructions: "",
						is_clinical_trial: null,
						is_detailed_workplan: null,
						keywords: [],
						max_words: 3000,
						order: 0,
						parent_id: null,
						search_queries: [],
						title: "Category Name",
						topics: [],
					}),
				]);
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

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: grantSections,
				}),
			});

			useApplicationStore.setState({
				application,
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

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: grantSections,
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureStep />);

			expect(screen.getByText("Main Section")).toBeInTheDocument();
			expect(screen.getByText("Subsection")).toBeInTheDocument();
		});
	});
});

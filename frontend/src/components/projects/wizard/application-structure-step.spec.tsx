import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
	RagJobResponseFactory,
} from "::testing/factories";
import { render, screen } from "@testing-library/react";
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
			project_id: "test-project-id",
			title: "Test Application",
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
			project_id: "test-project-id",
			title: "",
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
			project_id: "test-project-id",
			title: "Test Application",
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
		expect(mainContainer).toHaveClass("flex");

		const leftPane = mainContainer.querySelector(".w-1\\/3");
		expect(leftPane).toBeInTheDocument();

		const previewPane = mainContainer.querySelector(".w-\\[70\\%\\]");
		expect(previewPane).toBeInTheDocument();
		expect(previewPane).toHaveClass("bg-preview-bg");
	});

	it("renders with application that has grant sections", () => {
		const application = ApplicationWithTemplateFactory.build({
			id: "test-id",
			project_id: "test-project-id",
			title: "Test Application",
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

			expect(screen.getByTestId("application-structure-sections")).toBeInTheDocument();
			const sectionsContainer = screen.getByTestId("application-structure-sections");
			expect(sectionsContainer).toBeInTheDocument();
		});

		it("shows add new section button", () => {
			const application = ApplicationWithTemplateFactory.build();

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureStep />);

			expect(screen.getByTestId("add-new-section-button")).toBeInTheDocument();
		});
	});

	describe("GeneratingLoader state", () => {
		it("shows GeneratingLoader during PROCESSING status", () => {
			const application = ApplicationWithTemplateFactory.build();

			useApplicationStore.setState({
				application,
			});

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			render(<ApplicationStructureStep />);

			expect(screen.getByTestId("image-Analyzing data")).toBeInTheDocument();
		});

		it("shows GeneratingLoader during PENDING status", () => {
			const application = ApplicationWithTemplateFactory.build();

			useApplicationStore.setState({
				application,
			});

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PENDING" }),
			});

			render(<ApplicationStructureStep />);

			expect(screen.getByTestId("image-Analyzing data")).toBeInTheDocument();
		});

		it("does not show GeneratingLoader when completed", () => {
			const application = ApplicationWithTemplateFactory.build();

			useApplicationStore.setState({
				application,
			});

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			render(<ApplicationStructureStep />);

			expect(screen.queryByTestId("image-Analyzing data")).not.toBeInTheDocument();
			expect(screen.getByTestId("application-structure-sections")).toBeInTheDocument();
		});

		it("changes description text during generation", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			render(<ApplicationStructureStep />);

			const description = screen.getByTestId("application-structure-description");
			expect(description).toBeInTheDocument();
			expect(description).toHaveTextContent("Analyzing your knowledge base to generate the optimal structure...");
		});

		it("shows normal description text when not generating", () => {
			render(<ApplicationStructureStep />);

			const description = screen.getByTestId("application-structure-description");
			expect(description).toBeInTheDocument();
			expect(description).toHaveTextContent("Review and customize the structure of your grant application.");
		});
	});
});
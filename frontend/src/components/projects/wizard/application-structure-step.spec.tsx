import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
	RagJobResponseFactory,
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

vi.mock("@/components/ui/scroll-area", () => ({
	ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className} data-testid="scroll-area">
			{children}
		</div>
	),
}));

describe("ApplicationStructureStep", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		useWizardStore.setState({
			checkTemplateRagJobStatus: vi.fn(),
			currentStep: WizardStep.APPLICATION_STRUCTURE,
			grantTemplateRagJobData: null,
			isGeneratingTemplate: false,
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
				grant_sections: [
					GrantSectionDetailedFactory.build({ id: "1", order: 0, parent_id: null, title: "Introduction" }),
				],
				id: "template-id",
				rag_sources: [],
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

		const leftPane = screen.getByTestId("application-structure-left-pane");
		expect(leftPane).toBeInTheDocument();

		const previewPane = screen.getByTestId("application-structure-preview-pane");
		expect(previewPane).toBeInTheDocument();
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
				isGeneratingTemplate: true,
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
				isGeneratingTemplate: true,
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
				isGeneratingTemplate: false,
			});

			render(<ApplicationStructureStep />);

			expect(screen.queryByTestId("image-Analyzing data")).not.toBeInTheDocument();
			expect(screen.getByTestId("application-structure-sections")).toBeInTheDocument();
		});

		it("changes description text during generation", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
				isGeneratingTemplate: true,
			});

			render(<ApplicationStructureStep />);

			const description = screen.getByTestId("application-structure-description");
			expect(description).toBeInTheDocument();
			expect(description).toHaveTextContent("Analyzing your knowledge base to generate the optimal structure...");
		});

		it("shows normal description text when not generating", () => {
			useWizardStore.setState({
				isGeneratingTemplate: false,
			});

			render(<ApplicationStructureStep />);

			const description = screen.getByTestId("application-structure-description");
			expect(description).toBeInTheDocument();
			expect(description).toHaveTextContent("Review and customize the structure of your grant application.");
		});
	});

	describe("Section Management", () => {
		beforeEach(() => {
			vi.clearAllMocks();

			useWizardStore.getState().reset();

			useWizardStore.setState({
				checkTemplateRagJobStatus: vi.fn(),
				currentStep: WizardStep.APPLICATION_STRUCTURE,
				grantTemplateRagJobData: null,
				isGeneratingTemplate: false,
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
				generateTemplate: vi.fn().mockResolvedValue(undefined),
				retrieveApplication: vi.fn(),
				updateGrantSections: vi.fn(),
			});
		});

		it("handles add new section button click", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [
						GrantSectionDetailedFactory.build({
							id: "1",
							order: 0,
							parent_id: null,
							title: "Introduction",
						}),
					],
					id: "template-id",
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({
				application,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			await waitFor(() => {
				expect(screen.getByTestId("application-structure-sections")).toBeInTheDocument();
			});

			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalledWith([
					expect.objectContaining({
						id: "1",
						title: "Introduction",
					}),
					expect.objectContaining({
						depends_on: [],
						generation_instructions: "",
						id: expect.stringMatching(/^section-/),
						is_clinical_trial: null,
						is_detailed_research_plan: null,
						keywords: [],
						max_words: 3000,
						order: 1,
						parent_id: null,
						search_queries: [],
						title: "Category Name",
						topics: [],
					}),
				]);
			});
		});

		it("creates main section with correct title", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [
						GrantSectionDetailedFactory.build({
							id: "1",
							order: 0,
							parent_id: null,
							title: "Introduction",
						}),
					],
					rag_sources: [],
				}),
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
						id: "1",
						title: "Introduction",
					}),
					expect.objectContaining({
						parent_id: null,
						title: "Category Name",
					}),
				]);
			});
		});

		it("assigns correct order to new sections", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const existingSections = [
				GrantSectionDetailedFactory.build({ order: 0 }),
				GrantSectionDetailedFactory.build({ order: 1 }),
				GrantSectionDetailedFactory.build({ order: 2 }),
			];

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: existingSections,
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({
				application,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalled();
				const [[calledWith]] = mockUpdateGrantSections.mock.calls;
				expect(calledWith).toHaveLength(4);
				expect(calledWith[3]).toEqual(
					expect.objectContaining({
						order: 3,
					}),
				);
			});
		});

		it("preserves existing sections when adding new one", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const existingSections = [
				GrantSectionDetailedFactory.build({
					id: "keep-1",
					title: "Keep This Section",
				}),
				GrantSectionDetailedFactory.build({
					id: "keep-2",
					title: "Keep This Too",
				}),
			];

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: existingSections,
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({
				application,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			await waitFor(() => {
				const [[calledWith]] = mockUpdateGrantSections.mock.calls;
				expect(calledWith).toHaveLength(3); // 2 existing + 1 new
				expect(calledWith[0]).toEqual(
					expect.objectContaining({
						id: "keep-1",
						title: "Keep This Section",
					}),
				);
				expect(calledWith[1]).toEqual(
					expect.objectContaining({
						id: "keep-2",
						title: "Keep This Too",
					}),
				);
				expect(calledWith[2]).toEqual(
					expect.objectContaining({
						title: "Category Name",
					}),
				);
			});
		});

		it("handles empty grant sections array", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [
						GrantSectionDetailedFactory.build({
							id: "1",
							order: 0,
							parent_id: null,
							title: "Introduction",
						}),
					],
					rag_sources: [],
				}),
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
						id: "1",
						title: "Introduction",
					}),
					expect.objectContaining({
						order: 1,
						parent_id: null,
						title: "Category Name",
					}),
				]);
			});
		});

		it("generates unique IDs for new sections", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [
						GrantSectionDetailedFactory.build({
							id: "1",
							order: 0,
							parent_id: null,
							title: "Introduction",
						}),
					],
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({
				application,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalled();
			});

			const [[firstCall]] = mockUpdateGrantSections.mock.calls;
			const [, firstNewSection] = firstCall;
			const firstCallId = firstNewSection.id;

			mockUpdateGrantSections.mockClear();
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalled();
			});

			const [[secondCall]] = mockUpdateGrantSections.mock.calls;
			const [, secondNewSection] = secondCall;
			const secondCallId = secondNewSection.id;

			expect(firstCallId).not.toBe(secondCallId);
			expect(firstCallId).toMatch(/^section-/);
			expect(secondCallId).toMatch(/^section-/);
		});
	});
});

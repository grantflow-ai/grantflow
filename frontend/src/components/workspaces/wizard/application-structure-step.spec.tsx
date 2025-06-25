import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
	RagJobResponseFactory,
	RagSourceFactory,
} from "::testing/factories";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

let mockSections: any[] = [];

vi.mock("@/components/workspaces/wizard/drag-drop-section-manager", () => ({
	DragDropSectionManager: () => {
		return (
			<div data-testid="drag-drop-section-manager">
				{mockSections.map((section: any) => (
					<div data-testid={`section-${section.id}`} key={section.id}>
						<span>{section.title}</span>
						{section.max_words && <span>{section.max_words.toLocaleString()} Max words</span>}
					</div>
				))}
			</div>
		);
	},
}));

describe("ApplicationStructureStep", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockSections = [];

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

			mockSections = grantSections;

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

			mockSections = grantSections;

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

			mockSections = grantSections;

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

	describe("RAG job polling and effects", () => {
		it("calls checkTemplateRagJobStatus when application has rag_job_id", () => {
			const mockCheckTemplateRagJobStatus = vi.fn();
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_job_id: "test-rag-job-id",
				}),
			});

			useWizardStore.setState({
				checkTemplateRagJobStatus: mockCheckTemplateRagJobStatus,
				grantTemplateRagJobData: null,
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureStep />);

			expect(mockCheckTemplateRagJobStatus).toHaveBeenCalled();
		});

		it("does not call checkTemplateRagJobStatus when no rag_job_id", () => {
			const mockCheckTemplateRagJobStatus = vi.fn();
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_job_id: undefined,
				}),
			});

			useWizardStore.setState({
				checkTemplateRagJobStatus: mockCheckTemplateRagJobStatus,
				grantTemplateRagJobData: null,
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureStep />);

			expect(mockCheckTemplateRagJobStatus).not.toHaveBeenCalled();
		});

		it("calls retrieveApplication when RAG job completes", async () => {
			const mockRetrieveApplication = vi.fn();
			const application = ApplicationWithTemplateFactory.build({
				id: "test-app-id",
				workspace_id: "test-workspace-id",
			});

			useApplicationStore.setState({
				application,
				retrieveApplication: mockRetrieveApplication,
			});

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			const { rerender } = render(<ApplicationStructureStep />);

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			rerender(<ApplicationStructureStep />);

			await waitFor(() => {
				expect(mockRetrieveApplication).toHaveBeenCalledWith("test-workspace-id", "test-app-id");
			});
		});

		it("does not call retrieveApplication when RAG job is not completed", () => {
			const mockRetrieveApplication = vi.fn();
			const application = ApplicationWithTemplateFactory.build();

			useApplicationStore.setState({
				application,
				retrieveApplication: mockRetrieveApplication,
			});

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			render(<ApplicationStructureStep />);

			expect(mockRetrieveApplication).not.toHaveBeenCalled();
		});
	});

	describe("template generation animation", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("starts animation when template is generating", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			render(<ApplicationStructureStep />);

			expect(
				screen.getByText("Analyzing your knowledge base to generate the optimal structure..."),
			).toBeInTheDocument();
		});

		it("shows steps progressively during generation", async () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			render(<ApplicationStructureStep />);

			// Steps should start showing after timer advances
			// Initially we should see the analyzing description but no specific steps yet highlighted

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			expect(screen.getByText("Reading the call")).toBeInTheDocument();

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			expect(screen.getByText("Building the outline")).toBeInTheDocument();
		});

		it("resets visibleSteps when generation stops", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			const { rerender } = render(<ApplicationStructureStep />);

			act(() => {
				vi.advanceTimersByTime(2000);
			});

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			rerender(<ApplicationStructureStep />);

			expect(
				screen.queryByText("Analyzing your knowledge base to generate the optimal structure..."),
			).not.toBeInTheDocument();
		});

		it("cleans up interval when component unmounts during generation", () => {
			const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			const { unmount } = render(<ApplicationStructureStep />);

			unmount();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});
	});

	describe("file and URL processing", () => {
		it("renders FilePreviewCard for each template file", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({
							filename: "document1.pdf",
							sourceId: "source-1",
							url: undefined,
						}),
						RagSourceFactory.build({
							filename: "document2.docx",
							sourceId: "source-2",
							url: undefined,
						}),
					],
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureStep />);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
		});

		it("renders LinkPreviewItem for each template URL", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({
							filename: undefined,
							sourceId: "source-1",
							url: "https://example.com/grant-guidelines",
						}),
						RagSourceFactory.build({
							filename: undefined,
							sourceId: "source-2",
							url: "https://example.com/application-form",
						}),
					],
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureStep />);

			expect(screen.getByText("Links")).toBeInTheDocument();
		});

		it("filters out sources without filename for files", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({
							filename: "document1.pdf",
							sourceId: "source-1",
							url: undefined,
						}),
						RagSourceFactory.build({
							filename: undefined,
							sourceId: "source-2",
							url: "https://example.com",
						}),
					],
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureStep />);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
		});

		it("filters out sources without URL for links", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({
							filename: "document1.pdf",
							sourceId: "source-1",
							url: undefined,
						}),
						RagSourceFactory.build({
							filename: undefined,
							sourceId: "source-2",
							url: "https://example.com",
						}),
					],
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureStep />);

			expect(screen.getByText("Links")).toBeInTheDocument();
		});

		it("shows no documents message when no files exist", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureStep />);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
		});

		it("does not show links section when no URLs exist", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({
							filename: "document1.pdf",
							sourceId: "source-1",
							url: undefined,
						}),
					],
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureStep />);

			expect(screen.queryByText("Links")).not.toBeInTheDocument();
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

			expect(
				screen.getByText("Analyzing your knowledge base to generate the optimal structure..."),
			).toBeInTheDocument();
		});

		it("shows normal description text when not generating", () => {
			render(<ApplicationStructureStep />);

			expect(
				screen.getByText("Review and customize the structure of your grant application."),
			).toBeInTheDocument();
		});
	});

	describe("helper functions", () => {
		// We need to test these functions indirectly since they're not exported
		// We'll test their behavior through the component interactions

		it("handles detailed section identification correctly", () => {
			const grantSections = [
				GrantSectionDetailedFactory.build({
					id: "detailed-section",
					max_words: 3000,
					title: "Detailed Section",
				}),
			];

			mockSections = grantSections;

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: grantSections,
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureStep />);

			// The detailed section should render properly with max_words
			expect(screen.getByText("3,000 Max words")).toBeInTheDocument();
		});

		it("converts sections to update format when adding new section", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const existingSections = [
				GrantSectionDetailedFactory.build({
					id: "existing-1",
					max_words: 2000,
					order: 0,
					parent_id: null,
					title: "Existing Section",
				}),
			];

			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_application_id: "test-id",
					grant_sections: existingSections,
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
					// Existing section should be preserved
					expect.objectContaining({
						id: "existing-1",
						max_words: 2000,
						title: "Existing Section",
					}),
					// New section should have default values
					expect.objectContaining({
						depends_on: [],
						generation_instructions: "",
						is_clinical_trial: null,
						is_detailed_workplan: null,
						keywords: [],
						max_words: 3000,
						order: 1, // Should be length of existing sections
						parent_id: null,
						search_queries: [],
						title: "Category Name",
						topics: [],
					}),
				]);
			});
		});

		it("generates proper default values for new sections", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					id: "template-id",
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
						depends_on: [],
						generation_instructions: "",
						id: expect.stringMatching(/^section-/), // Should start with "section-"
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
	});

	describe("handleAddNewSection logic", () => {
		it("creates main section with correct title", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
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
						parent_id: null,
						title: "Category Name", // Main section title
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

			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: existingSections,
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
				expect(calledWith).toHaveLength(4); // 3 existing + 1 new
				// Check that the new section (last one) has the correct order
				expect(calledWith[3]).toEqual(
					expect.objectContaining({
						order: 3, // Should be the length of existing sections
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

			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: existingSections,
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
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
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
						order: 0,
						parent_id: null,
						title: "Category Name",
					}),
				]);
			});
		});

		it("generates unique IDs for new sections", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
			});

			useApplicationStore.setState({
				application,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			// Add first section
			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalled();
			});

			const [[firstCall]] = mockUpdateGrantSections.mock.calls;
			const [firstSection] = firstCall;
			const firstCallId = firstSection.id;

			// Reset and add second section
			mockUpdateGrantSections.mockClear();
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalled();
			});

			const [[secondCall]] = mockUpdateGrantSections.mock.calls;
			const [secondSection] = secondCall;
			const secondCallId = secondSection.id;

			// IDs should be different
			expect(firstCallId).not.toBe(secondCallId);
			expect(firstCallId).toMatch(/^section-/);
			expect(secondCallId).toMatch(/^section-/);
		});
	});
});

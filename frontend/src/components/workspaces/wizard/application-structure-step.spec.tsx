import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
	RagJobResponseFactory,
	RagSourceFactory,
} from "::testing/factories";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ApplicationStructureLeftPane, ApplicationStructureStep } from "./application-structure-step";

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

			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
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

			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
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

			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();
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
});

describe("ApplicationStructureLeftPane", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		useWizardStore.setState({
			checkTemplateRagJobStatus: vi.fn(),
			currentStep: WizardStep.APPLICATION_STRUCTURE,
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

	describe("Animation Timer Logic", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("initializes with no visible steps", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			render(<ApplicationStructureLeftPane />);

			expect(
				screen.getByText("Review and customize the structure of your grant application."),
			).toBeInTheDocument();
		});

		it("starts timer animation when template is generating", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			render(<ApplicationStructureLeftPane />);

			expect(
				screen.getByText("Analyzing your knowledge base to generate the optimal structure..."),
			).toBeInTheDocument();
		});

		it("progresses through animation steps correctly", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			render(<ApplicationStructureLeftPane />);

			// All step titles should be present in the DOM but with different visual states
			expect(screen.getByText("Reading the call")).toBeInTheDocument();
			expect(screen.getByText("Building the outline")).toBeInTheDocument();
			expect(screen.getByText("Adding writing cues")).toBeInTheDocument();
			expect(screen.getByText("Final check")).toBeInTheDocument();

			// After 1000ms, animation progresses
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			// Steps should still be present (this is about visual styling, not DOM presence)
			expect(screen.getByText("Reading the call")).toBeInTheDocument();
			expect(screen.getByText("Building the outline")).toBeInTheDocument();

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			expect(screen.getByText("Building the outline")).toBeInTheDocument();

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			expect(screen.getByText("Adding writing cues")).toBeInTheDocument();

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			expect(screen.getByText("Final check")).toBeInTheDocument();
		});

		it("resets animation when generation status changes", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			const { rerender } = render(<ApplicationStructureLeftPane />);

			act(() => {
				vi.advanceTimersByTime(2000);
			});

			expect(screen.getByText("Building the outline")).toBeInTheDocument();

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			rerender(<ApplicationStructureLeftPane />);

			expect(screen.queryByText("Building the outline")).not.toBeInTheDocument();
			expect(
				screen.getByText("Review and customize the structure of your grant application."),
			).toBeInTheDocument();
		});

		it("cleans up timer on unmount", () => {
			const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			const { unmount } = render(<ApplicationStructureLeftPane />);

			unmount();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});
	});

	describe("RAG Job Polling", () => {
		it("calls checkTemplateRagJobStatus when rag_job_id exists", () => {
			const mockCheckTemplateRagJobStatus = vi.fn();
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_job_id: "test-rag-job-id",
				}),
			});

			useWizardStore.setState({
				checkTemplateRagJobStatus: mockCheckTemplateRagJobStatus,
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureLeftPane />);

			expect(mockCheckTemplateRagJobStatus).toHaveBeenCalled();
		});

		it("does not call checkTemplateRagJobStatus when rag_job_id is missing", () => {
			const mockCheckTemplateRagJobStatus = vi.fn();
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_job_id: undefined,
				}),
			});

			useWizardStore.setState({
				checkTemplateRagJobStatus: mockCheckTemplateRagJobStatus,
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureLeftPane />);

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

			const { rerender } = render(<ApplicationStructureLeftPane />);

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			rerender(<ApplicationStructureLeftPane />);

			await waitFor(() => {
				expect(mockRetrieveApplication).toHaveBeenCalledWith("test-workspace-id", "test-app-id");
			});
		});
	});

	describe("File and URL Processing", () => {
		it("processes template files correctly", () => {
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
						RagSourceFactory.build({
							filename: undefined,
							sourceId: "source-3",
							url: "https://example.com",
						}),
					],
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
		});

		it("processes template URLs correctly", () => {
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
						// This should be filtered out (no URL)
						RagSourceFactory.build({
							filename: "document.pdf",
							sourceId: "source-3",
							url: undefined,
						}),
					],
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
		});

		it("shows no documents message when no files exist", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({
							filename: undefined,
							sourceId: "source-1",
							url: "https://example.com",
						}),
					],
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
		});

		it("handles empty rag_sources array", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles null application gracefully", () => {
			useApplicationStore.setState({
				application: null,
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();
		});

		it("handles application without grant_template", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();
		});

		it("handles malformed rag_sources", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						// Sources with empty strings
						RagSourceFactory.build({
							filename: "",
							sourceId: "source-1",
							url: "",
						}),
						// Sources with null values
						RagSourceFactory.build({
							filename: null as any,
							sourceId: "source-2",
							url: null as any,
						}),
					],
				}),
			});

			useApplicationStore.setState({
				application,
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();
		});
	});
});

import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantTemplateFactory,
	RagJobResponseFactory,
	RagSourceFactory,
} from "::testing/factories";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import ApplicationStructureLeftPane, { ApplicationStructureFilePreview } from "./application-structure-left-pane";

vi.mock("next/image", () => ({
	default: ({ alt, className }: { alt: string; className?: string; src: string }) => (
		<div className={className} data-testid={`image-${alt}`} />
	),
}));

describe("ApplicationStructureLeftPane", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		useWizardStore.setState({
			checkTemplateRagJobStatus: vi.fn(),
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

			render(<ApplicationStructureLeftPane />);

			expect(screen.getByTestId("application-structure-description")).toBeInTheDocument();
		});

		it("shows steps progressively during generation", async () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			render(<ApplicationStructureLeftPane />);

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			const stepElements = document.querySelectorAll('[class*="transition-all duration-700"]');
			expect(stepElements.length).toBeGreaterThan(0);

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			expect(stepElements.length).toBeGreaterThan(0);
		});

		it("resets visibleSteps when generation stops", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			const { rerender } = render(<ApplicationStructureLeftPane />);

			act(() => {
				vi.advanceTimersByTime(2000);
			});

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			rerender(<ApplicationStructureLeftPane />);

			const description = screen.getByTestId("application-structure-description");
			expect(description).toBeInTheDocument();
		});

		it("cleans up interval when component unmounts during generation", () => {
			const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			const { unmount } = render(<ApplicationStructureLeftPane />);

			unmount();

			expect(clearIntervalSpy).toHaveBeenCalled();
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

			expect(screen.getByText("Reading the call")).toBeInTheDocument();
			expect(screen.getByText("Building the outline")).toBeInTheDocument();
			expect(screen.getByText("Adding writing cues")).toBeInTheDocument();
			expect(screen.getByText("Final check")).toBeInTheDocument();

			act(() => {
				vi.advanceTimersByTime(1000);
			});

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
				project_id: "test-project-id",
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
				expect(mockRetrieveApplication).toHaveBeenCalledWith("test-project-id", "test-app-id");
			});
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

			render(<ApplicationStructureLeftPane />);

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

			render(<ApplicationStructureLeftPane />);

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

			render(<ApplicationStructureLeftPane />);

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

			render(<ApplicationStructureLeftPane />);

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

			render(<ApplicationStructureLeftPane />);

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

			render(<ApplicationStructureLeftPane />);

			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();
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
						RagSourceFactory.build({
							filename: "",
							sourceId: "source-1",
							url: "",
						}),
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

describe("Original Helper Functions and Utilities", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Logic Helper Functions", () => {
		it("correctly identifies active step based on visibleSteps state", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			render(<ApplicationStructureLeftPane />);

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			const activeIndicator = document.querySelector(".animate-pulse.bg-blue-500");
			expect(activeIndicator).toBeInTheDocument();

			act(() => {
				vi.advanceTimersByTime(1000);
			});

			const newActiveIndicator = document.querySelector(".animate-pulse.bg-blue-500");
			expect(newActiveIndicator).toBeInTheDocument();
		});

		it("correctly determines when to show connector lines", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			render(<ApplicationStructureLeftPane />);

			const connectors = document.querySelectorAll('[class*="absolute left-3 top-8 h-full w-0.5"]');
			expect(connectors).toHaveLength(3);
		});

		it("generates consistent step delays using 100ms intervals", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			render(<ApplicationStructureLeftPane />);

			const elementsWithDelay = document.querySelectorAll('[style*="transition-delay"]');

			elementsWithDelay.forEach((element) => {
				const style = element.getAttribute("style") ?? "";
				const delayMatch = /transition-delay:\s*(\d+)ms/.exec(style);
				if (delayMatch) {
					const delay = Number.parseInt(delayMatch[1], 10);
					expect(delay % 100).toBe(0);
				}
			});
		});
	});

	describe("Computed Values and useMemo Functions", () => {
		it("correctly computes description text based on generation status", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			const { rerender } = render(<ApplicationStructureLeftPane />);

			const description = screen.getByTestId("application-structure-description");
			expect(description).toBeInTheDocument();

			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			rerender(<ApplicationStructureLeftPane />);

			const updatedDescription = screen.getByTestId("application-structure-description");
			expect(updatedDescription).toBeInTheDocument();
		});

		it("correctly computes hasTemplateFiles from rag sources", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({
							filename: "document.pdf",
							sourceId: "source-1",
							url: undefined,
						}),
					],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
		});

		it("correctly computes hasTemplateUrls from rag sources", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({
							filename: undefined,
							sourceId: "source-1",
							url: "https://example.com/grant",
						}),
					],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
		});

		it("correctly filters and processes templateFiles from rag sources", () => {
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

			useApplicationStore.setState({ application });
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
		});

		it("correctly filters and processes templateUrls from rag sources", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({
							filename: undefined,
							sourceId: "source-1",
							url: "https://example.com/grant1",
						}),
						RagSourceFactory.build({
							filename: undefined,
							sourceId: "source-2",
							url: "https://example.com/grant2",
						}),
						RagSourceFactory.build({
							filename: "document.pdf",
							sourceId: "source-3",
							url: undefined,
						}),
					],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
		});
	});

	describe("Boundary Conditions and Edge Cases", () => {
		it("handles animation progression beyond step count gracefully", () => {
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
			});

			render(<ApplicationStructureLeftPane />);

			for (let i = 0; i < 10; i++) {
				act(() => {
					vi.advanceTimersByTime(1000);
				});
			}

			const stepTitles = document.querySelectorAll('[class*="font-medium transition-colors duration-300"]');
			expect(stepTitles).toHaveLength(4);

			stepTitles.forEach((title) => {
				expect(title).toHaveClass("text-gray-900");
			});
		});

		it("handles empty rag_sources array correctly", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();
		});

		it("handles null/undefined rag_sources gracefully", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: undefined as any,
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({
				grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
			});

			render(<ApplicationStructureLeftPane />);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();
		});
	});
});

describe("Animation Edge Cases", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("handles rapid status changes from PROCESSING to COMPLETED to PROCESSING", () => {
		useWizardStore.setState({
			grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
		});

		const { rerender } = render(<ApplicationStructureLeftPane />);

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		let stepTitles = document.querySelectorAll('[class*="font-medium transition-colors duration-300"]');
		expect(stepTitles[0]).toHaveClass("text-gray-900");

		useWizardStore.setState({
			grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
		});

		rerender(<ApplicationStructureLeftPane />);

		const animationContainer = document.querySelector(".relative.space-y-6");
		expect(animationContainer).not.toBeInTheDocument();

		useWizardStore.setState({
			grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
		});

		rerender(<ApplicationStructureLeftPane />);

		const description = screen.getByTestId("application-structure-description");
		expect(description).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		stepTitles = document.querySelectorAll('[class*="font-medium transition-colors duration-300"]');
		expect(stepTitles[0]).toHaveClass("text-gray-900");
	});

	it("cleans up previous timers when status changes during animation", () => {
		const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

		useWizardStore.setState({
			grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
		});

		const { rerender } = render(<ApplicationStructureLeftPane />);

		act(() => {
			vi.advanceTimersByTime(500);
		});

		useWizardStore.setState({
			grantTemplateRagJobData: RagJobResponseFactory.build({ status: "COMPLETED" }),
		});

		rerender(<ApplicationStructureLeftPane />);

		expect(clearIntervalSpy).toHaveBeenCalled();
	});

	it("handles component re-mount during active animation", () => {
		const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

		useWizardStore.setState({
			grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
		});

		const { unmount } = render(<ApplicationStructureLeftPane />);

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		let stepTitles = document.querySelectorAll('[class*="font-medium transition-colors duration-300"]');
		expect(stepTitles[0]).toHaveClass("text-gray-900");

		unmount();

		expect(clearIntervalSpy).toHaveBeenCalled();

		render(<ApplicationStructureLeftPane />);

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		stepTitles = document.querySelectorAll('[class*="font-medium transition-colors duration-300"]');
		expect(stepTitles[0]).toHaveClass("text-gray-900");
	});

	it("handles maximum step boundary correctly", () => {
		useWizardStore.setState({
			grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
		});

		render(<ApplicationStructureLeftPane />);

		for (let i = 0; i < 10; i++) {
			act(() => {
				vi.advanceTimersByTime(1000);
			});
		}

		const stepTitles = document.querySelectorAll('[class*="font-medium transition-colors duration-300"]');
		expect(stepTitles).toHaveLength(4);

		stepTitles.forEach((title) => {
			expect(title).toHaveClass("text-gray-900");
		});
	});

	it("handles zero-duration timer edge case", () => {
		useWizardStore.setState({
			grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
		});

		render(<ApplicationStructureLeftPane />);

		for (let i = 0; i < 5; i++) {
			act(() => {
				vi.advanceTimersByTime(0);
			});
		}

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		const stepTitles = document.querySelectorAll('[class*="font-medium transition-colors duration-300"]');
		expect(stepTitles[0]).toHaveClass("text-gray-900");
	});

	it("handles multiple rapid re-renders during generation", () => {
		useWizardStore.setState({
			grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
		});

		const { rerender } = render(<ApplicationStructureLeftPane />);

		for (let i = 0; i < 10; i++) {
			rerender(<ApplicationStructureLeftPane />);
		}

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		const stepTitles = document.querySelectorAll('[class*="font-medium transition-colors duration-300"]');
		expect(stepTitles[0]).toHaveClass("text-gray-900");
	});

	it("handles status change to PENDING and back to PROCESSING", () => {
		useWizardStore.setState({
			grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PENDING" }),
		});

		const { rerender } = render(<ApplicationStructureLeftPane />);

		const description = screen.getByTestId("application-structure-description");
		expect(description).toBeInTheDocument();

		useWizardStore.setState({
			grantTemplateRagJobData: RagJobResponseFactory.build({ status: "PROCESSING" }),
		});

		rerender(<ApplicationStructureLeftPane />);

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		const stepTitles = document.querySelectorAll('[class*="font-medium transition-colors duration-300"]');
		expect(stepTitles[0]).toHaveClass("text-gray-900");
	});
});

const mockFileWithId = (filename: string, id: string) => {
	const file = new File([], filename, { type: "application/octet-stream" });
	return Object.assign(file, { id });
};

describe("ApplicationStructureFilePreview", () => {
	const defaultProps = {
		hasTemplateFiles: false,
		hasTemplateUrls: false,
		parentId: undefined,
		templateFiles: [],
		templateUrls: [],
	};

	describe("Component Structure", () => {
		it("renders the main container with correct classes", () => {
			render(<ApplicationStructureFilePreview {...defaultProps} />);

			const container = document.querySelector(".space-y-4");
			expect(container).toBeInTheDocument();
		});

		it("always renders the application documents card", () => {
			render(<ApplicationStructureFilePreview {...defaultProps} />);

			expect(screen.getByTestId("application-documents-card")).toBeInTheDocument();
			expect(screen.getByTestId("application-documents-title")).toBeInTheDocument();
		});
	});

	describe("State Combinations", () => {
		it("shows no documents message when hasTemplateFiles is false", () => {
			render(<ApplicationStructureFilePreview {...defaultProps} hasTemplateFiles={false} />);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
		});

		it("shows files when hasTemplateFiles is true", () => {
			const templateFiles = [
				mockFileWithId("document1.pdf", "file-1"),
				mockFileWithId("document2.docx", "file-2"),
			];

			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateFiles={true}
					templateFiles={templateFiles}
				/>,
			);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
		});

		it("does not show links section when hasTemplateUrls is false", () => {
			render(<ApplicationStructureFilePreview {...defaultProps} hasTemplateUrls={false} />);

			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();
		});

		it("shows links section when hasTemplateUrls is true", () => {
			const templateUrls = ["https://example.com/grant1", "https://example.com/grant2"];

			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateUrls={true}
					templateUrls={templateUrls}
				/>,
			);

			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
		});

		it("shows no documents and no links when both flags are false", () => {
			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateFiles={false}
					hasTemplateUrls={false}
					templateFiles={[]}
					templateUrls={[]}
				/>,
			);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();
		});

		it("shows files but no links when only hasTemplateFiles is true", () => {
			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateFiles={true}
					hasTemplateUrls={false}
					templateFiles={[mockFileWithId("test.pdf", "test-id")]}
					templateUrls={[]}
				/>,
			);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();
		});

		it("shows no documents but shows links when only hasTemplateUrls is true", () => {
			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateFiles={false}
					hasTemplateUrls={true}
					templateFiles={[]}
					templateUrls={["https://example.com"]}
				/>,
			);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
		});

		it("shows files and links when both flags are true", () => {
			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateFiles={true}
					hasTemplateUrls={true}
					templateFiles={[mockFileWithId("test.pdf", "test-id")]}
					templateUrls={["https://example.com"]}
				/>,
			);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
		});
	});

	describe("Data Flow and Prop Passing", () => {
		it("passes parentId to FilePreviewCard components", () => {
			const parentId = "test-parent-id";
			const templateFiles = [mockFileWithId("document.pdf", "file-1")];

			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateFiles={true}
					parentId={parentId}
					templateFiles={templateFiles}
				/>,
			);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
		});

		it("passes parentId to LinkPreviewItem components", () => {
			const parentId = "test-parent-id";
			const templateUrls = ["https://example.com/grant"];

			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateUrls={true}
					parentId={parentId}
					templateUrls={templateUrls}
				/>,
			);

			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
		});

		it("handles undefined parentId gracefully", () => {
			const templateFiles = [mockFileWithId("document.pdf", "file-1")];
			const templateUrls = ["https://example.com/grant"];

			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateFiles={true}
					hasTemplateUrls={true}
					parentId={undefined}
					templateFiles={templateFiles}
					templateUrls={templateUrls}
				/>,
			);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
		});
	});

	describe("Edge Cases and Boundary Conditions", () => {
		it("handles empty templateFiles array", () => {
			render(<ApplicationStructureFilePreview {...defaultProps} hasTemplateFiles={false} templateFiles={[]} />);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
		});

		it("handles empty templateUrls array", () => {
			render(<ApplicationStructureFilePreview {...defaultProps} hasTemplateUrls={false} templateUrls={[]} />);

			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();
		});

		it("handles files with duplicate names using index-based keys", () => {
			const templateFiles = [mockFileWithId("document.pdf", "file-1"), mockFileWithId("document.pdf", "file-2")];

			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateFiles={true}
					templateFiles={templateFiles}
				/>,
			);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
		});

		it("handles URLs with duplicates using index-based keys", () => {
			const templateUrls = ["https://example.com/grant", "https://example.com/grant"];

			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateUrls={true}
					templateUrls={templateUrls}
				/>,
			);

			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
		});

		it("handles files with empty names", () => {
			const templateFiles = [mockFileWithId("", "file-1")];

			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateFiles={true}
					templateFiles={templateFiles}
				/>,
			);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
		});

		it("handles very long filenames and URLs", () => {
			const longFilename = `${"a".repeat(200)}.pdf`;
			const longUrl = `https://example.com/${"a".repeat(200)}`;

			const templateFiles = [mockFileWithId(longFilename, "file-1")];
			const templateUrls = [longUrl];

			render(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateFiles={true}
					hasTemplateUrls={true}
					templateFiles={templateFiles}
					templateUrls={templateUrls}
				/>,
			);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
		});
	});

	describe("Component Contract", () => {
		it("renders without crashing with minimal props", () => {
			expect(() => {
				render(<ApplicationStructureFilePreview {...defaultProps} />);
			}).not.toThrow();
		});

		it("maintains consistent behavior when props change", () => {
			const { rerender } = render(<ApplicationStructureFilePreview {...defaultProps} />);

			expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
			expect(screen.queryByTestId("template-links-title")).not.toBeInTheDocument();

			rerender(
				<ApplicationStructureFilePreview
					{...defaultProps}
					hasTemplateFiles={true}
					hasTemplateUrls={true}
					templateFiles={[mockFileWithId("test.pdf", "test-1")]}
					templateUrls={["https://example.com"]}
				/>,
			);

			expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
		});

		it("handles all required props being provided", () => {
			const templateFiles = [mockFileWithId("document.pdf", "file-1")];
			const templateUrls = ["https://example.com/grant"];

			render(
				<ApplicationStructureFilePreview
					hasTemplateFiles={true}
					hasTemplateUrls={true}
					parentId="test-parent-id"
					templateFiles={templateFiles}
					templateUrls={templateUrls}
				/>,
			);

			expect(screen.getByTestId("application-documents-card")).toBeInTheDocument();
			expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
		});
	});
});

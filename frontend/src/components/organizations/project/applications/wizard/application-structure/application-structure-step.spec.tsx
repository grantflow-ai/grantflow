import { ApplicationWithTemplateFactory, GrantSectionDetailedFactory, GrantTemplateFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { ApplicationStructureStep } from "./application-structure-step";

vi.mock("./application-structure-left-pane", () => ({
	ApplicationStructureLeftPane: () => <div data-testid="application-structure-left-pane-content">Left Pane</div>,
}));

vi.mock("./drag-drop-section-manager", () => ({
	DragDropSectionManager: () => <div data-testid="application-structure-sections">Section Manager</div>,
}));

vi.mock("next/image", () => ({
	default: ({ alt }: { alt: string }) => <div data-testid={`image-${alt}`} />,
}));

vi.mock("@/hooks/use-wait-for-sources-ready", () => ({
	useWaitForSourcesReady: () => ({
		isWaiting: false,
		waitForSources: vi.fn().mockResolvedValue(undefined),
	}),
}));

describe("ApplicationStructureStep", () => {
	const mockDialogRef = { current: null };

	beforeEach(() => {
		vi.clearAllMocks();

		useWizardStore.setState({
			isGeneratingTemplate: false,
		});

		useApplicationStore.setState({
			application: null,
			areAppOperationsInProgress: false,
			updateGrantSections: vi.fn(),
		});
	});

	it("renders both left pane and preview sections", () => {
		render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

		expect(screen.getByTestId("application-structure-left-pane-content")).toBeInTheDocument();
		expect(screen.getByTestId("application-structure-step")).toBeInTheDocument();
	});

	it("shows empty state when no application", () => {
		render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

		expect(screen.getByTestId("application-structure-left-pane-content")).toBeInTheDocument();
		expect(screen.getByTestId("application-structure-step")).toBeInTheDocument();
	});

	it("shows generating loader when template is generating", () => {
		const application = ApplicationWithTemplateFactory.build();
		useApplicationStore.setState({ application });
		useWizardStore.setState({ isGeneratingTemplate: true });

		render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

		expect(screen.getByTestId("image-Analyzing data")).toBeInTheDocument();
	});

	it("shows section editor when application exists and not generating", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				grant_sections: [
					GrantSectionDetailedFactory.build({
						id: "section-1",
						order: 0,
						parent_id: null,
						title: "Test Section",
					}),
				],
			}),
		});

		useApplicationStore.setState({ application });
		useWizardStore.setState({ isGeneratingTemplate: false });

		render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

		expect(screen.getByTestId("application-structure-sections")).toBeInTheDocument();
	});

	describe("Template Generation Triggers", () => {
		const mockDialogRef = {
			current: {
				close: vi.fn(),
				open: vi.fn(),
			},
		};

		beforeEach(() => {
			vi.clearAllMocks();
			useWizardStore.setState({
				isGeneratingTemplate: false,
				shouldTriggerTemplateGeneration: vi.fn(() => true),
				startTemplateGeneration: vi.fn().mockResolvedValue(undefined),
				templateGenerationFailed: false,
			});
		});

		it("triggers generation when all RAG sources are FINISHED", async () => {
			const startTemplateGeneration = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					rag_sources: [
						{ filename: "file1.pdf", sourceId: "1", status: "FINISHED" },
						{ filename: "file2.pdf", sourceId: "2", status: "FINISHED" },
					],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({ startTemplateGeneration });

			render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

			await vi.waitFor(() => {
				expect(startTemplateGeneration).toHaveBeenCalledOnce();
			});
		});

		it("does not trigger generation when RAG sources are INDEXING", () => {
			const startTemplateGeneration = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					rag_sources: [
						{ filename: "file1.pdf", sourceId: "1", status: "FINISHED" },
						{ filename: "file2.pdf", sourceId: "2", status: "INDEXING" },
					],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({ startTemplateGeneration });

			render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

			expect(startTemplateGeneration).not.toHaveBeenCalled();
		});

		it("does not trigger generation when isGeneratingTemplate is true", () => {
			const startTemplateGeneration = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					rag_sources: [{ filename: "file1.pdf", sourceId: "1", status: "FINISHED" }],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({
				isGeneratingTemplate: true,
				startTemplateGeneration,
			});

			render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

			expect(startTemplateGeneration).not.toHaveBeenCalled();
		});

		it("does not trigger generation when templateGenerationFailed is true", () => {
			const startTemplateGeneration = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					rag_sources: [{ filename: "file1.pdf", sourceId: "1", status: "FINISHED" }],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({
				startTemplateGeneration,
				templateGenerationFailed: true,
			});

			render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

			expect(startTemplateGeneration).not.toHaveBeenCalled();
		});

		it("does not trigger generation when shouldTriggerTemplateGeneration returns false", () => {
			const startTemplateGeneration = vi.fn().mockResolvedValue(undefined);
			const shouldTriggerTemplateGeneration = vi.fn(() => false);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					rag_sources: [{ filename: "file1.pdf", sourceId: "1", status: "FINISHED" }],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({
				shouldTriggerTemplateGeneration,
				startTemplateGeneration,
			});

			render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

			expect(shouldTriggerTemplateGeneration).toHaveBeenCalled();
			expect(startTemplateGeneration).not.toHaveBeenCalled();
		});

		it("triggers generation when no sources are INDEXING and no FAILED sources exist", async () => {
			const startTemplateGeneration = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					rag_sources: [
						{ filename: "file1.pdf", sourceId: "1", status: "FINISHED" },
						{ filename: "file2.pdf", sourceId: "2", status: "CREATED" },
					],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({ startTemplateGeneration });

			render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

			await vi.waitFor(() => {
				expect(startTemplateGeneration).toHaveBeenCalledOnce();
			});
		});

		it("does not trigger generation when RAG sources are empty", () => {
			const startTemplateGeneration = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({ startTemplateGeneration });

			render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

			expect(startTemplateGeneration).not.toHaveBeenCalled();
		});

		it("opens dialog when FAILED sources exist and no grant sections", () => {
			const startTemplateGeneration = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					rag_sources: [
						{ filename: "file1.pdf", sourceId: "1", status: "FINISHED" },
						{ filename: "file2.pdf", sourceId: "2", status: "FAILED" },
					],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({ startTemplateGeneration });

			render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

			expect(mockDialogRef.current.open).toHaveBeenCalledOnce();
			expect(startTemplateGeneration).not.toHaveBeenCalled();
		});

		it("does not open dialog when FAILED sources exist but grant sections already exist", () => {
			const startTemplateGeneration = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [
						GrantSectionDetailedFactory.build({
							id: "section-1",
							order: 0,
							parent_id: null,
							title: "Section 1",
						}),
					],
					rag_sources: [
						{ filename: "file1.pdf", sourceId: "1", status: "FINISHED" },
						{ filename: "file2.pdf", sourceId: "2", status: "FAILED" },
					],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({ startTemplateGeneration });

			render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

			expect(mockDialogRef.current.open).not.toHaveBeenCalled();
			expect(startTemplateGeneration).not.toHaveBeenCalled();
		});

		it("triggers generation when all sources are FINISHED even with mix of file and URL sources", async () => {
			const startTemplateGeneration = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					rag_sources: [
						{ filename: "file1.pdf", sourceId: "1", status: "FINISHED" },
						{ sourceId: "2", status: "FINISHED", url: "https://example.com" },
					],
				}),
			});

			useApplicationStore.setState({ application });
			useWizardStore.setState({ startTemplateGeneration });

			render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

			await vi.waitFor(() => {
				expect(startTemplateGeneration).toHaveBeenCalledOnce();
			});
		});
	});
});

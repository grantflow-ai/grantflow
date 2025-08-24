import { ApplicationWithTemplateFactory, GrantTemplateFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore, useWizardStore } from "@/stores";
import { ApplicationStructureStep } from "./application-structure-step";

vi.mock("./application-structure-left-pane", () => ({
	ApplicationStructureLeftPane: () => <div data-testid="application-structure-left-pane-content">Left Pane</div>,
}));

vi.mock("./drag-drop-section-manager", () => ({
	DragDropSectionManager: () => <div data-testid="drag-drop-section-manager">Section Manager</div>,
}));

vi.mock("next/image", () => ({
	default: ({ alt }: { alt: string }) => <div data-testid={`image-${alt}`} />,
}));

describe("ApplicationStructureStep", () => {
	const mockDialogRef = { current: null };

	beforeEach(() => {
		vi.clearAllMocks();

		useWizardStore.setState({
			checkTemplateGeneration: vi.fn(),
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
					{
						id: "section-1",
						order: 0,
						parent_id: null,
						title: "Test Section",
					},
				],
			}),
		});

		useApplicationStore.setState({ application });
		useWizardStore.setState({ isGeneratingTemplate: false });

		render(<ApplicationStructureStep dialogRef={mockDialogRef} />);

		expect(screen.getByTestId("application-structure-sections")).toBeInTheDocument();
		expect(screen.getByTestId("add-new-section-button")).toBeInTheDocument();
	});
});

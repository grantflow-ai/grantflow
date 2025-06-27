import { ApplicationWithTemplateFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ApplicationStructureFilePreview, ApplicationStructureLeftPane } from "./application-structure-left-pane";

vi.mock("next/image", () => ({
	default: ({ alt, className }: { alt: string; className?: string; src: string }) => (
		<div className={className} data-testid={`image-${alt}`} />
	),
}));

describe("ApplicationStructureLeftPane", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

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
			ragJobState: {
				isRestoring: false,
				restoredJob: null,
			},
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders generating state when isGeneratingTemplate is true", () => {
		useWizardStore.setState({
			isGeneratingTemplate: true,
		});

		render(<ApplicationStructureLeftPane />);

		expect(
			screen.getByText("Analyzing your knowledge base to generate the optimal structure..."),
		).toBeInTheDocument();
	});

	it("renders normal state when not generating", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [],
			}),
		});

		useApplicationStore.setState({ application });

		render(<ApplicationStructureLeftPane />);

		expect(screen.getByText("Review and customize the structure of your grant application.")).toBeInTheDocument();
	});

	it("shows files when template has file sources", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						url: undefined,
					}),
				],
			}),
		});

		useApplicationStore.setState({ application });

		render(<ApplicationStructureLeftPane />);

		expect(screen.queryByTestId("no-documents-message")).not.toBeInTheDocument();
	});

	it("shows URLs when template has URL sources", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				rag_sources: [
					RagSourceFactory.build({
						filename: undefined,
						url: "https://example.com/grant",
					}),
				],
			}),
		});

		useApplicationStore.setState({ application });

		render(<ApplicationStructureLeftPane />);

		expect(screen.getByTestId("template-links-title")).toBeInTheDocument();
	});

	it("starts animation steps when generating", () => {
		useWizardStore.setState({
			isGeneratingTemplate: true,
		});

		render(<ApplicationStructureLeftPane />);

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(screen.getByText("Reading the call")).toBeInTheDocument();
	});
});

describe("ApplicationStructureFilePreview", () => {
	it("renders file preview correctly", () => {
		const templateFiles = [Object.assign(new File([], "test.pdf"), { id: "file-1" })];

		render(
			<ApplicationStructureFilePreview
				hasTemplateFiles={true}
				hasTemplateUrls={false}
				parentId="template-id"
				templateFiles={templateFiles}
				templateUrls={[]}
			/>,
		);

		expect(screen.getByTestId("application-documents-title")).toBeInTheDocument();
	});

	it("shows no documents message when no files", () => {
		render(
			<ApplicationStructureFilePreview
				hasTemplateFiles={false}
				hasTemplateUrls={false}
				parentId="template-id"
				templateFiles={[]}
				templateUrls={[]}
			/>,
		);

		expect(screen.getByTestId("no-documents-message")).toBeInTheDocument();
	});
});

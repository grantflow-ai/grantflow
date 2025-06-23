import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantTemplateFactory,
	RagSourceFactory,
} from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { ApplicationPreview } from "./application-preview";

describe("ApplicationPreview", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
		});

		useApplicationStore.setState({
			application: null,
			areAppOperationsInProgress: false,
		});
	});

	it("renders empty state when no content", () => {
		render(<ApplicationPreview />);

		expect(screen.queryByTestId("application-title")).not.toBeInTheDocument();
		expect(screen.queryByTestId("application-documents")).not.toBeInTheDocument();
		expect(screen.queryByTestId("application-links")).not.toBeInTheDocument();
	});

	it("renders application title", () => {
		const application = ApplicationFactory.build({
			id: "test-id",
			title: "Test Application",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		render(<ApplicationPreview />);

		expect(screen.getByTestId("application-title")).toBeInTheDocument();
		expect(screen.getByTestId("application-title")).toHaveTextContent("Test Application");
	});

	it("renders untitled when no title", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				id: "template-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "source-1",
						status: "FINISHED",
					}),
				],
			}),
			id: "test-id",
			title: undefined,
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		render(<ApplicationPreview />);

		expect(screen.getByTestId("application-title")).toHaveTextContent("Untitled Application");
	});

	it("renders uploaded files", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				id: "template-id",
				rag_sources: [
					RagSourceFactory.build({
						filename: "test.pdf",
						sourceId: "source-1",
						status: "FINISHED",
					}),
				],
			}),
			id: "test-id",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		render(<ApplicationPreview />);

		expect(screen.getByTestId("application-documents")).toBeInTheDocument();
		expect(screen.getByTestId("file-collection")).toBeInTheDocument();
	});

	it("renders URLs", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				id: "template-id",
				rag_sources: [
					RagSourceFactory.build({
						sourceId: "source-1",
						status: "FINISHED",
						url: "https://example.com",
					}),
				],
			}),
			id: "test-id",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		render(<ApplicationPreview />);

		expect(screen.getByTestId("application-links")).toBeInTheDocument();
	});
});

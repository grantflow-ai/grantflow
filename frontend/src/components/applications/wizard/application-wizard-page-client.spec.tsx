import { setupAuthenticatedTest } from "::testing/auth-helpers";
import {
	ApplicationWithTemplateFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
	ProjectFactory,
} from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";

import { ApplicationWizardPageClient } from "./application-wizard-page-client";

const buildRetrieveApplication = (overrides?: Parameters<typeof ApplicationWithTemplateFactory.build>[0]) =>
	ApplicationWithTemplateFactory.build(overrides as any) as unknown as API.RetrieveApplication.Http200.ResponseBody;

vi.mock("@/components/organizations/project/applications/wizard/wizard-client", () => ({
	WizardClientComponent: vi.fn(({ applicationId, organizationId, projectId }) => (
		<div data-testid="wizard-client">
			{applicationId} | {organizationId} | {projectId}
		</div>
	)),
}));

vi.mock("@/utils/logger/client", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe("ApplicationWizardPageClient", () => {
	beforeEach(() => {
		resetAllStores();
		setupAuthenticatedTest();
		vi.clearAllMocks();
	});

	afterEach(() => {
		resetAllStores();
	});

	describe("loading states", () => {
		it("should show loading spinner when no application ID", () => {
			useApplicationStore.setState({ application: null });
			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });
			useProjectStore.setState({
				project: ProjectFactory.build({
					id: "project-123",
					name: "Test Project",
				}),
			});

			render(<ApplicationWizardPageClient />);

			expect(screen.getByText("Loading application...")).toBeInTheDocument();
			expect(screen.getByRole("status")).toBeInTheDocument();
		});

		it("should return null when no project or organization", () => {
			const application = buildRetrieveApplication();
			useApplicationStore.setState({ application });
			useOrganizationStore.setState({ selectedOrganizationId: null });
			useProjectStore.setState({ project: null });

			const { container } = render(<ApplicationWizardPageClient />);

			expect(container.firstChild).toBeNull();
		});
	});

	describe("cleanup effects", () => {
		it("should reset stores on unmount", () => {
			const application = buildRetrieveApplication();
			useApplicationStore.setState({ application });
			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });
			useProjectStore.setState({
				project: ProjectFactory.build({
					id: "project-123",
					name: "Test Project",
				}),
			});

			const { unmount } = render(<ApplicationWizardPageClient />);

			const wizardResetSpy = vi.spyOn(useWizardStore.getState(), "reset");
			const applicationResetSpy = vi.spyOn(useApplicationStore.getState(), "reset");

			unmount();

			expect(wizardResetSpy).toHaveBeenCalled();
			expect(applicationResetSpy).toHaveBeenCalled();
		});
	});

	describe("step determination", () => {
		it("should determine appropriate step based on application state", async () => {
			const application = buildRetrieveApplication({
				form_inputs: {
					background_context: "Some content",
					hypothesis: "Some hypothesis",
					impact: "",
					novelty_and_innovation: "",
					preliminary_data: "",
					rationale: "Some rationale",
					research_feasibility: "",
					scientific_infrastructure: "",
					team_excellence: "",
				},
				grant_template: GrantTemplateFactory.build({
					grant_sections: [
						GrantSectionDetailedFactory.build({
							id: "section-1",
							order: 0,
							parent_id: null,
							title: "Section 1",
						}),
					],
				}),
				id: "app-123",
				rag_sources: [{ filename: "test.pdf", sourceId: "source-1", status: "FINISHED" }],
				research_objectives: [
					{
						description: "Description 1",
						number: 1,
						research_tasks: [{ description: "Task description", number: 1, title: "Task 1" }],
						title: "Objective 1",
					},
				],
				text: "Application has text",
				title: "A Valid Application Title With More Than 10 Chars",
			});

			useApplicationStore.setState({ application });
			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });
			useProjectStore.setState({
				project: ProjectFactory.build({
					id: "project-123",
					name: "Test Project",
				}),
			});

			const wizardSetStateSpy = vi.spyOn(useWizardStore, "setState");

			render(<ApplicationWizardPageClient />);

			await waitFor(() => {
				expect(wizardSetStateSpy).toHaveBeenCalledWith({
					currentStep: WizardStep.GENERATE_AND_COMPLETE,
				});
			});
		});

		it("should fall back to APPLICATION_DETAILS for basic application", async () => {
			const application = buildRetrieveApplication({
				form_inputs: undefined,
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
				id: "app-123",
				rag_sources: [],
				research_objectives: [],
				text: undefined,
			});

			useApplicationStore.setState({ application });
			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });
			useProjectStore.setState({
				project: ProjectFactory.build({
					id: "project-123",
					name: "Test Project",
				}),
			});

			const wizardSetStateSpy = vi.spyOn(useWizardStore, "setState");

			render(<ApplicationWizardPageClient />);

			await waitFor(() => {
				expect(wizardSetStateSpy).toHaveBeenCalledWith({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			});
		});

		it("should not determine step when already set by user", async () => {
			const application = buildRetrieveApplication({
				form_inputs: {
					background_context: "Some content",
					hypothesis: "Some hypothesis",
					impact: "",
					novelty_and_innovation: "",
					preliminary_data: "",
					rationale: "Some rationale",
					research_feasibility: "",
					scientific_infrastructure: "",
					team_excellence: "",
				},
				grant_template: GrantTemplateFactory.build({
					grant_sections: [
						GrantSectionDetailedFactory.build({
							id: "section-1",
							order: 0,
							parent_id: null,
							title: "Section 1",
						}),
					],
				}),
				id: "app-123",
				rag_sources: [{ filename: "test.pdf", sourceId: "source-1", status: "FINISHED" }],
				research_objectives: [
					{
						description: "Description 1",
						number: 1,
						research_tasks: [{ description: "Task description", number: 1, title: "Task 1" }],
						title: "Objective 1",
					},
				],
				text: "Application has text",
				title: "A Valid Application Title With More Than 10 Chars",
			});

			useApplicationStore.setState({ application });
			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });
			useProjectStore.setState({
				project: ProjectFactory.build({
					id: "project-123",
					name: "Test Project",
				}),
			});

			const wizardSetStateSpy = vi.spyOn(useWizardStore, "setState");

			const { rerender } = render(<ApplicationWizardPageClient />);

			await waitFor(() => {
				expect(wizardSetStateSpy).toHaveBeenCalledWith({
					currentStep: WizardStep.GENERATE_AND_COMPLETE,
				});
			});

			wizardSetStateSpy.mockClear();

			rerender(<ApplicationWizardPageClient />);

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(wizardSetStateSpy).not.toHaveBeenCalled();
		});
	});

	describe("store management", () => {
		it("should call reset and softReset when application ID changes", async () => {
			const application1 = buildRetrieveApplication({ id: "app-123" });
			const application2 = buildRetrieveApplication({ id: "app-456" });

			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });
			useProjectStore.setState({
				project: ProjectFactory.build({
					id: "project-123",
					name: "Test Project",
				}),
			});

			const wizardResetSpy = vi.spyOn(useWizardStore.getState(), "reset");
			const applicationSoftResetSpy = vi.spyOn(useApplicationStore.getState(), "softReset");

			useApplicationStore.setState({ application: application1 });
			const { rerender } = render(<ApplicationWizardPageClient />);

			await waitFor(() => {
				expect(wizardResetSpy).toHaveBeenCalled();
				expect(applicationSoftResetSpy).toHaveBeenCalled();
			});

			wizardResetSpy.mockClear();
			applicationSoftResetSpy.mockClear();

			useApplicationStore.setState({ application: application2 });
			rerender(<ApplicationWizardPageClient />);

			await waitFor(() => {
				expect(wizardResetSpy).toHaveBeenCalled();
				expect(applicationSoftResetSpy).toHaveBeenCalled();
			});
		});
	});

	describe("wizard client rendering", () => {
		it("should render WizardClientComponent with correct props", () => {
			const application = buildRetrieveApplication({ id: "app-123" });
			useApplicationStore.setState({ application });
			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });
			useProjectStore.setState({
				project: ProjectFactory.build({
					id: "project-123",
					name: "Test Project",
				}),
			});

			render(<ApplicationWizardPageClient />);

			expect(screen.getByTestId("wizard-client")).toBeInTheDocument();
			expect(screen.getByText("app-123 | org-123 | project-123")).toBeInTheDocument();
		});
	});

	describe("edge cases", () => {
		it("should handle application ID becoming null", () => {
			const application = buildRetrieveApplication();
			useApplicationStore.setState({ application });
			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });
			useProjectStore.setState({
				project: ProjectFactory.build({
					id: "project-123",
					name: "Test Project",
				}),
			});

			const { rerender } = render(<ApplicationWizardPageClient />);

			expect(screen.getByTestId("wizard-client")).toBeInTheDocument();

			useApplicationStore.setState({ application: null });
			rerender(<ApplicationWizardPageClient />);

			expect(screen.getByText("Loading application...")).toBeInTheDocument();
			expect(screen.queryByTestId("wizard-client")).not.toBeInTheDocument();
		});

		it("should handle when no step determination is needed", async () => {
			const application = buildRetrieveApplication({ id: "app-123" });
			useApplicationStore.setState({ application });
			useOrganizationStore.setState({ selectedOrganizationId: "org-123" });
			useProjectStore.setState({
				project: ProjectFactory.build({
					id: "project-123",
					name: "Test Project",
				}),
			});

			render(<ApplicationWizardPageClient />);

			expect(screen.getByTestId("wizard-client")).toBeInTheDocument();
		});
	});
});

import { ApplicationWithTemplateFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { SectionHeaderControls } from "./section-header-controls";

describe("SectionHeaderControls", () => {
	const mockOnAddNewSection = vi.fn();

	beforeEach(() => {
		mockOnAddNewSection.mockClear();
		useApplicationStore.getState().reset();
	});

	it("renders Add New Section button", () => {
		render(<SectionHeaderControls onAddNewSection={mockOnAddNewSection} />);

		expect(screen.getByTestId("add-new-section-button")).toBeInTheDocument();
		expect(screen.getByText("Add New Section")).toBeInTheDocument();
	});

	it("calls onAddNewSection when button is clicked", async () => {
		const user = userEvent.setup();
		render(<SectionHeaderControls onAddNewSection={mockOnAddNewSection} />);

		const addButton = screen.getByTestId("add-new-section-button");
		await user.click(addButton);

		expect(mockOnAddNewSection).toHaveBeenCalledOnce();
	});

	it("shows error banner when no research plan is selected", () => {
		const applicationWithoutResearchPlan = ApplicationWithTemplateFactory.build();
		applicationWithoutResearchPlan.grant_template!.grant_sections = [
			{ id: "1", is_detailed_research_plan: false, order: 0, parent_id: null, title: "Section 1" },
			{ id: "2", is_detailed_research_plan: false, order: 1, parent_id: null, title: "Section 2" },
		] as any;

		useApplicationStore.setState({ application: applicationWithoutResearchPlan });
		render(<SectionHeaderControls onAddNewSection={mockOnAddNewSection} />);

		expect(screen.getByTestId("wizard-banner-error")).toBeInTheDocument();
		expect(screen.getByText("Research Plan is missing.")).toBeInTheDocument();
	});

	it("does not show error banner when research plan is selected", () => {
		const applicationWithResearchPlan = ApplicationWithTemplateFactory.build();
		applicationWithResearchPlan.grant_template!.grant_sections = [
			{ id: "1", is_detailed_research_plan: true, order: 0, parent_id: null, title: "Section 1" },
			{ id: "2", is_detailed_research_plan: false, order: 1, parent_id: null, title: "Section 2" },
		] as any;

		useApplicationStore.setState({ application: applicationWithResearchPlan });
		render(<SectionHeaderControls onAddNewSection={mockOnAddNewSection} />);

		expect(screen.queryByTestId("wizard-banner-error")).not.toBeInTheDocument();
		expect(screen.queryByText("Research Plan is missing.")).not.toBeInTheDocument();
	});

	it("can close error banner", async () => {
		const user = userEvent.setup();
		const applicationWithoutResearchPlan = ApplicationWithTemplateFactory.build();
		applicationWithoutResearchPlan.grant_template!.grant_sections = [
			{ id: "1", is_detailed_research_plan: false, order: 0, parent_id: null, title: "Section 1" },
		] as any;

		useApplicationStore.setState({ application: applicationWithoutResearchPlan });
		render(<SectionHeaderControls onAddNewSection={mockOnAddNewSection} />);

		const errorBanner = screen.getByTestId("wizard-banner-error");
		expect(errorBanner).toBeInTheDocument();

		const closeButton = screen.getByRole("button", { name: "Close" });
		await user.click(closeButton);

		expect(screen.queryByTestId("wizard-banner-error")).not.toBeInTheDocument();
	});

	it("updates error banner visibility when sections change", () => {
		const { rerender } = render(<SectionHeaderControls onAddNewSection={mockOnAddNewSection} />);

		// Initially no sections, so no error banner
		expect(screen.queryByTestId("wizard-banner-error")).not.toBeInTheDocument();

		// Add sections without research plan
		const applicationWithoutResearchPlan = ApplicationWithTemplateFactory.build();
		applicationWithoutResearchPlan.grant_template!.grant_sections = [
			{ id: "1", is_detailed_research_plan: false, order: 0, parent_id: null, title: "Section 1" },
		] as any;

		useApplicationStore.setState({ application: applicationWithoutResearchPlan });
		rerender(<SectionHeaderControls onAddNewSection={mockOnAddNewSection} />);

		expect(screen.getByTestId("wizard-banner-error")).toBeInTheDocument();

		// Add research plan
		const applicationWithResearchPlan = ApplicationWithTemplateFactory.build();
		applicationWithResearchPlan.grant_template!.grant_sections = [
			{ id: "1", is_detailed_research_plan: true, order: 0, parent_id: null, title: "Section 1" },
		] as any;

		useApplicationStore.setState({ application: applicationWithResearchPlan });
		rerender(<SectionHeaderControls onAddNewSection={mockOnAddNewSection} />);

		expect(screen.queryByTestId("wizard-banner-error")).not.toBeInTheDocument();
	});

	it("handles application without grant template", () => {
		const applicationWithoutTemplate = ApplicationWithTemplateFactory.build();
		(applicationWithoutTemplate as any).grant_template = null;

		useApplicationStore.setState({ application: applicationWithoutTemplate });
		render(<SectionHeaderControls onAddNewSection={mockOnAddNewSection} />);

		// Should not show error banner when there's no template at all
		expect(screen.queryByTestId("wizard-banner-error")).not.toBeInTheDocument();
		expect(screen.getByTestId("add-new-section-button")).toBeInTheDocument();
	});

	it("resets error banner visibility when research plan status changes after dismissal", async () => {
		const user = userEvent.setup();

		// Start with application that has no research plan
		const applicationWithoutResearchPlan = ApplicationWithTemplateFactory.build();
		applicationWithoutResearchPlan.grant_template!.grant_sections = [
			{ id: "1", is_detailed_research_plan: false, order: 0, parent_id: null, title: "Section 1" },
		] as any;

		useApplicationStore.setState({ application: applicationWithoutResearchPlan });
		const { rerender } = render(<SectionHeaderControls onAddNewSection={mockOnAddNewSection} />);

		// Error banner should be visible
		expect(screen.getByTestId("wizard-banner-error")).toBeInTheDocument();

		// Dismiss the banner
		const closeButton = screen.getByRole("button", { name: "Close" });
		await user.click(closeButton);
		expect(screen.queryByTestId("wizard-banner-error")).not.toBeInTheDocument();

		// Add a research plan (should not show error anymore)
		const applicationWithResearchPlan = ApplicationWithTemplateFactory.build();
		applicationWithResearchPlan.grant_template!.grant_sections = [
			{ id: "1", is_detailed_research_plan: true, order: 0, parent_id: null, title: "Research Plan" },
		] as any;

		useApplicationStore.setState({ application: applicationWithResearchPlan });
		rerender(<SectionHeaderControls onAddNewSection={mockOnAddNewSection} />);

		// Should not show error banner when research plan is present
		expect(screen.queryByTestId("wizard-banner-error")).not.toBeInTheDocument();

		// Remove research plan again
		const applicationWithoutResearchPlanAgain = ApplicationWithTemplateFactory.build();
		applicationWithoutResearchPlanAgain.grant_template!.grant_sections = [
			{ id: "1", is_detailed_research_plan: false, order: 0, parent_id: null, title: "Section 1" },
		] as any;

		useApplicationStore.setState({ application: applicationWithoutResearchPlanAgain });
		rerender(<SectionHeaderControls onAddNewSection={mockOnAddNewSection} />);

		// Banner should reappear because research plan is missing again
		expect(screen.getByTestId("wizard-banner-error")).toBeInTheDocument();
	});
});

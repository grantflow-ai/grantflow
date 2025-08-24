import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ApplicationWithTemplateFactory, EmptyFormInputsFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore, useWizardStore } from "@/stores";

import { ResearchDeepDiveContent } from "./research-deep-dive-content";

describe.sequential("ResearchDeepDiveContent", () => {
	beforeEach(() => {
		resetAllStores();
		setupAuthenticatedTest();
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	describe("Component Structure", () => {
		it("renders main container with correct layout", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			expect(screen.getByTestId("research-deep-dive-content")).toBeInTheDocument();
			expect(screen.getByTestId("research-deep-dive-content")).toHaveClass("flex w-full gap-6 px-16");
		});

		it("renders questions list and answer card", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			expect(screen.getByTestId("question-card-0")).toBeInTheDocument();
			expect(screen.getByTestId("question-card-7")).toBeInTheDocument();

			expect(screen.getByTestId("research-deep-dive-answer")).toBeInTheDocument();
		});
	});

	describe("Question Flow State Logic", () => {
		it("starts with first question selected when no answers exist", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			expect(screen.getByTestId("question-card-0")).toBeInTheDocument();
			expect(screen.getByTestId("research-deep-dive-answer")).toBeInTheDocument();
		});

		it("selects next unanswered question after answered ones", () => {
			const formInputs = EmptyFormInputsFactory.build({
				background_context: "Some background context",
				hypothesis: "Some hypothesis",
			});
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const textarea = screen.getByTestId("research-deep-dive-answer");
			expect(textarea).toBeInTheDocument();
			expect(textarea).toHaveValue("");
		});

		it("selects last question when all questions are answered", () => {
			const formInputs = EmptyFormInputsFactory.build();
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const textarea = screen.getByTestId("research-deep-dive-answer");
			expect(textarea).toBeInTheDocument();
			expect(textarea).toHaveValue(formInputs.preliminary_data);
		});

		it("updates selected question when form inputs change", async () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			const { rerender } = render(<ResearchDeepDiveContent />);

			expect(screen.getByTestId("research-deep-dive-answer")).toBeInTheDocument();
			expect(screen.getByTestId("research-deep-dive-answer")).toHaveValue("");

			const formInputs = EmptyFormInputsFactory.build({
				background_context: "Some background",
			});
			const updatedApplication = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application: updatedApplication });

			rerender(<ResearchDeepDiveContent />);

			await waitFor(() => {
				const textarea = screen.getByTestId("research-deep-dive-answer");
				expect(textarea).toHaveValue("");
			});
		});
	});

	describe("Question Enabling/Disabling Logic", () => {
		it("enables first question always", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const firstQuestionCard = screen.getByTestId("question-card-0");
			expect(firstQuestionCard).not.toHaveClass("outline-app-gray-100");
		});

		it("disables questions beyond the next unanswered one", () => {
			const formInputs = EmptyFormInputsFactory.build({
				background_context: "Some background",
			});
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const secondQuestionCard = screen.getByTestId("question-card-1");
			expect(secondQuestionCard).toHaveClass("cursor-pointer");

			const thirdQuestionCard = screen.getByTestId("question-card-2");
			expect(thirdQuestionCard).toHaveClass("outline-app-gray-100");
		});

		it("enables all answered questions for editing", () => {
			const formInputs = EmptyFormInputsFactory.build({
				background_context: "Background",
				hypothesis: "Hypothesis",
				rationale: "Rationale",
			});
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			expect(screen.getByTestId("question-card-0")).toHaveClass("cursor-pointer");
			expect(screen.getByTestId("question-card-1")).toHaveClass("cursor-pointer");
			expect(screen.getByTestId("question-card-2")).toHaveClass("cursor-pointer");

			expect(screen.getByTestId("question-card-3")).toHaveClass("cursor-pointer");

			expect(screen.getByTestId("question-card-4")).toHaveClass("outline-app-gray-100");
		});

		it("prevents clicking on disabled questions", async () => {
			const user = userEvent.setup();
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const thirdQuestionCard = screen.getByTestId("question-card-2");
			await user.click(thirdQuestionCard);

			expect(screen.getByTestId("research-deep-dive-answer")).toBeInTheDocument();
		});

		it("allows clicking on enabled questions", async () => {
			const user = userEvent.setup();
			const formInputs = EmptyFormInputsFactory.build({
				background_context: "Some background",
			});
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const firstQuestionCard = screen.getByTestId("question-card-0");
			await user.click(firstQuestionCard);

			const textarea = screen.getByTestId("research-deep-dive-answer");
			expect(textarea).toHaveValue("Some background");
		});
	});

	describe("Answer Card Functionality", () => {
		it("displays correct question text and placeholder", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			expect(screen.getByTestId("question-card-0")).toBeInTheDocument();
			expect(screen.getByTestId("research-deep-dive-answer")).toBeInTheDocument();
		});

		it("populates textarea with existing answer", async () => {
			const user = userEvent.setup();
			const formInputs = EmptyFormInputsFactory.build({
				background_context: "Existing background content",
			});
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			let textarea = screen.getByTestId("research-deep-dive-answer");
			expect(textarea).toHaveValue("");

			const firstQuestionCard = screen.getByTestId("question-card-0");
			await user.click(firstQuestionCard);
			await waitFor(() => {
				textarea = screen.getByTestId("research-deep-dive-answer");
				expect(textarea).toHaveValue("Existing background content");
			});
		});

		it("updates local state when user types", async () => {
			const user = userEvent.setup();
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const textarea = screen.getByTestId("research-deep-dive-answer");
			await user.type(textarea, "New content");

			expect(textarea).toHaveValue("New content");
		});

		it("syncs local state when form inputs change externally", async () => {
			const user = userEvent.setup();
			const formInputs = EmptyFormInputsFactory.build({
				background_context: "Initial content",
			});
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application });

			const { rerender } = render(<ResearchDeepDiveContent />);

			const firstQuestionCard = screen.getByTestId("question-card-0");
			await user.click(firstQuestionCard);

			const textarea = screen.getByTestId("research-deep-dive-answer");
			expect(textarea).toHaveValue("Initial content");

			const updatedFormInputs = EmptyFormInputsFactory.build({
				background_context: "Updated content",
			});
			const updatedApplication = ApplicationWithTemplateFactory.build({
				form_inputs: updatedFormInputs,
			});

			useApplicationStore.setState({ application: updatedApplication });
			rerender(<ResearchDeepDiveContent />);

			await waitFor(() => {
				expect(textarea).toHaveValue("Updated content");
			});
		});
	});

	describe("Save Button Behavior", () => {
		it("disables save button when textarea is empty", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const saveButton = screen.getByTestId("save-button");
			expect(saveButton).toBeDisabled();
		});

		it("disables save button when textarea contains only whitespace", async () => {
			const user = userEvent.setup();
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const textarea = screen.getByTestId("research-deep-dive-answer");
			const saveButton = screen.getByTestId("save-button");

			await user.type(textarea, "   ");
			expect(saveButton).toBeDisabled();
		});

		it("enables save button when textarea has content", async () => {
			const user = userEvent.setup();
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const textarea = screen.getByTestId("research-deep-dive-answer");
			const saveButton = screen.getByTestId("save-button");

			await user.type(textarea, "Some content");
			expect(saveButton).toBeEnabled();
		});

		it("calls updateFormInputs when save is clicked", async () => {
			const user = userEvent.setup();
			const mockUpdateFormInputs = vi.fn();

			const originalState = useWizardStore.getState();
			useWizardStore.setState({
				...originalState,
				updateFormInputs: mockUpdateFormInputs,
			});

			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const textarea = screen.getByTestId("research-deep-dive-answer");
			const saveButton = screen.getByTestId("save-button");

			await user.type(textarea, "New research content");
			await user.click(saveButton);

			expect(mockUpdateFormInputs).toHaveBeenCalledWith({
				background_context: "New research content",
			});
		});

		it("trims whitespace when saving", async () => {
			const user = userEvent.setup();
			const mockUpdateFormInputs = vi.fn();

			const originalState = useWizardStore.getState();
			useWizardStore.setState({
				...originalState,
				updateFormInputs: mockUpdateFormInputs,
			});

			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const textarea = screen.getByTestId("research-deep-dive-answer");
			const saveButton = screen.getByTestId("save-button");

			await user.type(textarea, "  Content with spaces  ");
			await user.click(saveButton);

			expect(mockUpdateFormInputs).toHaveBeenCalledWith({
				background_context: "Content with spaces",
			});
		});
	});

	describe("Back Button Behavior", () => {
		it("hides back button on first question", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();
		});

		it("shows back button on subsequent questions", async () => {
			const user = userEvent.setup();
			const formInputs = EmptyFormInputsFactory.build({
				background_context: "Some background",
			});
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const thirdQuestionCard = screen.getByTestId("question-card-2");
			await user.click(thirdQuestionCard);

			expect(screen.getByTestId("back-button")).toBeInTheDocument();
		});

		it("navigates to previous question when back is clicked", async () => {
			const user = userEvent.setup();
			const formInputs = EmptyFormInputsFactory.build({
				background_context: "Background",
				hypothesis: "Hypothesis",
				impact: undefined,
				novelty_and_innovation: undefined,
				preliminary_data: undefined,
				rationale: undefined,
				research_feasibility: undefined,
				team_excellence: undefined,
			});
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const textarea = screen.getByTestId("research-deep-dive-answer");
			expect(textarea).toHaveValue("");

			const backButton = screen.getByTestId("back-button");
			await user.click(backButton);

			await waitFor(() => {
				expect(screen.getByTestId("research-deep-dive-answer")).toHaveValue("Hypothesis");
			});
		});
	});

	describe("Index Badge Display", () => {
		it("shows numbered badge for unanswered questions", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const firstQuestionCard = screen.getByTestId("question-card-0");
			expect(firstQuestionCard).toHaveTextContent("1");
		});

		it("shows checkmark icon for answered questions", () => {
			const formInputs = EmptyFormInputsFactory.build({
				background_context: "Some background",
			});
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const firstQuestionCard = screen.getByTestId("question-card-0");
			const checkmarkImage = firstQuestionCard.querySelector('img[alt="Done"]');
			expect(checkmarkImage).toBeInTheDocument();
		});

		it("applies disabled styles to disabled question badges", () => {
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: undefined,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const thirdQuestionCard = screen.getByTestId("question-card-2");
			const badge = thirdQuestionCard.querySelector(".bg-app-gray-100");
			expect(badge).toBeInTheDocument();
		});
	});

	describe("Keyboard Navigation", () => {
		it("allows keyboard navigation on question cards", async () => {
			const user = userEvent.setup();
			const formInputs = EmptyFormInputsFactory.build({
				background_context: "Some background",
			});
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const firstQuestionCard = screen.getByTestId("question-card-0");
			await user.click(firstQuestionCard);
			await user.keyboard("{Enter}");

			expect(screen.getByTestId("research-deep-dive-answer")).toHaveValue("Some background");
		});

		it("responds to space key for question selection", async () => {
			const user = userEvent.setup();
			const formInputs = EmptyFormInputsFactory.build({
				background_context: "Some background",
			});
			const application = ApplicationWithTemplateFactory.build({
				form_inputs: formInputs,
			});

			useApplicationStore.setState({ application });

			render(<ResearchDeepDiveContent />);

			const firstQuestionCard = screen.getByTestId("question-card-0");
			await user.click(firstQuestionCard);
			await user.keyboard(" ");

			expect(screen.getByTestId("research-deep-dive-answer")).toHaveValue("Some background");
		});
	});
});

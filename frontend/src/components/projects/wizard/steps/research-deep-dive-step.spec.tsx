import { ApplicationFactory, FormInputsFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResearchDeepDiveStep } from "@/components/projects";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

describe("ResearchDeepDiveStep", () => {
	const mockUpdateFormInputs = vi.fn();
	const mockTriggerAutofill = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		useApplicationStore.setState({
			application: ApplicationFactory.build({ form_inputs: undefined }),
		});

		const currentWizardState = useWizardStore.getState();
		useWizardStore.setState({
			...currentWizardState,
			isAutofillLoading: { research_deep_dive: false, research_plan: false },
			triggerAutofill: mockTriggerAutofill,
			updateFormInputs: mockUpdateFormInputs,
		});
	});

	it("renders step content", () => {
		render(<ResearchDeepDiveStep />);

		expect(screen.getByTestId("research-deep-dive-step")).toBeInTheDocument();
		expect(screen.getByTestId("research-deep-dive-header")).toBeInTheDocument();
		expect(screen.getByTestId("research-deep-dive-description")).toBeInTheDocument();
		expect(screen.getByTestId("ai-try-button")).toBeInTheDocument();

		expect(screen.getAllByTestId("app-card").length).toBeGreaterThan(0);
	});

	it("displays questions in default state when no form inputs", () => {
		useApplicationStore.setState({
			application: ApplicationFactory.build({ form_inputs: undefined }),
		});

		render(<ResearchDeepDiveStep />);

		expect(screen.getByTestId("question-card-0")).toBeInTheDocument();
		expect(screen.getByTestId("question-card-1")).toBeInTheDocument();
		expect(screen.getByTestId("question-card-2")).toBeInTheDocument();
	});

	it("shows questions as done when form inputs are provided", () => {
		const formInputs = FormInputsFactory.build({
			background_context: "Some context",
			hypothesis: "Some hypothesis",
		});

		useApplicationStore.setState({
			application: ApplicationFactory.build({ form_inputs: formInputs }),
		});

		render(<ResearchDeepDiveStep />);

		expect(screen.getByTestId("question-card-0")).toBeInTheDocument();
		expect(screen.getByTestId("question-card-1")).toBeInTheDocument();
	});

	it("allows user to input answer and save", async () => {
		const user = userEvent.setup();

		useApplicationStore.setState({
			application: ApplicationFactory.build({ form_inputs: undefined }),
		});

		render(<ResearchDeepDiveStep />);

		const textarea = screen.getByTestId("research-deep-dive-answer");
		expect(textarea).toBeInTheDocument();

		await user.type(textarea, "This is my research context");

		const saveButton = screen.getByTestId("save-button");
		expect(saveButton).toBeEnabled();

		await user.click(saveButton);

		expect(mockUpdateFormInputs).toHaveBeenCalledWith({
			background_context: "This is my research context",
		});
	});

	it("disables save button when answer is empty", () => {
		useApplicationStore.setState({
			application: ApplicationFactory.build({ form_inputs: undefined }),
		});

		render(<ResearchDeepDiveStep />);

		const saveButton = screen.getByTestId("save-button");
		expect(saveButton).toBeDisabled();
	});

	it("shows back button only after first question", async () => {
		const user = userEvent.setup();
		const formInputs = FormInputsFactory.build({
			background_context: "Some context",
		});

		useApplicationStore.setState({
			application: ApplicationFactory.build({ form_inputs: formInputs }),
		});

		render(<ResearchDeepDiveStep />);

		expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();

		const secondQuestion = screen.getByTestId("question-card-1");
		await user.click(secondQuestion);

		await waitFor(() => {
			expect(screen.getByTestId("back-button")).toBeInTheDocument();
		});
	});

	it("updates answer when switching between questions", async () => {
		const user = userEvent.setup();
		const formInputs = FormInputsFactory.build({
			background_context: "Background context",
			hypothesis: "Research hypothesis",
		});

		useApplicationStore.setState({
			application: ApplicationFactory.build({ form_inputs: formInputs }),
		});

		render(<ResearchDeepDiveStep />);

		let textarea = screen.getByTestId("research-deep-dive-answer");
		expect(textarea).toHaveValue("Background context");

		const secondQuestion = screen.getByTestId("question-card-1");
		await user.click(secondQuestion);

		await waitFor(() => {
			textarea = screen.getByTestId("research-deep-dive-answer");
			expect(textarea).toHaveValue("Research hypothesis");
		});
	});

	it("triggers autofill when AI button is clicked", async () => {
		const user = userEvent.setup();

		useApplicationStore.setState({
			application: ApplicationFactory.build({ form_inputs: undefined }),
		});

		render(<ResearchDeepDiveStep />);

		const aiButton = screen.getByTestId("ai-try-button");
		await user.click(aiButton);

		expect(mockTriggerAutofill).toHaveBeenCalledWith("research_deep_dive");
	});

	it("shows loading state when autofill is active", () => {
		useWizardStore.setState({
			isAutofillLoading: { research_deep_dive: true, research_plan: false },
			triggerAutofill: mockTriggerAutofill,
			updateFormInputs: mockUpdateFormInputs,
		});

		useApplicationStore.setState({
			application: ApplicationFactory.build({ form_inputs: undefined }),
		});

		render(<ResearchDeepDiveStep />);

		const aiButton = screen.getByTestId("ai-try-button");
		expect(aiButton).toHaveTextContent("Generating...");
		expect(aiButton).toBeDisabled();
	});
});

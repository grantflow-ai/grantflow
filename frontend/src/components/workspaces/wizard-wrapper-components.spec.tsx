import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory } from "::testing/factories";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { StepIndicator, WizardFooter, WizardHeader } from "./wizard-wrapper-components";

// Mock the application store
vi.mock("@/stores/application-store", () => ({
	useApplicationStore: {
		getState: vi.fn(),
	},
}));

describe("WizardFooter - Grant Application Wizard Navigation Controls", () => {
	beforeEach(() => {
		const { polling } = useWizardStore.getState();
		useWizardStore.setState({
			currentStep: 0,
			polling: {
				...polling,
				intervalId: null,
				isActive: false,
			},
		});
		vi.mocked(useApplicationStore.getState).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({ title: "A".repeat(20) }),
			areFilesOrUrlsIndexing: vi.fn(),
			createApplication: vi.fn(),
			generateTemplate: vi.fn(),
			handleApplicationInit: vi.fn(),
			isLoading: false,
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
			retrieveApplication: vi.fn(),
			setApplication: vi.fn(),
			setUploadedFiles: vi.fn(),
			setUrls: vi.fn(),
			updateApplication: vi.fn(),
			uploadedFiles: [],
			urls: ["https://example.com"],
		});
	});

	describe("Navigation Button Visibility", () => {
		it("displays back button for steps after the first", () => {
			useWizardStore.setState({ currentStep: 1 });
			render(<WizardFooter />);

			expect(screen.getByTestId("back-button")).toBeInTheDocument();
		});

		it("hides back button on the first step", () => {
			useWizardStore.setState({ currentStep: 0 });
			render(<WizardFooter />);

			expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();
		});
	});

	describe("Action Button Configuration", () => {
		it("displays approval action on step 2", () => {
			useWizardStore.setState({ currentStep: 1 });
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Approve and Continue");
		});

		it("displays generation action on final step", () => {
			useWizardStore.setState({ currentStep: 5 });
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Generate");
		});

		it("displays standard next action on other steps", () => {
			useWizardStore.setState({ currentStep: 2 });
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Next");
		});
	});

	describe("Button State Management", () => {
		it("enables continue button when step validation passes", () => {
			useWizardStore.setState({ currentStep: 0 });
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).not.toBeDisabled();
		});

		it("disables continue button when step validation fails", () => {
			useWizardStore.setState({ currentStep: 0 });
			vi.mocked(useApplicationStore.getState).mockReturnValue({
				addFile: vi.fn(),
				addUrl: vi.fn(),
				application: ApplicationFactory.build({ title: "Short" }),
				areFilesOrUrlsIndexing: vi.fn(),
				createApplication: vi.fn(),
				generateTemplate: vi.fn(),
				handleApplicationInit: vi.fn(),
				isLoading: false,
				removeFile: vi.fn(),
				removeUrl: vi.fn(),
				retrieveApplication: vi.fn(),
				setApplication: vi.fn(),
				setUploadedFiles: vi.fn(),
				setUrls: vi.fn(),
				updateApplication: vi.fn(),
				uploadedFiles: [],
				urls: [],
			});
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toBeDisabled();
		});
	});
});

describe("WizardHeader", () => {
	beforeEach(() => {
		const { polling } = useWizardStore.getState();
		useWizardStore.setState({
			currentStep: 0,
			polling: {
				...polling,
				intervalId: null,
				isActive: false,
			},
		});
		vi.mocked(useApplicationStore.getState).mockReturnValue({
			addFile: vi.fn(),
			addUrl: vi.fn(),
			application: ApplicationFactory.build({ title: "Test Application" }),
			areFilesOrUrlsIndexing: vi.fn(),
			createApplication: vi.fn(),
			generateTemplate: vi.fn(),
			handleApplicationInit: vi.fn(),
			isLoading: false,
			removeFile: vi.fn(),
			removeUrl: vi.fn(),
			retrieveApplication: vi.fn(),
			setApplication: vi.fn(),
			setUploadedFiles: vi.fn(),
			setUrls: vi.fn(),
			updateApplication: vi.fn(),
			uploadedFiles: [],
			urls: [],
		});
	});

	describe("Header Information Display", () => {
		it("shows application name and deadline after first step", () => {
			useWizardStore.setState({ currentStep: 1 });
			render(<WizardHeader />);

			expect(screen.getByTestId("app-name")).toHaveTextContent("Test Application");
			expect(screen.getByTestId("deadline-component")).toBeInTheDocument();
		});

		it("hides application info on first step", () => {
			useWizardStore.setState({ currentStep: 0 });
			render(<WizardHeader />);

			expect(screen.queryByTestId("app-name")).not.toBeInTheDocument();
			expect(screen.queryByTestId("deadline-component")).not.toBeInTheDocument();
		});
	});

	describe("Progress Bar Display", () => {
		it("always displays step indicators", () => {
			render(<WizardHeader />);

			expect(screen.getByTestId("step-indicators")).toBeInTheDocument();
		});

		it("displays exit button", () => {
			render(<WizardHeader />);

			expect(screen.getByTestId("exit-button")).toBeInTheDocument();
		});
	});
});

describe("StepIndicator", () => {
	it("renders active step indicator", () => {
		render(<StepIndicator isLastStep={false} type="active" />);

		expect(screen.getByTestId("step-active")).toBeInTheDocument();
	});

	it("renders done step indicator", () => {
		render(<StepIndicator isLastStep={false} type="done" />);

		expect(screen.getByTestId("step-done")).toBeInTheDocument();
	});

	it("renders inactive step indicator", () => {
		render(<StepIndicator isLastStep={false} type="inactive" />);

		expect(screen.getByTestId("step-inactive")).toBeInTheDocument();
	});
});

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory } from "::testing/factories";
import { useWizardStore } from "@/stores/wizard-store";

import { StepIndicator, WizardFooter, WizardHeader } from "./wizard-wrapper-components";

const mockStoreState = {
	addFile: vi.fn(),
	addUrl: vi.fn(),
	application: null,
	areFilesOrUrlsIndexing: vi.fn(() => false),
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
	updateApplication: vi.fn().mockResolvedValue(undefined),
	uploadedFiles: [],
	urls: [],
};

vi.mock("@/stores/application-store", () => ({
	useApplicationStore: Object.assign(
		vi.fn(() => mockStoreState),
		{
			getState: vi.fn(() => mockStoreState),
		},
	),
}));

describe("WizardFooter - Grant Application Wizard Navigation Controls", () => {
	beforeEach(() => {
		const { polling } = useWizardStore.getState();
		useWizardStore.setState({
			applicationState: {
				application: ApplicationFactory.build({ title: "A".repeat(20) }),
				applicationId: null,
				applicationTitle: "A".repeat(20),
				templateId: null,
				wsConnectionStatus: undefined,
				wsConnectionStatusColor: undefined,
			},
			contentState: {
				uploadedFiles: [],
				urls: ["https://example.com"],
			},
			isLoading: false,
			polling: {
				...polling,
				intervalId: null,
				isActive: false,
			},
			ui: {
				currentStep: 0,
				fileDropdownStates: {},
				linkHoverStates: {},
				urlInput: "",
			},
			workspaceId: "test-workspace-id",
		});

		Object.assign(mockStoreState, {
			application: ApplicationFactory.build({ title: "A".repeat(20) }),
			urls: ["https://example.com"],
		});
	});

	describe("Navigation Button Visibility", () => {
		it("displays back button for steps after the first", () => {
			useWizardStore.setState({
				ui: {
					currentStep: 1,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});
			render(<WizardFooter />);

			expect(screen.getByTestId("back-button")).toBeInTheDocument();
		});

		it("hides back button on the first step", () => {
			useWizardStore.setState({
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});
			render(<WizardFooter />);

			expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();
		});
	});

	describe("Action Button Configuration", () => {
		it("displays approval action on step 2", () => {
			useWizardStore.setState({
				ui: {
					currentStep: 1,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Approve and Continue");
		});

		it("displays generation action on final step", () => {
			useWizardStore.setState({
				ui: {
					currentStep: 5,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Generate");
		});

		it("displays standard next action on other steps", () => {
			useWizardStore.setState({
				ui: {
					currentStep: 2,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Next");
		});
	});

	describe("Button State Management", () => {
		it("enables continue button when step validation passes", () => {
			useWizardStore.setState({
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).not.toBeDisabled();
		});

		it("disables continue button when step validation fails", () => {
			useWizardStore.setState({
				applicationState: {
					application: ApplicationFactory.build({ title: "Short" }),
					applicationId: null,
					applicationTitle: "Short",
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				contentState: {
					uploadedFiles: [],
					urls: [],
				},
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});

			Object.assign(mockStoreState, {
				application: ApplicationFactory.build({ title: "Short" }),
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
			applicationState: {
				application: ApplicationFactory.build({ title: "Test Application" }),
				applicationId: null,
				applicationTitle: "Test Application",
				templateId: null,
				wsConnectionStatus: undefined,
				wsConnectionStatusColor: undefined,
			},
			contentState: {
				uploadedFiles: [],
				urls: [],
			},
			isLoading: false,
			polling: {
				...polling,
				intervalId: null,
				isActive: false,
			},
			ui: {
				currentStep: 0,
				fileDropdownStates: {},
				linkHoverStates: {},
				urlInput: "",
			},
			workspaceId: "test-workspace-id",
		});

		Object.assign(mockStoreState, {
			application: ApplicationFactory.build({ title: "Test Application" }),
			urls: [],
		});
	});

	describe("Header Information Display", () => {
		it("shows application name and deadline after first step", () => {
			useWizardStore.setState({
				ui: {
					currentStep: 1,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});
			render(<WizardHeader />);

			expect(screen.getByTestId("app-name")).toHaveTextContent("Test Application");
			expect(screen.getByTestId("deadline-component")).toBeInTheDocument();
		});

		it("hides application info on first step", () => {
			useWizardStore.setState({
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
			});
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

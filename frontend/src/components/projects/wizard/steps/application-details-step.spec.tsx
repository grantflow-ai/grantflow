import { ApplicationFactory, GrantTemplateFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { ApplicationDetailsStep } from "./application-details-step";

vi.mock("@/components/projects/wizard/shared", () => ({
	ApplicationPreview: vi.fn(({ connectionStatus, connectionStatusColor, draftTitle, parentId }) => (
		<div data-testid="application-preview">
			<span data-testid="preview-title">{draftTitle}</span>
			<span data-testid="preview-status">{connectionStatus}</span>
			<span data-testid="preview-status-color">{connectionStatusColor}</span>
			<span data-testid="preview-parent-id">{parentId}</span>
		</div>
	)),
	TemplateFileUploader: vi.fn(({ parentId }) => (
		<div data-testid="template-file-uploader">
			<span data-testid="uploader-parent-id">{parentId}</span>
		</div>
	)),
	WizardLeftPane: vi.fn(({ children }) => <div data-testid="wizard-left-pane">{children}</div>),
}));

vi.mock("../shared/url-input", () => ({
	UrlInput: vi.fn(({ parentId }) => (
		<div data-testid="url-input">
			<span data-testid="url-input-parent-id">{parentId}</span>
		</div>
	)),
}));

vi.mock("@/hooks/use-polling-cleanup", () => ({
	usePollingCleanup: vi.fn(),
}));

describe("ApplicationDetailsStep", () => {
	const user = userEvent.setup();

	beforeEach(() => {
		resetAllStores();
		vi.clearAllMocks();
	});

	it("renders all sections correctly", () => {
		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-left-pane")).toBeInTheDocument();
		expect(screen.getByTestId("application-preview")).toBeInTheDocument();

		expect(screen.getByTestId("application-title-header")).toHaveTextContent("Application Title");
		expect(screen.getByTestId("application-title-description")).toHaveTextContent(
			"Give your application file a clear, descriptive name.",
		);
		expect(screen.getByTestId("application-instructions-header")).toHaveTextContent("Application Instructions");

		expect(screen.getByText("Documents")).toBeInTheDocument();
		expect(screen.getByText("Links")).toBeInTheDocument();
	});

	it("initializes with application title from store", () => {
		const mockApplication = ApplicationFactory.build({
			title: "Test Application Title",
		});
		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationDetailsStep />);

		const titleTextarea = screen.getByTestId("application-title-textarea");
		expect(titleTextarea).toHaveValue("Test Application Title");
		expect(screen.getByTestId("preview-title")).toHaveTextContent("Test Application Title");
	});

	it("passes grant template ID to child components", () => {
		const mockTemplate = GrantTemplateFactory.build();
		const mockApplication = ApplicationFactory.build({
			grant_template: mockTemplate,
		});
		useApplicationStore.setState({ application: mockApplication });

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("preview-parent-id")).toHaveTextContent(mockTemplate.id);
		expect(screen.getByTestId("uploader-parent-id")).toHaveTextContent(mockTemplate.id);
		expect(screen.getByTestId("url-input-parent-id")).toHaveTextContent(mockTemplate.id);
	});

	it("updates title in wizard store on input change", async () => {
		const handleTitleChange = vi.fn();
		useWizardStore.setState({ handleTitleChange });

		render(<ApplicationDetailsStep />);

		const titleTextarea = screen.getByTestId("application-title-textarea");
		await user.type(titleTextarea, "New Application Title");

		expect(handleTitleChange).toHaveBeenCalledWith("New Application Title");
	});

	it("shows error when title is empty after continue attempt", async () => {
		render(<ApplicationDetailsStep />);

		const continueButton = document.createElement("button");
		continueButton.dataset.testid = "continue-button";
		document.body.append(continueButton);

		continueButton.click();

		await waitFor(() => {
			expect(screen.getByText("Title is required")).toBeInTheDocument();
		});

		continueButton.remove();
	});

	it("shows error when title is less than 10 characters after continue attempt", async () => {
		render(<ApplicationDetailsStep />);

		const titleTextarea = screen.getByTestId("application-title-textarea");
		await user.type(titleTextarea, "Short");

		const continueButton = document.createElement("button");
		continueButton.dataset.testid = "continue-button";
		document.body.append(continueButton);

		continueButton.click();

		await waitFor(() => {
			expect(screen.getByText("Title is required and must be at least 10 characters")).toBeInTheDocument();
		});

		continueButton.remove();
	});

	it("removes error when title becomes valid", async () => {
		render(<ApplicationDetailsStep />);

		const titleTextarea = screen.getByTestId("application-title-textarea");
		await user.type(titleTextarea, "Short");

		const continueButton = document.createElement("button");
		continueButton.dataset.testid = "continue-button";
		document.body.append(continueButton);

		continueButton.click();

		await waitFor(() => {
			expect(screen.getByText("Title is required and must be at least 10 characters")).toBeInTheDocument();
		});

		await user.clear(titleTextarea);
		await user.type(titleTextarea, "Valid Application Title");

		await waitFor(() => {
			expect(screen.queryByText("Title is required and must be at least 10 characters")).not.toBeInTheDocument();
		});

		continueButton.remove();
	});

	it("shows error immediately when typing after attempting continue with invalid title", async () => {
		render(<ApplicationDetailsStep />);

		const continueButton = document.createElement("button");
		continueButton.dataset.testid = "continue-button";
		document.body.append(continueButton);

		continueButton.click();

		await waitFor(() => {
			expect(screen.getByText("Title is required")).toBeInTheDocument();
		});

		const titleTextarea = screen.getByTestId("application-title-textarea");
		await user.type(titleTextarea, "Test");

		expect(screen.getByText("Title is required and must be at least 10 characters")).toBeInTheDocument();

		continueButton.remove();
	});

	it("passes connection status props to ApplicationPreview", () => {
		render(<ApplicationDetailsStep connectionStatus="Connected" connectionStatusColor="text-green-500" />);

		expect(screen.getByTestId("preview-status")).toHaveTextContent("Connected");
		expect(screen.getByTestId("preview-status-color")).toHaveTextContent("text-green-500");
	});

	it("handles maximum character count for title", async () => {
		const longTitle = "a".repeat(121);

		render(<ApplicationDetailsStep />);

		const titleTextarea = screen.getByTestId("application-title-textarea");
		await user.type(titleTextarea, longTitle);

		const displayedValue = titleTextarea.getAttribute("value") ?? "";
		expect(displayedValue.length).toBeLessThanOrEqual(120);
	});

	it("trims whitespace when validating title length", async () => {
		render(<ApplicationDetailsStep />);

		const titleTextarea = screen.getByTestId("application-title-textarea");
		await user.type(titleTextarea, "   Short   ");

		const continueButton = document.createElement("button");
		continueButton.dataset.testid = "continue-button";
		document.body.append(continueButton);

		continueButton.click();

		await waitFor(() => {
			expect(screen.getByText("Title is required and must be at least 10 characters")).toBeInTheDocument();
		});

		continueButton.remove();
	});
});

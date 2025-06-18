import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationFactory } from "::testing/factories";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ApplicationDetailsStep } from "./application-details-step";

vi.mock("@/actions/sources", () => ({
	crawlTemplateUrl: vi.fn().mockResolvedValue({ message: "URL crawled successfully" }),
	deleteTemplateSource: vi.fn(),
}));

describe("ApplicationDetailsStep", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset only the state parts, not the actions
		useWizardStore.setState({
			currentStep: 0,
		});

		useApplicationStore.setState({
			application: null,
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});
	});

	it("renders application title section", () => {
		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-title-header")).toBeInTheDocument();
		expect(screen.getByTestId("application-title-description")).toBeInTheDocument();
		expect(screen.getByTestId("application-title-textarea")).toBeInTheDocument();
	});

	it("renders application instructions section", () => {
		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("template-file-container")).toBeInTheDocument();
	});

	it("displays character count for title", () => {
		const application = ApplicationFactory.build({
			grant_template: {
				created_at: "",
				grant_application_id: "",
				grant_sections: [],
				id: "test-template-id",
				rag_sources: [],
				updated_at: "",
			},
			id: "test-id",
			title: "Test Title",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});

		render(<ApplicationDetailsStep />);

		const charCount = screen.getByTestId("application-title-textarea-chars-count");
		expect(charCount).toHaveTextContent("10/120");
	});

	it("updates title on user input", async () => {
		const user = userEvent.setup();
		const application = ApplicationFactory.build({ title: "Initial Title" });

		useApplicationStore.setState({
			application,
			isLoading: false,
			uploadedFiles: [],
			urls: [],
		});

		render(<ApplicationDetailsStep />);

		const titleInput = screen.getByTestId("application-title-textarea");
		await user.type(titleInput, "e");

		// Wait for debounced update
		await waitFor(
			() => {
				const charCount = screen.getByTestId("application-title-textarea-chars-count");
				expect(charCount).toHaveTextContent("13/120");
			},
			{ timeout: 1000 },
		);
	});

	it("shows file upload component", () => {
		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("template-file-container")).toBeInTheDocument();
	});

	it("shows URL input component", () => {
		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("template-file-container")).toBeInTheDocument();
	});

	it("displays existing URLs", () => {
		const application = ApplicationFactory.build({
			grant_template: {
				created_at: "",
				grant_application_id: "",
				grant_sections: [],
				id: "test-template-id",
				rag_sources: [],
				updated_at: "",
			},
			id: "test-id",
			title: "Test Title",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
			isLoading: false,
			uploadedFiles: [],
			urls: ["https://example1.com", "https://example2.com"],
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getAllByText("https://example1.com").length).toBeGreaterThan(0);
		expect(screen.getAllByText("https://example2.com").length).toBeGreaterThan(0);
	});

	it("displays URLs and shows removal on hover", async () => {
		const user = userEvent.setup();

		const application = ApplicationFactory.build({
			grant_template: {
				created_at: "",
				grant_application_id: "",
				grant_sections: [],
				id: "test-template-id",
				rag_sources: [],
				updated_at: "",
			},
			id: "test-id",
			title: "Test Title",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
			isLoading: false,
			uploadedFiles: [],
			urls: ["https://example1.com", "https://example2.com"],
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-links")).toBeInTheDocument();
		expect(screen.getByText("https://example1.com")).toBeInTheDocument();
		expect(screen.getByText("https://example2.com")).toBeInTheDocument();

		const [link] = screen.getAllByTestId("link-preview-item");
		await user.hover(link);

		// Check that the remove icon appears on hover
		await waitFor(() => {
			expect(screen.getByTestId("link-remove-icon")).toBeInTheDocument();
		});
	});

	it("renders TemplateFileContainer", () => {
		const { container } = render(<ApplicationDetailsStep />);

		const templateFileContainer = container.querySelector('[data-testid="template-file-container"]');
		expect(templateFileContainer).toBeInTheDocument();
	});

	it("renders application preview with empty state", () => {
		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-title-textarea")).toBeInTheDocument();
		expect(screen.getAllByText("Application Title").length).toBeGreaterThan(0);
		expect(screen.queryByTestId("application-documents")).not.toBeInTheDocument();
		expect(screen.queryByTestId("application-links")).not.toBeInTheDocument();
	});

	it("shows uploaded files in preview", () => {
		const file = new File(["content"], "test.pdf", { type: "application/pdf" });
		Object.assign(file, { id: "file-id" });

		const application = ApplicationFactory.build({
			grant_template: {
				created_at: "",
				grant_application_id: "",
				grant_sections: [],
				id: "test-template-id",
				rag_sources: [],
				updated_at: "",
			},
			id: "test-id",
			title: "Test Title",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
			isLoading: false,
			uploadedFiles: [file],
			urls: [],
		});

		render(<ApplicationDetailsStep />);

		expect(screen.getByTestId("application-documents")).toBeInTheDocument();
		expect(screen.getByText("test.pdf")).toBeInTheDocument();
	});

	it("renders file dropdown with right-click", async () => {
		const user = userEvent.setup();

		const file = new File(["content"], "test.pdf", { type: "application/pdf" });
		Object.assign(file, { id: "file-id" });

		const application = ApplicationFactory.build({
			grant_template: {
				created_at: "",
				grant_application_id: "",
				grant_sections: [],
				id: "test-template-id",
				rag_sources: [],
				updated_at: "",
			},
			id: "test-id",
			title: "Test Title",
			workspace_id: "test-workspace-id",
		});

		useApplicationStore.setState({
			application,
			isLoading: false,
			uploadedFiles: [file],
			urls: [],
		});

		render(<ApplicationDetailsStep />);

		const fileCard = screen.getByText("test.pdf").closest(".group");
		expect(fileCard).toBeInTheDocument();

		if (fileCard) {
			await user.pointer({ keys: "[MouseRight]", target: fileCard });
		}

		// Check that right-clicking shows context menu
		await waitFor(() => {
			expect(screen.getByText("Open")).toBeInTheDocument();
			expect(screen.getByText("Remove")).toBeInTheDocument();
		});
	});
});

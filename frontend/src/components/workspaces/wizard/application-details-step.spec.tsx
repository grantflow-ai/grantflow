import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ApplicationDetailsStep } from "./application-details-step";

vi.mock("@/actions/sources", () => ({
	crawlTemplateUrl: vi.fn().mockResolvedValue({ message: "URL crawled successfully" }),
	deleteTemplateSource: vi.fn(),
}));

const DEFAULT_PROPS = {
	applicationTitle: "",
	onApplicationTitleChange: vi.fn(),
	onUrlsChange: vi.fn(),
	templateId: "test-template-id",
	urls: [],
	workspaceId: "test-workspace-id",
};

describe("ApplicationDetailsStep", () => {
	it("renders application title section", () => {
		render(<ApplicationDetailsStep {...DEFAULT_PROPS} />);

		expect(screen.getByTestId("application-title-header")).toBeInTheDocument();
		expect(screen.getByTestId("application-title-description")).toBeInTheDocument();
		expect(screen.getByTestId("application-title-textarea")).toBeInTheDocument();
	});

	it("renders application instructions section", () => {
		render(<ApplicationDetailsStep {...DEFAULT_PROPS} />);

		expect(screen.getByText("Application Instructions")).toBeInTheDocument();
		expect(screen.getAllByText("Documents")[0]).toBeInTheDocument();
		expect(screen.getAllByText("Links")[0]).toBeInTheDocument();
	});

	it("displays character count for title", () => {
		const props = { ...DEFAULT_PROPS, applicationTitle: "Test Title" };
		render(<ApplicationDetailsStep {...props} />);

		expect(screen.getByTestId("application-title-textarea-chars-count")).toBeInTheDocument();
	});

	it("calls onApplicationTitleChange when title is typed", async () => {
		const user = userEvent.setup();
		const onApplicationTitleChange = vi.fn();

		function TestWrapper() {
			const [title, setTitle] = useState("");
			return (
				<ApplicationDetailsStep
					{...DEFAULT_PROPS}
					applicationTitle={title}
					onApplicationTitleChange={(value) => {
						setTitle(value);
						onApplicationTitleChange(value);
					}}
				/>
			);
		}

		render(<TestWrapper />);

		const textarea = screen.getByTestId("application-title-textarea");
		await user.type(textarea, "New Title");

		expect(onApplicationTitleChange).toHaveBeenCalledTimes(9);
		expect(onApplicationTitleChange).toHaveBeenLastCalledWith("New Title");
	});

	it("limits title length to 120 characters", () => {
		render(<ApplicationDetailsStep {...DEFAULT_PROPS} />);

		const textarea = screen.getByTestId("application-title-textarea");
		expect(textarea).toHaveAttribute("maxLength", "120");
	});

	it("adds URL when Enter is pressed", async () => {
		const user = userEvent.setup();
		const onUrlsChange = vi.fn();
		render(<ApplicationDetailsStep {...DEFAULT_PROPS} onUrlsChange={onUrlsChange} />);

		const urlInput = screen.getByPlaceholderText("Paste a link and press Enter to add");
		await user.type(urlInput, "https://example.com");
		await user.keyboard("{Enter}");

		expect(onUrlsChange).toHaveBeenCalledWith(["https://example.com"]);
	});

	it("does not add empty URLs", async () => {
		const user = userEvent.setup();
		const onUrlsChange = vi.fn();
		render(<ApplicationDetailsStep {...DEFAULT_PROPS} onUrlsChange={onUrlsChange} />);

		screen.getByPlaceholderText("Paste a link and press Enter to add");
		await user.keyboard("{Enter}");

		expect(onUrlsChange).not.toHaveBeenCalled();
	});

	it("does not add duplicate URLs", async () => {
		const user = userEvent.setup();
		const onUrlsChange = vi.fn();
		const existingUrls = ["https://example.com"];
		render(<ApplicationDetailsStep {...DEFAULT_PROPS} onUrlsChange={onUrlsChange} urls={existingUrls} />);

		const urlInput = screen.getByPlaceholderText("Paste a link and press Enter to add");
		await user.type(urlInput, "https://example.com");
		await user.keyboard("{Enter}");

		expect(onUrlsChange).not.toHaveBeenCalled();
	});

	it("displays existing URLs", () => {
		const urls = ["https://example1.com", "https://example2.com"];
		render(<ApplicationDetailsStep {...DEFAULT_PROPS} urls={urls} />);

		expect(screen.getAllByText("https://example1.com").length).toBeGreaterThan(0);
		expect(screen.getAllByText("https://example2.com").length).toBeGreaterThan(0);
	});

	it("removes URL when × button is clicked", async () => {
		const user = userEvent.setup();
		const onUrlsChange = vi.fn();
		const urls = ["https://example1.com", "https://example2.com"];
		render(<ApplicationDetailsStep {...DEFAULT_PROPS} onUrlsChange={onUrlsChange} urls={urls} />);

		const removeButtons = screen.getAllByText("×");
		await user.click(removeButtons[0]);

		expect(onUrlsChange).toHaveBeenCalledWith(["https://example2.com"]);
	});

	it("clears URL input after adding", async () => {
		const user = userEvent.setup();
		render(<ApplicationDetailsStep {...DEFAULT_PROPS} />);

		const urlInput = screen.getByPlaceholderText("Paste a link and press Enter to add");
		await user.type(urlInput, "https://example.com");
		await user.keyboard("{Enter}");

		await waitFor(() => {
			expect(Reflect.get(urlInput, "value")).toBe("");
		});
	});

	it("renders TemplateFileContainer with correct props", () => {
		const { container } = render(<ApplicationDetailsStep {...DEFAULT_PROPS} />);

		const templateFileContainer = container.querySelector('[data-testid="template-file-container"]');
		expect(templateFileContainer).toBeInTheDocument();
	});

	it("renders application preview", () => {
		render(<ApplicationDetailsStep {...DEFAULT_PROPS} />);

		expect(screen.getByText("Untitled Application")).toBeInTheDocument();
		expect(screen.getByText("Draft")).toBeInTheDocument();
		expect(screen.getByText("No documents uploaded yet")).toBeInTheDocument();
		expect(screen.getByText("No links added yet")).toBeInTheDocument();
	});

	it("updates preview when title changes", () => {
		const { rerender } = render(<ApplicationDetailsStep {...DEFAULT_PROPS} />);

		expect(screen.getByText("Untitled Application")).toBeInTheDocument();

		rerender(<ApplicationDetailsStep {...DEFAULT_PROPS} applicationTitle="My New Application" />);

		expect(screen.getByRole("heading", { name: "My New Application" })).toBeInTheDocument();
	});

	it("updates preview when URLs are added", () => {
		const { rerender } = render(<ApplicationDetailsStep {...DEFAULT_PROPS} />);

		expect(screen.getByText("No links added yet")).toBeInTheDocument();

		rerender(<ApplicationDetailsStep {...DEFAULT_PROPS} urls={["https://example.com"]} />);

		expect(screen.queryByText("No links added yet")).not.toBeInTheDocument();
		expect(screen.getAllByText("https://example.com").length).toBeGreaterThan(0);
	});
});

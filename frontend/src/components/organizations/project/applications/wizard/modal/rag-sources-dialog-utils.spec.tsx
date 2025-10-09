import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRagSourcesDialog } from "./rag-sources-dialog-utils";

vi.mock("./rag-sources-content", () => ({
	RagSourcesContent: () => <div data-testid="rag-sources-content">RAG Sources Content</div>,
}));

vi.mock("./rag-sources-footer", () => ({
	RagSourcesFooter: ({ onBackToUploads, onContinue }: any) => (
		<div data-testid="rag-sources-footer">
			<button onClick={onBackToUploads} type="button">
				Back to Uploads
			</button>
			<button onClick={onContinue} type="button">
				Continue
			</button>
		</div>
	),
}));

describe.sequential("createRagSourcesDialog", () => {
	afterEach(() => {
		cleanup();
	});
	it("returns dialog with content and footer", () => {
		const dialog = createRagSourcesDialog({ sourceType: "template" });

		expect(dialog).toHaveProperty("content");
		expect(dialog).toHaveProperty("footer");
	});

	it("renders content component", () => {
		const dialog = createRagSourcesDialog({ sourceType: "template" });

		const { container } = render(<div>{dialog.content}</div>);

		expect(container.querySelector('[data-testid="rag-sources-content"]')).toBeInTheDocument();
	});

	it("renders footer component with callbacks", () => {
		const mockOnBackToUploads = vi.fn();
		const mockOnContinue = vi.fn();

		const dialog = createRagSourcesDialog({
			onBackToUploads: mockOnBackToUploads,
			onContinue: mockOnContinue,
			sourceType: "template",
		});

		const { container } = render(<div>{dialog.footer}</div>);

		expect(container.querySelector('[data-testid="rag-sources-footer"]')).toBeInTheDocument();
		expect(container.querySelector('button[type="button"]')).toBeInTheDocument();
	});

	it("creates dialog for template source type", () => {
		const dialog = createRagSourcesDialog({ sourceType: "template" });

		expect(dialog.content).toBeDefined();
		expect(dialog.footer).toBeDefined();
	});

	it("creates dialog for application source type", () => {
		const dialog = createRagSourcesDialog({ sourceType: "application" });

		expect(dialog.content).toBeDefined();
		expect(dialog.footer).toBeDefined();
	});

	it("creates dialog with only onBackToUploads callback", () => {
		const mockOnBackToUploads = vi.fn();

		const dialog = createRagSourcesDialog({
			onBackToUploads: mockOnBackToUploads,
			sourceType: "template",
		});

		const { container } = render(<div>{dialog.footer}</div>);

		expect(container.querySelector('[data-testid="rag-sources-footer"]')).toBeInTheDocument();
		expect(container.querySelectorAll('button[type="button"]')).toHaveLength(2);
	});

	it("creates dialog with only onContinue callback", () => {
		const mockOnContinue = vi.fn();

		const dialog = createRagSourcesDialog({
			onContinue: mockOnContinue,
			sourceType: "application",
		});

		const { container } = render(<div>{dialog.footer}</div>);

		expect(container.querySelector('[data-testid="rag-sources-footer"]')).toBeInTheDocument();
		expect(container.querySelectorAll('button[type="button"]')).toHaveLength(2);
	});

	it("passes callbacks to footer component", () => {
		const mockOnBackToUploads = vi.fn();
		const mockOnContinue = vi.fn();

		const dialog = createRagSourcesDialog({
			onBackToUploads: mockOnBackToUploads,
			onContinue: mockOnContinue,
			sourceType: "template",
		});

		const { container } = render(<div>{dialog.footer}</div>);

		expect(container.querySelector('[data-testid="rag-sources-footer"]')).toBeInTheDocument();
	});

	it("exports individual components", async () => {
		const { RagSourcesContent, RagSourcesFooter } = await import("./rag-sources-dialog-utils");

		expect(RagSourcesContent).toBeDefined();
		expect(RagSourcesFooter).toBeDefined();
	});
});

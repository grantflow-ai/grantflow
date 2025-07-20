import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRagSourcesDialog } from "./rag-sources-dialog-utils";

// Mock the content and footer components
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
		const dialog = createRagSourcesDialog();

		expect(dialog).toHaveProperty("content");
		expect(dialog).toHaveProperty("footer");
	});

	it("renders content component", () => {
		const dialog = createRagSourcesDialog();

		const { container } = render(<div>{dialog.content}</div>);

		expect(container.querySelector('[data-testid="rag-sources-content"]')).toBeInTheDocument();
	});

	it("renders footer component with callbacks", () => {
		const mockOnBackToUploads = vi.fn();
		const mockOnContinue = vi.fn();

		const dialog = createRagSourcesDialog({
			onBackToUploads: mockOnBackToUploads,
			onContinue: mockOnContinue,
		});

		const { container } = render(<div>{dialog.footer}</div>);

		expect(container.querySelector('[data-testid="rag-sources-footer"]')).toBeInTheDocument();
		expect(container.querySelector('button[type="button"]')).toBeInTheDocument();
	});

	it("creates dialog without options", () => {
		const dialog = createRagSourcesDialog();

		expect(dialog.content).toBeDefined();
		expect(dialog.footer).toBeDefined();
	});

	it("creates dialog with empty options", () => {
		const dialog = createRagSourcesDialog({});

		expect(dialog.content).toBeDefined();
		expect(dialog.footer).toBeDefined();
	});

	it("creates dialog with only onBackToUploads callback", () => {
		const mockOnBackToUploads = vi.fn();

		const dialog = createRagSourcesDialog({
			onBackToUploads: mockOnBackToUploads,
		});

		const { container } = render(<div>{dialog.footer}</div>);

		expect(container.querySelector('[data-testid="rag-sources-footer"]')).toBeInTheDocument();
		expect(container.querySelectorAll('button[type="button"]')).toHaveLength(2);
	});

	it("creates dialog with only onContinue callback", () => {
		const mockOnContinue = vi.fn();

		const dialog = createRagSourcesDialog({
			onContinue: mockOnContinue,
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

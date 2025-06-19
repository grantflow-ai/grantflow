import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { assert, describe, expect, it, vi } from "vitest";

import { Editor } from "./editor";

class FakeDOMRectList extends Array<DOMRect> implements DOMRectList {
	item(index: number): DOMRect | null {
		return this[index];
	}
}

function getBoundingClientRect(): DOMRect {
	const rec = {
		bottom: 0,
		height: 0,
		left: 0,
		right: 0,
		top: 0,
		width: 0,
		x: 0,
		y: 0,
	};
	return { ...rec, toJSON: () => rec };
}

document.elementFromPoint = (): null => null;
HTMLElement.prototype.getBoundingClientRect = getBoundingClientRect;
HTMLElement.prototype.getClientRects = (): DOMRectList => new FakeDOMRectList();
Range.prototype.getBoundingClientRect = getBoundingClientRect;
Range.prototype.getClientRects = (): DOMRectList => new FakeDOMRectList();

describe("Editor", () => {
	it("renders with initial content", () => {
		const initialContent = "<p>Initial content</p>";
		render(<Editor content={initialContent} onContentUpdate={() => {}} />);

		const editor = screen.getByTestId("tiptap-editor");
		expect(editor).toBeInTheDocument();
		expect(editor).toHaveTextContent("Initial content");
	});

	it("calls onContentUpdate when content changes", async () => {
		const mockContent = "";
		const mockOnChange = vi.fn();

		render(<Editor content={mockContent} onContentUpdate={mockOnChange} />);
		const user = userEvent.setup();

		const editor = await waitFor(() => screen.getByTestId("tiptap-editor").querySelector("p"));
		assert(editor, "Editor not found");

		await user.type(editor, "New content");

		expect(editor).toMatchInlineSnapshot(`
			<p>
			  New content
			</p>
		`);
		expect(mockOnChange).toHaveBeenCalledTimes(11);
		expect(mockOnChange).toHaveBeenCalledWith("<p>New content</p>");
	});
});

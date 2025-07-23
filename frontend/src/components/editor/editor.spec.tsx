import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

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

describe.sequential("Editor", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders with initial content", () => {
		render(<Editor content={""} onContentUpdate={() => {}} />);

		const editor = screen.getByTestId("tiptap-editor");
		expect(editor).toBeInTheDocument();
	});
});

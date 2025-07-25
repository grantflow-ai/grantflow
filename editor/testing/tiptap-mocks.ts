import { vi } from "vitest";

function getBoundingClientRect() {
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

class FakeDOMRectList extends Array {
	item(index: number) {
		return this[index];
	}
}

document.elementFromPoint = vi.fn(() => null);
HTMLElement.prototype.getBoundingClientRect = vi.fn(getBoundingClientRect);
HTMLElement.prototype.getClientRects = vi.fn(() => new FakeDOMRectList() as any);
Range.prototype.getBoundingClientRect = vi.fn(getBoundingClientRect);
Range.prototype.getClientRects = vi.fn(() => new FakeDOMRectList() as any);

globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
	disconnect: vi.fn(),
	observe: vi.fn(),
	unobserve: vi.fn(),
}));

globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
	disconnect: vi.fn(),
	observe: vi.fn(),
	unobserve: vi.fn(),
}));

const mockFileReader = vi.fn().mockImplementation(() => ({
	addEventListener: vi.fn(),
	readAsDataURL: vi.fn(function (this: any) {
		setTimeout(() => {
			if (this.onload) {
				this.onload({
					target: { result: "data:image/jpeg;base64,fake-image-data" },
				} as any);
			}
		}, 0);
	}),
	removeEventListener: vi.fn(),
}));

Object.assign(mockFileReader, {
	DONE: 2,
	EMPTY: 0,
	LOADING: 1,
	prototype: mockFileReader.prototype,
});

globalThis.FileReader = mockFileReader as any;

globalThis.URL.createObjectURL = vi.fn(() => "blob:fake-url");
globalThis.URL.revokeObjectURL = vi.fn();

Object.assign(navigator, {
	clipboard: {
		readText: vi.fn(() => Promise.resolve("")),
		writeText: vi.fn(() => Promise.resolve()),
	},
});

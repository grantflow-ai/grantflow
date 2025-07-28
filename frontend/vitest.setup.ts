import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
	addEventListener: vi.fn(),
	addListener: vi.fn(),
	dispatchEvent: vi.fn(() => false),
	matches: false,
	media: query,
	onchange: null,
	removeEventListener: vi.fn(),
	removeListener: vi.fn(),
}));

afterEach(async () => {
	cleanup();

	await new Promise((resolve) => setTimeout(resolve, 0));

	document.querySelectorAll("[data-radix-portal]").forEach((el) => {
		el.innerHTML = "";
		el.remove();
	});

	document.querySelectorAll('[role="dialog"]').forEach((el) => {
		el.innerHTML = "";
		el.remove();
	});

	document.querySelectorAll('[data-testid*="modal"]').forEach((el) => {
		const parent = el.parentElement;
		if (parent && parent.getAttribute("role") === "dialog") {
			parent.innerHTML = "";
			parent.remove();
		}
	});

	delete document.body.dataset.scrollLocked;
	document.body.style.pointerEvents = "";
	document.body.style.overflow = "";

	const portalRoot = document.querySelector("#radix-portal-root");
	if (portalRoot) {
		portalRoot.innerHTML = "";
	}
});

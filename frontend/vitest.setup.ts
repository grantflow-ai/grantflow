import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock window.matchMedia
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

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(async () => {
	// First do normal React cleanup
	cleanup();

	// Wait a bit for React to finish unmounting
	await new Promise((resolve) => setTimeout(resolve, 0));

	// Then aggressively clean up any lingering portal elements
	// Remove all Radix UI portals
	document.querySelectorAll("[data-radix-portal]").forEach((el) => {
		el.innerHTML = "";
		el.remove();
	});

	// Remove all dialog elements
	document.querySelectorAll('[role="dialog"]').forEach((el) => {
		el.innerHTML = "";
		el.remove();
	});

	// Remove any remaining modal-related elements
	document.querySelectorAll('[data-testid*="modal"]').forEach((el) => {
		const parent = el.parentElement;
		if (parent && parent.getAttribute("role") === "dialog") {
			parent.innerHTML = "";
			parent.remove();
		}
	});

	// Reset body attributes that Radix UI may have set
	delete document.body.dataset.scrollLocked;
	document.body.style.pointerEvents = "";
	document.body.style.overflow = "";

	// Clear any remaining portal containers
	const portalRoot = document.querySelector("#radix-portal-root");
	if (portalRoot) {
		portalRoot.innerHTML = "";
	}
});

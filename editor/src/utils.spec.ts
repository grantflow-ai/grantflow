import { describe, expect, it, vi } from "vitest";
import { MockFileFactory } from "../testing/factories";
import {
	cn,
	convertFileToBase64,
	formatShortcutKey,
	handleImageUpload,
	isAllowedUri,
	isMac,
	isValidPosition,
	MAX_FILE_SIZE,
	parseShortcutKeys,
	sanitizeUrl,
} from "./utils";

describe("tiptap-utils", () => {
	describe("cn (className utility)", () => {
		it("joins valid class names", () => {
			expect(cn("class1", "class2", "class3")).toBe("class1 class2 class3");
		});

		it("filters out falsy values", () => {
			expect(cn("class1", false, null, undefined, "class2", "")).toBe("class1 class2");
		});

		it("returns empty string for no valid classes", () => {
			expect(cn(false, null, undefined, "")).toBe("");
		});

		it("handles mixed valid and invalid values", () => {
			expect(cn("valid", false, "also-valid", false, "conditional")).toBe("valid also-valid conditional");
		});
	});

	describe("isMac", () => {
		it("returns true for macOS platforms", () => {
			Object.defineProperty(navigator, "platform", {
				configurable: true,
				value: "MacIntel",
			});
			expect(isMac()).toBe(true);
		});

		it("returns false for non-macOS platforms", () => {
			Object.defineProperty(navigator, "platform", {
				configurable: true,
				value: "Win32",
			});
			expect(isMac()).toBe(false);
		});
	});

	describe("formatShortcutKey", () => {
		it("formats keys for Mac with symbols", () => {
			expect(formatShortcutKey("ctrl", true)).toBe("⌘");
			expect(formatShortcutKey("alt", true)).toBe("⌥");
			expect(formatShortcutKey("shift", true)).toBe("⇧");
		});

		it("formats keys for non-Mac platforms", () => {
			expect(formatShortcutKey("ctrl", false)).toBe("Ctrl");
			expect(formatShortcutKey("alt", false)).toBe("Alt");
			expect(formatShortcutKey("shift", false)).toBe("Shift");
		});

		it("handles unknown keys", () => {
			expect(formatShortcutKey("unknown", false)).toBe("Unknown");
			expect(formatShortcutKey("unknown", true)).toBe("UNKNOWN");
		});

		it("respects capitalize parameter", () => {
			expect(formatShortcutKey("ctrl", false, false)).toBe("ctrl");
			expect(formatShortcutKey("unknown", true, false)).toBe("unknown");
		});
	});

	describe("parseShortcutKeys", () => {
		it("parses shortcut keys with default delimiter", () => {
			const result = parseShortcutKeys({ shortcutKeys: "ctrl+alt+s" });
			expect(result).toHaveLength(3);
		});

		it("handles custom delimiter", () => {
			const result = parseShortcutKeys({
				delimiter: "-",
				shortcutKeys: "ctrl-alt-s",
			});
			expect(result).toHaveLength(3);
		});

		it("returns empty array for undefined shortcutKeys", () => {
			const result = parseShortcutKeys({ shortcutKeys: undefined });
			expect(result).toEqual([]);
		});

		it("trims whitespace from keys", () => {
			const result = parseShortcutKeys({ shortcutKeys: "ctrl + alt + s" });
			expect(result).toHaveLength(3);
		});
	});

	describe("isValidPosition", () => {
		it("returns true for valid positive numbers", () => {
			expect(isValidPosition(0)).toBe(true);
			expect(isValidPosition(10)).toBe(true);
			expect(isValidPosition(100)).toBe(true);
		});

		it("returns false for negative numbers", () => {
			expect(isValidPosition(-1)).toBe(false);
			expect(isValidPosition(-10)).toBe(false);
		});

		it("returns false for null, undefined, and NaN", () => {
			expect(isValidPosition(null)).toBe(false);
			expect(isValidPosition(undefined)).toBe(false);
			expect(isValidPosition(Number.NaN)).toBe(false);
		});
	});

	describe("handleImageUpload", () => {
		it("throws error for files exceeding max size", async () => {
			const largeFile = MockFileFactory.build();
			Object.defineProperty(largeFile, "size", { value: MAX_FILE_SIZE + 1 });

			await expect(handleImageUpload(largeFile)).rejects.toThrow("File size exceeds maximum allowed");
		});

		it("throws error when no file provided", async () => {
			await expect(handleImageUpload(null as any)).rejects.toThrow("No file provided");
		});

		it("returns placeholder image path for valid files", async () => {
			const file = MockFileFactory.build();
			Object.defineProperty(file, "size", { value: 1024 });

			const result = await handleImageUpload(file);
			expect(result).toBe("/images/tiptap-ui-placeholder-image.jpg");
		}, 15000);

		it("calls progress callback during upload", async () => {
			const file = MockFileFactory.build();
			Object.defineProperty(file, "size", { value: 1024 });
			const onProgress = vi.fn();

			await handleImageUpload(file, onProgress);
			expect(onProgress).toHaveBeenCalled();
			expect(onProgress).toHaveBeenCalledWith({ progress: expect.any(Number) });
		}, 15000);

		it("handles abort signal", async () => {
			const file = MockFileFactory.build();
			Object.defineProperty(file, "size", { value: 1024 });
			const abortController = new AbortController();

			abortController.abort();

			await expect(handleImageUpload(file, undefined, abortController.signal)).rejects.toThrow(
				"Upload cancelled",
			);
		});
	});

	describe("convertFileToBase64", () => {
		it("rejects when no file provided", async () => {
			await expect(convertFileToBase64(null as any)).rejects.toThrow("No file provided");
		});
	});

	describe("isAllowedUri", () => {
		it("allows standard HTTP URLs", () => {
			expect(isAllowedUri("https://example.com")).toBeTruthy();
			expect(isAllowedUri("http://example.com")).toBeTruthy();
		});

		it("allows mailto links", () => {
			expect(isAllowedUri("mailto:test@example.com")).toBeTruthy();
		});

		it("allows tel links", () => {
			expect(isAllowedUri("tel:+1234567890")).toBeTruthy();
		});

		it("allows undefined/empty URIs", () => {
			expect(isAllowedUri(undefined)).toBeTruthy();
			expect(isAllowedUri("")).toBeTruthy();
		});

		it("blocks javascript URLs", () => {
			expect(isAllowedUri("javascript:alert('xss')")).toBeFalsy();
		});

		it("supports custom protocols", () => {
			const customProtocols = [{ scheme: "myapp" }];
			expect(isAllowedUri("myapp://open", customProtocols)).toBeTruthy();
		});
	});

	describe("sanitizeUrl", () => {
		it("returns valid HTTPS URLs unchanged", () => {
			const url = "https://example.com/path";
			expect(sanitizeUrl(url, "https://base.com")).toBe(url);
		});

		it("handles invalid URLs by resolving against base", () => {
			const result = sanitizeUrl("invalid-url", "https://base.com");
			expect(result).toBe("https://base.com/invalid-url");
		});

		it("resolves relative URLs against base", () => {
			const result = sanitizeUrl("/path", "https://example.com");
			expect(result).toBe("https://example.com/path");
		});

		it("blocks disallowed protocols", () => {
			expect(sanitizeUrl("javascript:alert('xss')", "https://example.com")).toBe("#");
		});

		it("handles malformed URLs by resolving against base", () => {
			const result = sanitizeUrl("ht tp://invalid", "https://example.com");
			expect(result).toBe("https://example.com/ht%20tp://invalid");
		});
	});
});

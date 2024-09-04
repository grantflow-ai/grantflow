import { describe, expect, it } from "vitest";
import { formatBytes } from "./format";

describe("formatBytes", () => {
	it('should return "0 Bytes" for 0 bytes', () => {
		expect(formatBytes(0)).toBe("0 Bytes");
	});

	it("should format bytes correctly with default options", () => {
		expect(formatBytes(1)).toBe("1 Bytes");
		expect(formatBytes(500)).toBe("500 Bytes");
		expect(formatBytes(1000)).toBe("1 KB");
		expect(formatBytes(1500)).toBe("2 KB");
		expect(formatBytes(1_000_000)).toBe("1 MB");
		expect(formatBytes(1_500_000)).toBe("2 MB");
	});

	it("should respect the decimals option", () => {
		expect(formatBytes(1500, { decimals: 2 })).toBe("1.50 KB");
		expect(formatBytes(1_500_000, { decimals: 3 })).toBe("1.500 MB");
	});

	it("should use accurate size types when specified", () => {
		expect(formatBytes(1024, { sizeType: "accurate" })).toBe("1 KiB");
		expect(formatBytes(1_048_576, { sizeType: "accurate" })).toBe("1 MiB");
		expect(formatBytes(1_073_741_824, { sizeType: "accurate" })).toBe("1 GiB");
	});

	it("should handle large numbers correctly", () => {
		expect(formatBytes(1e12)).toBe("1 TB");
		expect(formatBytes(1e15)).toBe("1 PB");
		expect(formatBytes(1e18)).toBe("1 EB");
		expect(formatBytes(1e21)).toBe("1 ZB");
		expect(formatBytes(1e24)).toBe("1 YB");
	});

	it("should handle large numbers correctly with accurate sizing", () => {
		expect(formatBytes(1024 ** 4, { sizeType: "accurate" })).toBe("1 TiB");
		expect(formatBytes(1024 ** 5, { sizeType: "accurate" })).toBe("1 PiB");
		expect(formatBytes(1024 ** 6, { sizeType: "accurate" })).toBe("1 EiB");
		expect(formatBytes(1024 ** 7, { sizeType: "accurate" })).toBe("1 ZiB");
		expect(formatBytes(1024 ** 8, { sizeType: "accurate" })).toBe("1 YiB");
	});

	it("should handle decimal numbers", () => {
		expect(formatBytes(1.5 * 1000, { decimals: 2 })).toBe("1.50 KB");
		expect(formatBytes(1.5 * 1024, { decimals: 2, sizeType: "accurate" })).toBe("1.50 KiB");
	});

	it("should handle extreme cases", () => {
		const hugeNumber = Number.MAX_SAFE_INTEGER;
		expect(formatBytes(hugeNumber)).toBe("9 PB");
		expect(formatBytes(hugeNumber, { sizeType: "accurate" })).toBe("8 PiB");
	});

	it("should handle very small non-zero numbers", () => {
		expect(formatBytes(0.1)).toBe("0 Bytes");
		expect(formatBytes(0.1, { decimals: 2 })).toBe("0.10 Bytes");
		expect(formatBytes(0.6)).toBe("1 Bytes");
		expect(formatBytes(0.6, { decimals: 1 })).toBe("0.6 Bytes");
	});

	it("should throw an error for negative numbers", () => {
		expect(() => formatBytes(-1000)).toThrow("Bytes cannot be negative");
		expect(() => formatBytes(-0.1)).toThrow("Bytes cannot be negative");
	});

	it("should handle edge cases between units", () => {
		expect(formatBytes(999)).toBe("999 Bytes");
		expect(formatBytes(1000)).toBe("1 KB");
		expect(formatBytes(1_000_000 - 1)).toBe("1000 KB");
		expect(formatBytes(1_000_000)).toBe("1 MB");
	});

	it("should handle edge cases between units with accurate sizing", () => {
		expect(formatBytes(1023, { sizeType: "accurate" })).toBe("1023 Bytes");
		expect(formatBytes(1024, { sizeType: "accurate" })).toBe("1 KiB");
		expect(formatBytes(1_048_576 - 1, { sizeType: "accurate" })).toBe("1024 KiB");
		expect(formatBytes(1_048_576, { sizeType: "accurate" })).toBe("1 MiB");
	});

	it("should handle fractional bytes correctly", () => {
		expect(formatBytes(0.1, { decimals: 2 })).toBe("0.10 Bytes");
		expect(formatBytes(1.5, { decimals: 2 })).toBe("1.50 Bytes");
		expect(formatBytes(2.7, { decimals: 1 })).toBe("2.7 Bytes");
	});
});

import { formatBytes } from "./format";

describe("formatBytes", () => {
	it('should return "0 Bytes" for 0 bytes', () => {
		expect(formatBytes(0)).toBe("0 Bytes");
	});

	it("should format bytes correctly", () => {
		expect(formatBytes(1)).toBe("1 Bytes");
		expect(formatBytes(500)).toBe("500 Bytes");
		expect(formatBytes(1000)).toBe("1 KB");
		expect(formatBytes(1500)).toBe("2 KB");
		expect(formatBytes(1_000_000)).toBe("1 MB");
		expect(formatBytes(1_500_000)).toBe("2 MB");
	});
});

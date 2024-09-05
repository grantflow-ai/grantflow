import { describe, expect, it } from "vitest";
import { Ref } from "./state";

describe("Ref", () => {
	it("should initialize with null when no value is provided", () => {
		const ref = new Ref();
		expect(ref.value).toBeNull();
	});

	it("should initialize with the provided value", () => {
		const ref = new Ref("test");
		expect(ref.value).toBe("test");
	});

	it("should work with different types", () => {
		const numberRef = new Ref<number>(42);
		expect(numberRef.value).toBe(42);

		const booleanRef = new Ref<boolean>(true);
		expect(booleanRef.value).toBe(true);

		const objectRef = new Ref<object>({ key: "value" });
		expect(objectRef.value).toEqual({ key: "value" });
	});

	it("should allow null as a valid value", () => {
		const ref = new Ref<string | null>(null);
		expect(ref.value).toBeNull();
	});

	it("should allow updating the value after initialization", () => {
		const ref = new Ref<number>(10);
		expect(ref.value).toBe(10);

		ref.value = 20;
		expect(ref.value).toBe(20);
	});

	it("should allow setting the value to null after initialization", () => {
		const ref = new Ref<string>("initial");
		expect(ref.value).toBe("initial");

		ref.value = null;
		expect(ref.value).toBeNull();
	});
});

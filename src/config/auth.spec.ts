import { getEnabledAuthMethods } from "@/config/auth";
import { AuthMethod } from "@/config/enums";

vi.mock("@/utils/env");

describe("getEnabledAuthMethods", () => {
	it("returns all enabled auth methods", () => {
		const result = getEnabledAuthMethods();
		expect(result).toEqual(new Set(Object.values(AuthMethod)));
	});
});

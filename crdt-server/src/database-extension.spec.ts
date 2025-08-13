import { databaseExtension } from "./database-extension";

describe("DatabaseExtension", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should be defined", () => {
		expect(databaseExtension).toBeDefined();
		expect(typeof databaseExtension).toBe("object");
	});
});

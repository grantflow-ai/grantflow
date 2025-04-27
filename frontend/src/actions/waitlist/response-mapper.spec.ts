import { ServerResponseCode } from "./join-waitlist";
import { getUserMessage } from "./response-mapper";

describe("response-mapper", () => {
	it("should handle all possible enum values and ensure all codes have messages", () => {
		const allCodes: ServerResponseCode[] = [
			"ALREADY_REGISTERED",
			"EMAIL_SENDING_FAILED",
			"RATE_LIMITED",
			"SECURITY_CONCERN",
			"SERVER_ERROR",
			"SUCCESS",
			"VALIDATION_ERROR",
		];

		allCodes.forEach((code) => {
			const message = getUserMessage(code);
			expect(message).toBeDefined();
			expect(typeof message).toBe("string");
			expect(message.length).toBeGreaterThan(0);
		});
	});

	it("should return the correct message for SUCCESS code", () => {
		const message = getUserMessage("SUCCESS");
		expect(message).toBe("Thank you! You've successfully joined the waitlist.");
	});

	it("should return the correct message for ALREADY_REGISTERED code", () => {
		const message = getUserMessage("ALREADY_REGISTERED");
		expect(message).toBe("This email is already on our waitlist. We'll be in touch soon!");
	});

	it("should return the correct message for EMAIL_SENDING_FAILED code", () => {
		const message = getUserMessage("EMAIL_SENDING_FAILED");
		expect(message).toBe(
			"You're on our waitlist, but we couldn't send a confirmation email. Please check your email address.",
		);
	});

	it("should return the correct message for RATE_LIMITED code", () => {
		const message = getUserMessage("RATE_LIMITED");
		expect(message).toBe("We are dealing with too many requests. Please try again in a few minutes.");
	});

	it("should return the correct message for SECURITY_CONCERN code", () => {
		const message = getUserMessage("SECURITY_CONCERN");
		expect(message).toBe(
			"We've flagged a potential security concern. Please try again with a different email address or contact our support team.",
		);
	});

	it("should return the correct message for SERVER_ERROR code", () => {
		const message = getUserMessage("SERVER_ERROR");
		expect(message).toBe("Something went wrong on our end. Please try again later.");
	});

	it("should return the correct message for VALIDATION_ERROR code", () => {
		const message = getUserMessage("VALIDATION_ERROR");
		expect(message).toBe("Please check your information and try again.");
	});
});

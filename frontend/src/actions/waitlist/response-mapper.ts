import { ServerResponseCode } from "./join-waitlist";

const responseMessages: Record<ServerResponseCode, string> = {
	ALREADY_REGISTERED: "This email is already on our waitlist. We'll be in touch soon!",
	EMAIL_SENDING_FAILED:
		"You're on our waitlist, but we couldn't send a confirmation email. Please check your email address.",
	RATE_LIMITED: "We are dealing with too many requests. Please try again in a few minutes.",
	SECURITY_CONCERN:
		"We've flagged a potential security concern. Please try again with a different email address or contact our support team.",
	SERVER_ERROR: "Something went wrong on our end. Please try again later.",
	SUCCESS: "Thank you! You've successfully joined the waitlist.",
	VALIDATION_ERROR: "Please check your information and try again.",
};

export const getUserMessage = (responseCode: ServerResponseCode): string => responseMessages[responseCode];
